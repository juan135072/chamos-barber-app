// Verifier probes for "an unreachable auth backend is unavailable, not signed out".
// Same approach as tests/server-session.test.cjs: the real SDK over a scripted fetch.
require('./load-typescript.cjs')
const test = require('node:test')
const { mock } = require('node:test')
const assert = require('node:assert/strict')
const { createResponse } = require('./fake-db.cjs')
process.env.INSFORGE_INTERNAL_URL = 'https://session.example'
process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = 'public-key'
process.env.INSFORGE_API_KEY = 'ik_test_nonsecret'

let createPagesServerClient
let requireStaff
let sessionRoute
test.before(async () => {
  const sdk = await import('@insforge/sdk')
  const sdkFile = require.resolve('@insforge/sdk')
  require.cache[sdkFile] = { id: sdkFile, filename: sdkFile, loaded: true, exports: sdk }
  ;({ createPagesServerClient } = require('../src/lib/supabase-server.ts'))
  ;({ requireStaff } = require('../src/lib/server-authorization.ts'))
  sessionRoute = require('../src/pages/api/auth/session.ts').default
})

const USER = { id: '4ce7e112-12a7-4909-b922-59fa1fdafc0b', email: 'session@example.com' }
const STAFF = { id: USER.id, email: USER.email, rol: 'admin', activo: true, comercio_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }
const BOTH = 'insforge_access_token=good-access; insforge_refresh_token=valid-refresh'
const REFRESH_ONLY = 'insforge_refresh_token=valid-refresh'
const cookies = (res) => res.getHeader('Set-Cookie')

const json = (body, status = 200) => Response.json(body, { status })
const netfail = () => { throw new TypeError('fetch failed') }
// Never answers until the caller aborts, like a connection that hangs.
const hang = (options) => new Promise((resolve, reject) => {
  options.signal?.addEventListener('abort', () => reject(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })))
})
const goodCurrent = (auth) => (auth === 'Bearer good-access' || auth === 'Bearer new-access' ? json({ user: USER }) : json({ error: 'INVALID_TOKEN', message: 'Expired' }, 401))
const goodRefresh = () => json({ accessToken: 'new-access', refreshToken: 'new-refresh', user: USER })

function backend({ current = goodCurrent, refresh = goodRefresh } = {}) {
  const seen = { records: 0 }
  global.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname
    if (path === '/api/auth/sessions/current') return current(new Headers(options.headers).get('Authorization'), options)
    if (path === '/api/auth/refresh') return refresh(options)
    if (path.startsWith('/api/database/records/')) { seen.records++; return json([STAFF]) }
    throw new Error(`unexpected request ${path}`)
  }
  return seen
}

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
async function silently(run) {
  const realError = console.error
  const logged = []
  console.error = (...args) => logged.push(args.map(String).join(' '))
  try { return [await run(), logged] } finally { console.error = realError }
}

const unavailableBackends = [
  ['the first check hangs until the SDK gives up (408)', BOTH, { current: (auth, options) => hang(options) }],
  ['the refresh hangs until the SDK gives up (408)', REFRESH_ONLY, { refresh: (options) => hang(options) }],
  ['the first check answers 500 with a detail', BOTH, { current: () => json({ error: 'INTERNAL', message: 'pg: password authentication failed for user "postgres"' }, 500) }],
  ['the first check answers 429', BOTH, { current: () => json({ error: 'RATE_LIMITED', message: 'slow down' }, 429) }],
  ['the refresh answers 504 from a proxy', REFRESH_ONLY, { refresh: () => new Response('<html>Gateway Timeout</html>', { status: 504, headers: { 'content-type': 'text/html' } }) }],
  ['the refresh works but the new token cannot be confirmed (429)', REFRESH_ONLY, { current: () => json({ error: 'RATE_LIMITED', message: 'slow down' }, 429) }],
  ['the network is down', BOTH, { current: netfail, refresh: netfail }],
]

for (const [name, cookie, spec] of unavailableBackends) {
  test(`when ${name}: the session route answers 503, requireStaff lets nobody in, and both keep the cookies`, async () => {
    backend(spec)
    let res = createResponse()
    const [, routeLog] = await silently(() => settled(() => sessionRoute({ method: 'GET', headers: { cookie } }, res)))
    assert.equal(res.statusCode, 503)
    assert.deepEqual(res.body, { error: 'No se pudo verificar la sesión' })
    assert.equal(cookies(res), undefined)
    assert.equal(res.getHeader('Cache-Control'), 'no-store, no-cache, must-revalidate')

    const seen = backend(spec)
    res = createResponse()
    const [actor, staffLog] = await silently(() => settled(() => requireStaff({ headers: { cookie } }, res, ['admin', 'cajero', 'barbero'])))
    assert.equal(actor, null, 'the caller of requireStaff must stop')
    assert.equal(res.statusCode, 503)
    assert.deepEqual(res.body, { error: 'No se pudo verificar el acceso', message: 'No se pudo verificar el acceso' })
    assert.equal(cookies(res), undefined)
    assert.equal(seen.records, 0, 'the staff row is not even read')
    // Nothing from the backend reaches the browser or the log line.
    const visible = JSON.stringify([res.body, routeLog, staffLog])
    assert.doesNotMatch(visible, /postgres|slow down|Gateway|fetch failed|aborted/)
  })
}

test('every refusal still ends the session: 400, 401 and 403 on the refresh clear both cookies', async () => {
  for (const status of [400, 401, 403]) {
    backend({ refresh: () => json({ error: 'REFUSED', message: 'no' }, status) })
    const res = createResponse()
    await settled(() => sessionRoute({ method: 'GET', headers: { cookie: REFRESH_ONLY } }, res))
    assert.equal(res.statusCode, 200, `status ${status}`)
    assert.deepEqual(res.body, { session: null })
    assert.deepEqual(cookies(res).map((c) => c.split(';')[0]), ['insforge_access_token=', 'insforge_refresh_token='])
    assert.ok(cookies(res).every((c) => c.includes('Max-Age=0')))
  }
})

test('a session that was unavailable is restored as usual once the backend answers again', async () => {
  backend({ current: netfail, refresh: netfail })
  let res = createResponse()
  await settled(() => sessionRoute({ method: 'GET', headers: { cookie: REFRESH_ONLY } }, res))
  assert.equal(res.statusCode, 503)
  // The browser still has its refresh cookie, so the next check renews the session.
  backend()
  res = createResponse()
  await settled(() => sessionRoute({ method: 'GET', headers: { cookie: REFRESH_ONLY } }, res))
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.session.user.id, USER.id)
  assert.equal(res.body.session.access_token, 'new-access')
  assert.ok(cookies(res).some((c) => c.startsWith('insforge_access_token=new-access;')))
})
