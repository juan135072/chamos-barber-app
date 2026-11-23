// Coming back to the app with a flaky network must not look like a logout.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')

let native = null
let respond = async () => { throw new Error('offline') }
const token = (exp) => 'header.' + Buffer.from(JSON.stringify({ exp })).toString('base64url') + '.signature'
const fresh = { user: { id: 'barbero-user' }, access_token: token(Math.floor(Date.now() / 1000) + 900) }

global.window = {}
global.fetch = (...args) => respond(...args)
const sdkFile = require.resolve('../src/lib/supabase.ts')
require.cache[sdkFile] = { id: sdkFile, filename: sdkFile, loaded: true, exports: { supabase: { _insforge: { tokenManager: { getSession: () => native, saveSession: (value) => { native = value } } } } } }
const { checkAppSession, getAppSession, isSameSession, isNoRowsError } = require('../src/lib/app-session.ts')

const reply = (status, body) => async () => ({ status, ok: status >= 200 && status < 300, json: async () => body })

async function quietly(run) {
  const realWarn = console.warn
  console.warn = () => {}
  try { return await run() } finally { console.warn = realWarn }
}

test('a network failure is "unknown", not signed out', async () => {
  native = null
  respond = async () => { throw new TypeError('Failed to fetch') }
  assert.deepEqual(await quietly(checkAppSession), { status: 'unknown' })
  // Older callers still get null from getAppSession().
  assert.equal(await quietly(getAppSession), null)
})

test('server or proxy errors are "unknown"; only an answer means signed out', async () => {
  native = null
  respond = reply(503, { error: 'Service Unavailable' })
  assert.deepEqual(await checkAppSession(), { status: 'unknown' })
  respond = async () => ({ status: 200, ok: true, json: async () => { throw new SyntaxError('Unexpected token <') } })
  assert.deepEqual(await quietly(checkAppSession), { status: 'unknown' })
  respond = reply(401, { error: 'Unauthorized' })
  assert.deepEqual(await checkAppSession(), { status: 'signed-out' })
  respond = reply(200, { session: null })
  assert.deepEqual(await checkAppSession(), { status: 'signed-out' })
})

test('a restored session is signed in and hydrates the in-memory token', async () => {
  native = null
  respond = reply(200, { session: fresh })
  const result = await checkAppSession()
  assert.equal(result.status, 'signed-in')
  assert.equal(result.session.user.id, 'barbero-user')
  assert.equal(native.accessToken, fresh.access_token)
})

test('the session only counts as changed when the user or token changes', () => {
  const a = { user: { id: 'u1' }, access_token: 't1', expires_in: 0 }
  assert.equal(isSameSession(a, { user: { id: 'u1' }, access_token: 't1', expires_in: 900 }), true)
  assert.equal(isSameSession(a, { user: { id: 'u1' }, access_token: 't2' }), false)
  assert.equal(isSameSession(a, { user: { id: 'u2' }, access_token: 't1' }), false)
  assert.equal(isSameSession(null, null), true)
  assert.equal(isSameSession(undefined, null), false)
  assert.equal(isSameSession(a, null), false)
})

test('only a PostgREST "no rows" error is a real not-found', () => {
  assert.equal(isNoRowsError({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }), true)
  assert.equal(isNoRowsError({ code: '', message: 'TypeError: Failed to fetch' }), false)
  assert.equal(isNoRowsError(null), false)
})
