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

test('an older signed-in answer that arrives after a newer sign-out cannot bring the session back', scenario(async (auth) => {
  checks[0](signedIn)
  await flush()
  assert.equal(auth.render().session.barberoId, 'barbero-1')
  fire('visibilitychange')
  fire('online')
  assert.equal(checks.length, 3)
  checks[2]({ status: 'signed-out' })
  await flush()
  checks[1](signedIn)
  await flush()
  await advance(2000)
  const state = auth.render()
  assert.equal(state.session, null)
  assert.equal(state.error, 'No hay sesión activa')
  assert.deepEqual(redirects, ['/chamos-acceso'])
}))

test('a pending retry is cancelled when a newer check starts', scenario(async () => {
  checks[0]({ status: 'unknown' })
  await flush()
  await advance(1000)
  // The 3 s retry is waiting; coming back to the app starts a check that stays pending.
  fire('visibilitychange')
  assert.equal(checks.length, 2)
  // Before that check would time out (20 s), nothing else runs.
  await advance(19000)
  assert.equal(checks.length, 2)
}))

test('a stale "unknown" answer schedules no retry', scenario(async (auth) => {
  fire('visibilitychange')
  assert.equal(checks.length, 2)
  checks[0]({ status: 'unknown' })
  await flush()
  checks[1](signedIn)
  await flush()
  await advance(60000)
  assert.equal(checks.length, 2)
  assert.equal(auth.render().session.barberoId, 'barbero-1')
}))

test('a first session check that never answers times out after 20 s and is retried', scenario(async (auth) => {
  // The request hangs (no answer at all): the spinner must not stay forever.
  await advance(20000 - 1)
  assert.equal(checks.length, 1)
  await advance(1)
  assert.equal(auth.render().loading, true)
  assert.deepEqual(redirects, [])
  answer = signedIn
  await advance(3000 - 1)
  assert.equal(checks.length, 1, 'retries on the usual 3 s schedule')
  await advance(1)
  assert.equal(checks.length, 2)
  const state = auth.render()
  assert.equal(state.session.barberoId, 'barbero-1')
  assert.equal(state.loading, false)
}))

test('a check that hangs while signed in times out, so an expired session is still detected', scenario(async (auth) => {
  checks[0](signedIn)
  await flush()
  assert.equal(auth.render().session.barberoId, 'barbero-1')
  fire('visibilitychange')
  assert.equal(checks.length, 2)
  await advance(20000)
  assert.equal(auth.render().session.barberoId, 'barbero-1', 'a timeout is not a sign-out')
  answer = { status: 'signed-out' }
  await advance(3000)
  assert.equal(checks.length, 3)
  await advance(2000)
  assert.equal(auth.render().session, null)
  assert.deepEqual(redirects, ['/chamos-acceso'])
}))

test('a stale answer cannot leave the app unchecked: the newest check still times out and retries', scenario(async (auth) => {
  fire('visibilitychange')
  checks[0](signedIn)
  await flush()
  await advance(20000)
  answer = signedIn
  await advance(3000)
  assert.equal(checks.length, 3)
  assert.equal(auth.render().session.barberoId, 'barbero-1')
}))

test('the 5-minute check does not start a second request while one is pending', scenario(async (auth) => {
  checks[0](signedIn)
  await flush()
  assert.equal(auth.render().session.barberoId, 'barbero-1')
  // A reconnect 5 s before the 5-minute check starts a request that is still pending at the tick.
  await advance(5 * 60 * 1000 - 5000)
  fire('online')
  assert.equal(checks.length, 2)
  await advance(5000)
  assert.equal(checks.length, 2)

  // Once it answers, the next 5-minute check runs again.
  answer = signedIn
  checks[1](signedIn)
  await flush()
  await advance(5 * 60 * 1000)
  assert.equal(checks.length, 3)
}))

