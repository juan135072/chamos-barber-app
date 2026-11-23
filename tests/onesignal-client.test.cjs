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

test('init carries the Custom Code settings, including the Safari web ID', async () => {
  const { client } = freshClient()
  const sdk = fakeSdk()
  let options = null
  sdk.init = async (received) => { options = received }
  const loading = client.loadOneSignal()
  await bootSdk(sdk)
  await loading
  assert.equal(options.appId, client.ONESIGNAL_APP_ID)
  assert.equal(options.safari_web_id, client.ONESIGNAL_SAFARI_WEB_ID)
  assert.match(options.safari_web_id, /^web\.onesignal\.auto\./)
  assert.deepEqual(options.notifyButton, { enable: false })
  assert.deepEqual(options.welcomeNotification, { disable: true })
  assert.equal(options.serviceWorkerPath, '/OneSignalSDKWorker.js')
})

test('a failed download is retried later without a second init', async () => {
  const { client, scripts } = freshClient()
  const sdk = fakeSdk()
  const offline = client.loadOneSignal()
  scripts[0].onerror()
  assert.equal(await offline, null)
  assert.equal(scripts.length, 0)

  assert.equal(client.canRetryOneSignalLoad(), true)
  const retry = client.loadOneSignal()
  assert.equal(scripts.length, 1)
  // Both queued callbacks run once the SDK finally loads.
  await bootSdk(sdk)
  assert.equal(await retry, sdk)
  assert.equal(sdk.calls.filter(([name]) => name === 'init').length, 1)
})

test('an SDK that arrived but failed to start can only be retried with a reload', async () => {
  const { client } = freshClient()
  const sdk = fakeSdk()
  sdk.init = async () => { throw new Error('Can only be used on: https://chamosbarber.com') }
  const loading = client.loadOneSignal()
  // Still downloading (or stuck): a new call would only wait on the same attempt.
  assert.equal(client.canRetryOneSignalLoad(), false)
  const realError = console.error
  console.error = () => {}
  try {
    await bootSdk(sdk)
    assert.equal(await loading, null)
  } finally {
    console.error = realError
  }
  assert.equal(client.canRetryOneSignalLoad(), false)
})

