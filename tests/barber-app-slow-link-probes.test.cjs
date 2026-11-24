// Verifier probes for S7: the barber app on a slow or hanging link.
// Unlike tests/barber-app-auth.test.cjs and tests/session-resume.test.cjs,
// which each fake the other half, this file runs the real hook
// (src/hooks/useBarberAppAuth.ts) on top of the real shared restore
// (src/lib/app-session.ts). Only fetch, the database lookups, React's hook
// primitives and the clock are faked.
require('./load-typescript.cjs')
const test = require('node:test')
const { mock } = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const { stubModule } = require('./fake-db.cjs')

let listeners = []
const on = (type, fn) => listeners.push({ type, fn })
const off = (type, fn) => { listeners = listeners.filter((l) => l.type !== type || l.fn !== fn) }
global.window = { addEventListener: on, removeEventListener: off }
global.document = { visibilityState: 'visible', addEventListener: on, removeEventListener: off }

// In-memory token manager of the SDK, as app-session.ts reads and fills it.
let native = null
const token = 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.signature'
const SESSION = { user: { id: 'user-1' }, access_token: token }
const rows = {
  admin_users: { id: 'user-1', email: 'gustavo@chamosbarber.com', nombre: 'Gustavo', rol: 'barbero', barbero_id: 'barbero-1' },
  barberos: { id: 'barbero-1', nombre: 'Gustavo' },
}

// Virtual clock and scripted latencies (all in ms of mocked time).
let clock = 0
let later = null // the mocked setTimeout, for the probe's own delays
let lookupLatency = 0
let lookups = 0
let respond = null // (request) => void: decides how /api/auth/session answers
let requests = []
const redirects = []

const delay = (ms) => new Promise((resolve) => (ms > 0 ? later(resolve, ms) : resolve()))
stubModule('../src/lib/supabase.ts', {
  supabase: {
    _insforge: { tokenManager: { getSession: () => native, saveSession: (value) => { native = value } } },
    from: (table) => ({
      select() { return this },
      eq() { return this },
      async single() { lookups++; await delay(lookupLatency); return { data: rows[table], error: null } },
    }),
    auth: { signOut: async () => { native = null } },
  },
})
stubModule('../src/lib/onesignal-client.ts', { logoutOneSignal: async () => {} })
stubModule('next/router', { useRouter: () => ({ push: (path) => redirects.push(path) }) })

global.fetch = (url, options) => new Promise((resolve, reject) => {
  const request = { url, startedAt: clock, abortedAt: null, signal: options.signal, resolve, reject }
  requests.push(request)
  options.signal?.addEventListener('abort', () => { request.abortedAt = clock; request.onAbort?.() })
  respond(request)
})
const json = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body })
// Answers after `ms`; like a real fetch, an abort rejects it.
const answersAfter = (ms, status, body) => (request) => {
  const timer = later(() => request.resolve(json(status, body)), ms)
  request.onAbort = () => { clearTimeout(timer); request.reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })) }
}
const hangs = (request) => { request.onAbort = () => request.reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })) }

const { useBarberAppAuth } = require('../src/hooks/useBarberAppAuth.ts')
const { checkAppSession } = require('../src/lib/app-session.ts')
const flush = () => new Promise((resolve) => setImmediate(resolve))

function mountAuth() {
  const states = []
  const refs = []
  let cleanup = null
  let mounted = false
  const render = () => {
    let s = 0
    let r = 0
    const effects = []
    const saved = { useState: React.useState, useRef: React.useRef, useEffect: React.useEffect }
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
    React.useEffect = (fn) => { effects.push(fn) }
    let value
    try { value = useBarberAppAuth() } finally { Object.assign(React, saved) }
    if (!mounted) {
      mounted = true
      cleanup = effects.map((fn) => fn())
    }
    return value
  }
  render()
  return { render, unmount: () => cleanup.forEach((fn) => fn?.()) }
}

