// Verifier probes for POST /api/solicitudes/aprobar (T5). Same harness as
// tests/solicitudes-aprobar.test.cjs: the real route and the real
// staff-accounts helpers over the fake DB and an in-memory auth.users.
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
const SEGUNDA = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const ADMIN_ROW = { id: ADMIN, email: 'admin@chamos.test', nombre: 'Admin', rol: 'admin', activo: true, comercio_id: TENANT, barbero_id: null }
const TAKEN = 'Ese correo ya tiene una cuenta de acceso creada antes. Pide al administrador del sistema que la libere o usa otro correo.'

let db
const auth = { users: [], created: [], deleted: [], failCreate: null, staleLookup: false }
const mail = { sent: [], fail: null }

stubModule('@insforge/sdk', { createClient() { throw new Error('SDK client not used in these tests') } })
stubModule('../src/lib/supabase-server.ts', {
  createPagesAdminClient: () => db,
  async getUserFromBearer(token) { return { data: { user: token === 'valid' ? { id: ADMIN } : null }, error: null } },
  createPagesServerClient: () => ({ auth: { async getSession() { return { data: { session: null } } } } }),
})
stubModule('../lib/email-service.ts', {
  emailService: {
    async sendCredentials(credentials) {
      mail.sent.push(credentials)
      if (mail.fail === 'throw') throw new Error('Resend unavailable')
      return true
    },
  },
})
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
  // staleLookup: the lookup ran just before someone else created the user.
  async adminGetUserByEmail(email) { return { data: { user: auth.staleLookup ? null : auth.users.find((u) => u.email.toLowerCase() === email) ?? null }, error: null } },
  async adminRawSql(query) { throw new Error(`unexpected SQL in test: ${query}`) },
})

const handler = require('../src/pages/api/solicitudes/aprobar.ts').default

const solicitud = (overrides = {}) => ({
  id: SOLICITUD, nombre: 'Luis', apellido: 'Díaz', email: '  Luis.Diaz@Example.COM ', telefono: '+56911112222',
  especialidad: 'Fade', descripcion: 'Diez años de oficio', imagen_url: 'https://cdn.test/luis.jpg', experiencia_anos: 10,
  estado: 'pendiente', comercio_id: TENANT, barbero_id: null, revisada_por: null, fecha_revision: null, notas_revision: null,
  ...overrides,
})

function setup({ solicitudes = [solicitud()], barberos = [], admin_users = [], users = [], ...options } = {}) {
  Object.assign(auth, { users: structuredClone(users), created: [], deleted: [], failCreate: null, staleLookup: false })
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
        row.id = randomUUID()
        for (let dia = 0; dia < 7; dia++) db.tables.horarios_atencion.push({ id: randomUUID(), barbero_id: row.id, dia_semana: dia })
      }
      if (table === 'admin_users' && rows.some((a) => a.comercio_id === row.comercio_id && a.email === row.email)) return unique('admin_users_comercio_id_email_key')
      return null
    },
    onDelete(table, matched) {
      if (table !== 'barberos') return null
      const ids = matched.map((b) => b.id)
      if (db.tables.solicitudes_barberos.some((s) => ids.includes(s.barbero_id))) return { code: '23503', message: 'violates foreign key constraint "solicitudes_barberos_barbero_id_fkey"' }
      db.tables.horarios_atencion = db.tables.horarios_atencion.filter((h) => !ids.includes(h.barbero_id))
      return null
    },
    ...options,
  })
}

async function call(body = { solicitudId: SOLICITUD }, { method = 'POST', headers = { authorization: 'Bearer valid' } } = {}) {
  const res = createResponse()
  const logged = []
  const originals = { log: console.log, info: console.info, warn: console.warn, error: console.error }
  for (const level of Object.keys(originals)) console[level] = (...args) => logged.push(args)
  try { await handler({ method, headers, body }, res) } finally { Object.assign(console, originals) }
  res.logged = JSON.stringify(logged)
  return res
}

const application = (id = SOLICITUD) => db.tables.solicitudes_barberos.find((s) => s.id === id)
const logins = () => db.tables.admin_users.filter((a) => a.id !== ADMIN)

test('an auth user that appears between the check and the creation is refused: not adopted, not deleted, and everything is undone', async () => {
  const existing = { id: randomUUID(), email: 'luis.diaz@example.com', is_project_admin: false }
  setup({ users: [existing] })
  auth.staleLookup = true
  const res = await call()
  assert.equal(res.statusCode, 409)
  assert.deepEqual(res.body, { error: TAKEN })
  assert.deepEqual(auth.users, [existing], 'the existing user is still there, untouched')
  assert.deepEqual([auth.created.length, auth.deleted.length], [0, 0], 'no user was created, and the existing one was not deleted by the undo')
  assert.deepEqual(logins(), [], 'no login row points to the existing user')
  assert.deepEqual(application(), solicitud(), 'the application is pending again')
  assert.deepEqual([db.tables.barberos, db.tables.horarios_atencion, mail.sent], [[], [], []])
})

