// The notifications overlay on barber pages: what a tap on "Permitir" does.
// React hooks are faked (state and refs survive re-renders, effects run when
// their deps change), OneSignal is a fake SDK booted through the real client
// and timers are mocked.
require('./load-typescript.cjs')
const test = require('node:test')
const { mock } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const React = require('react')
const { stubModule } = require('./fake-db.cjs')
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)

const toasts = []
stubModule('react-hot-toast', Object.assign((message) => toasts.push(['blank', message]), {
  success: (message) => toasts.push(['success', message]),
  error: (message) => toasts.push(['error', message]),
}))
stubModule('next/navigation', { usePathname: () => '/barber-app' })
stubModule('lucide-react', { Bell: 'Bell', BellOff: 'BellOff', Smartphone: 'Smartphone', X: 'X' })

const clientFile = require.resolve('../src/lib/onesignal-client.ts')
const providerFile = require.resolve('../src/components/providers/OneSignalProvider.tsx')
const flush = () => new Promise((resolve) => setImmediate(resolve))

const ANDROID = 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1'

// A browser with (or without) web push, and a fresh page lifetime for the SDK client.
function browser({ userAgent = ANDROID, push = true, nativePermission = 'default' } = {}) {
  const scripts = []
  class PushSubscriptionOptions {}
  Object.defineProperty(PushSubscriptionOptions.prototype, 'applicationServerKey', { get: () => null })
  global.window = push ? { PushManager() {}, PushSubscriptionOptions, Notification: { permission: nativePermission } } : {}
  global.document = {
    querySelector: (selector) => scripts.find((script) => selector.includes(script.src)) || null,
    createElement: () => ({ remove() { scripts.splice(scripts.indexOf(this), 1) } }),
    head: { appendChild: (node) => scripts.push(node) },
  }
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: push ? { userAgent, maxTouchPoints: 0, serviceWorker: {} } : { userAgent, maxTouchPoints: 5 },
  })
  delete require.cache[clientFile]
  delete require.cache[providerFile]
  toasts.length = 0
  return { scripts }
}

// requestPermission() stays pending until the test answers for the barber.
function fakeSdk({ permission = false, optedIn = false, token = null } = {}) {
  const sdk = {
    calls: [],
    pending: [],
    init: async () => {},
    login: async () => {},
    Notifications: {
      permission,
      requestPermission: () => {
        sdk.calls.push('requestPermission')
        return new Promise((resolve, reject) => sdk.pending.push({ resolve, reject }))
      },
    },
    User: {
      PushSubscription: {
        optedIn,
        token,
        optIn: async () => { sdk.calls.push('optIn'); sdk.User.PushSubscription.optedIn = true },
      },
    },
    // What the browser and OneSignal look like once the barber tapped "Permitir".
    allow(token = 'push-token') {
      sdk.Notifications.permission = true
      global.window.Notification.permission = 'granted'
      sdk.User.PushSubscription.optedIn = true
      sdk.User.PushSubscription.token = token
    },
  }
  return sdk
}

// What OneSignalSDK.page.js does once downloaded: drain the queue.
function bootSdk(sdk) {
  const queue = global.window.OneSignalDeferred || []
  global.window.OneSignalDeferred = { push: (fn) => fn(sdk) }
  return Promise.all(queue.map((fn) => fn(sdk)))
}

function mountProvider(props = {}) {
  const OneSignalProvider = require(providerFile).default
  const states = []
  const refs = []
  const effects = []
  let tree = null
  const render = () => {
    let s = 0
    let r = 0
    let e = 0
    const due = []
    const saved = { useState: React.useState, useRef: React.useRef, useEffect: React.useEffect, useCallback: React.useCallback }
    React.useState = (initial) => {
      const i = s++
      if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial
      return [states[i], (next) => { states[i] = typeof next === 'function' ? next(states[i]) : next }]
    }
    React.useRef = (current) => {
      const i = r++
      if (!(i in refs)) refs[i] = { current }
      return refs[i]
    }
    React.useCallback = (fn) => fn
    React.useEffect = (fn, deps) => {
      const i = e++
      const previous = effects[i]
      if (!previous || !deps || deps.some((dep, k) => !Object.is(dep, previous.deps[k]))) due.push({ i, fn, deps })
    }
    try {
      tree = OneSignalProvider({ children: null, autoPrompt: false, ...props })
    } finally {
      Object.assign(React, saved)
    }
    for (const { i, fn, deps } of due) {
      effects[i]?.cleanup?.()
      effects[i] = { deps, cleanup: fn() }
    }
    return tree
  }
  render()
  return {
    render,
    get tree() { return tree },
    openPrompt() { tree.props.value.triggerPrompt(); return render() },
  }
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean) || null
  if (predicate(node)) return node
  return find(React.Children.toArray(node.props?.children), predicate)
}

