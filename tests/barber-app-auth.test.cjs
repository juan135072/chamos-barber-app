// /barber-app session check: quiet retries that back off, and no stale answers.
// React hooks are faked (state and refs survive re-renders, the mount effect
// runs once), the session check is controlled by the test and timers are mocked.
require('./load-typescript.cjs')
const test = require('node:test')
const { mock } = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const { stubModule } = require('./fake-db.cjs')

let listeners = []
const on = (type, fn) => listeners.push({ type, fn })
const off = (type, fn) => { listeners = listeners.filter((listener) => listener.type !== type || listener.fn !== fn) }
global.window = { addEventListener: on, removeEventListener: off }
global.document = { visibilityState: 'visible', addEventListener: on, removeEventListener: off }
const fire = (type) => listeners.filter((listener) => listener.type === type).forEach((listener) => listener.fn({ type }))

// Every checkAppSession() call; it answers `answer` at once, or waits for the test when null.
let checks = []
let answer = null
const signedIn = { status: 'signed-in', session: { user: { id: 'user-1' } } }
stubModule('../src/lib/app-session.ts', {
  checkAppSession: () => new Promise((resolve) => {
    checks.push(resolve)
    if (answer) resolve(answer)
  }),
  isNoRowsError: (error) => error?.code === 'PGRST116',
  isSameSession: (a, b) => a === b,
})
const rows = {
  admin_users: { id: 'user-1', email: 'gustavo@chamosbarber.com', nombre: 'Gustavo', rol: 'barbero', barbero_id: 'barbero-1' },
  barberos: { id: 'barbero-1', nombre: 'Gustavo' },
}
stubModule('../src/lib/supabase.ts', {
  supabase: {
    from: (table) => ({ select() { return this }, eq() { return this }, single: async () => ({ data: rows[table], error: null }) }),
    auth: { signOut: async () => {} },
  },
})
stubModule('../src/lib/onesignal-client.ts', { logoutOneSignal: async () => {} })
const redirects = []
stubModule('next/router', { useRouter: () => ({ push: (path) => redirects.push(path) }) })

const { useBarberAppAuth } = require('../src/hooks/useBarberAppAuth.ts')
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
    // The hook's only effect has [] deps: it runs on mount.
    if (!mounted) {
      mounted = true
      cleanup = effects.map((fn) => fn())
    }
    return value
  }
  render()
  return { render, unmount: () => cleanup.forEach((fn) => fn?.()) }
}

function scenario(run) {
  return async () => {
    checks = []
    answer = null
    listeners = []
    redirects.length = 0
    mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
    const realWarn = console.warn
    const realError = console.error
    console.warn = () => {}
    console.error = () => {}
    const auth = mountAuth()
    try {
      await flush()
      await run(auth)
    } finally {
      auth.unmount()
      mock.timers.reset()
      console.warn = realWarn
      console.error = realError
    }
  }
}

async function advance(ms) {
  mock.timers.tick(ms)
  await flush()
}

test('unanswered session checks retry quietly at 3 s, 6 s, 12 s … up to 30 s', scenario(async (auth) => {
  // checkAppSession() said "unknown" (offline, deploy): no redirect, keep the spinner.
  checks[0]({ status: 'unknown' })
  answer = { status: 'unknown' }
  await flush()
  for (const delay of [3000, 6000, 12000, 24000, 30000, 30000]) {
    const before = checks.length
    await advance(delay - 1)
    assert.equal(checks.length, before, `no retry before ${delay} ms`)
    await advance(1)
    assert.equal(checks.length, before + 1, `retry after ${delay} ms`)
  }
  assert.equal(auth.render().loading, true)
  assert.deepEqual(redirects, [])
}))

test('a definitive answer resets the backoff', scenario(async (auth) => {
  answer = { status: 'unknown' }
  checks[0]({ status: 'unknown' })
  await flush()
  await advance(3000)
  await advance(6000)
  assert.equal(checks.length, 3)

  // The next retry (12 s) finally reaches the server.
  answer = signedIn
  await advance(12000)
  assert.equal(checks.length, 4)
  assert.equal(auth.render().session.barberoId, 'barbero-1')

  // Lost again later: the schedule starts over at 3 s.
  answer = { status: 'unknown' }
  fire('visibilitychange')
  await flush()
  assert.equal(checks.length, 5)
  await advance(3000)
  assert.equal(checks.length, 6)
  assert.equal(auth.render().session.barberoId, 'barbero-1')
}))

test('an older check that answers last cannot sign the barber out', scenario(async (auth) => {
  assert.equal(checks.length, 1)
  // Back to the app while the first check is still waiting: a fresh check starts.
  fire('visibilitychange')
  assert.equal(checks.length, 2)
  checks[1](signedIn)
  await flush()
  assert.equal(auth.render().session.barberoId, 'barbero-1')

  // The first request answers late with what was true before the barber signed in.
  checks[0]({ status: 'signed-out' })
  await flush()
  await advance(2000)
  const state = auth.render()
  assert.equal(state.session?.barberoId, 'barbero-1')
  assert.equal(state.error, null)
  assert.deepEqual(redirects, [])
}))

test('the 5-minute check does not start a second request while one is pending', scenario(async (auth) => {
  assert.equal(checks.length, 1)
  await advance(5 * 60 * 1000)
  assert.equal(checks.length, 1)

  checks[0](signedIn)
  await flush()
  assert.equal(auth.render().session.barberoId, 'barbero-1')
  answer = signedIn
  await advance(5 * 60 * 1000)
  assert.equal(checks.length, 2)
  // Reconnecting always checks again.
  fire('online')
  await flush()
  assert.equal(checks.length, 3)
}))

test('a confirmed sign-out still clears the session and redirects to login after 2 s', scenario(async (auth) => {
  checks[0]({ status: 'signed-out' })
  await flush()
  const state = auth.render()
  assert.equal(state.session, null)
  assert.equal(state.error, 'No hay sesión activa')
  assert.equal(state.loading, false)
  await advance(1999)
  assert.deepEqual(redirects, [])
  await advance(1)
  assert.deepEqual(redirects, ['/chamos-acceso'])
}))
