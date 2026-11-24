// Guards the zod override in package.json.
//
// @insforge/shared-schemas, which @insforge/sdk depends on, declares
// `zod ^3.23.8`. Every zod below 4.6.6 is affected by GHSA-mrhx-c7xc-m3w5, and
// 3.25.76 is the last 3.x release, so there is no patched zod 3. package.json
// therefore makes that package use the site's own zod 4
// (`"overrides": { "@insforge/shared-schemas": { "zod": "$zod" } }`) and pins
// @insforge/sdk to the version the override was checked against.
//
// Those schemas were written for zod 3 and now run on zod 4. SDK 1.2.7 reads
// them in one place, the provider list that decides which OAuth endpoint it
// calls, and never parses with them. Check that again before changing the
// @insforge/sdk version.
//
// Remove the override, the pin and this file when @insforge/shared-schemas
// declares a zod range that has a patched release.
const test = require('node:test')
const assert = require('node:assert/strict')
const lock = require('../package-lock.json')

const FIRST_PATCHED_ZOD = [4, 6, 6]

function isPatched(version) {
  // Pre-releases and anything that is not x.y.z count as unpatched.
  if (!/^\d+\.\d+\.\d+$/.test(version)) return false
  const parts = version.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (parts[i] !== FIRST_PATCHED_ZOD[i]) return parts[i] > FIRST_PATCHED_ZOD[i]
  }
  return true
}

test('every zod in the lockfile is a release patched for GHSA-mrhx-c7xc-m3w5', () => {
  const copies = Object.entries(lock.packages)
    .filter(([location]) => location === 'node_modules/zod' || location.endsWith('/node_modules/zod'))
    .map(([location, entry]) => ({ location, version: entry.version }))
  assert.ok(copies.length > 0, 'the lockfile has no zod entry')
  assert.deepEqual(copies.filter(copy => !isPatched(copy.version)), [])
})

test('the InsForge SDK still loads on that zod and sends built-in OAuth providers to their endpoint', async () => {
  // The SDK's shared schema package exports ESM only.
  const { createClient } = await import('@insforge/sdk')
  const { oAuthProvidersSchema } = await import('@insforge/shared-schemas')
  assert.equal(typeof createClient, 'function')
  assert.ok(oAuthProvidersSchema.options.includes('google'))

  // The client keeps the fetch that is global when it is created.
  const saved = global.fetch
  const paths = []
  global.fetch = async url => {
    paths.push(new URL(url).pathname)
    return Response.json({ authUrl: 'https://provider.invalid/authorize' })
  }
  try {
    // What lib/initSupabase.ts and src/lib/supabase-server.ts use on a client.
    const client = createClient({ baseUrl: 'https://insforge.invalid', anonKey: 'public-anon', isServerMode: true, autoRefreshToken: false })
    for (const method of ['signUp', 'signInWithPassword', 'signOut', 'refreshSession', 'getCurrentUser', 'signInWithOAuth', 'exchangeOAuthCode', 'sendResetPasswordEmail']) {
      assert.equal(typeof client.auth[method], 'function', `auth.${method}`)
    }
    for (const method of ['from', 'rpc']) assert.equal(typeof client.database[method], 'function', `database.${method}`)
    const bucket = client.storage.from('fotos')
    for (const method of ['upload', 'uploadAuto', 'download', 'list', 'remove', 'getPublicUrl']) {
      assert.equal(typeof bucket[method], 'function', `storage bucket ${method}`)
    }
    assert.equal(typeof client.setAccessToken, 'function')
    assert.equal(typeof client.tokenManager.getAccessToken, 'function')
    assert.ok(client.functions)
    assert.ok(client.realtime)

    const builtIn = await client.auth.signInWithOAuth({ provider: 'google', skipBrowserRedirect: true })
    const custom = await client.auth.signInWithOAuth({ provider: 'acme-sso', skipBrowserRedirect: true })
    assert.equal(builtIn.error, null)
    assert.equal(custom.error, null)
    assert.equal(builtIn.data.url, 'https://provider.invalid/authorize')
  } finally {
    global.fetch = saved
  }
  assert.deepEqual(paths, ['/api/auth/oauth/google', '/api/auth/oauth/custom/acme-sso'])
})
