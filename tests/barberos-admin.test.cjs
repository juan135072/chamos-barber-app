// Admin barber management API: create a barber with or without a login
// account, credentials for existing barbers, permanent delete and edits.
// Routes run against the fake DB and an in-memory stand-in for the InsForge
// auth helpers in src/lib/insforge-admin.ts.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const bcrypt = require('bcryptjs')
const { createFakeDb, createResponse, stubModule } = require('./fake-db.cjs')

process.env.NEXT_PUBLIC_INSFORGE_BASE_URL = 'https://insforge.invalid'
process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = 'public-anon'
process.env.INSFORGE_API_KEY = 'ik_test_nonsecret'

// The real helpers are loaded before the stub replaces them for the routes.
// The ones under test only use rawsql over fetch, not the SDK client.
stubModule('@insforge/sdk', { createClient() { throw new Error('SDK client not used in these tests') } })
const realAdmin = require('../src/lib/insforge-admin.ts')
const { EmailService } = require('../lib/email-service.ts')

const TENANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OTHER_TENANT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ADMIN = '00000000-0000-4000-8000-000000000001'

let db
const auth = { users: [], created: [], deleted: [], passwords: [], sql: [], failCreate: null, failDelete: null, failSql: null }

stubModule('../src/lib/supabase-server.ts', {
  createPagesAdminClient: () => db,
  async getUserFromBearer() { return { data: { user: { id: ADMIN } }, error: null } },
  createPagesServerClient: () => ({ auth: { async getSession() { return { data: { session: null } } } } }),
})

// In-memory auth.users. Like InsForge, signUp refuses an email that exists.
// Credentials email (lib/email-service.ts): records each send; can fail.
const mail = { sent: [], fail: null }
stubModule('../lib/email-service.ts', {
  emailService: {
    async sendCredentials(credentials) {
      mail.sent.push(credentials)
      if (mail.fail === 'throw') throw new Error('Resend unavailable')
      return mail.fail !== 'false'
    },
  },
})

stubModule('../src/lib/insforge-admin.ts', {
  async adminCreateUser({ email, password }) {
    if (auth.failCreate) return { data: { user: null }, error: auth.failCreate }
    if (auth.users.some((u) => u.email === email)) return { data: { user: null }, error: Object.assign(new Error('User already exists'), { statusCode: 409 }) }
    const user = { id: randomUUID(), email, is_project_admin: false }
    auth.users.push(user)
    auth.created.push({ id: user.id, email, password })
    return { data: { user }, error: null }
  },
  async adminDeleteUser(id) {
    if (auth.failDelete) return { data: { user: null }, error: auth.failDelete }
    auth.users = auth.users.filter((u) => u.id !== id)
    auth.deleted.push(id)
    return { data: { user: null }, error: null }
  },
  async adminGetUserById(id) { return { data: { user: auth.users.find((u) => u.id === id) ?? null }, error: null } },
  async adminGetUserByEmail(email) { return { data: { user: auth.users.find((u) => u.email === email) ?? null }, error: null } },
  async adminSetUserPassword(id, password, { onlyUnlinked = false } = {}) {
    const user = auth.users.find((u) => u.id === id && !u.is_project_admin)
    const linked = (db.tables.admin_users || []).some((a) => a.id === id)
    if (!user || (onlyUnlinked && linked)) return { updated: false, error: null }
    auth.passwords.push({ id, password, onlyUnlinked })
    return { updated: true, error: null }
  },
  async adminRawSql(query, params) {
    auth.sql.push({ query, params })
    if (auth.failSql) throw auth.failSql
    if (/UPDATE auth\.users SET email = \$3/.test(query)) return changeEmails(params)
    throw new Error(`unexpected SQL in test: ${query}`)
  },
})

// Emulates the single statement that moves a barber's email together with
// its login row and auth user, including the unique constraints it can hit.
function changeEmails([barberoId, comercioId, email, accountId]) {
  const account = db.tables.admin_users.find((a) => a.id === accountId && a.barbero_id === barberoId && a.comercio_id === comercioId)
  const user = auth.users.find((u) => u.id === accountId && !u.is_project_admin)
  const barbero = db.tables.barberos.find((b) => b.id === barberoId && b.comercio_id === comercioId)
  if (!account || !user || !barbero) return { rows: [{ barberos: 0, cuentas: 0, usuarios: 0 }], rowCount: 1 }
  const taken = db.tables.barberos.some((b) => b.comercio_id === comercioId && b.email === email && b.id !== barberoId)
    || db.tables.admin_users.some((a) => a.comercio_id === comercioId && a.email === email && a.id !== accountId)
    || auth.users.some((u) => u.email === email && u.id !== accountId)
  if (taken) throw new Error('InsForge rawsql 400: duplicate key value violates unique constraint (23505)')
  barbero.email = email
  account.email = email
  user.email = email
  return { rows: [{ barberos: 1, cuentas: 1, usuarios: 1 }], rowCount: 1 }
}

const unique = (code, message) => ({ code, message })

