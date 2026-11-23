// A staff member changes their own password from their panel. The route runs
// with the real auth helpers of src/lib/insforge-admin.ts over an in-memory
// auth.users table behind a stubbed rawsql endpoint.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const bcrypt = require('bcryptjs')
const { createFakeDb, createResponse, stubModule } = require('./fake-db.cjs')
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)
const React = require('react')

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
const sessions = { valid: { id: SELF, email: 'ana@chamos.test' } }

stubModule('@insforge/sdk', { createClient() { throw new Error('SDK client not used in these tests') } })
stubModule('../src/lib/supabase-server.ts', {
  createPagesAdminClient: () => db,
  async getUserFromBearer(token) { return { data: { user: sessions[token] ?? null }, error: null } },
  createPagesServerClient: () => ({ auth: { async getSession() { return { data: { session: null } } } } }),
})

// rawsql over auth.users: the three statements the password helpers send.
global.fetch = async (url, options) => {
  const { query, params } = JSON.parse(options.body)
  sql.push({ query, params })
  let rows = []
  if (/SELECT password FROM auth\.users WHERE id = \$1/.test(query)) {
    rows = users.filter((u) => u.id === params[0]).map((u) => ({ password: u.password }))
  } else if (/FROM auth\.users WHERE id = \$1/.test(query)) {
    rows = users.filter((u) => u.id === params[0]).map(({ password, ...user }) => user)
  } else if (/UPDATE auth\.users SET password = \$2/.test(query)) {
    const linked = (db.tables.admin_users || []).some((a) => a.id === params[0])
    const user = users.find((u) => u.id === params[0] && !u.is_project_admin && !(/NOT EXISTS/.test(query) && linked))
    if (user) { user.password = params[1]; rows = [{ id: user.id }] }
  } else {
    throw new Error(`unexpected SQL in test: ${query}`)
  }
  return new Response(JSON.stringify({ rows, rowCount: rows.length }), { status: 200, headers: { 'content-type': 'application/json' } })
}

const handler = require('../src/pages/api/auth/change-password.ts').default

function setup({ rol = 'barbero', activo = true, projectAdmin = false } = {}) {
  sql = []
  users = [
    { id: SELF, email: 'ana@chamos.test', password: bcrypt.hashSync(ACTUAL, 4), is_project_admin: projectAdmin },
    { id: OTHER, email: 'otro@chamos.test', password: bcrypt.hashSync(ACTUAL, 4), is_project_admin: false },
  ]
  db = createFakeDb({ tables: { admin_users: [
    { id: SELF, email: 'ana@chamos.test', rol, activo, comercio_id: TENANT, barbero_id: rol === 'barbero' ? 'b1' : null },
    { id: OTHER, email: 'otro@chamos.test', rol: 'barbero', activo: true, comercio_id: TENANT, barbero_id: 'b2' },
  ] } })
}

async function call(body, headers = { authorization: 'Bearer valid' }) {
  const res = createResponse()
  await handler({ method: 'POST', headers, body }, res)
  return res
}

const hashOf = (id) => users.find((u) => u.id === id).password
const writes = () => sql.filter(({ query }) => /UPDATE auth\.users/.test(query))

test('without a session the request gets a 401 and touches nothing', async () => {
  setup()
  const before = hashOf(SELF)
  const res = await call({ userId: SELF, currentPassword: ACTUAL, newPassword: NUEVA }, {})
  assert.equal(res.statusCode, 401)
  assert.deepEqual(sql, [])
  assert.equal(hashOf(SELF), before)
})

test("another user's id gets a 403, and that user's password is not checked or changed", async () => {
  setup()
  const before = hashOf(OTHER)
  const res = await call({ userId: OTHER, currentPassword: ACTUAL, newPassword: NUEVA })
  assert.equal(res.statusCode, 403)
  assert.match(res.body.error, /tu propia contraseña/)
  assert.deepEqual(sql, [])
  assert.equal(hashOf(OTHER), before)
})

test('a wrong current password gets a 401 and writes no hash', async () => {
  setup()
  const before = hashOf(SELF)
  const res = await call({ currentPassword: 'Incorrecta!1', newPassword: NUEVA })
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.error, 'La contraseña actual es incorrecta')
  assert.deepEqual(writes(), [])
  assert.equal(hashOf(SELF), before)
})