test('logging out discards a session check that started before it', scenario(async (auth) => {
  checks[0](signedIn)
  await flush()
  assert.equal(auth.render().session.barberoId, 'barbero-1')
  // Back to the app just before tapping "Cerrar sesión": that check is still pending.
  fire('visibilitychange')
  assert.equal(checks.length, 2)
  await auth.render().logout()
  assert.equal(auth.render().session, null)
  assert.deepEqual(redirects, ['/chamos-acceso'])

  // Its answer arrives after the logout: the session stays closed.
  checks[1](signedIn)
  await flush()
  await advance(60000)
  assert.equal(auth.render().session, null)
  assert.deepEqual(redirects, ['/chamos-acceso'])
}))

test('logging out cancels a pending retry', scenario(async (auth) => {
  checks[0](signedIn)
  await flush()
  fire('visibilitychange')
  checks[1]({ status: 'unknown' })
  await flush()
  // A 3 s retry is waiting when the barber logs out.
  await auth.render().logout()
  await advance(60000)
  assert.equal(checks.length, 2)
  assert.deepEqual(redirects, ['/chamos-acceso'])
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

test('a timed-out check frees the 5-minute check, which replaces the pending retry', scenario(async (auth) => {
  checks[0](signedIn)
  await flush()
  await advance(278000)
  fire('visibilitychange')
  await advance(20000) // times out at 298 s; its retry is due at 301 s
  answer = signedIn
  await advance(2000)
  assert.equal(checks.length, 3, 'the 5-minute check runs at 300 s')
  await advance(30000)
  assert.equal(checks.length, 3, 'the pending retry was replaced, not doubled')
  assert.equal(auth.render().session.barberoId, 'barbero-1')
}))

test('a timed-out check that answers late changes nothing (before its retry starts)', scenario(async (auth) => {
  checks[0](signedIn)
  await flush()
  fire('visibilitychange')
  await advance(20000)
  checks[1]({ status: 'signed-out' })
  await flush()
  answer = signedIn
  await advance(3000)
  assert.equal(checks.length, 3)
  await advance(2000)
  assert.equal(auth.render().session.barberoId, 'barbero-1')
  assert.deepEqual(redirects, [])
}))

test('a timed-out check that answers late changes nothing (after its retry started)', scenario(async (auth) => {
  await advance(20000)
  await advance(3000)
  assert.equal(checks.length, 2)
  checks[0]({ status: 'signed-out' })
  await flush()
  await advance(2000)
  let state = auth.render()
  assert.equal(state.loading, true)
  assert.equal(state.error, null)
  assert.deepEqual(redirects, [])
  checks[1](signedIn)
  await flush()
  state = auth.render()
  assert.equal(state.session.barberoId, 'barbero-1')
  assert.equal(state.loading, false)
}))

test('the timeout of a superseded check schedules no retry', scenario(async () => {
  await advance(10000)
  fire('visibilitychange')
  await advance(10000)
  await advance(9999)
  assert.equal(checks.length, 2)
  await advance(1)
  await advance(3000)
  assert.equal(checks.length, 3)
  await advance(5999)
  assert.equal(checks.length, 3)
}))

test('a timeout after logout neither retries nor restores the session', scenario(async (auth) => {
  checks[0](signedIn)
  await flush()
  fire('visibilitychange')
  await auth.render().logout()
  answer = signedIn
  await advance(20000)
  await advance(60000)
  assert.equal(checks.length, 2)
  assert.equal(auth.render().session, null)
  assert.deepEqual(redirects, ['/chamos-acceso'])
}))

test('a check that answers in time leaves no timeout behind', scenario(async () => {
  const warnings = []
  console.warn = (message) => warnings.push(String(message))
  checks[0](signedIn)
  await flush()
  await advance(60000)
  assert.deepEqual(warnings.filter((message) => /no respondió/.test(message)), [])
}))

// --- The limit of a check grows while it keeps timing out: 20 s, 40 s, 80 s --

// The pending check is abandoned `limit` ms from now (not sooner, not later)
// and retried `retry` ms after that. The retry timer only starts once the
// timeout has been handled, after the tick that reaches it: stopping 1 ms
// short first makes a timeout that came sooner start its retry early.
async function abandonedAfter(limit, retry) {
  const before = checks.length
  await advance(limit - 1)
  await advance(1)
  await advance(retry - 1)
  assert.equal(checks.length, before, `no retry before ${limit} + ${retry} ms`)
  await advance(1)
  assert.equal(checks.length, before + 1, `gave up after ${limit} ms and retried ${retry} ms later`)
}

test('a check that keeps timing out gets 20 s, then 40 s, then 80 s, and never more than 80 s', scenario(async () => {
  const warnings = []
  console.warn = (message) => warnings.push(String(message))
  const timeouts = () => warnings.filter((message) => /no respondió/.test(message))
  // Every check hangs; each retry comes 3 s, 6 s, 12 s, 24 s after its timeout.
  let seen = 0
  for (const [limit, retry] of [[20000, 3000], [40000, 6000], [80000, 12000], [80000, 24000]]) {
    const before = checks.length
    await advance(limit - 1)
    assert.equal(timeouts().length, seen, `still waiting just before ${limit} ms`)
    await advance(1)
    assert.equal(timeouts().length, ++seen, `gives up at ${limit} ms`)
    await advance(retry)
    assert.equal(checks.length, before + 1, `retried ${retry} ms later`)
  }
  assert.deepEqual(timeouts().map((message) => message.match(/en (\d+) s/)[1]), ['20', '40', '80', '80'], 'each warning names the limit that was used')
}))

test('an answer that needs 30 s loads on the second attempt, which waits 40 s', scenario(async (auth) => {
  await advance(20000) // the first attempt gets no answer in 20 s
  await advance(3000)
  assert.equal(checks.length, 2)
  await advance(30000) // a 20 s limit would have abandoned this attempt 10 s ago
  checks[1](signedIn)
  await flush()
  const state = auth.render()
  assert.equal(state.session?.barberoId, 'barbero-1')
  assert.equal(state.loading, false)
  assert.equal(checks.length, 2)
}))

test('a signed-in answer brings the limit back to 20 s', scenario(async (auth) => {
  await advance(20000) // the limit is now 40 s
  answer = signedIn
  await advance(3000)
  assert.equal(auth.render().session.barberoId, 'barbero-1')
  // Later a check hangs: it is abandoned after 20 s, not after 40 s.
  answer = null
  fire('visibilitychange')
  assert.equal(checks.length, 3)
  await abandonedAfter(20000, 3000)
}))

test('a signed-out answer brings the limit back to 20 s too', scenario(async (auth) => {
  await advance(20000) // the limit is now 40 s
  answer = { status: 'signed-out' }
  await advance(3000)
  assert.equal(auth.render().error, 'No hay sesión activa')
  answer = null
  fire('visibilitychange')
  assert.equal(checks.length, 3)
  await abandonedAfter(20000, 3000)
}))

test('a quick "unknown" answer does not lengthen the limit', scenario(async () => {
  checks[0]({ status: 'unknown' })
  await flush()
  await advance(3000) // the retry hangs
  assert.equal(checks.length, 2)
  await abandonedAfter(20000, 6000)
}))

test('a session restore that timed out on its own lengthens the limit', scenario(async () => {
  // app-session gave up on its request and says so with timedOut.
  checks[0]({ status: 'unknown', timedOut: true })
  await flush()
  await advance(3000) // the retry hangs
  assert.equal(checks.length, 2)
  await abandonedAfter(40000, 6000)
}))

test('the timeout of a superseded check does not lengthen the limit', scenario(async () => {
  await advance(10000)
  fire('visibilitychange') // check 2 replaces check 1
  await advance(10000) // check 1 reaches its 20 s limit: stale, ignored
  checks[1]({ status: 'unknown' }) // check 2 fails quickly, without a timeout
  await flush()
  await advance(3000) // the retry (check 3) hangs
  assert.equal(checks.length, 3)
  await abandonedAfter(20000, 6000)
}))