/** Fake DB with the shop admin, its unique constraints and the barber triggers. */
function setup({ barberos = [], admin_users = [], users = [], ...options } = {}) {
  Object.assign(auth, { users: structuredClone(users), created: [], deleted: [], passwords: [], sql: [], failCreate: null, failDelete: null, failSql: null })
  Object.assign(mail, { sent: [], fail: null })
  db = createFakeDb({
    tables: {
      admin_users: [{ id: ADMIN, email: 'admin@chamos.test', nombre: 'Admin', rol: 'admin', activo: true, comercio_id: TENANT, barbero_id: null }, ...structuredClone(admin_users)],
      barberos: structuredClone(barberos),
      horarios_atencion: [],
    },
    onInsert(table, row) {
      const rows = db.tables[table] || []
      if (table === 'barberos') {
        if (rows.some((b) => b.comercio_id === row.comercio_id && b.slug === row.slug)) return unique('23505', 'duplicate key value violates unique constraint "barberos_comercio_id_slug_key"')
        if (row.email && rows.some((b) => b.comercio_id === row.comercio_id && b.email === row.email)) return unique('23505', 'duplicate key value violates unique constraint "barberos_comercio_id_email_key"')
        // AFTER INSERT trigger app_new_barber_hours: 7 schedule rows.
        row.id = randomUUID()
        for (let dia = 0; dia < 7; dia++) db.tables.horarios_atencion.push({ id: randomUUID(), barbero_id: row.id, dia_semana: dia })
      }
      if (table === 'admin_users' && rows.some((a) => a.comercio_id === row.comercio_id && a.email === row.email)) return unique('23505', 'duplicate key value violates unique constraint "admin_users_comercio_id_email_key"')
      return null
    },
    onDelete(table, matched) {
      // horarios_atencion references barberos ON DELETE CASCADE.
      if (table === 'barberos') {
        const ids = matched.map((b) => b.id)
        db.tables.horarios_atencion = db.tables.horarios_atencion.filter((h) => !ids.includes(h.barbero_id))
      }
      return null
    },
    ...options,
  })
  return db
}

async function call(route, body, { method = 'POST' } = {}) {
  const handler = require(`../src/pages/api/barberos/${route}.ts`).default
  const res = createResponse()
  await handler({ method, headers: { authorization: 'Bearer valid' }, body }, res)
  return res
}

/** Captures console.error calls made while `fn` runs. */
async function capturingErrors(fn) {
  const saved = console.error
  const logged = []
  console.error = (...args) => logged.push(args)
  try { return { result: await fn(), logged } } finally { console.error = saved }
}

const barbero = (overrides = {}) => ({ id: randomUUID(), nombre: 'Ana', apellido: 'Pérez', email: 'ana@chamos.test', slug: 'ana-perez', activo: true, comercio_id: TENANT, ...overrides })
const nuevo = { nombre: 'Ana', apellido: 'Pérez', email: '  Ana.Perez@Example.COM ', slug: 'ana-perez', porcentaje_comision: 50, activo: true }
const inserts = (table) => db.calls.inserts.filter((i) => i.table === table).map((i) => i.row)

// --- Real helpers in src/lib/insforge-admin.ts ------------------------------

