require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
process.env.INSFORGE_INTERNAL_URL = 'https://session.example'
process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = 'public-key'
let createPagesServerClient
test.before(async () => {
  // The SDK's shared schema package exports ESM only; production is bundled.
  const sdk = await import('@insforge/sdk')
  const sdkFile = require.resolve('@insforge/sdk')
  require.cache[sdkFile] = { id: sdkFile, filename: sdkFile, loaded: true, exports: sdk }
  ;({ createPagesServerClient } = require('../src/lib/supabase-server.ts'))
})
const user = { id: '4ce7e112-12a7-4909-b922-59fa1fdafc0b', email: 'session@example.com' }

for (const oldToken of [null, 'expired-access']) {
  test(`server renews and persists session with ${oldToken ? 'expired' : 'missing'} access cookie using real SDK`, async () => {
    const requests = []
    global.fetch = async (url, options) => {
      const path = new URL(url).pathname
      const auth = new Headers(options.headers).get('Authorization')
      requests.push({ path, auth })
      if (path === '/api/auth/refresh') {
        assert.deepEqual(JSON.parse(options.body), { refresh_token: 'valid-refresh' })
        assert.equal(new URL(url).searchParams.get('client_type'), 'mobile')
        return Response.json({ accessToken: 'new-access', refreshToken: 'new-refresh', user })
      }
      assert.equal(path, '/api/auth/sessions/current')
      return auth === 'Bearer new-access'
        ? Response.json({ user })
        : Response.json({ error: 'INVALID_TOKEN', message: 'Expired' }, { status: 401 })
    }
    const headers = {}
    const res = { getHeader: key => headers[key], setHeader: (key, value) => { headers[key] = value } }
    const req = { headers: { cookie: `insforge_refresh_token=valid-refresh${oldToken ? '; insforge_access_token=' + oldToken : ''}` } }
    const result = await createPagesServerClient(req, res).auth.getSession()
    assert.equal(result.data.session.user.id, user.id)
    assert.equal(result.data.session.access_token, 'new-access')
    assert.equal(requests.filter(r => r.path === '/api/auth/refresh').length, 1)
    assert.equal(requests.at(-1).auth, 'Bearer new-access')
    assert.ok(headers['Set-Cookie'].some(c => c.startsWith('insforge_access_token=new-access;') && c.includes('HttpOnly')))
    assert.ok(headers['Set-Cookie'].some(c => c.startsWith('insforge_refresh_token=new-refresh;') && c.includes('HttpOnly')))
    assert.ok(headers['Set-Cookie'].every(c => !c.includes('Max-Age=0')))
  })
}

test('invalid refresh token returns no session and clears stale cookies', async () => {
  global.fetch = async () => Response.json({ error: 'INVALID_REFRESH_TOKEN' }, { status: 401 })
  const headers = {}
  const res = { getHeader: key => headers[key], setHeader: (key, value) => { headers[key] = value } }
  const result = await createPagesServerClient({ headers: { cookie: 'insforge_refresh_token=invalid' } }, res).auth.getSession()
  assert.equal(result.data.session, null)
  assert.ok(headers['Set-Cookie'].every(c => c.includes('Max-Age=0')))
})

// --- An auth backend that does not answer is "unavailable", not "signed out" ---

const { mock } = require('node:test')
const { createResponse } = require('./fake-db.cjs')
const down = async () => { throw new TypeError('fetch failed') }
const refused = async () => Response.json({ error: 'INVALID_REFRESH_TOKEN' }, { status: 401 })
const cookies = (res) => res.getHeader('Set-Cookie')
const BOTH = 'insforge_refresh_token=valid-refresh; insforge_access_token=expired-access'
const REFRESH_ONLY = 'insforge_refresh_token=valid-refresh'

// The SDK waits between retries of a failed GET: those waits run on mocked time.
async function settled(start) {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    let done = false
    const promise = start().finally(() => { done = true })
    while (!done) {
      mock.timers.tick(1000)
      await new Promise((resolve) => setImmediate(resolve))
    }
    return await promise
  } finally {
    mock.timers.reset()
  }
}

async function getSession(cookie) {
  const res = createResponse()
  const result = await settled(() => createPagesServerClient({ headers: { cookie } }, res).auth.getSession())
  return { result, res }
}

async function sessionRoute(headers) {
  const handler = require('../src/pages/api/auth/session.ts').default
  const res = createResponse()
  await settled(() => handler({ method: 'GET', headers }, res))
  return res
}

async function silently(run) {
  const realError = console.error
  console.error = () => {}
  try { return await run() } finally { console.error = realError }
}

