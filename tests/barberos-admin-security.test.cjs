// Security probes for admin barber management (from the independent security
// review). A shop admin, including anyone who self-registers a shop, must
// never take over an auth user the shop did not create, and barber actions
// must never touch the login of an admin or of the acting user.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { createFakeDb, createResponse, stubModule } = require('./fake-db.cjs')

process.env.NEXT_PUBLIC_INSFORGE_BASE_URL = 'https://insforge.invalid'
process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = 'public-anon'
process.env.INSFORGE_API_KEY = 'ik_test_nonsecret'

const TENANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ADMIN = '00000000-0000-4000-8000-000000000001'
const TAKEN = 'Ese correo ya tiene una cuenta de acceso creada antes. Pide al administrador del sistema que la libere o usa otro correo.'

let db
const auth = { users: [], created: [], deleted: [], passwords: [], sql: [] }
// The bearer token decides which auth user is signed in.
const sessions = { valid: ADMIN }
stubModule('../src/lib/supabase-server.ts', {
  createPagesAdminClient: () => db,
  async getUserFromBearer(token) { return { data: { user: sessions[token] ? { id: sessions[token] } : null }, error: null } },
  createPagesServerClient: () => ({ auth: { async getSession() { return { data: { session: null } } } } }),
})
stubModule('../lib/email-service.ts', { emailService: { async sendCredentials() { return true } } })