async function withRawSql(rows, fn) {
  const saved = global.fetch
  const sent = []
  global.fetch = async (url, options) => {
    sent.push({ url: String(url), body: JSON.parse(options.body), authorization: options.headers.Authorization })
    return new Response(JSON.stringify({ rows, rowCount: rows.length }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try { return { result: await fn(), sent } } finally { global.fetch = saved }
}

test('adminGetUserByEmail looks the auth user up by its stored email', async () => {
  const user = { id: randomUUID(), email: 'ana@chamos.test', is_project_admin: false }
  const { result, sent } = await withRawSql([user], () => realAdmin.adminGetUserByEmail('ana@chamos.test'))
  assert.deepEqual(result, { data: { user }, error: null })
  assert.equal(sent.length, 1)
  assert.match(sent[0].body.query, /FROM auth\.users WHERE email = \$1/)
  assert.deepEqual(sent[0].body.params, ['ana@chamos.test'])
})

test('adminSetUserPassword stores a bcrypt hash and never touches a project admin', async () => {
  const id = randomUUID()
  const { result, sent } = await withRawSql([{ id }], () => realAdmin.adminSetUserPassword(id, 'Chamosabc!1234'))
  assert.deepEqual(result, { updated: true, error: null })
  const { query, params } = sent[0].body
  assert.match(query, /UPDATE auth\.users SET password = \$2/)
  assert.match(query, /NOT COALESCE\(is_project_admin, false\)/)
  assert.doesNotMatch(query, /admin_users/)
  assert.equal(params[0], id)
  assert.notEqual(params[1], 'Chamosabc!1234')
  assert.ok(bcrypt.compareSync('Chamosabc!1234', params[1]), 'the stored value is a bcrypt hash of the password')
})

test('adminSetUserPassword with onlyUnlinked refuses users that have a staff row', async () => {
  const id = randomUUID()
  const { result, sent } = await withRawSql([], () => realAdmin.adminSetUserPassword(id, 'Chamosabc!1234', { onlyUnlinked: true }))
  assert.deepEqual(result, { updated: false, error: null })
  assert.match(sent[0].body.query, /NOT EXISTS \(SELECT 1 FROM public\.admin_users a WHERE a\.id = \$1\)/)
})

// --- T2 / S1: crear-con-cuenta ---------------------------------------------

test('creating a barber with an account stores lowercased emails and returns the credentials once', async () => {
  setup()
  const res = await call('crear-con-cuenta', { barberoData: nuevo, crearCuenta: true })
  assert.equal(res.statusCode, 200)
  const [row] = inserts('barberos')
  assert.equal(row.email, 'ana.perez@example.com')
  assert.equal(row.comercio_id, TENANT)
  assert.equal(auth.created.length, 1)
  assert.equal(auth.created[0].email, 'ana.perez@example.com')
  const [cuenta] = inserts('admin_users')
  assert.deepEqual(cuenta, { id: auth.created[0].id, email: 'ana.perez@example.com', nombre: 'Ana Pérez', rol: 'barbero', barbero_id: row.id, comercio_id: TENANT, activo: true })
  assert.equal(res.body.success, true)
  assert.equal(res.body.cuenta_creada, true)
  assert.equal(res.body.email, 'ana.perez@example.com')
  assert.equal(res.body.barbero.id, row.id)
  assert.equal(res.body.password, auth.created[0].password)
  assert.match(res.body.password, /^Chamos[a-z0-9]{8}![0-9]{4}$/)
  assert.equal(res.getHeader('cache-control'), 'no-store')
})

test('a repeated name gets the next free slug instead of failing', async () => {
  setup({ barberos: [barbero({ email: 'otra@chamos.test' }), barbero({ email: 'tercera@chamos.test', slug: 'ana-perez-2' })] })
  const res = await call('crear-con-cuenta', { barberoData: nuevo, crearCuenta: true })
  assert.equal(res.statusCode, 200)
  assert.equal(inserts('barberos')[0].slug, 'ana-perez-3')
  assert.equal(res.body.barbero.slug, 'ana-perez-3')
  assert.equal(res.body.cuenta_creada, true)
})

test('an email of a deactivated barber gives a 409 that says to reactivate that barber', async () => {
  setup({ barberos: [barbero({ nombre: 'Carolina', apellido: 'Rojas', email: 'ana.perez@example.com', slug: 'carolina-rojas', activo: false })] })
  const res = await call('crear-con-cuenta', { barberoData: nuevo, crearCuenta: true })
  assert.equal(res.statusCode, 409)
  assert.match(res.body.error, /Carolina Rojas/)
  assert.match(res.body.error, /desactivado/)
  assert.match(res.body.error, /Reactívalo/)
  assert.equal(res.body.password, undefined)
  assert.deepEqual([db.calls.inserts.length, auth.created.length], [0, 0])
})

test('an email already used by an active barber or by a login account gives a 409', async () => {
  setup({ barberos: [barbero({ email: 'ana.perez@example.com', slug: 'ana' })] })
  let res = await call('crear-con-cuenta', { barberoData: nuevo, crearCuenta: true })
  assert.equal(res.statusCode, 409)
  assert.match(res.body.error, /Ana Pérez/)

  setup({ admin_users: [{ id: randomUUID(), email: 'ana.perez@example.com', nombre: 'Cajera', rol: 'cajero', activo: true, comercio_id: TENANT, barbero_id: null }] })
  res = await call('crear-con-cuenta', { barberoData: nuevo, crearCuenta: true })
  assert.equal(res.statusCode, 409)
  assert.match(res.body.error, /cuenta de acceso/)
  assert.equal(res.body.password, undefined)
  assert.deepEqual([db.calls.inserts.length, auth.created.length, auth.passwords.length], [0, 0, 0])
})

test('an orphan auth user with the same email is adopted with a new password', async () => {
  const orphan = { id: randomUUID(), email: 'ana.perez@example.com', is_project_admin: false }
  setup({ users: [orphan] })
  const res = await call('crear-con-cuenta', { barberoData: nuevo, crearCuenta: true })
  assert.equal(res.statusCode, 200)
  assert.equal(auth.created.length, 0)
  assert.deepEqual(auth.passwords, [{ id: orphan.id, password: res.body.password, onlyUnlinked: true }])
  assert.equal(inserts('admin_users')[0].id, orphan.id)
  assert.equal(res.body.cuenta_creada, true)
})

test('an auth user with a staff row in any shop, or a project admin, is never adopted', async () => {
  for (const [user, rows] of [
    [{ id: randomUUID(), email: 'ana.perez@example.com', is_project_admin: false }, (id) => [{ id, email: 'x@otro.test', nombre: 'X', rol: 'admin', activo: true, comercio_id: OTHER_TENANT, barbero_id: null }]],
    [{ id: randomUUID(), email: 'ana.perez@example.com', is_project_admin: true }, () => []],
  ]) {
    setup({ users: [user], admin_users: rows(user.id) })
    const res = await call('crear-con-cuenta', { barberoData: nuevo, crearCuenta: true })
    assert.equal(res.statusCode, 409)
    assert.match(res.body.error, /otra cuenta/)
    assert.equal(res.body.password, undefined)
    assert.deepEqual([db.calls.inserts.length, auth.created.length, auth.passwords.length], [0, 0, 0])
  }
})

test('if the login row cannot be saved, the barber, its schedules and the new auth user are removed', async () => {
  setup({ fail: { 'admin_users.insert': { code: 'XX000', message: 'insert failed' } } })
  const { result: res, logged } = await capturingErrors(() => call('crear-con-cuenta', { barberoData: nuevo, crearCuenta: true }))
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.password, undefined)
  assert.equal(res.body.cuenta_creada, undefined)
  assert.match(res.body.error, /No se pudo crear la cuenta de acceso/)
  assert.deepEqual(db.tables.barberos, [])
  assert.deepEqual(db.tables.horarios_atencion, [])
  assert.deepEqual(auth.deleted, [auth.created[0].id])
  assert.deepEqual(auth.users, [])
  assert.ok(logged.length > 0, 'the failure is logged')
  assert.ok(!JSON.stringify(logged).includes(auth.created[0].password), 'the password is never logged')
})

test('if the auth user cannot be created, the barber is removed and no password is returned', async () => {
  setup()
  auth.failCreate = new Error('signUp unavailable')
  const { result: res } = await capturingErrors(() => call('crear-con-cuenta', { barberoData: nuevo, crearCuenta: true }))
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.password, undefined)
  assert.match(res.body.error, /No se pudo crear la cuenta de acceso/)
  assert.deepEqual(db.tables.barberos, [])
  assert.deepEqual(db.tables.horarios_atencion, [])
  assert.equal(db.calls.deletes.filter((d) => d.table === 'barberos').length, 1)
})

test('a failed rollback is logged and the error says the barber was kept', async () => {
  setup({ fail: { 'admin_users.insert': { code: 'XX000', message: 'insert failed' }, 'barberos.delete': { code: 'XX000', message: 'delete failed' } } })
  const { result: res, logged } = await capturingErrors(() => call('crear-con-cuenta', { barberoData: nuevo, crearCuenta: true }))
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.password, undefined)
  assert.match(res.body.error, /quedó guardado sin acceso/)
  assert.ok(JSON.stringify(logged).includes('rollback'), 'the failed rollback is logged')
})

