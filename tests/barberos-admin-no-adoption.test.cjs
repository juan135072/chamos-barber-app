// B1/B2 regression tests: creating a barber login never adopts an existing auth user.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { createFakeDb, createResponse, stubModule } = require('./fake-db.cjs')

process.env.NEXT_PUBLIC_INSFORGE_BASE_URL = 'https://insforge.invalid'
process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = 'public-anon'
process.env.INSFORGE_API_KEY = 'ik_test_nonsecret'

const TENANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ADMIN_A = '00000000-0000-4000-8000-00000000000a'
const ADMIN_B = '00000000-0000-4000-8000-00000000000b'
const sessions = { a: ADMIN_A, b: ADMIN_B }

let db
const auth = { users: [], created: [], deleted: [], passwords: [], sql: [], lookups: [], barrier: null, beforeCreate: null, dupError: 'conflict' }
const mail = { sent: [] }

stubModule('../src/lib/supabase-server.ts', {
  createPagesAdminClient: () => db,
  async getUserFromBearer(token) { return { data: { user: sessions[token] ? { id: sessions[token] } : null }, error: null } },
  createPagesServerClient: () => ({ auth: { async getSession() { return { data: { session: null } } } } }),
})
stubModule('../lib/email-service.ts', { emailService: { async sendCredentials(c) { mail.sent.push(c); return true } } })
stubModule('../src/lib/insforge-admin.ts', {
  async adminCreateUser({ email, password }) {
    if (auth.beforeCreate) { const f = auth.beforeCreate; auth.beforeCreate = null; f() }
    await new Promise((r) => setImmediate(r))
    // auth.users UNIQUE(email): exact match.
    if (auth.users.some((u) => u.email === email)) {
      const err = auth.dupError === 'conflict'
        ? Object.assign(new Error('User already exists'), { statusCode: 409 })
        : Object.assign(new Error('duplicate key value violates unique constraint'), { statusCode: 400 })
      return { data: { user: null }, error: err }
    }
    const user = { id: randomUUID(), email, is_project_admin: false }
    auth.users.push(user)
    auth.created.push({ id: user.id, email, password })
    return { data: { user }, error: null }
  },
  async adminDeleteUser(id) { auth.users = auth.users.filter((u) => u.id !== id); auth.deleted.push(id); return { data: { user: null }, error: null } },
  async adminGetUserById(id) { return { data: { user: auth.users.find((u) => u.id === id) ?? null }, error: null } },
  // Emulates `WHERE lower(email) = $1`.
  async adminGetUserByEmail(email) {
    auth.lookups.push(email)
    if (auth.barrier) await auth.barrier()
    return { data: { user: auth.users.find((u) => (u.email ?? '').toLowerCase() === email) ?? null }, error: null }
  },
  async adminSetUserPassword(id, password) { auth.passwords.push({ id, password }); return { updated: true, error: null } },
  async adminRawSql(query, params) { auth.sql.push({ query, params }); throw new Error('unexpected SQL: ' + query) },
})

function setup({ barberos = [], admin_users = [], users = [] } = {}) {
  Object.assign(auth, { users: structuredClone(users), created: [], deleted: [], passwords: [], sql: [], lookups: [], barrier: null, beforeCreate: null, dupError: 'conflict' })
  mail.sent = []
  db = createFakeDb({
    tables: {
      admin_users: [
        { id: ADMIN_A, email: 'a@shop-a.test', nombre: 'A', rol: 'admin', activo: true, comercio_id: TENANT, barbero_id: null },
        { id: ADMIN_B, email: 'b@shop-b.test', nombre: 'B', rol: 'admin', activo: true, comercio_id: OTHER, barbero_id: null },
        ...structuredClone(admin_users),
      ],
      barberos: structuredClone(barberos),
      horarios_atencion: [],
    },
    onInsert(table, row) {
      if (table === 'barberos') {
        if (row.email && db.tables.barberos.some((b) => b.comercio_id === row.comercio_id && b.email === row.email)) return { code: '23505', message: 'dup barberos email' }
        row.id = row.id || randomUUID()
      }
      if (table === 'admin_users' && db.tables.admin_users.some((a) => a.id === row.id || (a.comercio_id === row.comercio_id && a.email === row.email))) return { code: '23505', message: 'dup admin_users' }
      return null
    },
  })
}
async function call(route, body, { method = 'POST', token = 'a' } = {}) {
  const handler = require(`../src/pages/api/barberos/${route}.ts`).default
  const res = createResponse()
  await handler({ method, headers: { authorization: `Bearer ${token}` }, body }, res)
  return res
}
const PW = /Chamos[a-z0-9]{8}![0-9]{4}/

