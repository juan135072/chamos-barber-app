// Verifier probes for the public shop sign-up (S6): POST /api/onboarding/register.
// Same harness as tests/onboarding-register.test.cjs.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { createFakeDb, createResponse, stubModule } = require('./fake-db.cjs')

process.env.NEXT_PUBLIC_INSFORGE_BASE_URL = 'https://insforge.invalid'
process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = 'public-anon'
process.env.INSFORGE_API_KEY = 'ik_test_nonsecret'

let db
const auth = { users: [], created: [], deleted: [], sql: [], lookups: 0, loseAnswer: false }

stubModule('@insforge/sdk', { createClient() { throw new Error('SDK client not used in these tests') } })
stubModule('../src/lib/supabase-server.ts', { createPagesAdminClient: () => db })
stubModule('../lib/email-service.ts', { emailService: { async sendCredentials() { throw new Error('sign-up sends no email') } } })
stubModule('../src/lib/insforge-admin.ts', {
  async adminCreateUser({ email, password }) {
    if (auth.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return { data: { user: null }, error: Object.assign(new Error('User already exists'), { statusCode: 409 }) }
    const user = { id: randomUUID(), email, is_project_admin: false }
    auth.users.push(user)
    auth.created.push({ id: user.id, email, password })
    return { data: { user }, error: null }
  },
  // admin_users.id references auth.users(id) ON DELETE CASCADE.
  async adminDeleteUser(id) {
    auth.users = auth.users.filter((u) => u.id !== id)
    db.tables.admin_users = db.tables.admin_users.filter((a) => a.id !== id)
    auth.deleted.push(id)
    return { data: { user: null }, error: null }
  },
  async adminGetUserByEmail(email) { auth.lookups++; return { data: { user: auth.users.find((u) => u.email.toLowerCase() === email) ?? null }, error: null } },
  async adminGetUserById(id) { return { data: { user: auth.users.find((u) => u.id === id) ?? null }, error: null } },
  async adminUpdateUserById() { throw new Error('adminUpdateUserById: only password resets are supported') },
  async adminRawSql(query, params) {
    auth.sql.push({ query, params })
    const result = createShop(query, params)
    if (auth.loseAnswer) throw new TypeError('fetch failed') // committed, but the answer never arrived
    return result
  },
})

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
const body = { nombreComercio: 'The Gentleman', slug: 'the-gentleman', colorPrimario: '#112233', nombreAdmin: 'Luis', apellidoAdmin: 'Díaz', email: 'luis.diaz@example.com', password: 'Segura!2345' }

// ON by default; setup(OFF) leaves the variable unset.
const OFF = Symbol('unset')
function setup(flag = 'true') {
  if (flag === OFF) delete process.env.ONBOARDING_ENABLED
  else process.env.ONBOARDING_ENABLED = flag
  Object.assign(auth, { users: [], created: [], deleted: [], sql: [], lookups: 0, loseAnswer: false })
  db = createFakeDb({ tables: { comercios: [structuredClone(OTHER_SHOP)], admin_users: [structuredClone(OTHER_ADMIN)] } })
}

const NO_BODY = Symbol('no body')
async function call(payload = body, method = 'POST') {
  if (payload === NO_BODY) payload = undefined
  const res = createResponse()
  const originals = { log: console.log, info: console.info, warn: console.warn, error: console.error }
  for (const level of Object.keys(originals)) console[level] = () => {}
  try { await handler({ method, headers: {}, body: payload }, res) } finally { Object.assign(console, originals) }
  return res
}

const untouched = () => {
  assert.deepEqual([db.calls.selects.length, db.calls.inserts.length, db.calls.updates.length, db.calls.deletes.length], [0, 0, 0, 0])
  assert.deepEqual([auth.created.length, auth.deleted.length, auth.sql.length, auth.lookups], [0, 0, 0, 0])
  assert.deepEqual([db.tables.comercios, db.tables.admin_users], [[OTHER_SHOP], [OTHER_ADMIN]])
}

test('any flag other than exactly "true" answers 404 for every method and body, and does no work', async () => {
  for (const flag of [OFF, '', 'false', '0', '1', 'yes', 'on', 'enabled', 'True', 'TRUE', 'tRuE', ' true', 'true ', 'true\n', '"true"']) {
    for (const method of ['POST', 'GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
      for (const payload of [body, NO_BODY, null, 'texto', [], { ...body, email: { $ne: null } }]) {
        setup(flag)
        const res = await call(payload, method)
        assert.equal(res.statusCode, 404, `flag ${String(flag)} ${method}`)
        assert.deepEqual(res.body, { error: 'No encontrado' })
        untouched()
      }
    }
  }
})

test('with the flag on, a body that is missing or not an object is refused with 400 and does no work', async () => {
  for (const payload of [NO_BODY, null, 'texto', 42, [], { ...body, password: 12345678 }, { ...body, password: { length: 12 } }, { ...body, slug: ['the-gentleman'] }, { ...body, slug: 'the-gentleman\n' }, { ...body, nombreComercio: '   ' }]) {
    setup()
    const res = await call(payload)
    assert.equal(res.statusCode, 400, String(JSON.stringify(payload)))
    untouched()
  }
})

test('the request text only ever travels as parameters: the statement is the same for hostile input', async () => {
  setup()
  await call()
  const normal = auth.sql[0].query
  const hostile = {
    ...body,
    nombreComercio: "x', 'y', '#000', 'pro', true); DROP TABLE public.comercios; --",
    slug: 'otro-slug',
    colorPrimario: "'); DELETE FROM public.admin_users; --",
    nombreAdmin: "Robert'); UPDATE public.admin_users SET rol = 'admin'; --",
    email: "o'brien+x@example.com",
  }
  setup()
  const res = await call(hostile)
  assert.equal(res.statusCode, 200)
  assert.equal(auth.sql.length, 1)
  assert.equal(auth.sql[0].query, normal, 'the SQL text does not depend on the request')
  assert.deepEqual(auth.sql[0].params, [hostile.nombreComercio, 'otro-slug', hostile.colorPrimario, auth.created[0].id, hostile.nombreAdmin, "o'brien+x@example.com"])
  assert.ok(!/\$\{|\+ ?nombre|\+ ?slug/.test(normal))
  // A color that is not text falls back to the default instead of reaching the statement.
  setup()
  await call({ ...body, colorPrimario: { toString: () => "x'); DROP" } })
  assert.equal(auth.sql[0].params[2], '#D4AF37')
})

test('the statement makes the new user the admin of the new shop, on the trial plan and active', async () => {
  setup()
  await call()
  const query = auth.sql[0].query.replace(/\s+/g, ' ').trim()
  assert.ok(query.includes("INSERT INTO public.comercios (nombre, slug, color_primario, plan, activo) VALUES ($1, $2, $3, 'trial', true) RETURNING id"), query)
  assert.ok(query.includes("INSERT INTO public.admin_users (id, comercio_id, rol, nombre, email, activo) SELECT $4::uuid, comercio.id, 'admin', $5::text, $6::text, true FROM comercio RETURNING id"), query)
  assert.ok(query.endsWith('SELECT (SELECT id FROM comercio) AS comercio_id, (SELECT count(*) FROM cuenta)::int AS cuentas'), query)
})

test('two sign-ups with the same email at the same time: one account, and the loser deletes nothing', async () => {
  setup()
  const results = await Promise.all([call(), call({ ...body, slug: 'otro-slug', email: ' LUIS.DIAZ@example.com ' })])
  assert.deepEqual(results.map((res) => res.statusCode).sort(), [200, 409])
  assert.deepEqual(auth.deleted, [], "the winner's auth user was not deleted by the loser")
  assert.equal(auth.users.length, 1)
  assert.equal(db.tables.comercios.length, 2, 'one new shop')
  assert.deepEqual(db.tables.admin_users.filter((a) => a.id === auth.users[0].id).length, 1)
})

test('two sign-ups with the same slug at the same time: one shop, and the loser removes only its own user', async () => {
  setup()
  const results = await Promise.all([call(), call({ ...body, email: 'otra@example.com' })])
  assert.deepEqual(results.map((res) => res.statusCode).sort(), [200, 500])
  const loser = results.find((res) => res.statusCode === 500)
  assert.deepEqual(loser.body, { error: 'No se pudo registrar la barbería. Intenta de nuevo.' })
  assert.equal(auth.deleted.length, 1)
  assert.equal(auth.users.length, 1)
  assert.ok(!auth.deleted.includes(auth.users[0].id), 'the winner keeps its user')
  assert.equal(db.tables.comercios.filter((c) => c.slug === 'the-gentleman').length, 1)
  assert.equal(db.tables.admin_users.length, 2, 'the existing admin and the new one')
  assert.equal(db.tables.admin_users[1].id, auth.users[0].id)
})
