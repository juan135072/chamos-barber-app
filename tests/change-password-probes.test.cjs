// Verifier probes for the attempt limit of POST /api/auth/change-password (S6).
// Same harness as tests/change-password.test.cjs: the real route and the real
// auth helpers over an in-memory auth.users behind a stubbed rawsql endpoint.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')
const { createFakeDb, createResponse, stubModule } = require('./fake-db.cjs')

process.env.NEXT_PUBLIC_INSFORGE_BASE_URL = 'https://insforge.invalid'
process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = 'public-anon'
process.env.INSFORGE_API_KEY = 'ik_test_nonsecret'

const TENANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const SELF = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const ACTUAL = 'Actual!2345'
const NUEVA = 'Nueva!23456'

let db
let users = []
let sql = []
let failSql = null
// Three sessions of the same user (two bearers and a cookie) and one of another user.
const sessions = { phone: { id: SELF }, laptop: { id: SELF }, other: { id: OTHER } }

stubModule('@insforge/sdk', { createClient() { throw new Error('SDK client not used in these tests') } })
stubModule('../src/lib/supabase-server.ts', {
  createPagesAdminClient: () => db,
  async getUserFromBearer(token) { return { data: { user: sessions[token] ?? null }, error: null } },
  createPagesServerClient: (req) => ({ auth: { async getSession() {
    return { data: { session: req.headers.cookie?.includes('insforge_access_token=self') ? { user: { id: SELF } } : null } }
  } } }),
})
stubModule('../src/lib/security/logger.ts', { logRateLimitExceeded() {} })
const { clearRateLimitStore, getRateLimitStats } = require('../src/lib/security/rateLimit.ts')

global.fetch = async (url, options) => {
  const { query, params } = JSON.parse(options.body)
  sql.push({ query, params })
  if (failSql && failSql.test(query)) return new Response('upstream down', { status: 502 })
  let rows = []
  if (/SELECT password FROM auth\.users WHERE id = \$1/.test(query)) {
    rows = users.filter((u) => u.id === params[0]).map((u) => ({ password: u.password }))
  } else if (/FROM auth\.users WHERE id = \$1/.test(query)) {
    rows = users.filter((u) => u.id === params[0]).map(({ password, ...user }) => user)
  } else if (/UPDATE auth\.users SET password = \$2/.test(query)) {
    const user = users.find((u) => u.id === params[0] && !u.is_project_admin)
    if (user) { user.password = params[1]; rows = [{ id: user.id }] }
  } else {
    throw new Error(`unexpected SQL in test: ${query}`)
  }
  return new Response(JSON.stringify({ rows, rowCount: rows.length }), { status: 200, headers: { 'content-type': 'application/json' } })
}

const handler = require('../src/pages/api/auth/change-password.ts').default

function setup() {
  clearRateLimitStore()
  sql = []
  failSql = null
  users = [
    { id: SELF, email: 'ana@chamos.test', password: bcrypt.hashSync(ACTUAL, 4), is_project_admin: false },
    { id: OTHER, email: 'otro@chamos.test', password: bcrypt.hashSync(ACTUAL, 4), is_project_admin: false },
  ]
  db = createFakeDb({ tables: { admin_users: [
    { id: SELF, email: 'ana@chamos.test', rol: 'barbero', activo: true, comercio_id: TENANT, barbero_id: 'b1' },
    { id: OTHER, email: 'otro@chamos.test', rol: 'barbero', activo: true, comercio_id: TENANT, barbero_id: 'b2' },
  ] } })
}

const PHONE = { authorization: 'Bearer phone' }
const LAPTOP = { authorization: 'Bearer laptop' }
const COOKIE = { cookie: 'insforge_access_token=self' }
const AS_OTHER = { authorization: 'Bearer other' }

async function call(body, headers = PHONE) {
  const res = createResponse()
  const realWarn = console.warn
  const realError = console.error
  console.warn = () => {}
  console.error = () => {}
  try { await handler({ method: 'POST', headers, body }, res) } finally { console.warn = realWarn; console.error = realError }
  return res
}

const wrong = { currentPassword: 'Incorrecta!1', newPassword: NUEVA }
const right = { currentPassword: ACTUAL, newPassword: NUEVA }
const comparisons = () => sql.filter(({ query }) => /SELECT password FROM auth\.users/.test(query))
const hashOf = (id) => users.find((u) => u.id === id).password

test('every session of the same user counts against one limit (two bearers and a cookie session)', async () => {
  setup()
  assert.equal((await call(wrong, PHONE)).statusCode, 401)
  assert.equal((await call(wrong, LAPTOP)).statusCode, 401)
  assert.equal((await call(wrong, COOKIE)).statusCode, 401)
  assert.equal((await call(wrong, LAPTOP)).statusCode, 401)
  assert.equal((await call(wrong, PHONE)).statusCode, 401)
  for (const headers of [PHONE, LAPTOP, COOKIE]) {
    const res = await call(right, headers)
    assert.equal(res.statusCode, 429, 'a second session does not get its own five attempts')
  }
  assert.equal(comparisons().length, 5)
  assert.ok(bcrypt.compareSync(ACTUAL, hashOf(SELF)))
})

test('changing the body neither gets around the limit nor resets it', async () => {
  setup()
  for (let i = 0; i < 5; i++) assert.equal((await call({ currentPassword: `Otra!${i}xxxx`, newPassword: `Nueva!${i}xxxx` })).statusCode, 401)
  sql = []
  for (const body of [
    right,
    { ...right, userId: SELF },
    { ...right, extra: 'x', attempt: 0, reset: true },
    { currentPassword: ACTUAL, newPassword: 'Distinta!9876' },
  ]) assert.equal((await call(body)).statusCode, 429)
  // Requests refused before the check stay refused the same way and do not free the user.
  assert.equal((await call({ ...right, userId: ` ${SELF}` })).statusCode, 403)
  assert.equal((await call({ ...right, userId: OTHER })).statusCode, 403)
  assert.equal((await call({ currentPassword: ACTUAL })).statusCode, 400)
  assert.equal((await call(right)).statusCode, 429)
  assert.deepEqual(sql, [], 'nothing was compared or written while limited')
})

