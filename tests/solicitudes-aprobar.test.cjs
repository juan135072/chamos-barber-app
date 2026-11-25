// Approving a barber application: POST /api/solicitudes/aprobar (admin only).
// The route claims the application while it is pending, creates the barber
// and its login with the staff-accounts helpers, and undoes what it created
// when a step fails. It runs against the fake DB and an in-memory stand-in for
// the auth helpers in src/lib/insforge-admin.ts.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { createFakeDb, createResponse, stubModule } = require('./fake-db.cjs')

process.env.NEXT_PUBLIC_INSFORGE_BASE_URL = 'https://insforge.invalid'
process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = 'public-anon'
process.env.INSFORGE_API_KEY = 'ik_test_nonsecret'

const TENANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OTHER_TENANT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ADMIN = '00000000-0000-4000-8000-000000000001'
const SOLICITUD = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const ADMIN_ROW = { id: ADMIN, email: 'admin@chamos.test', nombre: 'Admin', rol: 'admin', activo: true, comercio_id: TENANT, barbero_id: null }
const TAKEN = 'Ese correo ya tiene una cuenta de acceso creada antes. Pide al administrador del sistema que la libere o usa otro correo.'
const REVIEWED = 'Esta solicitud ya fue revisada. Recarga la lista.'
const FAILED = 'No se pudo aprobar la solicitud. Intenta de nuevo.'

let db
const auth = { users: [], created: [], deleted: [], failCreate: null }
const mail = { sent: [], fail: null }