function textOf(node) {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node.type === 'style') return ''
  return textOf(node.props?.children)
}

const primaryButton = (tree) => find(tree, (node) => node.type === 'button' && String(node.props.className).includes('onesignal-btn-primary'))
const overlay = (tree) => find(tree, (node) => node.props?.className === 'onesignal-prompt-overlay')

// Loads the SDK the way a barber page does and opens the overlay.
async function readyProvider(sdk) {
  const provider = mountProvider()
  await bootSdk(sdk)
  await flush()
  provider.render()
  provider.openPrompt()
  return provider
}

function withTimers(run) {
  return async () => {
    mock.timers.enable({ apis: ['setTimeout'] })
    try { await run() } finally { mock.timers.reset() }
  }
}

test('a tap asks the browser at once, and a second tap while it is open does not ask again', withTimers(async () => {
  browser()
  const sdk = fakeSdk()
  const provider = await readyProvider(sdk)
  const button = primaryButton(provider.tree)
  assert.equal(textOf(button), 'Permitir notificaciones')

  // Called synchronously from the tap: browsers ignore a prompt asked after an await.
  button.props.onClick()
  assert.deepEqual(sdk.calls, ['requestPermission'])
  // A fast double tap, before React re-rendered the disabled button.
  button.props.onClick()
  assert.deepEqual(sdk.calls, ['requestPermission'])
  assert.equal(primaryButton(provider.render()).props.disabled, true)
}))

test('a browser prompt left open past 30 s shows a neutral hint, and its answer gives one toast', withTimers(async () => {
  browser()
  const sdk = fakeSdk()
  const provider = await readyProvider(sdk)
  primaryButton(provider.tree).props.onClick()

  mock.timers.tick(30000)
  await flush()
  provider.render()
  assert.deepEqual(toasts, [])
  assert.match(textOf(overlay(provider.tree)), /Si no ves el aviso del navegador/)
  // Still waiting on the same request: tapping again asks nothing new.
  const waiting = primaryButton(provider.tree)
  assert.equal(waiting.props.disabled, true)
  waiting.props.onClick()
  assert.deepEqual(sdk.calls, ['requestPermission'])

  // The barber finally answers the browser prompt.
  sdk.allow()
  sdk.pending[0].resolve(true)
  await flush()
  mock.timers.tick(60000)
  await flush()
  provider.render()
  assert.deepEqual(toasts, [['success', '¡Listo! Te avisaremos cuando tengas nuevas citas.']])
  assert.equal(overlay(provider.tree), null)
}))

test('an opt-in tap calls optIn() inside the tap, and a second tap does not opt in again', withTimers(async () => {
  browser({ nativePermission: 'granted' })
  const sdk = fakeSdk({ permission: true, optedIn: false })
  const provider = await readyProvider(sdk)
  const button = primaryButton(provider.tree)
  button.props.onClick()
  assert.deepEqual(sdk.calls, ['optIn'])
  button.props.onClick()
  await flush()
  assert.deepEqual(sdk.calls, ['optIn', 'requestPermission'])
}))

test('a request answered before 30 s leaves no hint behind, gives one toast and allows a new tap', withTimers(async () => {
  browser({ nativePermission: 'granted' })
  const sdk = fakeSdk({ permission: true, optedIn: true })
  const provider = await readyProvider(sdk)
  primaryButton(provider.tree).props.onClick()
  await flush()
  sdk.pending[0].resolve(false)
  await flush()
  // Long after the answer, the slow-request timer must not show its hint.
  mock.timers.tick(120000)
  await flush()
  provider.render()
  assert.doesNotMatch(textOf(overlay(provider.tree)), /Si no ves el aviso del navegador/)
  assert.deepEqual(toasts, [['error', 'No pudimos activar las notificaciones en este dispositivo. Inténtalo de nuevo.']])
  primaryButton(provider.tree).props.onClick()
  await flush()
  assert.deepEqual(sdk.calls, ['requestPermission', 'requestPermission'])
}))

