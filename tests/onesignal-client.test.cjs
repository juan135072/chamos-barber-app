require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')

const clientFile = require.resolve('../src/lib/onesignal-client.ts')

// Fresh module state and a minimal DOM for every test (one page lifetime each).
function freshClient() {
  delete require.cache[clientFile]
  const scripts = []
  global.window = {}
  global.document = {
    querySelector: (selector) => scripts.find((script) => selector.includes(script.src)) || null,
    createElement: () => ({ remove() { scripts.splice(scripts.indexOf(this), 1) } }),
    head: { appendChild: (node) => scripts.push(node) },
  }
  return { client: require(clientFile), scripts }
}

function fakeSdk() {
  const calls = []
  return {
    calls,
    init: async (options) => { calls.push(['init', options.appId]) },
    login: async (id) => { calls.push(['login', id]) },
    logout: async () => { calls.push(['logout']) },
    Notifications: { permission: false },
    User: { addTags: async (tags) => { calls.push(['addTags', tags]) } },
  }
}

// What OneSignalSDK.page.js does once downloaded: drain the queue, then run later pushes at once.
function bootSdk(sdk) {
  const queue = global.window.OneSignalDeferred || []
  global.window.OneSignalDeferred = { push: (fn) => fn(sdk) }
  return Promise.all(queue.map((fn) => fn(sdk)))
}

test('the SDK script is added once and every caller shares one init', async () => {
  const { client, scripts } = freshClient()
  const sdk = fakeSdk()
  const first = client.loadOneSignal()
  assert.equal(client.loadOneSignal(), first)
  assert.equal(scripts.length, 1)
  assert.equal(scripts[0].src, client.ONESIGNAL_SDK_SRC)

  await bootSdk(sdk)
  assert.equal(await first, sdk)
  assert.equal(client.getReadyOneSignal(), sdk)
  assert.deepEqual(sdk.calls, [['init', client.ONESIGNAL_APP_ID]])
})

test('a failed download is retried later without a second init', async () => {
  const { client, scripts } = freshClient()
  const sdk = fakeSdk()
  const offline = client.loadOneSignal()
  scripts[0].onerror()
  assert.equal(await offline, null)
  assert.equal(scripts.length, 0)

  const retry = client.loadOneSignal()
  assert.equal(scripts.length, 1)
  // Both queued callbacks run once the SDK finally loads.
  await bootSdk(sdk)
  assert.equal(await retry, sdk)
  assert.equal(sdk.calls.filter(([name]) => name === 'init').length, 1)
})

test('login runs right after init without notification permission, once per barber', async () => {
  const { client } = freshClient()
  const sdk = fakeSdk()
  // The page knew the barber before the SDK finished loading.
  await client.linkOneSignalUser(' barbero-1 ')
  const ready = client.loadOneSignal()
  await bootSdk(sdk)
  await ready
  await client.linkOneSignalUser('barbero-1')

  assert.equal(sdk.Notifications.permission, false)
  assert.deepEqual(sdk.calls, [['init', client.ONESIGNAL_APP_ID], ['login', 'barbero-1']])
})

test('tags go after login and are only sent again when they change', async () => {
  const { client } = freshClient()
  const sdk = fakeSdk()
  const ready = client.loadOneSignal()
  await bootSdk(sdk)
  await ready
  await client.sendOneSignalTags({ rol: 'barbero' })
  await client.linkOneSignalUser('barbero-1')
  await client.sendOneSignalTags({ rol: 'barbero' })
  await client.sendOneSignalTags({ rol: 'barbero', barbero_id: 'barbero-1' })

  assert.deepEqual(sdk.calls.slice(1), [
    ['login', 'barbero-1'],
    ['addTags', { rol: 'barbero' }],
    ['addTags', { rol: 'barbero', barbero_id: 'barbero-1' }],
  ])
})

test('logout waits for init, unlinks the device and allows linking again', async () => {
  const { client } = freshClient()
  const sdk = fakeSdk()
  await client.linkOneSignalUser('barbero-1')
  client.loadOneSignal()
  // Logged out before the SDK arrived: no login for the barber that left.
  const loggingOut = client.logoutOneSignal(1000)
  await bootSdk(sdk)
  await loggingOut
  assert.deepEqual(sdk.calls, [['init', client.ONESIGNAL_APP_ID], ['logout']])

  await client.linkOneSignalUser('barbero-1')
  await client.logoutOneSignal(1000)
  await client.linkOneSignalUser('barbero-1')
  assert.deepEqual(sdk.calls.slice(2), [['login', 'barbero-1'], ['logout'], ['login', 'barbero-1']])
})

test('logout never holds the caller when the SDK does not answer', async () => {
  const { client } = freshClient()
  client.loadOneSignal()
  const started = Date.now()
  await client.logoutOneSignal(30)
  assert.ok(Date.now() - started < 1000)
})

test('push support tells an iPhone Safari tab to install the app', () => {
  const { client } = freshClient()
  const env = { userAgent: '', maxTouchPoints: 0, standalone: false, hasServiceWorker: true, hasPushManager: true, hasNotification: true }
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1'
  const ipad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15'
  const noPush = { hasPushManager: false, hasNotification: false }

  assert.equal(client.detectPushSupport({ ...env, userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile' }), 'supported')
  assert.equal(client.detectPushSupport({ ...env, userAgent: iphone, standalone: true }), 'supported')
  assert.equal(client.detectPushSupport({ ...env, ...noPush, userAgent: iphone }), 'ios-install')
  assert.equal(client.detectPushSupport({ ...env, ...noPush, userAgent: ipad, maxTouchPoints: 5 }), 'ios-install')
  assert.equal(client.detectPushSupport({ ...env, ...noPush, userAgent: iphone, standalone: true }), 'ios-update')
  assert.equal(client.detectPushSupport({ ...env, ...noPush, userAgent: ipad }), 'unsupported')
})

test('permission status separates blocked from not asked yet', () => {
  const { client } = freshClient()
  assert.equal(client.resolvePermissionStatus(true, 'granted'), 'granted')
  assert.equal(client.resolvePermissionStatus(false, 'denied'), 'denied')
  assert.equal(client.resolvePermissionStatus(false, 'default'), 'default')
  assert.equal(client.resolvePermissionStatus(undefined, null), 'default')
})