stubModule('@insforge/sdk', { createClient() { throw new Error('SDK client not used in these tests') } })
stubModule('../src/lib/supabase-server.ts', {
  createPagesAdminClient: () => db,
  async getUserFromBearer() { return { data: { user: { id: ADMIN } }, error: null } },
  createPagesServerClient: () => ({ auth: { async getSession() { return { data: { session: null } } } } }),
})
stubModule('../lib/email-service.ts', {
  emailService: {
    async sendCredentials(credentials) {
      mail.sent.push(credentials)
      if (mail.fail === 'throw') throw new Error('Resend unavailable')
      return mail.fail !== 'false'
    },
  },
})
// In-memory auth.users. Like InsForge, signUp refuses an email that exists,
// and the lookup by email ignores case.
stubModule('../src/lib/insforge-admin.ts', {
  async adminCreateUser({ email, password }) {
    if (auth.failCreate) return { data: { user: null }, error: auth.failCreate }
    if (auth.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return { data: { user: null }, error: Object.assign(new Error('User already exists'), { statusCode: 409 }) }
    const user = { id: randomUUID(), email, is_project_admin: false }
    auth.users.push(user)
    auth.created.push({ id: user.id, email, password })
    return { data: { user }, error: null }
  },
  async adminDeleteUser(id) {
    auth.users = auth.users.filter((u) => u.id !== id)
    auth.deleted.push(id)
    return { data: { user: null }, error: null }
  },
  async adminGetUserById(id) { return { data: { user: auth.users.find((u) => u.id === id) ?? null }, error: null } },
  async adminGetUserByEmail(email) { return { data: { user: auth.users.find((u) => u.email.toLowerCase() === email) ?? null }, error: null } },
  async adminRawSql(query) { throw new Error(`unexpected SQL in test: ${query}`) },
})

const handler = require('../src/pages/api/solicitudes/aprobar.ts').default

const solicitud = (overrides = {}) => ({
  id: SOLICITUD, nombre: 'Luis', apellido: 'Díaz', email: '  Luis.Diaz@Example.COM ', telefono: '+56911112222',
  especialidad: 'Fade', descripcion: 'Diez años de oficio', imagen_url: 'https://cdn.test/luis.jpg', experiencia_anos: 10,
  estado: 'pendiente', comercio_id: TENANT, barbero_id: null, revisada_por: null, fecha_revision: null, notas_revision: null,
  ...overrides,
})

/** Fake DB with the shop admin, the barber constraints and trigger, and the application's foreign key. */
function setup({ solicitudes = [solicitud()], barberos = [], admin_users = [], users = [], ...options } = {}) {
  Object.assign(auth, { users: structuredClone(users), created: [], deleted: [], failCreate: null })
  Object.assign(mail, { sent: [], fail: null })
  db = createFakeDb({
    tables: {
      admin_users: [structuredClone(ADMIN_ROW), ...structuredClone(admin_users)],
      barberos: structuredClone(barberos),
      horarios_atencion: [],
      solicitudes_barberos: structuredClone(solicitudes),
    },
    onInsert(table, row) {
      const rows = db.tables[table] || []
      const unique = (name) => ({ code: '23505', message: `duplicate key value violates unique constraint "${name}"` })
      if (table === 'barberos') {
        if (rows.some((b) => b.comercio_id === row.comercio_id && b.slug === row.slug)) return unique('barberos_comercio_id_slug_key')
        if (row.email && rows.some((b) => b.comercio_id === row.comercio_id && b.email === row.email)) return unique('barberos_comercio_id_email_key')
        // AFTER INSERT trigger: 7 schedule rows.
        row.id = randomUUID()
        for (let dia = 0; dia < 7; dia++) db.tables.horarios_atencion.push({ id: randomUUID(), barbero_id: row.id, dia_semana: dia })
      }
      if (table === 'admin_users' && rows.some((a) => a.comercio_id === row.comercio_id && a.email === row.email)) return unique('admin_users_comercio_id_email_key')
      return null
    },
    onDelete(table, matched) {
      if (table !== 'barberos') return null
      const ids = matched.map((b) => b.id)
      // solicitudes_barberos.barbero_id references the barber: it cannot go first.
      if (db.tables.solicitudes_barberos.some((s) => ids.includes(s.barbero_id))) return { code: '23503', message: 'violates foreign key constraint "solicitudes_barberos_barbero_id_fkey"' }
      db.tables.horarios_atencion = db.tables.horarios_atencion.filter((h) => !ids.includes(h.barbero_id))
      return null
    },
    ...options,
  })
}

/** Runs the route and captures everything it logs. */
async function call(body = { solicitudId: SOLICITUD }, { method = 'POST', headers = { authorization: 'Bearer valid' } } = {}) {
  const res = createResponse()
  const logged = []
  const originals = { log: console.log, info: console.info, warn: console.warn, error: console.error }
  for (const level of Object.keys(originals)) console[level] = (...args) => logged.push(args)
  try { await handler({ method, headers, body }, res) } finally { Object.assign(console, originals) }
  res.logged = JSON.stringify(logged)
  return res
}

const application = () => db.tables.solicitudes_barberos.find((s) => s.id === SOLICITUD)
const logins = () => db.tables.admin_users.filter((a) => a.id !== ADMIN)

/** The request was refused: no password, and nothing was written, created, deleted or sent. */
function assertNothingChanged(res, original = solicitud()) {
  assert.equal(res.body.password, undefined)
  assert.equal(res.body.success, undefined)
  assert.deepEqual([db.calls.inserts.length, db.calls.updates.length, db.calls.deletes.length, db.calls.rpc.length], [0, 0, 0, 0])
  assert.deepEqual([auth.created.length, auth.deleted.length, mail.sent.length], [0, 0, 0])
  assert.deepEqual(application(), original)
}

/** A step failed after the claim: the application is pending again and nothing this request made is left. */
function assertUndone(res) {
  assert.equal(res.body.password, undefined)
  assert.equal(res.body.success, undefined)
  assert.deepEqual(application(), solicitud(), 'the application is exactly as it was')
  assert.deepEqual([db.tables.barberos, db.tables.horarios_atencion, logins(), auth.users], [[], [], [], []])
  assert.deepEqual([mail.sent.length, db.calls.rpc.length], [0, 0])
}

test('approving a pending application creates the barber and its login, and returns the password once', async () => {
  setup()
  const realRandom = Math.random
  Math.random = () => { throw new Error('Math.random must not generate a password') }
  let res
  try { res = await call() } finally { Math.random = realRandom }

  assert.equal(res.statusCode, 200)
  assert.equal(res.getHeader('cache-control'), 'no-store')
  const [barbero] = db.tables.barberos
  assert.deepEqual(res.body, {
    success: true,
    barbero_id: barbero.id,
    email: 'luis.diaz@example.com',
    password: auth.created[0].password,
    email_enviado: true,
    message: 'Barbero aprobado exitosamente',
  })
  assert.match(res.body.password, /^Chamos[a-z0-9]{8}![0-9]{4}$/)

  assert.deepEqual(barbero, {
    id: barbero.id, nombre: 'Luis', apellido: 'Díaz', email: 'luis.diaz@example.com', telefono: '+56911112222',
    especialidades: ['Fade'], descripcion: 'Diez años de oficio', imagen_url: 'https://cdn.test/luis.jpg', activo: true,
    slug: 'luis-diaz', comercio_id: TENANT,
  })
  assert.equal(db.tables.barberos.length, 1)
  assert.equal(db.tables.horarios_atencion.filter((h) => h.barbero_id === barbero.id).length, 7)
  assert.deepEqual(auth.created.map(({ email }) => email), ['luis.diaz@example.com'])
  assert.notEqual(barbero.id, auth.created[0].id, 'the barber gets its own id, not the auth user id')
  assert.deepEqual(logins(), [{ id: auth.created[0].id, email: 'luis.diaz@example.com', nombre: 'Luis Díaz', rol: 'barbero', barbero_id: barbero.id, comercio_id: TENANT, activo: true }])

  const approved = application()
  assert.deepEqual({ ...approved, fecha_revision: null }, solicitud({ estado: 'aprobada', barbero_id: barbero.id, revisada_por: ADMIN }))
  assert.equal(new Date(approved.fecha_revision).toISOString(), approved.fecha_revision)

  assert.deepEqual(mail.sent, [{ email: 'luis.diaz@example.com', password: res.body.password, nombre: 'Luis', apellido: 'Díaz' }])
  assert.deepEqual(db.calls.rpc, [], 'the SQL function aprobar_solicitud_barbero is not called')
  assert.deepEqual([db.calls.deletes.length, auth.deleted.length], [0, 0])
  assert.ok(!res.logged.includes(res.body.password), 'the password is never logged')
})

test('an email that already has an auth user is refused, whoever owns it and in any case, and nothing changes', async () => {
  for (const [email, extra] of [
    ['luis.diaz@example.com', {}],
    ['LUIS.DIAZ@EXAMPLE.COM', {}],
    ['luis.diaz@example.com', { otherShop: true }],
    ['Luis.Diaz@example.com', { is_project_admin: true }],
  ]) {
    const user = { id: randomUUID(), email, is_project_admin: extra.is_project_admin === true }
    const staff = extra.otherShop ? [{ id: user.id, email: 'x@otro.test', nombre: 'X', rol: 'admin', activo: true, comercio_id: OTHER_TENANT, barbero_id: null }] : []
    setup({ users: [user], admin_users: staff })
    const res = await call()
    assert.equal(res.statusCode, 409)
    assert.deepEqual(res.body, { error: TAKEN })
    assert.equal(res.getHeader('cache-control'), 'no-store')
    assertNothingChanged(res)
    assert.deepEqual(auth.users, [user], 'the existing user is neither adopted nor deleted')
  }
})

test('an email used by a barber or a login of the shop is refused before anything is written', async () => {
  const barbero = (overrides) => ({ id: randomUUID(), nombre: 'Carolina', apellido: 'Rojas', email: 'luis.diaz@example.com', slug: 'carolina-rojas', activo: true, comercio_id: TENANT, ...overrides })
  for (const [extra, message] of [
    [{ barberos: [barbero()] }, /^Ese email ya lo usa el barbero Carolina Rojas\.$/],
    [{ barberos: [barbero({ activo: false })] }, /Carolina Rojas, un barbero desactivado/],
    [{ admin_users: [{ id: randomUUID(), email: 'luis.diaz@example.com', nombre: 'Caja', rol: 'cajero', activo: true, comercio_id: TENANT, barbero_id: null }] }, /otra cuenta de acceso/],
  ]) {
    setup(extra)
    const res = await call()
    assert.equal(res.statusCode, 409)
    assert.match(res.body.error, message)
    assertNothingChanged(res)
  }
})

test('an application of another shop, or one that does not exist, gets a 404 and nothing changes', async () => {
  const ajena = solicitud({ comercio_id: OTHER_TENANT })
  setup({ solicitudes: [ajena] })
  let res = await call()
  assert.equal(res.statusCode, 404)
  assert.deepEqual(res.body, { error: 'Solicitud no encontrada' })
  assertNothingChanged(res, ajena)

  setup()
  res = await call({ solicitudId: randomUUID() })
  assert.equal(res.statusCode, 404)
  assertNothingChanged(res)
})

test('only a signed-in admin of the shop can approve', async () => {
  setup()
  db.tables.admin_users[0].rol = 'cajero'
  let res = await call()
  assert.equal(res.statusCode, 403)
  assertNothingChanged(res)

  setup()
  res = await call({ solicitudId: SOLICITUD }, { headers: {} })
  assert.equal(res.statusCode, 401)
  assertNothingChanged(res)
})

test('invalid requests are refused: wrong method, missing or malformed id, application without an email', async () => {
  setup()
  let res = await call({ solicitudId: SOLICITUD }, { method: 'GET' })
  assert.equal(res.statusCode, 405)
  assert.equal(res.getHeader('cache-control'), 'no-store')
  res = await call({})
  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, { error: 'Faltan datos: solicitudId' })
  for (const solicitudId of ['no-es-un-uuid', { $ne: null }, 42]) {
    res = await call({ solicitudId })
    assert.equal(res.statusCode, 400)
    assert.deepEqual(res.body, { error: 'Solicitud inválida' })
  }
  assertNothingChanged(res)

  const sinEmail = solicitud({ email: '   ' })
  setup({ solicitudes: [sinEmail] })
  res = await call()
  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, { error: 'La solicitud no tiene un email válido.' })
  assertNothingChanged(res, sinEmail)
})