test('another signed-in user cannot use up the attempts of a colleague, nor lock them out', async () => {
  setup()
  for (let i = 0; i < 12; i++) {
    const res = await call({ userId: SELF, currentPassword: 'Incorrecta!1', newPassword: NUEVA }, AS_OTHER)
    assert.equal(res.statusCode, 403)
  }
  // The other user's own wrong guesses do not touch SELF either.
  for (let i = 0; i < 5; i++) assert.equal((await call(wrong, AS_OTHER)).statusCode, 401)
  assert.equal((await call(wrong, AS_OTHER)).statusCode, 429)
  for (let i = 0; i < 4; i++) assert.equal((await call(wrong, PHONE)).statusCode, 401, 'SELF still has its five attempts')
  assert.equal((await call(right, PHONE)).statusCode, 200)
  assert.ok(bcrypt.compareSync(NUEVA, hashOf(SELF)))
  assert.ok(bcrypt.compareSync(ACTUAL, hashOf(OTHER)))
})

test('requests that arrive together from several sessions cannot get past the limit', async () => {
  setup()
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) => call(i === 11 ? right : wrong, [PHONE, LAPTOP, COOKIE][i % 3])))
  const codes = results.map((res) => res.statusCode)
  assert.equal(codes.filter((code) => code === 429).length, 7)
  assert.equal(comparisons().length, 5, 'only five passwords were compared')
  assert.ok(bcrypt.compareSync(ACTUAL, hashOf(SELF)), 'the right password sent as the 12th request was not accepted')
})

test('the store keeps one entry per limited user and none after a success', async () => {
  setup()
  for (let i = 0; i < 30; i++) await call(wrong, [PHONE, LAPTOP, COOKIE][i % 3])
  assert.equal(getRateLimitStats().storeSize, 1, '30 attempts of one user are one entry')
  for (let i = 0; i < 3; i++) await call(wrong, AS_OTHER)
  assert.equal(getRateLimitStats().storeSize, 2)
  assert.equal((await call(right, AS_OTHER)).statusCode, 200)
  assert.equal(getRateLimitStats().storeSize, 1, 'a success removes the entry')
  // Requests without a session, or refused before the check, add nothing.
  for (let i = 0; i < 20; i++) {
    await call(wrong, { authorization: `Bearer unknown-${i}` })
    await call({ ...wrong, userId: `99999999-9999-4999-8999-${String(i).padStart(12, '0')}` }, AS_OTHER)
    await call(wrong, {})
  }
  assert.equal(getRateLimitStats().storeSize, 1)
})

test('the 15 minutes run from the first attempt, however the other four are spread', async () => {
  const { mock } = require('node:test')
  setup()
  mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 10, 24, 15, 0, 0) })
  try {
    assert.equal((await call(wrong)).statusCode, 401) // 15:00
    for (let i = 0; i < 4; i++) {
      mock.timers.tick(3 * 60 * 1000)
      assert.equal((await call(wrong)).statusCode, 401) // 15:03, 15:06, 15:09, 15:12
    }
    mock.timers.tick(2 * 60 * 1000) // 15:14
    const limited = await call(right)
    assert.equal(limited.statusCode, 429)
    assert.equal(limited.getHeader('Retry-After'), '60', 'one minute left, counted from the first attempt')
    mock.timers.tick(60 * 1000) // 15:15
    assert.equal((await call(wrong)).statusCode, 401, 'a new window starts 15 minutes after the first attempt')
    // The refused request did not extend anything, and the new window is counted from 15:15.
    mock.timers.tick(14 * 60 * 1000) // 15:29
    for (let i = 0; i < 4; i++) assert.equal((await call(wrong)).statusCode, 401)
    assert.equal((await call(right)).getHeader('Retry-After'), '60')
  } finally {
    mock.timers.reset()
  }
})

// The verifier's advisory probe pinned that five failed checks left the user
// limited. The rule changed: a check that could not run gives its attempt
// back, so only wrong-password answers count.
test('a check that could not run (backend or database error) gives its attempt back', async () => {
  for (const [failing, status] of [
    [/SELECT id, email/, 404], // the user lookup fails
    [/SELECT password FROM auth\.users/, 500], // the comparison cannot run
    [/UPDATE auth\.users/, 500], // the right password, but the new one cannot be saved
  ]) {
    setup()
    failSql = failing
    for (let i = 0; i < 8; i++) assert.equal((await call(right)).statusCode, status, String(failing))
    assert.equal(getRateLimitStats().storeSize, 0, 'nothing stays counted')
    failSql = null
    assert.equal((await call(right)).statusCode, 200, 'the right password works as soon as the backend does')
    assert.ok(bcrypt.compareSync(NUEVA, hashOf(SELF)))
  }
})

test('a backend error between wrong guesses gives back only its own attempt', async () => {
  setup()
  for (let i = 0; i < 4; i++) assert.equal((await call(wrong)).statusCode, 401)
  failSql = /SELECT password FROM auth\.users/
  for (let i = 0; i < 3; i++) assert.equal((await call(wrong)).statusCode, 500)
  failSql = null
  assert.equal((await call(wrong)).statusCode, 401, 'the fifth wrong guess is still checked')
  assert.equal((await call(right)).statusCode, 429, 'and the limit holds after it')
  assert.ok(bcrypt.compareSync(ACTUAL, hashOf(SELF)))
})