test('only a push token counts as an active subscription', () => {
  const { client } = freshClient()
  const withSubscription = (subscription) => ({ User: { PushSubscription: subscription } })
  // optedIn stays true when subscribing failed and no token was created.
  assert.equal(client.hasPushSubscription(withSubscription({ optedIn: true, token: null })), false)
  assert.equal(client.hasPushSubscription(withSubscription({ optedIn: false, token: 'push-token' })), false)
  assert.equal(client.hasPushSubscription(withSubscription({ optedIn: true, token: 'push-token' })), true)
  assert.equal(client.hasPushSubscription(null), false)
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

test('logout is not held behind a login that has not finished', async () => {
  const { client } = freshClient()
  const sdk = fakeSdk()
  // First login of a fresh install while offline: the SDK keeps it pending.
  sdk.login = (id) => { sdk.calls.push(['login', id]); return new Promise(() => {}) }
  const ready = client.loadOneSignal()
  await bootSdk(sdk)
  await ready
  void client.linkOneSignalUser('barbero-1')
  await new Promise((resolve) => setImmediate(resolve))
  await client.logoutOneSignal(200)
  assert.deepEqual(sdk.calls.slice(1), [['login', 'barbero-1'], ['logout']])
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

test('a device allowed by the browser only counts as active with a push token', () => {
  const { client } = freshClient()
  // Subscribing failed or the barber opted out: "Activar" stays offered.
  assert.equal(client.resolveDeviceStatus('granted', false), 'default')
  assert.equal(client.resolveDeviceStatus('granted', true), 'granted')
  assert.equal(client.resolveDeviceStatus('denied', false), 'denied')
  assert.equal(client.resolveDeviceStatus('default', false), 'default')
})

test('a tap prompts, opts in or subscribes depending on what the browser already allows', () => {
  const { client } = freshClient()
  assert.equal(client.planPermissionRequest(false, false), 'prompt')
  assert.equal(client.planPermissionRequest(undefined, true), 'prompt')
  // Allowed but opted out: optIn() first, then requestPermission() if still no token.
  assert.equal(client.planPermissionRequest(true, false), 'opt-in')
  // Allowed and opted in, but no token yet: requestPermission() subscribes without asking.
  assert.equal(client.planPermissionRequest(true, true), 'subscribe')
})

function requestSdk({ permission = false, optedIn = false, token = null, tokenAfterOptIn = null } = {}) {
  const calls = []
  const sdk = {
    calls,
    Notifications: {
      permission,
      requestPermission: () => { calls.push('requestPermission'); return Promise.resolve(true) },
    },
    User: {
      PushSubscription: {
        optedIn,
        token,
        optIn: async () => {
          calls.push('optIn')
          sdk.User.PushSubscription.optedIn = true
          sdk.User.PushSubscription.token = tokenAfterOptIn
        },
      },
    },
  }
  return sdk
}

test('a permission request asks the browser inside the tap and opts in before subscribing', async () => {
  const { client } = freshClient()

  // Not allowed yet: the browser prompt opens before the call returns (user gesture).
  const prompt = requestSdk()
  const asked = client.startPermissionRequest(prompt)
  assert.deepEqual(prompt.calls, ['requestPermission'])
  assert.equal(await asked, true)

  // Opted out and optIn() does not bring a token back: subscribe afterwards.
  const optedOut = requestSdk({ permission: true })
  assert.equal(await client.startPermissionRequest(optedOut), true)
  assert.deepEqual(optedOut.calls, ['optIn', 'requestPermission'])

  // optIn() restored the token: nothing else to ask.
  const restored = requestSdk({ permission: true, tokenAfterOptIn: 'push-token' })
  assert.equal(await client.startPermissionRequest(restored), true)
  assert.deepEqual(restored.calls, ['optIn'])

  // Opted in without a token: subscribe only.
  const noToken = requestSdk({ permission: true, optedIn: true })
  await client.startPermissionRequest(noToken)
  assert.deepEqual(noToken.calls, ['requestPermission'])

  // An SDK that throws gives a rejected request, never an exception in the tap.
  const broken = requestSdk()
  broken.Notifications.requestPermission = () => { throw new Error('IndexedDB unavailable') }
  await assert.rejects(client.startPermissionRequest(broken), /IndexedDB unavailable/)
})

test('the outcome of a finished request decides the toast', () => {
  const { client } = freshClient()
  // accepted = what requestPermission() resolved; false = allowed but subscribing failed.
  assert.equal(client.classifyPermissionResult(true, 'granted', true), 'subscribed')
  assert.equal(client.classifyPermissionResult(undefined, 'granted', true), 'subscribed')
  assert.equal(client.classifyPermissionResult(true, 'granted', false), 'subscribed')
  assert.equal(client.classifyPermissionResult(undefined, 'granted', false), 'not-subscribed')
  assert.equal(client.classifyPermissionResult(false, 'granted', true), 'not-subscribed')
  // The barber closed the browser prompt without choosing.
  assert.equal(client.classifyPermissionResult(false, 'default', false), 'dismissed')
  assert.equal(client.classifyPermissionResult(false, 'denied', false), 'blocked')
})

test('the notifications overlay picks one view for every state', () => {
  const { client } = freshClient()
  assert.equal(client.resolvePromptView('unsupported', 'ios-install', 'default'), 'ios-install')
  assert.equal(client.resolvePromptView('unsupported', 'ios-update', 'default'), 'ios-update')
  assert.equal(client.resolvePromptView('unsupported', 'unsupported', 'default'), 'unsupported')
  // The SDK itself said this browser has no web push.
  assert.equal(client.resolvePromptView('unsupported', 'supported', 'default'), 'unsupported')
  assert.equal(client.resolvePromptView('failed', 'supported', 'default'), 'failed')
  assert.equal(client.resolvePromptView('ready', 'supported', 'denied'), 'blocked')
  assert.equal(client.resolvePromptView('ready', 'supported', 'default'), 'ask')
  assert.equal(client.resolvePromptView('loading', 'supported', 'default'), 'ask')
})
