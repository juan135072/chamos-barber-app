// Public shop sign-up: /registro and /api/onboarding/register. It is closed
// unless ONBOARDING_ENABLED is exactly "true". Behind the flag, the shop and
// its admin row are created together or not at all, and a failure deletes only
// the auth user this request created. The route runs against the fake DB and
// an in-memory stand-in for the auth helpers in src/lib/insforge-admin.ts.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const { randomUUID } = require('node:crypto')
const { createFakeDb, createResponse, stubModule } = require('./fake-db.cjs')
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)

process.env.NEXT_PUBLIC_INSFORGE_BASE_URL = 'https://insforge.invalid'
process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = 'public-anon'
process.env.INSFORGE_API_KEY = 'ik_test_nonsecret'

let db
const auth = { users: [], created: [], deleted: [], updated: [], sql: [], failCreate: null, failSql: null, failDelete: null }

stubModule('@insforge/sdk', { createClient() { throw new Error('SDK client not used in these tests') } })
stubModule('../src/lib/supabase-server.ts', { createPagesAdminClient: () => db })
stubModule('../lib/email-service.ts', { emailService: { async sendCredentials() { throw new Error('sign-up sends no email') } } })

// In-memory auth.users. Like InsForge, signUp refuses an email that exists.
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
    if (auth.failDelete) return { data: { user: null }, error: auth.failDelete }
    auth.users = auth.users.filter((u) => u.id !== id)
    auth.deleted.push(id)
    return { data: { user: null }, error: null }
  },
  async adminGetUserByEmail(email) { return { data: { user: auth.users.find((u) => u.email.toLowerCase() === email) ?? null }, error: null } },
  async adminGetUserById(id) { return { data: { user: auth.users.find((u) => u.id === id) ?? null }, error: null } },
  // The old flow called this with app_metadata, which always throws.
  async adminUpdateUserById(...args) {
    auth.updated.push(args)
    throw new Error('adminUpdateUserById: only password resets are supported')
  },
  async adminRawSql(query, params) {
    auth.sql.push({ query, params })
    if (auth.failSql) throw auth.failSql
    return createShop(query, params)
  },
})

// Emulates the single statement that inserts the shop and its admin row: both
// rows or, on a unique violation, neither.
function createShop(query, [nombre, slug, color, userId, nombreAdmin, email]) {
  if (!/INSERT INTO public\.comercios/.test(query) || !/INSERT INTO public\.admin_users/.test(query)) throw new Error(`unexpected SQL in test: ${query}`)
  if (db.tables.comercios.some((c) => c.slug === slug)) throw new Error('InsForge rawsql 400: duplicate key value violates unique constraint "comercios_slug_key" (23505)')
  const comercio = { id: randomUUID(), nombre, slug, color_primario: color, plan: 'trial', activo: true }
  db.tables.comercios.push(comercio)
  db.tables.admin_users.push({ id: userId, comercio_id: comercio.id, rol: 'admin', nombre: nombreAdmin, email, activo: true })
  return { rows: [{ comercio_id: comercio.id, cuentas: 1 }], rowCount: 1 }
}

const handler = require('../src/pages/api/onboarding/register.ts').default

const OTHER_SHOP = { id: randomUUID(), nombre: 'Chamos Barber', slug: 'chamos', plan: 'pro', activo: true }
const OTHER_ADMIN = { id: randomUUID(), comercio_id: OTHER_SHOP.id, rol: 'admin', nombre: 'Dueño', email: 'admin@chamos.test', activo: true }
const body = { nombreComercio: 'The Gentleman', slug: 'the-gentleman', colorPrimario: '#112233', nombreAdmin: 'Luis', apellidoAdmin: 'Díaz', email: '  Luis.Diaz@Example.COM ', password: 'Segura!2345' }

// The flag is on unless the test passes one; `flag: undefined` leaves it unset.
function setup(options = {}) {
  const { users = [] } = options
  const flag = 'flag' in options ? options.flag : 'true'
  if (flag === undefined) delete process.env.ONBOARDING_ENABLED
  else process.env.ONBOARDING_ENABLED = flag
  Object.assign(auth, { users: structuredClone(users), created: [], deleted: [], updated: [], sql: [], failCreate: null, failSql: null, failDelete: null })
  db = createFakeDb({ tables: { comercios: [structuredClone(OTHER_SHOP)], admin_users: [structuredClone(OTHER_ADMIN)] } })
}