function assertNoEffects(res, label, victimId, barberosBefore) {
  assert.equal(res.statusCode, 409, `${label}: status ${res.statusCode} ${JSON.stringify(res.body)}`)
  assert.equal(res.body.password, undefined, `${label}: password returned`)
  assert.ok(!PW.test(JSON.stringify(res.body)), `${label}: password-like value in body`)
  assert.deepEqual(auth.passwords, [], `${label}: password written`)
  assert.equal(auth.sql.length, 0, `${label}: raw SQL ran`)
  assert.equal(db.calls.inserts.filter((i) => i.table === 'admin_users').length, 0, `${label}: admin_users insert`)
  assert.equal(db.tables.admin_users.some((a) => a.id === victimId && a.barbero_id), false, `${label}: victim linked`)
  assert.deepEqual([auth.created, auth.deleted], [[], []], `${label}: auth users created/deleted`)
  assert.deepEqual(mail.sent, [], `${label}: email sent`)
  assert.deepEqual(db.tables.barberos.map((b) => b.id).sort(), barberosBefore.sort(), `${label}: barber rows changed`)
}

const victims = () => {
  const id = randomUUID()
  return [
    ['orphan', { id, email: 'Victima@Example.COM', is_project_admin: false }, []],
    ['staff same shop (cajero, other email row)', { id, email: 'victima@example.com', is_project_admin: false }, [{ id, email: 'caja@shop-a.test', nombre: 'C', rol: 'cajero', activo: true, comercio_id: TENANT, barbero_id: null }]],
    ['staff same shop (same email row)', { id, email: 'victima@example.com', is_project_admin: false }, [{ id, email: 'victima@example.com', nombre: 'C', rol: 'cajero', activo: true, comercio_id: TENANT, barbero_id: null }]],
    ['staff other shop (admin)', { id, email: 'victima@example.com', is_project_admin: false }, [{ id, email: 'victima@example.com', nombre: 'X', rol: 'admin', activo: true, comercio_id: OTHER, barbero_id: null }]],
    ['project admin', { id, email: 'VICTIMA@example.com', is_project_admin: true }, []],
    ['anonymous', { id, email: 'victima@example.com', is_project_admin: false, is_anonymous: true }, []],
  ]
}

test('B1 crear-con-cuenta refuses every kind of existing auth user, case/space-insensitively', async () => {
  for (const [kind, user, rows] of victims()) {
    setup({ users: [user], admin_users: rows })
    const res = await call('crear-con-cuenta', { barberoData: { nombre: 'Vic', apellido: 'Tima', email: '   VICTIMA@Example.com  ' }, crearCuenta: true })
    assertNoEffects(res, `crear-con-cuenta/${kind}`, user.id, [])
  }
})

test('B1 credenciales crear refuses every kind of existing auth user (barber email unnormalized)', async () => {
  for (const [kind, user, rows] of victims()) {
    const b = { id: randomUUID(), nombre: 'Vic', apellido: 'Tima', email: '  Victima@EXAMPLE.com ', slug: 'vic', activo: true, comercio_id: TENANT }
    setup({ users: [user], admin_users: rows, barberos: [b] })
    const res = await call('credenciales', { barberoId: b.id, accion: 'crear' })
    assertNoEffects(res, `credenciales/${kind}`, user.id, [b.id])
  }
})

test('B1 update-then-crear: pointing an account-less barber at a victim email cannot yield its login', async () => {
  for (const [kind, user, rows] of victims()) {
    const b = { id: randomUUID(), nombre: 'Vic', apellido: 'Tima', email: 'libre@shop-a.test', slug: 'vic', activo: true, comercio_id: TENANT }
    setup({ users: [user], admin_users: rows, barberos: [b] })
    const upd = await call('update', { barberoId: b.id, updates: { email: ' VICTIMA@example.COM ' } }, { method: 'PATCH' })
    // The record edit itself may succeed or 409; the login must never follow.
    assert.ok([200, 409].includes(upd.statusCode), `${kind}: update ${upd.statusCode}`)
    assert.equal(auth.sql.length, 0, `${kind}: update touched auth.users`)
    const res = await call('credenciales', { barberoId: b.id, accion: 'crear' })
    if (upd.statusCode === 200) {
      assert.equal(db.tables.barberos[0].email, 'victima@example.com', `${kind}: record moved to the victim email`)
      assertNoEffects(res, `update+crear/${kind}`, user.id, [b.id])
    } else {
      // The edit was refused: the barber keeps its own free email, so a fresh login is fine.
      assert.equal(db.tables.barberos[0].email, 'libre@shop-a.test', `${kind}: refused edit left the record changed`)
      assert.equal(res.statusCode, 200)
      assert.equal(auth.created.length, 1)
      assert.equal(auth.created[0].email, 'libre@shop-a.test')
      assert.notEqual(auth.created[0].id, user.id)
      assert.deepEqual(auth.passwords, [])
    }
    console.log(`  ${kind}: update ${upd.statusCode}, crear ${res.statusCode}`)
  }
})