test('a request that fails after the 30 s hint gives one error toast, clears the hint and frees the button', withTimers(async () => {
  browser({ nativePermission: 'granted' })
  const sdk = fakeSdk({ permission: true, optedIn: true })
  const provider = await readyProvider(sdk)
  primaryButton(provider.tree).props.onClick()
  mock.timers.tick(45000)
  await flush()
  assert.match(textOf(overlay(provider.render())), /Si no ves el aviso del navegador/)

  const realError = console.error
  console.error = () => {}
  try {
    sdk.pending[0].reject(new Error('push service error'))
    await flush()
  } finally {
    console.error = realError
  }
  provider.render()
  assert.deepEqual(toasts, [['error', 'No pudimos activar las notificaciones. Inténtalo de nuevo.']])
  assert.doesNotMatch(textOf(overlay(provider.tree)), /Si no ves el aviso del navegador/)
  assert.equal(primaryButton(provider.tree).props.disabled, false)
}))

test('allowed but without a push token: opt in, subscribe, and offer a retry if it still fails', withTimers(async () => {
  browser({ nativePermission: 'granted' })
  const sdk = fakeSdk({ permission: true, optedIn: false })
  const provider = await readyProvider(sdk)
  // Allowed by the browser without a token still counts as not active.
  assert.equal(provider.tree.props.value.permissionStatus, 'default')
  const button = primaryButton(provider.tree)
  assert.equal(textOf(button), 'Activar notificaciones')

  button.props.onClick()
  await flush()
  assert.deepEqual(sdk.calls, ['optIn', 'requestPermission'])
  // The device could not subscribe (no push service, worker download failed).
  sdk.pending[0].resolve(false)
  await flush()
  provider.render()
  assert.deepEqual(toasts, [['error', 'No pudimos activar las notificaciones en este dispositivo. Inténtalo de nuevo.']])
  assert.notEqual(overlay(provider.tree), null)
  assert.equal(primaryButton(provider.tree).props.disabled, false)
}))

test('a request that fails shows the error toast and frees the button for a new tap', withTimers(async () => {
  browser()
  const sdk = fakeSdk()
  const provider = await readyProvider(sdk)
  primaryButton(provider.tree).props.onClick()

  const realError = console.error
  console.error = () => {}
  try {
    sdk.pending[0].reject(new Error('push service error'))
    await flush()
  } finally {
    console.error = realError
  }
  assert.deepEqual(toasts, [['error', 'No pudimos activar las notificaciones. Inténtalo de nuevo.']])
  primaryButton(provider.render()).props.onClick()
  assert.deepEqual(sdk.calls, ['requestPermission', 'requestPermission'])
}))

test('closing the browser prompt without choosing hides the overlay quietly', withTimers(async () => {
  browser()
  const sdk = fakeSdk()
  const provider = await readyProvider(sdk)
  primaryButton(provider.tree).props.onClick()
  sdk.pending[0].resolve(false)
  await flush()
  provider.render()
  assert.deepEqual(toasts, [])
  assert.equal(overlay(provider.tree), null)
}))

test('the overlay explains an iPhone tab, a failed download and blocked notifications', withTimers(async () => {
  browser({ push: false, userAgent: IPHONE })
  const iphone = mountProvider().openPrompt()
  assert.equal(iphone.props.value.pushSupport, 'ios-install')
  assert.match(textOf(overlay(iphone)), /Instala la app en tu iPhone/)

  const { scripts } = browser()
  const offline = mountProvider()
  scripts[0].onerror()
  await flush()
  offline.render()
  assert.match(textOf(overlay(offline.openPrompt())), /No pudimos cargar las notificaciones/)
  assert.equal(textOf(primaryButton(offline.tree)), 'Reintentar')

  browser({ nativePermission: 'denied' })
  const blocked = await readyProvider(fakeSdk())
  assert.match(textOf(overlay(blocked.tree)), /Notificaciones bloqueadas/)
  assert.equal(find(blocked.tree, (node) => String(node.props?.className).includes('onesignal-prompt-icon')).props.className.includes('bg-red-500'), true)
}))