// Timeouts the code under test has started and neither fired nor cleared.
let live = null

async function advance(ms, step = 250) {
  await flush() // answers that are already there are handled at the current time
  for (let done = 0; done < ms; done += step) {
    clock += step // events inside the tick see the time the step ends at
    mock.timers.tick(step)
    await flush()
  }
}

/** Advances until the app has loaded, or `limit` ms have passed. Returns the time it loaded at, or null. */
async function loadedWithin(auth, limit) {
  const start = clock
  while (clock - start < limit) {
    await advance(250)
    if (auth.render().loading === false) return clock
  }
  return null
}

function scenario(run) {
  return async () => {
    // The shared restore keeps its limit between checks: start every scenario from a definitive answer.
    native = null
    respond = (request) => request.resolve(json(200, { session: null }))
    assert.deepEqual(await checkAppSession(), { status: 'signed-out' })

    clock = 0
    lookups = 0
    lookupLatency = 0
    requests = []
    listeners = []
    redirects.length = 0
    mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
    later = globalThis.setTimeout
    const mocked = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout }
    live = new Set()
    globalThis.setTimeout = (fn, ms, ...args) => {
      const id = mocked.setTimeout(() => { live.delete(id); fn(...args) }, ms)
      live.add(id)
      return id
    }
    globalThis.clearTimeout = (id) => { live.delete(id); return mocked.clearTimeout(id) }
    const real = { warn: console.warn, error: console.error }
    console.warn = () => {}
    console.error = () => {}
    let auth = null
    try {
      await run({ mount: () => (auth = mountAuth()) })
    } finally {
      auth?.unmount()
      // Let a restore that is still in flight reach its limit: its state is shared by the whole module.
      respond = (request) => request.resolve(json(200, { session: null }))
      for (let i = 0; i < 4; i++) { mock.timers.tick(100000); await flush() }
      Object.assign(globalThis, mocked)
      mock.timers.reset()
      Object.assign(console, real)
    }
  }
}

test('a session restore that needs 30 s loads on the second attempt, and nobody is sent to the login', scenario(async ({ mount }) => {
  respond = answersAfter(30000, 200, { session: SESSION })
  const auth = mount()
  const at = await loadedWithin(auth, 120000)
  assert.ok(at !== null, 'the app loads')
  assert.ok(at <= 60000, `loaded at ${at} ms: 20 s limit + 3 s wait + 30 s answer`)
  assert.equal(auth.render().session.barberoId, 'barbero-1')
  assert.deepEqual(requests.map((r) => [r.startedAt, r.abortedAt]), [[0, 20000], [23000, null]], 'the first request is aborted at 20 s, the second gets 40 s')
  await advance(10000)
  assert.deepEqual(redirects, [])
}))

test('a link where every request needs 30 s (restore and both lookups) still loads', scenario(async ({ mount }) => {
  respond = answersAfter(30000, 200, { session: SESSION })
  lookupLatency = 30000
  const auth = mount()
  const at = await loadedWithin(auth, 300000)
  assert.ok(at !== null, 'the app loads')
  assert.ok(at <= 140000, `loaded at ${at} ms`)
  assert.equal(auth.render().session.barberoId, 'barbero-1')
  assert.deepEqual(redirects, [])
  assert.equal(requests.length, 2, 'the session is restored once and then reused from memory')
}))