/** Runs the route and captures everything it logs. */
async function call(payload = body, method = 'POST') {
  const res = createResponse()
  const logged = []
  const originals = { log: console.log, info: console.info, warn: console.warn, error: console.error }
  for (const level of Object.keys(originals)) console[level] = (...args) => logged.push(args)
  try { await handler({ method, headers: {}, body: payload }, res) } finally { Object.assign(console, originals) }
  res.logged = JSON.stringify(logged)
  return res
}

/** Nothing was read, created or deleted anywhere. */
function assertUntouched({ reads = 0 } = {}) {
  assert.equal(db.calls.selects.length, reads)
  assert.deepEqual([db.calls.inserts.length, db.calls.updates.length, db.calls.deletes.length], [0, 0, 0])
  assert.deepEqual([auth.created.length, auth.deleted.length, auth.updated.length, auth.sql.length], [0, 0, 0, 0])
  assert.deepEqual(db.tables.comercios, [OTHER_SHOP])
  assert.deepEqual(db.tables.admin_users, [OTHER_ADMIN])
}

test('without ONBOARDING_ENABLED=true the route answers 404 before doing anything', async () => {
  for (const flag of [undefined, '', 'false', '1', 'TRUE', 'true ']) {
    for (const method of ['POST', 'GET']) {
      setup({ flag })
      const res = await call(body, method)
      assert.equal(res.statusCode, 404, `flag ${JSON.stringify(flag)} ${method}`)
      assert.deepEqual(res.body, { error: 'No encontrado' })
      assertUntouched()
    }
  }
})

test('without the flag the /registro page does not exist', async () => {
  stubModule('next/head', { __esModule: true, default: () => null })
  stubModule('next/link', { __esModule: true, default: () => null })
  stubModule('next/router', { useRouter: () => ({}) })
  const toast = { success() {}, error() {}, loading() {} }
  stubModule('react-hot-toast', Object.assign(toast, { default: toast }))
  const page = require('../src/pages/registro.tsx')
  assert.equal(typeof page.default, 'function')
  for (const flag of [undefined, 'false', 'TRUE']) {
    setup({ flag })
    assert.deepEqual(await page.getServerSideProps({}), { notFound: true })
  }
  setup({ flag: 'true' })
  assert.deepEqual(await page.getServerSideProps({}), { props: {} })
})

test('with the flag, a sign-up creates the auth user, the shop and its admin row, and nothing else', async () => {
  setup()
  const res = await call()
  assert.equal(res.statusCode, 200)
  const comercio = db.tables.comercios.find((c) => c.slug === 'the-gentleman')
  assert.deepEqual(res.body, { success: true, comercio_id: comercio.id, slug: 'the-gentleman' })
  assert.deepEqual(auth.created.map(({ email, password }) => ({ email, password })), [{ email: 'luis.diaz@example.com', password: 'Segura!2345' }])
  assert.deepEqual({ ...comercio, id: undefined }, { id: undefined, nombre: 'The Gentleman', slug: 'the-gentleman', color_primario: '#112233', plan: 'trial', activo: true })
  assert.deepEqual(db.tables.admin_users.filter((a) => a.comercio_id === comercio.id), [
    { id: auth.created[0].id, comercio_id: comercio.id, rol: 'admin', nombre: 'Luis', email: 'luis.diaz@example.com', activo: true },
  ])
  assert.deepEqual([db.tables.comercios.length, db.tables.admin_users.length], [2, 2])
  // The dead step that always threw is gone, and nothing is deleted on success.
  assert.deepEqual([auth.updated.length, auth.deleted.length], [0, 0])
  assert.ok(!res.logged.includes('Segura!2345'), 'the password is never logged')
})