// --- T2 / S1: create (without an account) -----------------------------------

test('creating a barber without an account normalizes the email and gets a free slug', async () => {
  setup({ barberos: [barbero({ email: 'otra@chamos.test' })] })
  const res = await call('create', nuevo)
  assert.equal(res.statusCode, 201)
  const [row] = inserts('barberos')
  assert.deepEqual([row.email, row.slug, row.comercio_id], ['ana.perez@example.com', 'ana-perez-2', TENANT])
  assert.deepEqual(inserts('admin_users'), [])
  assert.equal(auth.created.length, 0)
})

test('create keeps its response and takes the shop from the session, not the body', async () => {
  setup()
  const res = await call('create', { nombre: 'Luis', apellido: 'Díaz', comercio_id: OTHER_TENANT, rol: 'admin' })
  assert.equal(res.statusCode, 201)
  assert.deepEqual(Object.keys(res.body).sort(), ['barbero', 'message', 'success'])
  assert.equal(res.body.success, true)
  assert.equal(res.body.message, 'Barbero creado exitosamente')
  const [row] = inserts('barberos')
  assert.deepEqual([row.comercio_id, row.rol, row.nombre, row.apellido], [TENANT, undefined, 'Luis', 'Díaz'])
  assert.equal(res.body.barbero.id, row.id)
})

test('create gives a 409 for an email of a deactivated barber', async () => {
  setup({ barberos: [barbero({ nombre: 'Carolina', apellido: 'Rojas', email: 'ana.perez@example.com', slug: 'carolina-rojas', activo: false })] })
  const res = await call('create', nuevo)
  assert.equal(res.statusCode, 409)
  assert.match(res.body.error, /Carolina Rojas.*desactivado/)
  assert.deepEqual(db.calls.inserts, [])
})

// --- T3 / S2: credentials for existing barbers ------------------------------

const cuentaDe = (b, overrides = {}) => ({ id: randomUUID(), email: b.email, nombre: `${b.nombre} ${b.apellido}`, rol: 'barbero', activo: true, comercio_id: TENANT, barbero_id: b.id, ...overrides })
const usuarioDe = (cuenta, overrides = {}) => ({ id: cuenta.id, email: cuenta.email, is_project_admin: false, ...overrides })

test('a barber without an account gets one, and its password is returned once', async () => {
  const b = barbero({ email: 'Luis@Chamos.test' })
  setup({ barberos: [b] })
  const res = await call('credenciales', { barberoId: b.id, accion: 'crear' })
  assert.equal(res.statusCode, 200)
  assert.equal(res.getHeader('cache-control'), 'no-store')
  assert.equal(auth.created.length, 1)
  assert.equal(auth.created[0].email, 'luis@chamos.test')
  assert.deepEqual(inserts('admin_users'), [{ id: auth.created[0].id, email: 'luis@chamos.test', nombre: 'Ana Pérez', rol: 'barbero', barbero_id: b.id, comercio_id: TENANT, activo: true }])
  assert.deepEqual(res.body, { success: true, accion: 'crear', cuenta_creada: true, email: 'luis@chamos.test', password: auth.created[0].password, email_enviado: true })
  assert.match(res.body.password, /^Chamos[a-z0-9]{8}![0-9]{4}$/)
})