test('a restore that hangs is aborted at 20, 40, 80 and 80 s, never signs the barber out, and loads when the link comes back', scenario(async ({ mount }) => {
  respond = hangs
  const auth = mount()
  await advance(400000)
  const limits = requests.filter((r) => r.abortedAt !== null).map((r) => r.abortedAt - r.startedAt)
  assert.deepEqual(limits.slice(0, 5), [20000, 40000, 80000, 80000, 80000])
  assert.deepEqual(requests.map((r) => r.startedAt).slice(0, 5), [0, 23000, 69000, 161000, 265000], 'retries wait 3, 6, 12 and 24 s after each timeout')
  assert.ok(requests.every((r) => r.signal.aborted || r.abortedAt === null))
  assert.equal(requests.filter((r) => r.abortedAt === null).length <= 1, true, 'at most one request is in flight')
  assert.equal(auth.render().loading, true)
  assert.equal(auth.render().error, null)
  assert.deepEqual(redirects, [])

  respond = answersAfter(1000, 200, { session: SESSION })
  const at = await loadedWithin(auth, 200000)
  assert.ok(at !== null, 'the app loads once the link answers')
  assert.equal(auth.render().session.barberoId, 'barbero-1')
  assert.deepEqual(redirects, [])
}))

test('an answer that comes after the limit (even "signed out") changes nothing', scenario(async ({ mount }) => {
  // The server ignores the abort and answers 401 at 25 s; later requests answer at once.
  let first = true
  respond = (request) => {
    if (first) { first = false; later(() => request.resolve(json(401, { error: 'Unauthorized' })), 25000); return }
    request.resolve(json(200, { session: SESSION }))
  }
  const auth = mount()
  await advance(22000)
  assert.equal(auth.render().loading, true)
  const at = await loadedWithin(auth, 60000)
  assert.ok(at !== null && at <= 24000, `loaded by the 3 s retry (at ${at} ms)`)
  await advance(30000) // the late 401 has arrived by now
  assert.equal(auth.render().session.barberoId, 'barbero-1')
  assert.equal(auth.render().error, null)
  assert.deepEqual(redirects, [])
}))

test('a server that answers 503 at once keeps the spinner, retries on the backoff and never redirects', scenario(async ({ mount }) => {
  respond = (request) => request.resolve(json(503, { error: 'No se pudo verificar la sesión' }))
  const auth = mount()
  await advance(180000)
  assert.deepEqual(requests.map((r) => r.startedAt).slice(0, 7), [0, 3000, 9000, 21000, 45000, 75000, 105000])
  assert.equal(auth.render().loading, true)
  assert.deepEqual(redirects, [])
  // A 503 is not a timeout: the next hanging check is still abandoned after 20 s.
  respond = hangs
  await advance(60000)
  const hung = requests.find((r) => r.abortedAt !== null)
  assert.equal(hung.abortedAt - hung.startedAt, 20000)
  respond = (request) => request.resolve(json(200, { session: SESSION }))
  assert.ok((await loadedWithin(auth, 120000)) !== null)
  assert.deepEqual(redirects, [])
}))

test('a confirmed sign-out after slow attempts still ends the session', scenario(async ({ mount }) => {
  respond = hangs
  const auth = mount()
  await advance(30000)
  respond = (request) => request.resolve(json(200, { session: null }))
  await advance(60000)
  assert.equal(auth.render().loading, false)
  assert.equal(auth.render().error, 'No hay sesión activa')
  assert.deepEqual(redirects, ['/chamos-acceso'])
}))

test('no timeout is left behind after the app loads, and none keeps running after unmount', scenario(async ({ mount }) => {
  respond = answersAfter(30000, 200, { session: SESSION })
  lookupLatency = 5000
  const auth = mount()
  assert.ok((await loadedWithin(auth, 200000)) !== null)
  await advance(120000)
  assert.equal(live.size, 0, 'no pending timeout once the check is done')

  // A check that hangs when the screen is left.
  native = null
  respond = hangs
  listeners.filter((l) => l.type === 'visibilitychange').forEach((l) => l.fn({ type: 'visibilitychange' }))
  await advance(5000)
  const before = requests.length
  auth.unmount()
  await advance(300000)
  assert.equal(requests.length, before, 'no retry after unmount')
  assert.equal(live.size, 0, 'the timers of the abandoned check ended')
  assert.ok(requests.at(-1).signal.aborted, 'the hung request was aborted at its limit')
  assert.deepEqual(redirects, [])
}))