for (const [name, respond] of [
  ['a network failure', down],
  ['a 503', async () => Response.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 })],
  ['a 429', async () => Response.json({ error: 'RATE_LIMITED' }, { status: 429 })],
]) {
  test(`${name} while refreshing keeps both cookies and reports the session as unavailable`, async () => {
    global.fetch = respond
    const { result, res } = await getSession(REFRESH_ONLY)
    assert.equal(result.unavailable, true)
    assert.equal(result.data.session, null)
    assert.equal(cookies(res), undefined, 'no cookie is cleared or replaced')
  })
}

test('with the auth backend down, an expired access token is not a sign-out and no refresh is attempted', async () => {
  for (const respond of [down, async () => Response.json({ error: 'BAD_GATEWAY' }, { status: 502 })]) {
    const paths = []
    global.fetch = async (url) => { paths.push(new URL(url).pathname); return respond() }
    const { result, res } = await getSession(BOTH)
    assert.equal(result.unavailable, true)
    assert.equal(result.data.session, null)
    assert.equal(cookies(res), undefined)
    assert.ok(paths.length > 0 && paths.every((path) => path === '/api/auth/sessions/current'), 'the refresh token is not sent to a backend that is not answering')
  }
})

test('a refresh that works but cannot be confirmed leaves the cookies as they were', async () => {
  global.fetch = async (url) => new URL(url).pathname === '/api/auth/refresh'
    ? Response.json({ accessToken: 'new-access', refreshToken: 'new-refresh', user })
    : down()
  const { result, res } = await getSession(REFRESH_ONLY)
  assert.equal(result.unavailable, true)
  assert.equal(result.data.session, null)
  assert.equal(cookies(res), undefined)
})

test('a refused refresh is still an answer: no session, cookies cleared, not unavailable', async () => {
  global.fetch = refused
  const { result, res } = await getSession('insforge_refresh_token=invalid')
  assert.equal(result.unavailable, undefined)
  assert.equal(result.data.session, null)
  assert.ok(cookies(res).every((c) => c.includes('Max-Age=0')))
})

test('/api/auth/session answers 503 and keeps the cookies when the auth backend is down', async () => {
  global.fetch = down
  for (const cookie of [REFRESH_ONLY, BOTH]) {
    const res = await sessionRoute({ cookie })
    assert.equal(res.statusCode, 503)
    assert.equal(typeof res.body.error, 'string')
    assert.equal('session' in res.body, false, 'never "session: null", which the browser reads as signed out')
    assert.equal(cookies(res), undefined)
    assert.equal(res.getHeader('Cache-Control'), 'no-store, no-cache, must-revalidate')
  }
})

test('/api/auth/session answers 503 when the session cannot be checked at all', async () => {
  const res = await silently(() => sessionRoute({ get cookie() { throw new Error('unreadable request') } }))
  assert.equal(res.statusCode, 503)
  assert.equal('session' in res.body, false)
})

test('/api/auth/session still answers 200 with the session, and 200 with null after a refusal', async () => {
  global.fetch = async (url, options) => new Headers(options.headers).get('Authorization') === 'Bearer good-access'
    ? Response.json({ user })
    : Response.json({ error: 'INVALID_TOKEN' }, { status: 401 })
  let res = await sessionRoute({ cookie: 'insforge_access_token=good-access; insforge_refresh_token=valid-refresh' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { session: { user, access_token: 'good-access', refresh_token: '', expires_at: 0, expires_in: 0, token_type: 'bearer' } })
  assert.equal(cookies(res), undefined)
  assert.equal(res.getHeader('Cache-Control'), 'no-store, no-cache, must-revalidate')

  res = await sessionRoute({ cookie: 'insforge_refresh_token=invalid' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { session: null })
  assert.ok(cookies(res).every((c) => c.includes('Max-Age=0')))
})

test('requireStaff answers 503 when the auth backend is down, and still 401 after a refusal', async () => {
  const { requireStaff } = require('../src/lib/server-authorization.ts')
  await silently(async () => {
    global.fetch = down
    let res = createResponse()
    assert.equal(await settled(() => requireStaff({ headers: { cookie: REFRESH_ONLY } }, res, ['admin'])), null)
    assert.equal(res.statusCode, 503)
    assert.deepEqual(res.body, { error: 'No se pudo verificar el acceso', message: 'No se pudo verificar el acceso' })
    assert.equal(cookies(res), undefined)

    global.fetch = refused
    res = createResponse()
    assert.equal(await settled(() => requireStaff({ headers: { cookie: 'insforge_refresh_token=invalid' } }, res, ['admin'])), null)
    assert.equal(res.statusCode, 401)
    assert.ok(cookies(res).every((c) => c.includes('Max-Age=0')))
  })
})