test('creating access adopts an orphan auth user, and refuses one that is in use', async () => {
  const b = barbero()
  const orphan = { id: randomUUID(), email: b.email, is_project_admin: false }
  setup({ barberos: [b], users: [orphan] })
  let res = await call('credenciales', { barberoId: b.id, accion: 'crear' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(auth.passwords, [{ id: orphan.id, password: res.body.password, onlyUnlinked: true }])
  assert.equal(inserts('admin_users')[0].id, orphan.id)
  assert.equal(auth.created.length, 0)

  setup({ barberos: [b], users: [orphan], admin_users: [{ id: orphan.id, email: 'otro@otro.test', nombre: 'X', rol: 'admin', activo: true, comercio_id: OTHER_TENANT, barbero_id: null }] })
  res = await call('credenciales', { barberoId: b.id, accion: 'crear' })
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.password, undefined)
  assert.deepEqual([db.calls.inserts.length, auth.created.length, auth.passwords.length], [0, 0, 0])
})

test('a barber without an email gets a hint to add one first', async () => {
  const b = barbero({ email: null })
  setup({ barberos: [b] })
  const res = await call('credenciales', { barberoId: b.id, accion: 'crear' })
  assert.equal(res.statusCode, 400)
  assert.match(res.body.error, /Agrega un email/)
  assert.deepEqual([db.calls.inserts.length, auth.created.length], [0, 0])
})

test('"Nueva contraseña" sets a new temporary password on the barber account', async () => {
  const b = barbero()
  const cuenta = cuentaDe(b)
  const segunda = cuentaDe(b, { email: 'ana.vieja@chamos.test' })
  setup({ barberos: [b], admin_users: [segunda, cuenta], users: [usuarioDe(segunda), usuarioDe(cuenta)] })
  const res = await call('credenciales', { barberoId: b.id, accion: 'nueva' })
  assert.equal(res.statusCode, 200)
  assert.equal(res.getHeader('cache-control'), 'no-store')
  assert.deepEqual(res.body, { success: true, accion: 'nueva', email: b.email, password: auth.passwords[0]?.password })
  assert.deepEqual(auth.passwords, [{ id: cuenta.id, password: res.body.password, onlyUnlinked: false }], 'the account with the barber email')
  assert.match(res.body.password, /^Chamos[a-z0-9]{8}![0-9]{4}$/)
  assert.deepEqual([db.calls.inserts.length, auth.created.length], [0, 0])
})

test('no password is generated for another role, the admin itself, or another shop', async () => {
  const b = barbero()
  for (const cuenta of [cuentaDe(b, { rol: 'admin' }), cuentaDe(b, { id: ADMIN })]) {
    setup({ barberos: [b], admin_users: cuenta.id === ADMIN ? [] : [cuenta], users: [usuarioDe(cuenta)] })
    if (cuenta.id === ADMIN) Object.assign(db.tables.admin_users[0], { barbero_id: b.id })
    const res = await call('credenciales', { barberoId: b.id, accion: 'nueva' })
    assert.equal(res.statusCode, 409)
    assert.match(res.body.error, /propio perfil/)
    assert.equal(res.body.password, undefined)
    assert.deepEqual(auth.passwords, [])
  }
  const ajeno = barbero({ comercio_id: OTHER_TENANT })
  setup({ barberos: [ajeno], admin_users: [cuentaDe(ajeno, { comercio_id: OTHER_TENANT })] })
  const res = await call('credenciales', { barberoId: ajeno.id, accion: 'nueva' })
  assert.equal(res.statusCode, 404)
  assert.deepEqual([auth.passwords.length, db.calls.inserts.length], [0, 0])
})

test('the requested action must match whether the barber has an account', async () => {
  const b = barbero()
  const cuenta = cuentaDe(b)
  setup({ barberos: [b], admin_users: [cuenta], users: [usuarioDe(cuenta)] })
  let res = await call('credenciales', { barberoId: b.id, accion: 'crear' })
  assert.equal(res.statusCode, 409)
  assert.match(res.body.error, /ya tiene acceso/)
  setup({ barberos: [b] })
  res = await call('credenciales', { barberoId: b.id, accion: 'nueva' })
  assert.equal(res.statusCode, 409)
  assert.match(res.body.error, /aún no tiene acceso/)
  assert.deepEqual([auth.passwords.length, auth.created.length, db.calls.inserts.length], [0, 0, 0])
})

test('only an admin can generate credentials', async () => {
  const b = barbero()
  setup({ barberos: [b] })
  db.tables.admin_users[0].rol = 'cajero'
  const res = await call('credenciales', { barberoId: b.id, accion: 'crear' })
  assert.equal(res.statusCode, 403)
  assert.deepEqual([auth.created.length, db.calls.inserts.length], [0, 0])
})

test('cuentas lists the barber accounts of the shop, without secrets', async () => {
  const b = barbero()
  const cuenta = cuentaDe(b)
  setup({ barberos: [b], admin_users: [cuenta, cuentaDe(barbero(), { comercio_id: OTHER_TENANT })] })
  const res = await call('cuentas', undefined, { method: 'GET' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { cuentas: [{ barbero_id: b.id, email: b.email, activo: true, rol: 'barbero' }] })
})

test('reset-password no longer promises an email that cannot be completed', async () => {
  setup()
  const res = await call('reset-password', { barberoId: randomUUID() })
  assert.equal(res.statusCode, 410)
  assert.match(res.body.error, /Nueva contraseña/)
})

// --- T4 / S3: permanent delete and deactivation -----------------------------

const HISTORY = { code: 'P0001', message: 'El barbero tiene historial. Desactívalo para conservar sus registros' }
/** Stand-in for app_delete_unused_barber: deletes the barber and its staff rows, never auth.users. */
function deleteRpc({ error = null, keep = () => false } = {}) {
  return async (name, args, fake) => {
    if (error) return { data: null, error }
    fake.tables.admin_users = fake.tables.admin_users.filter((a) => keep(a) || !(a.barbero_id === args.p_barber && a.comercio_id === args.p_comercio))
    fake.tables.barberos = fake.tables.barberos.filter((b) => !(b.id === args.p_barber && b.comercio_id === args.p_comercio))
    return { data: null, error: null }
  }
}
const borrar = (barberoId) => call('delete-permanent', { barberoId }, { method: 'DELETE' })

test('permanently deleting a barber without history also deletes its login accounts', async () => {
  const b = barbero()
  const cuenta = cuentaDe(b)
  setup({ barberos: [b], admin_users: [cuenta], users: [usuarioDe(cuenta)], rpc: deleteRpc() })
  const res = await borrar(b.id)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { success: true, message: 'Barbero eliminado', cuentas_eliminadas: 1 })
  assert.deepEqual(db.calls.rpc, [{ name: 'app_delete_unused_barber', args: { p_comercio: TENANT, p_barber: b.id } }])
  assert.deepEqual(auth.deleted, [cuenta.id])
  assert.deepEqual([auth.users, db.tables.barberos], [[], []])
})

test('deleting a barber without an account keeps its previous response', async () => {
  const b = barbero()
  setup({ barberos: [b], rpc: deleteRpc() })
  const res = await borrar(b.id)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.success, true)
  assert.equal(res.body.message, 'Barbero eliminado')
  assert.deepEqual([auth.deleted, db.tables.barberos], [[], []])
})

