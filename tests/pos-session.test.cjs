require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
let native = { accessToken: 'header.' + Buffer.from(JSON.stringify({ exp: 1 })).toString('base64url') + '.signature', user: { id: 'cashier' } }
const sdkFile = require.resolve('../src/lib/supabase.ts')
require.cache[sdkFile] = { id: sdkFile, filename: sdkFile, loaded: true, exports: { supabase: { _insforge: { tokenManager: { getSession: () => native, saveSession: value => { native = value } } } } } }
const { posRequest } = require('../src/lib/pos-client.ts')
test('POS restores expired access before sending a payment request', async () => {
  global.window = {}
  const paths = []
  global.fetch = async (path, options) => {
    paths.push(path)
    if (path === '/api/auth/session') return Response.json({ session: { user: { id: 'cashier' }, access_token: 'fresh-access' } })
    assert.equal(options.headers.Authorization, 'Bearer fresh-access')
    assert.deepEqual(JSON.parse(options.body), { request_id: 'sale-id' })
    return Response.json({ success: true })
  }
  assert.deepEqual(await posRequest('/api/pos/registrar-venta', { request_id: 'sale-id' }), { success: true })
  assert.deepEqual(paths, ['/api/auth/session', '/api/pos/registrar-venta'])
})