// In-memory auth.users. Like InsForge, signUp refuses an email that exists.
stubModule('../src/lib/insforge-admin.ts', {
  async adminCreateUser({ email, password }) {
    if (auth.users.some((u) => u.email === email)) return { data: { user: null }, error: Object.assign(new Error('User already exists'), { statusCode: 409 }) }
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
  async adminGetUserByEmail(email) { return { data: { user: auth.users.find((u) => u.email === email) ?? null }, error: null } },
  async adminSetUserPassword(id, password) {
    const user = auth.users.find((u) => u.id === id && !u.is_project_admin)
    if (!user) return { updated: false, error: null }
    auth.passwords.push({ id, password })
    return { updated: true, error: null }
  },
  async adminRawSql(query, params) {
    auth.sql.push({ query, params })
    // The email-change statement: only a barber account that is not the actor moves.
    const [barberoId, comercioId, email, accountId, actorId] = params
    const account = db.tables.admin_users.find((a) => a.id === accountId && a.barbero_id === barberoId && a.comercio_id === comercioId && a.rol === 'barbero' && a.id !== actorId)
    const user = auth.users.find((u) => u.id === accountId && !u.is_project_admin)
    if (!account || !user) return { rows: [{ barberos: 0, cuentas: 0, usuarios: 0 }], rowCount: 1 }
    db.tables.barberos.find((b) => b.id === barberoId).email = email
    account.email = email
    user.email = email
    return { rows: [{ barberos: 1, cuentas: 1, usuarios: 1 }], rowCount: 1 }
  },
})

function setup({ barberos = [], admin_users = [], users = [], ...options } = {}) {
  Object.assign(auth, { users: structuredClone(users), created: [], deleted: [], passwords: [], sql: [] })
  db = createFakeDb({
    tables: {
      admin_users: [{ id: ADMIN, email: 'admin@chamos.test', nombre: 'Admin', rol: 'admin', activo: true, comercio_id: TENANT, barbero_id: null }, ...structuredClone(admin_users)],
      barberos: structuredClone(barberos),
    },
    ...options,
  })
  return db
}

async function call(route, body, { method = 'POST', token = 'valid' } = {}) {
  const handler = require(`../src/pages/api/barberos/${route}.ts`).default
  const res = createResponse()
  await handler({ method, headers: { authorization: `Bearer ${token}` }, body }, res)
  return res
}
const barbero = (overrides = {}) => ({ id: randomUUID(), nombre: 'Ana', apellido: 'Pérez', email: 'ana@chamos.test', slug: 'ana-perez', activo: true, comercio_id: TENANT, ...overrides })
const cuentaDe = (b, overrides = {}) => ({ id: randomUUID(), email: b.email, nombre: `${b.nombre} ${b.apellido}`, rol: 'barbero', activo: true, comercio_id: TENANT, barbero_id: b.id, ...overrides })
const usuarioDe = (cuenta, overrides = {}) => ({ id: cuenta.id, email: cuenta.email, is_project_admin: false, ...overrides })
function deleteRpc() {
  return async (name, args, fake) => {
    fake.tables.admin_users = fake.tables.admin_users.filter((a) => !(a.barbero_id === args.p_barber && a.comercio_id === args.p_comercio))
    fake.tables.barberos = fake.tables.barberos.filter((b) => !(b.id === args.p_barber && b.comercio_id === args.p_comercio))
    return { data: null, error: null }
  }
}

// P1 (B1): an auth user the shop did not create (signed up elsewhere, or a
// leftover with no staff row) never gets a password chosen by, and returned
// to, a shop admin, and is never linked to the shop.
test('P1 a shop admin never receives a password for a pre-existing auth user', async () => {
  for (const ajeno of [
    { id: randomUUID(), email: 'victima@example.com', is_project_admin: false },
    { id: randomUUID(), email: 'victima@example.com', is_project_admin: true },
  ]) {
    for (const [route, body, extra] of [
      ['crear-con-cuenta', { barberoData: { nombre: 'Vic', apellido: 'Tima', email: 'Victima@Example.com' }, crearCuenta: true }, {}],
      ['credenciales', null, { barberos: [barbero({ email: 'victima@example.com' })] }],
    ]) {
      setup({ users: [ajeno], ...extra })
      const res = await call(route, body ?? { barberoId: db.tables.barberos[0].id, accion: 'crear' })
      assert.equal(res.statusCode, 409, route)
      assert.equal(res.body.error, TAKEN)
      assert.equal(res.body.password, undefined, `${route} returned a password for ${ajeno.email}`)
      assert.deepEqual(auth.passwords, [], `${route} changed the password of the pre-existing auth user`)
      assert.equal(db.tables.admin_users.some((a) => a.id === ajeno.id), false, `${route} linked the pre-existing auth user to the shop`)
      assert.deepEqual([auth.created, auth.deleted, auth.users.length], [[], [], 1], 'the pre-existing auth user is left alone')
      assert.equal(db.calls.inserts.length, 0, 'nothing is written')
    }
  }
})

// P2 (B2): whoever already holds a session of that auth user (for example the
// person who signed it up) never becomes staff.
test('P2 a session issued before the account was requested never becomes a barber session', async () => {
  const ajeno = { id: randomUUID(), email: 'victima@example.com', is_project_admin: false }
  setup({ users: [ajeno] })
  sessions.attacker = ajeno.id
  const before = await call('update', { barberoId: randomUUID(), updates: { telefono: '1' } }, { method: 'PATCH', token: 'attacker' })
  assert.equal(before.statusCode, 403)
  const created = await call('crear-con-cuenta', { barberoData: { nombre: 'Vic', apellido: 'Tima', email: 'victima@example.com' }, crearCuenta: true })
  assert.equal(created.statusCode, 409)
  assert.deepEqual(db.tables.barberos, [])
  const after = await call('update', { barberoId: randomUUID(), updates: { telefono: '+56 9 0000 0000' } }, { method: 'PATCH', token: 'attacker' })
  assert.equal(after.statusCode, 403, 'the pre-existing session is still not staff')
})

// P3: deleting a barber never deletes the login of the actor or of a
// non-barber role linked to that barber record.
test('P3 delete-permanent never deletes the auth user of an admin or of the actor', async () => {
  const b = barbero()
  const cajero = cuentaDe(b, { rol: 'cajero', email: 'caja@chamos.test' })
  setup({ barberos: [b], admin_users: [cajero], users: [{ id: ADMIN, email: 'admin@chamos.test', is_project_admin: false }, usuarioDe(cajero)], rpc: deleteRpc() })
  Object.assign(db.tables.admin_users[0], { barbero_id: b.id })
  const res = await call('delete-permanent', { barberoId: b.id }, { method: 'DELETE' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(auth.deleted, [], 'no admin, cajero or actor auth user is deleted')
})

// P4: an edit never moves the login email of a non-barber account linked to
// the barber, nor the actor's own login email.
test('P4 an email edit never changes the login email of an admin or of the actor', async () => {
  const b = barbero()
  const otroAdmin = cuentaDe(b, { rol: 'admin' })
  setup({ barberos: [b], admin_users: [otroAdmin], users: [usuarioDe(otroAdmin)] })
  let res = await call('update', { barberoId: b.id, updates: { email: 'nuevo@example.com' } }, { method: 'PATCH' })
  assert.equal(auth.users.find((u) => u.id === otroAdmin.id).email, otroAdmin.email, `status ${res.statusCode}: the admin's auth email was changed`)
  assert.equal(db.tables.admin_users.find((a) => a.id === otroAdmin.id).email, otroAdmin.email)
  assert.equal(res.statusCode, 200)
  assert.equal(db.tables.barberos[0].email, 'nuevo@example.com', 'the barber record still gets the new email')

  // The acting admin linked to the barber it edits keeps its login email too.
  setup({ barberos: [b], users: [{ id: ADMIN, email: 'admin@chamos.test', is_project_admin: false }] })
  Object.assign(db.tables.admin_users[0], { barbero_id: b.id })
  res = await call('update', { barberoId: b.id, updates: { email: 'otro@example.com' } }, { method: 'PATCH' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual([auth.users[0].email, db.tables.admin_users[0].email], ['admin@chamos.test', 'admin@chamos.test'], "the actor's own login email is unchanged")
})