test('auth users that keep a staff row, or are project admins, are never deleted', async () => {
  const b = barbero()
  const enlazada = cuentaDe(b)
  const proyecto = cuentaDe(b, { email: 'proyecto@chamos.test' })
  setup({ barberos: [b], admin_users: [enlazada, proyecto], users: [usuarioDe(enlazada), usuarioDe(proyecto, { is_project_admin: true })], rpc: deleteRpc({ keep: (a) => a.id === enlazada.id }) })
  const res = await borrar(b.id)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.cuentas_eliminadas, 0)
  assert.deepEqual(auth.deleted, [])
  assert.equal(auth.users.length, 2)
})

test('a barber with history gets the "tiene historial" 409 and nothing is deleted', async () => {
  const b = barbero()
  const cuenta = cuentaDe(b)
  setup({ barberos: [b], admin_users: [cuenta], users: [usuarioDe(cuenta)], rpc: deleteRpc({ error: HISTORY }) })
  const res = await borrar(b.id)
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.error, 'El barbero tiene historial. Desactívalo para conservar sus registros.')
  assert.deepEqual(auth.deleted, [])
  assert.equal(db.tables.barberos.length, 1)
})

test('any other delete failure is logged and reported as a 500, not as history', async () => {
  const b = barbero()
  const cuenta = cuentaDe(b)
  const fk = { code: '23503', message: 'update or delete on table "admin_users" violates foreign key constraint "caja_sesiones_usuario_id_fkey"' }
  setup({ barberos: [b], admin_users: [cuenta], users: [usuarioDe(cuenta)], rpc: deleteRpc({ error: fk }) })
  const { result: res, logged } = await capturingErrors(() => borrar(b.id))
  assert.equal(res.statusCode, 500)
  assert.doesNotMatch(res.body.error, /historial/)
  assert.match(res.body.error, /No se pudo eliminar el barbero/)
  assert.ok(JSON.stringify(logged).includes('23503'), 'the real error is logged')
  assert.deepEqual(auth.deleted, [])
})

test('if the login account cannot be deleted, the result is partial and logged', async () => {
  const b = barbero()
  const cuenta = cuentaDe(b)
  setup({ barberos: [b], admin_users: [cuenta], users: [usuarioDe(cuenta)], rpc: deleteRpc() })
  auth.failDelete = new Error('rawsql unavailable')
  const { result: res, logged } = await capturingErrors(() => borrar(b.id))
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.success, true)
  assert.equal(res.body.partial, true)
  assert.match(res.body.message, /cuenta de acceso/)
  assert.ok(JSON.stringify(logged).includes(cuenta.id), 'the account left behind is logged')
})