test('the shop and its admin row are written by one statement, never one after the other', async () => {
  setup()
  await call()
  assert.equal(auth.sql.length, 1)
  const query = auth.sql[0].query.replace(/\s+/g, ' ')
  assert.match(query, /^ ?WITH comercio AS \( INSERT INTO public\.comercios .* RETURNING id \), cuenta AS \( INSERT INTO public\.admin_users .* FROM comercio RETURNING id \) SELECT /)
  assert.ok(!query.includes(';'), 'a single statement')
  assert.deepEqual(auth.sql[0].params, ['The Gentleman', 'the-gentleman', '#112233', auth.created[0].id, 'Luis', 'luis.diaz@example.com'])
  assert.deepEqual(db.calls.inserts, [], 'no separate inserts through the table API')
})

test('if the shop cannot be saved, the auth user this request created is deleted and no row is left', async () => {
  const existing = { id: randomUUID(), email: 'otra@example.com', is_project_admin: false }
  setup({ users: [existing] })
  auth.failSql = new Error('InsForge rawsql 500: connection lost')
  const res = await call()
  assert.equal(res.statusCode, 500)
  assert.deepEqual(res.body, { error: 'No se pudo registrar la barbería. Intenta de nuevo.' })
  assert.deepEqual(auth.deleted, [auth.created[0].id], 'only the user created by this request')
  assert.deepEqual(auth.users, [existing])
  assert.deepEqual(db.tables.comercios, [OTHER_SHOP])
  assert.deepEqual(db.tables.admin_users, [OTHER_ADMIN])
  assert.ok(res.logged.includes('rollback'), 'the rollback is logged')
  assert.ok(!res.logged.includes('Segura!2345'), 'the password is never logged')
})

test('a rollback that fails is logged with the user it left behind', async () => {
  setup()
  auth.failSql = new Error('InsForge rawsql 500: connection lost')
  auth.failDelete = new Error('rawsql unavailable')
  const res = await call()
  assert.equal(res.statusCode, 500)
  assert.deepEqual(res.body, { error: 'No se pudo registrar la barbería. Intenta de nuevo.' })
  assert.ok(res.logged.includes(auth.created[0].id), 'the auth user left behind is named in the log')
  assert.ok(!res.logged.includes('Segura!2345'))
})

test('an email that already has an auth user is refused in any case, and nothing is created or deleted', async () => {
  for (const email of ['luis.diaz@example.com', 'LUIS.DIAZ@EXAMPLE.COM']) {
    const existing = { id: randomUUID(), email, is_project_admin: false }
    setup({ users: [existing] })
    const res = await call()
    assert.equal(res.statusCode, 409)
    assert.deepEqual(res.body, { error: 'Ese correo ya tiene una cuenta. Inicia sesión o usa otro correo.' })
    assertUntouched({ reads: 1 })
    assert.deepEqual(auth.users, [existing])
  }
})

test('a slug that is already taken is refused before any account is created', async () => {
  setup()
  const res = await call({ ...body, slug: 'chamos' })
  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, { error: 'El subdominio (slug) ya está en uso. Por favor, elige otro.' })
  assertUntouched({ reads: 1 })
})

test('an auth user that cannot be created leaves nothing to undo and echoes no provider message', async () => {
  setup()
  auth.failCreate = Object.assign(new Error('Password does not meet the provider policy XYZ'), { statusCode: 400 })
  let res = await call()
  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, { error: 'No se pudo crear la cuenta. Revisa el correo y la contraseña e intenta de nuevo.' })
  assertUntouched({ reads: 1 })

  setup()
  auth.failCreate = new Error('signUp unavailable')
  res = await call()
  assert.equal(res.statusCode, 500)
  assert.doesNotMatch(JSON.stringify(res.body), /signUp|unavailable/)
  assertUntouched({ reads: 1 })
})

test('the existing validation still applies behind the flag', async () => {
  setup()
  let res = await call(body, 'GET')
  assert.equal(res.statusCode, 405)
  for (const missing of ['nombreComercio', 'slug', 'email', 'password', 'nombreAdmin']) {
    res = await call({ ...body, [missing]: '' })
    assert.equal(res.statusCode, 400, missing)
    assert.deepEqual(res.body, { error: 'Faltan campos obligatorios' })
  }
  res = await call({ ...body, email: { $ne: null } })
  assert.equal(res.statusCode, 400)
  res = await call({ ...body, slug: 'The Gentleman!' })
  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, { error: 'El slug solo puede contener letras minúsculas, números y guiones.' })
  assertUntouched()
})