test('an application that was already reviewed is refused and stays as it is', async () => {
  for (const estado of ['aprobada', 'rechazada']) {
    const revisada = solicitud({ estado, fecha_revision: '2026-11-20T15:00:00.000Z' })
    setup({ solicitudes: [revisada] })
    const res = await call()
    assert.equal(res.statusCode, 409)
    assert.deepEqual(res.body, { error: REVIEWED })
    assertNothingChanged(res, revisada)
  }
})

test('two approvals at the same time create one barber and one login', async () => {
  setup()
  const results = await Promise.all([call(), call()])
  assert.deepEqual(results.map((res) => res.statusCode).sort(), [200, 409])
  const loser = results.find((res) => res.statusCode === 409)
  assert.deepEqual(loser.body, { error: REVIEWED })
  const winner = results.find((res) => res.statusCode === 200)
  assert.deepEqual([db.tables.barberos.length, logins().length, auth.users.length, mail.sent.length], [1, 1, 1, 1])
  assert.equal(winner.body.barbero_id, db.tables.barberos[0].id)
  assert.deepEqual([application().estado, application().barbero_id], ['aprobada', db.tables.barberos[0].id])
  assert.deepEqual([db.calls.deletes.length, auth.deleted.length], [0, 0], 'the losing request had nothing to undo')
})