test('deactivating a barber also deactivates its login account, only in the shop', async () => {
  const b = barbero()
  const cuenta = cuentaDe(b)
  const ajena = cuentaDe(b, { comercio_id: OTHER_TENANT, email: 'ajena@otro.test' })
  setup({ barberos: [b], admin_users: [cuenta, ajena] })
  const res = await call('toggle-active', { barberoId: b.id, activo: false })
  assert.equal(res.statusCode, 200)
  assert.equal(db.tables.barberos[0].activo, false)
  assert.equal(db.tables.admin_users.find((a) => a.id === cuenta.id).activo, false)
  assert.equal(db.tables.admin_users.find((a) => a.id === ajena.id).activo, true)
})

// --- T5 / S4: edits through the server -------------------------------------

const editar = (barberoId, updates) => call('update', { barberoId, updates }, { method: 'PUT' })

test('an activo change in an edit also updates the login account, only in the shop', async () => {
  const b = barbero()
  const cuenta = cuentaDe(b)
  const ajena = cuentaDe(b, { comercio_id: OTHER_TENANT, email: 'ajena@otro.test' })
  setup({ barberos: [b], admin_users: [cuenta, ajena] })
  const res = await editar(b.id, { nombre: 'Ana María', activo: false })
  assert.equal(res.statusCode, 200)
  assert.deepEqual([db.tables.barberos[0].nombre, db.tables.barberos[0].activo], ['Ana María', false])
  assert.equal(db.tables.admin_users.find((a) => a.id === cuenta.id).activo, false)
  assert.equal(db.tables.admin_users.find((a) => a.id === ajena.id).activo, true)
})

test('an email change of a barber with an account moves the three emails in one statement', async () => {
  const b = barbero()
  const cuenta = cuentaDe(b)
  setup({ barberos: [b], admin_users: [cuenta], users: [usuarioDe(cuenta)] })
  const res = await editar(b.id, { nombre: 'Ana', email: '  Ana.Nueva@Chamos.TEST ' })
  assert.equal(res.statusCode, 200)
  assert.equal(auth.sql.length, 1)
  assert.deepEqual(auth.sql[0].params, [b.id, TENANT, 'ana.nueva@chamos.test', cuenta.id])
  assert.match(auth.sql[0].query, /UPDATE public\.barberos SET email = \$3/)
  assert.match(auth.sql[0].query, /UPDATE public\.admin_users SET email = \$3/)
  assert.match(auth.sql[0].query, /UPDATE auth\.users SET email = \$3/)
  assert.deepEqual([db.tables.barberos[0].email, db.tables.admin_users.find((a) => a.id === cuenta.id).email, auth.users[0].email], ['ana.nueva@chamos.test', 'ana.nueva@chamos.test', 'ana.nueva@chamos.test'])
  assert.equal(res.body.barbero.email, 'ana.nueva@chamos.test')
})

test('an email used by another barber or account gives a 409 and changes nothing', async () => {
  const b = barbero()
  const cuenta = cuentaDe(b)
  for (const otros of [
    { barberos: [barbero({ nombre: 'Franco', apellido: 'Soto', email: 'franco@chamos.test', slug: 'franco-soto' })], admin_users: [] },
    { barberos: [], admin_users: [{ id: randomUUID(), email: 'franco@chamos.test', nombre: 'Caja', rol: 'cajero', activo: true, comercio_id: TENANT, barbero_id: null }] },
  ]) {
    setup({ barberos: [b, ...otros.barberos], admin_users: [cuenta, ...otros.admin_users], users: [usuarioDe(cuenta)] })
    const res = await editar(b.id, { email: 'Franco@Chamos.test', nombre: 'Otra' })
    assert.equal(res.statusCode, 409)
    assert.match(res.body.error, /Franco Soto|otra cuenta de acceso/)
    assert.deepEqual([auth.sql.length, db.calls.updates.length], [0, 0])
    assert.deepEqual([db.tables.barberos[0].email, db.tables.barberos[0].nombre], [b.email, b.nombre])
  }
})

test('a unique violation inside the email statement gives a 409 and changes nothing', async () => {
  const b = barbero()
  const cuenta = cuentaDe(b)
  setup({ barberos: [b], admin_users: [cuenta], users: [usuarioDe(cuenta), { id: randomUUID(), email: 'huerfano@chamos.test', is_project_admin: false }] })
  const { result: res } = await capturingErrors(() => editar(b.id, { email: 'huerfano@chamos.test', nombre: 'Otra' }))
  assert.equal(res.statusCode, 409)
  assert.match(res.body.error, /otra cuenta de acceso/)
  assert.deepEqual(db.calls.updates, [])
  assert.deepEqual([db.tables.barberos[0].email, db.tables.barberos[0].nombre, auth.users[0].email], [b.email, b.nombre, b.email])
})

test('an email change of a barber without an account only updates the barber, normalized', async () => {
  const b = barbero()
  setup({ barberos: [b] })
  const res = await editar(b.id, { email: ' Nueva@Chamos.TEST ' })
  assert.equal(res.statusCode, 200)
  assert.equal(auth.sql.length, 0)
  assert.equal(db.tables.barberos[0].email, 'nueva@chamos.test')
})