function barrierOf(n) {
  let waiting = 0, release
  const gate = new Promise((r) => { release = r })
  return async () => { waiting++; if (waiting >= n) release(); await gate }
}

for (const dupError of ['conflict', 'generic']) {
  test(`B1/race (${dupError}): two concurrent creations across shops never return a password for a user not created by the request`, async () => {
    setup()
    auth.dupError = dupError
    auth.barrier = barrierOf(2)
    const [ra, rb] = await Promise.all([
      call('crear-con-cuenta', { barberoData: { nombre: 'A', apellido: 'Uno', email: 'same@example.com' }, crearCuenta: true }, { token: 'a' }),
      call('crear-con-cuenta', { barberoData: { nombre: 'B', apellido: 'Dos', email: 'SAME@example.com ' }, crearCuenta: true }, { token: 'b' }),
    ])
    assert.equal(auth.lookups.length, 2, 'both requests passed the pre-check concurrently')
    const ok = [ra, rb].filter((r) => r.statusCode === 200)
    const ko = [ra, rb].filter((r) => r.statusCode !== 200)
    assert.equal(ok.length, 1, `exactly one wins: ${ra.statusCode}/${rb.statusCode}`)
    assert.equal(auth.created.length, 1)
    assert.equal(ok[0].body.password, auth.created[0].password, 'winner password is the one it created')
    assert.equal(ko[0].body.password, undefined, 'loser returns no password')
    assert.ok([409, 500].includes(ko[0].statusCode))
    assert.deepEqual(auth.passwords, [], 'no password write')
    assert.equal(db.tables.admin_users.filter((a) => a.rol === 'barbero').length, 1, 'only the created user is linked')
    assert.equal(db.tables.admin_users.find((a) => a.rol === 'barbero').id, auth.created[0].id)
    assert.equal(db.tables.barberos.length, 1, 'loser barber row removed')
    assert.equal(mail.sent.length, 1)
  })
}

test('B1/race: crear-con-cuenta vs credenciales crear in another shop', async () => {
  const b = { id: randomUUID(), nombre: 'B', apellido: 'Dos', email: 'same@example.com', slug: 'b', activo: true, comercio_id: OTHER }
  setup({ barberos: [b] })
  auth.barrier = barrierOf(2)
  const [ra, rb] = await Promise.all([
    call('crear-con-cuenta', { barberoData: { nombre: 'A', apellido: 'Uno', email: 'same@example.com' }, crearCuenta: true }, { token: 'a' }),
    call('credenciales', { barberoId: b.id, accion: 'crear' }, { token: 'b' }),
  ])
  const ok = [ra, rb].filter((r) => r.statusCode === 200)
  assert.equal(ok.length, 1, `${ra.statusCode}/${rb.statusCode}`)
  assert.equal(ok[0].body.password, auth.created[0].password)
  assert.equal([ra, rb].find((r) => r.statusCode !== 200).body.password, undefined)
  assert.deepEqual(auth.passwords, [])
})

test('B1/B2 race: a stranger signs up between the check and the creation', async () => {
  const stranger = { id: randomUUID(), email: 'victima@example.com', is_project_admin: false }
  setup()
  auth.beforeCreate = () => auth.users.push(structuredClone(stranger))
  const res = await call('crear-con-cuenta', { barberoData: { nombre: 'Vic', apellido: 'Tima', email: 'victima@example.com' }, crearCuenta: true })
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.password, undefined)
  assert.deepEqual([auth.passwords, auth.created, auth.deleted], [[], [], []])
  assert.equal(db.tables.admin_users.some((a) => a.id === stranger.id), false, 'stranger never linked (no barber session)')
  assert.equal(db.tables.barberos.length, 0)
  assert.equal(mail.sent.length, 0)
})