test('if the login cannot be created, the barber is removed and the application is pending again', async () => {
  setup()
  auth.failCreate = new Error('signUp unavailable')
  const res = await call()
  assert.equal(res.statusCode, 500)
  assert.deepEqual(res.body, { error: 'No se pudo crear la cuenta de acceso. Intenta de nuevo.' })
  assertUndone(res)
  assert.ok(res.logged.includes('rollback'), 'the undo is logged')
})

test('if the login row cannot be saved, the auth user this request created is deleted too', async () => {
  setup({ fail: { 'admin_users.insert': { code: 'XX000', message: 'insert failed' } } })
  const res = await call()
  assert.equal(res.statusCode, 500)
  assert.deepEqual(res.body, { error: 'No se pudo crear la cuenta de acceso. Intenta de nuevo.' })
  assert.deepEqual(auth.deleted, [auth.created[0].id], 'only the user created by this request')
  assertUndone(res)
  assert.ok(!res.logged.includes(auth.created[0].password), 'the password is never logged')
})

test('if the barber cannot be created, the application is pending again and no login is created', async () => {
  setup({ fail: { 'barberos.insert': { code: 'XX000', message: 'insert failed' } } })
  const res = await call()
  assert.equal(res.statusCode, 500)
  assert.deepEqual(res.body, { error: 'No se pudo crear el barbero. Intenta de nuevo.' })
  assertUndone(res)
  assert.equal(auth.created.length, 0)
})