test('an edit to a taken name gets a free slug', async () => {
  const b = barbero({ slug: 'ana-perez' })
  setup({ barberos: [b, barbero({ nombre: 'Luis', apellido: 'Díaz', email: 'luis@chamos.test', slug: 'luis-diaz' })] })
  const res = await editar(b.id, { nombre: 'Luis', apellido: 'Díaz', slug: 'luis-diaz' })
  assert.equal(res.statusCode, 200)
  assert.equal(db.tables.barberos[0].slug, 'luis-diaz-2')
  setup({ barberos: [b] })
  await editar(b.id, { nombre: 'Ana', slug: 'ana-perez' })
  assert.equal(db.tables.barberos[0].slug, 'ana-perez', 'its own slug is not taken')
})

test('an admin edit keeps its response and stays within the shop', async () => {
  const b = barbero()
  const ajeno = barbero({ comercio_id: OTHER_TENANT, slug: 'ajeno' })
  setup({ barberos: [b, ajeno] })
  const res = await editar(b.id, { telefono: '+56911112222', porcentaje_comision: 60, comercio_id: OTHER_TENANT })
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.success, true)
  assert.equal(res.body.message, 'Barbero actualizado exitosamente')
  assert.deepEqual([res.body.barbero.telefono, res.body.barbero.porcentaje_comision, res.body.barbero.comercio_id], ['+56911112222', 60, TENANT])
  assert.ok(res.body.barbero.updated_at)

  const other = await editar(ajeno.id, { telefono: '+56900000000' })
  assert.notEqual(other.statusCode, 200)
  assert.equal(db.tables.barberos.find((x) => x.id === ajeno.id).telefono, undefined)
})

// --- T7: the credentials email, best-effort ---------------------------------

test('a created account emails its credentials once, from both create routes', async () => {
  setup()
  let res = await call('crear-con-cuenta', { barberoData: nuevo, crearCuenta: true })
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.email_enviado, true)
  assert.deepEqual(mail.sent, [{ email: 'ana.perez@example.com', password: res.body.password, nombre: 'Ana', apellido: 'Pérez' }])

  const b = barbero({ nombre: 'Luis', apellido: 'Díaz', email: 'luis@chamos.test' })
  setup({ barberos: [b] })
  res = await call('credenciales', { barberoId: b.id, accion: 'crear' })
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.email_enviado, true)
  assert.deepEqual(mail.sent, [{ email: 'luis@chamos.test', password: res.body.password, nombre: 'Luis', apellido: 'Díaz' }])
})

test('"Nueva contraseña" never emails the password', async () => {
  const b = barbero()
  const cuenta = cuentaDe(b)
  setup({ barberos: [b], admin_users: [cuenta], users: [usuarioDe(cuenta)] })
  const res = await call('credenciales', { barberoId: b.id, accion: 'nueva' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(mail.sent, [])
  assert.equal(res.body.email_enviado, undefined)
})

test('a failed email keeps the account and still returns the password', async () => {
  for (const fail of ['throw', 'false']) {
    setup()
    mail.fail = fail
    const { result: res } = await capturingErrors(() => call('crear-con-cuenta', { barberoData: nuevo, crearCuenta: true }))
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.cuenta_creada, true)
    assert.equal(res.body.email_enviado, false)
    assert.equal(res.body.password, auth.created[0].password)
    assert.deepEqual([db.tables.barberos.length, inserts('admin_users').length, db.calls.deletes.length, auth.deleted.length], [1, 1, 0, 0])

    const b = barbero({ email: 'luis@chamos.test' })
    setup({ barberos: [b] })
    mail.fail = fail
    const { result: other } = await capturingErrors(() => call('credenciales', { barberoId: b.id, accion: 'crear' }))
    assert.equal(other.statusCode, 200)
    assert.equal(other.body.email_enviado, false)
    assert.equal(other.body.password, auth.created[0].password)
    assert.equal(inserts('admin_users').length, 1)
  }
})

test('no email is sent when the account is not created', async () => {
  setup({ fail: { 'admin_users.insert': { code: 'XX000', message: 'insert failed' } } })
  const { result: res } = await capturingErrors(() => call('crear-con-cuenta', { barberoData: nuevo, crearCuenta: true }))
  assert.equal(res.statusCode, 500)
  assert.deepEqual(mail.sent, [])
})

test('without RESEND_API_KEY the email service never prints passwords', async () => {
  const saved = process.env.RESEND_API_KEY
  delete process.env.RESEND_API_KEY
  const output = []
  const originals = { log: console.log, warn: console.warn, error: console.error, info: console.info }
  for (const level of Object.keys(originals)) console[level] = (...args) => output.push(args.map(String).join(' '))
  try {
    const service = new EmailService()
    const credentials = { email: 'ana@chamos.test', password: 'Chamossecreto!1234', nombre: 'Ana', apellido: 'Pérez' }
    assert.equal(await service.sendCredentials(credentials), true)
    assert.equal(await service.sendPasswordReset(credentials), true)
  } finally {
    Object.assign(console, originals)
    if (saved !== undefined) process.env.RESEND_API_KEY = saved
  }
  assert.ok(output.length > 0, 'dev mode still says an email would have been sent')
  assert.ok(output.some((line) => line.includes('ana@chamos.test')))
  assert.ok(!output.some((line) => line.includes('Chamossecreto!1234')), 'no password in the console')
})