test('any active staff member changes their own password to a bcrypt hash of the new one', async () => {
  for (const [rol, body] of [
    ['barbero', { currentPassword: ACTUAL, newPassword: NUEVA }],
    ['cajero', { currentPassword: ACTUAL, newPassword: NUEVA }],
    ['admin', { userId: SELF, currentPassword: ACTUAL, newPassword: NUEVA }],
  ]) {
    setup({ rol })
    const other = hashOf(OTHER)
    const res = await call(body)
    assert.equal(res.statusCode, 200, rol)
    assert.deepEqual(res.body, { success: true, message: 'Contraseña cambiada exitosamente' })
    assert.equal(writes().length, 1)
    assert.equal(writes()[0].params[0], SELF)
    assert.ok(bcrypt.compareSync(NUEVA, hashOf(SELF)), 'the stored hash verifies the new password')
    assert.ok(!bcrypt.compareSync(ACTUAL, hashOf(SELF)), 'the old password no longer works')
    assert.equal(hashOf(OTHER), other)
  }
})

test('a project admin account is refused and keeps its password', async () => {
  setup({ rol: 'admin', projectAdmin: true })
  const before = hashOf(SELF)
  const res = await call({ currentPassword: ACTUAL, newPassword: NUEVA })
  assert.equal(res.statusCode, 403)
  assert.deepEqual(writes(), [])
  assert.equal(hashOf(SELF), before)
})

test('the existing validation still applies, and an inactive account is refused', async () => {
  setup()
  let res = await call({ currentPassword: ACTUAL, newPassword: 'corta' })
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.error, 'La nueva contraseña debe tener al menos 8 caracteres')
  res = await call({ newPassword: NUEVA })
  assert.equal(res.statusCode, 400)
  assert.match(res.body.error, /^Faltan datos/)
  assert.deepEqual(writes(), [])

  setup({ activo: false })
  res = await call({ currentPassword: ACTUAL, newPassword: NUEVA })
  assert.equal(res.statusCode, 403)
  assert.deepEqual(sql, [])
})

test('a new password longer than 72 bytes is refused, since bcrypt would ignore the rest', async () => {
  setup()
  const before = hashOf(SELF)
  for (const newPassword of ['A1!' + 'a'.repeat(70), 'Ñandú!1' + 'ñ'.repeat(33)]) {
    assert.ok(Buffer.byteLength(newPassword, 'utf8') > 72)
    const res = await call({ currentPassword: ACTUAL, newPassword })
    assert.equal(res.statusCode, 400)
    assert.match(res.body.error, /demasiado larga/)
  }
  assert.deepEqual(writes(), [])
  assert.equal(hashOf(SELF), before)
  const res = await call({ currentPassword: ACTUAL, newPassword: 'A1!' + 'a'.repeat(69) })
  assert.equal(res.statusCode, 200, 'exactly 72 bytes is accepted')
})

test('the panel form sends only the passwords, never a user id', async () => {
  stubModule('../src/lib/insforge-react.ts', { useSession: () => ({ user: { id: OTHER } }) })
  const toasts = []
  const toast = { success: (m) => toasts.push(['success', m]), error: (m) => toasts.push(['error', m]) }
  stubModule('react-hot-toast', Object.assign(toast, { default: toast }))
  const ChangePasswordSection = require('../src/components/barbero/ChangePasswordSection.tsx').default
  const values = [ACTUAL, NUEVA, NUEVA]
  let index = 0
  const originalState = React.useState
  React.useState = (initial) => { const i = index++; return [i < values.length ? values[i] : initial, () => {}] }
  let tree
  try { tree = ChangePasswordSection({}) } finally { React.useState = originalState }
  const find = (node) => {
    if (!node || typeof node !== 'object') return null
    if (node.type === 'form') return node
    return React.Children.toArray(node.props?.children).map(find).find(Boolean) || null
  }
  const savedFetch = global.fetch
  const sent = []
  global.fetch = async (url, options) => { sent.push([url, JSON.parse(options.body)]); return { ok: true, json: async () => ({ success: true }) } }
  try { await find(tree).props.onSubmit({ preventDefault() {} }) } finally { global.fetch = savedFetch }
  assert.deepEqual(sent, [['/api/auth/change-password', { currentPassword: ACTUAL, newPassword: NUEVA }]])
  assert.deepEqual(toasts.map(([kind]) => kind), ['success'])
})