test('if the application cannot be linked to its barber, the barber is removed before any login exists', async () => {
  setup({ onUpdate: (table, patch) => (table === 'solicitudes_barberos' && patch.barbero_id ? { code: 'XX000', message: 'update failed' } : null) })
  const res = await call()
  assert.equal(res.statusCode, 500)
  assert.deepEqual(res.body, { error: FAILED })
  assertUndone(res)
  assert.equal(auth.created.length, 0)
})

test('an unexpected failure after the claim is undone too, and its message is not echoed', async () => {
  // The slug lookup inside insertBarber throws: the request already holds the claim.
  let barberReads = 0
  setup()
  const from = db.from
  db.from = (table) => {
    if (table === 'barberos' && ++barberReads === 2) throw new Error('connection reset by peer')
    return from(table)
  }
  const res = await call()
  assert.equal(res.statusCode, 500)
  assert.deepEqual(res.body, { error: FAILED })
  assertUndone(res)
})

test('an undo that fails is logged, and the answer says what to review', async () => {
  // The login fails and the application cannot go back to pending: the barber stays.
  setup({ onUpdate: (table, patch) => (table === 'solicitudes_barberos' && patch.estado === 'pendiente' ? { code: 'XX000', message: 'update failed' } : null) })
  auth.failCreate = new Error('signUp unavailable')
  const res = await call()
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.error, 'No se pudo crear la cuenta de acceso. Intenta de nuevo. Revisa la solicitud y la lista de barberos: pudo quedar un barbero guardado sin acceso.')
  assert.equal(res.body.password, undefined)
  assert.equal(db.tables.barberos.length, 1, 'a barber the application still points to is not deleted')
  assert.equal(application().barbero_id, db.tables.barberos[0].id)
  assert.ok(res.logged.includes('rollback') && res.logged.includes(SOLICITUD), 'the failed undo is logged with the application id')
})

test('a credentials email that fails keeps the approval and still returns the password', async () => {
  for (const fail of ['throw', 'false']) {
    setup()
    mail.fail = fail
    const res = await call()
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.email_enviado, false)
    assert.equal(res.body.password, auth.created[0].password)
    assert.deepEqual([db.tables.barberos.length, logins().length, application().estado, db.calls.deletes.length, auth.deleted.length], [1, 1, 'aprobada', 0, 0])
    assert.ok(!res.logged.includes(res.body.password), 'the password is never logged')
  }
})
