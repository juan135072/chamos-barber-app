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