test('two applications with the same email approved at the same time give one barber and one login', async () => {
  const segunda = solicitud({ id: SEGUNDA, nombre: 'Luis Alberto', email: 'LUIS.DIAZ@example.com' })
  setup({ solicitudes: [solicitud(), segunda] })
  const results = await Promise.all([call({ solicitudId: SOLICITUD }), call({ solicitudId: SEGUNDA })])
  assert.deepEqual(results.map((res) => res.statusCode).sort(), [200, 409])
  const loser = results.find((res) => res.statusCode === 409)
  assert.equal(loser.body.password, undefined)
  assert.deepEqual([db.tables.barberos.length, logins().length, auth.users.length, mail.sent.length], [1, 1, 1, 1])
  const states = [application(SOLICITUD).estado, application(SEGUNDA).estado].sort()
  assert.deepEqual(states, ['aprobada', 'pendiente'], 'the application that lost is pending again')
  const lost = [application(SOLICITUD), application(SEGUNDA)].find((s) => s.estado === 'pendiente')
  assert.deepEqual([lost.barbero_id, lost.revisada_por, lost.fecha_revision], [null, null, null])
  assert.equal(db.tables.horarios_atencion.length, 7, 'no schedule rows of a second barber are left')
})

test('the shop always comes from the signed-in admin, never from the request', async () => {
  setup()
  const res = await call({ solicitudId: SOLICITUD, comercio_id: OTHER_TENANT, comercioId: OTHER_TENANT, estado: 'aprobada', email: 'otro@atacante.test', revisada_por: randomUUID() })
  assert.equal(res.statusCode, 200)
  assert.equal(db.tables.barberos[0].comercio_id, TENANT)
  assert.equal(logins()[0].comercio_id, TENANT)
  assert.equal(logins()[0].email, 'luis.diaz@example.com', 'the email is the one stored in the application')
  assert.equal(application().revisada_por, ADMIN)
  assert.deepEqual(Object.keys(res.body).sort(), ['barbero_id', 'email', 'email_enviado', 'message', 'password', 'success'])
})

test('an application that carries the email of the acting admin, or of any login of the shop in another case, creates nothing', async () => {
  for (const email of ['ADMIN@chamos.test', '  Admin@Chamos.Test  ']) {
    setup({ solicitudes: [solicitud({ email })] })
    const res = await call()
    assert.equal(res.statusCode, 409)
    assert.equal(res.body.password, undefined)
    assert.deepEqual([db.calls.inserts.length, db.calls.updates.length, auth.created.length, mail.sent.length], [0, 0, 0, 0])
    assert.deepEqual(db.tables.admin_users, [ADMIN_ROW], "the admin's own account is untouched")
  }
})

test('every answer is no-store, and no refused or failed request returns or logs a password', async () => {
  const failures = [
    ['no session', () => setup(), { headers: {} }, 401],
    ['wrong role', () => { setup(); db.tables.admin_users[0].rol = 'barbero' }, {}, 403],
    ['unknown application', () => setup({ solicitudes: [] }), {}, 404],
    ['already reviewed', () => setup({ solicitudes: [solicitud({ estado: 'rechazada' })] }), {}, 409],
    ['barber insert fails', () => setup({ fail: { 'barberos.insert': { code: 'XX000', message: 'insert failed' } } }), {}, 500],
    ['login row fails', () => setup({ fail: { 'admin_users.insert': { code: 'XX000', message: 'insert failed' } } }), {}, 500],
    ['login row is a duplicate', () => setup({ fail: { 'admin_users.insert': { code: '23505', message: 'duplicate key' } } }), {}, 409],
    ['sign-up fails', () => { setup(); auth.failCreate = new Error('signUp unavailable') }, {}, 500],
  ]
  for (const [name, arrange, options, status] of failures) {
    arrange()
    const res = await call({ solicitudId: SOLICITUD }, options)
    assert.equal(res.statusCode, status, name)
    assert.equal(res.getHeader('cache-control'), 'no-store', name)
    assert.deepEqual(Object.keys(res.body).filter((key) => key !== 'error' && key !== 'message'), [], `${name}: only an error message`)
    for (const { password } of auth.created) {
      assert.ok(!res.logged.includes(password), `${name}: the generated password is not logged`)
      assert.ok(!JSON.stringify(res.body).includes(password), `${name}: nor returned`)
    }
    assert.deepEqual(auth.users, [], `${name}: no auth user is left`)
    assert.deepEqual(logins(), [], `${name}: no login row is left`)
    assert.deepEqual(db.tables.barberos, [], `${name}: no barber is left`)
  }
})

// Kept from the verifier's advisory probe, reduced to the rule it guards: the
// undo releases only this request's own claim (still 'aprobada' and reviewed
// by this admin). What stays behind in these cases is reported, not pinned.
test('the undo never overwrites a review that landed while the approval ran', async () => {
  // Right after the claim, while the barber is being saved, another tab rejects the application.
  setup({
    onInsert: (table) => {
      if (table === 'barberos') Object.assign(application(), { estado: 'rechazada', fecha_revision: '2026-11-24T20:00:00.000Z' })
      return null
    },
  })
  let res = await call()
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.password, undefined)
  assert.deepEqual([application().estado, application().fecha_revision], ['rechazada', '2026-11-24T20:00:00.000Z'], 'the rejection is not put back to pending')
  assert.deepEqual([logins().length, auth.users.length], [0, 0], 'a rejected application gets no login')

  // The same when another reviewer took the application over and the login then fails.
  const OTRO_ADMIN = '00000000-0000-4000-8000-000000000002'
  setup({
    onInsert: (table) => {
      if (table === 'barberos') Object.assign(application(), { revisada_por: OTRO_ADMIN })
      return null
    },
  })
  auth.failCreate = new Error('signUp unavailable')
  res = await call()
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.password, undefined)
  assert.deepEqual([application().estado, application().revisada_por], ['aprobada', OTRO_ADMIN], "another reviewer's approval is not released")
})
