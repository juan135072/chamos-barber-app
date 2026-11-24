// Coming back to the app with a flaky network must not look like a logout.
require('./load-typescript.cjs')
const test = require('node:test')
const { mock } = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')

let native = null
let respond = async () => { throw new Error('offline') }
const token = (exp) => 'header.' + Buffer.from(JSON.stringify({ exp })).toString('base64url') + '.signature'
const fresh = { user: { id: 'barbero-user' }, access_token: token(Math.floor(Date.now() / 1000) + 900) }

global.window = {}
global.fetch = (...args) => respond(...args)
const sdkFile = require.resolve('../src/lib/supabase.ts')
require.cache[sdkFile] = { id: sdkFile, filename: sdkFile, loaded: true, exports: { supabase: { _insforge: { tokenManager: { getSession: () => native, saveSession: (value) => { native = value } } } } } }
const { checkAppSession, getAppSession, isSameSession, isNoRowsError } = require('../src/lib/app-session.ts')

const reply = (status, body) => async () => ({ status, ok: status >= 200 && status < 300, json: async () => body })

async function quietly(run) {
  const realWarn = console.warn
  console.warn = () => {}
  try { return await run() } finally { console.warn = realWarn }
}

test('a network failure is "unknown", not signed out', async () => {
  native = null
  respond = async () => { throw new TypeError('Failed to fetch') }
  assert.deepEqual(await quietly(checkAppSession), { status: 'unknown' })
  // Older callers still get null from getAppSession().
  assert.equal(await quietly(getAppSession), null)
})

test('server or proxy errors are "unknown"; only an answer means signed out', async () => {
  native = null
  respond = reply(503, { error: 'Service Unavailable' })
  assert.deepEqual(await checkAppSession(), { status: 'unknown' })
  respond = async () => ({ status: 200, ok: true, json: async () => { throw new SyntaxError('Unexpected token <') } })
  assert.deepEqual(await quietly(checkAppSession), { status: 'unknown' })
  respond = reply(401, { error: 'Unauthorized' })
  assert.deepEqual(await checkAppSession(), { status: 'signed-out' })
  respond = reply(200, { session: null })
  assert.deepEqual(await checkAppSession(), { status: 'signed-out' })
})

test('a restored session is signed in and hydrates the in-memory token', async () => {
  native = null
  respond = reply(200, { session: fresh })
  const result = await checkAppSession()
  assert.equal(result.status, 'signed-in')
  assert.equal(result.session.user.id, 'barbero-user')
  assert.equal(native.accessToken, fresh.access_token)
})

test('the session only counts as changed when the user or token changes', () => {
  const a = { user: { id: 'u1' }, access_token: 't1', expires_in: 0 }
  assert.equal(isSameSession(a, { user: { id: 'u1' }, access_token: 't1', expires_in: 900 }), true)
  assert.equal(isSameSession(a, { user: { id: 'u1' }, access_token: 't2' }), false)
  assert.equal(isSameSession(a, { user: { id: 'u2' }, access_token: 't1' }), false)
  assert.equal(isSameSession(null, null), true)
  assert.equal(isSameSession(undefined, null), false)
  assert.equal(isSameSession(a, null), false)
})

test('only a PostgREST "no rows" error is a real not-found', () => {
  assert.equal(isNoRowsError({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }), true)
  assert.equal(isNoRowsError({ code: '', message: 'TypeError: Failed to fetch' }), false)
  assert.equal(isNoRowsError(null), false)
})

test('useSession retries an unanswered check quietly at 3 s, 6 s, 12 s … up to 30 s', async () => {
  native = null
  let requests = 0
  respond = async () => { requests++; throw new TypeError('Failed to fetch') }
  global.window.addEventListener = () => {}
  global.window.removeEventListener = () => {}
  global.document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} }
  const { useSession } = require('../src/lib/insforge-react.ts')
  const flush = () => new Promise((resolve) => setImmediate(resolve))

  mock.timers.enable({ apis: ['setTimeout'] })
  const saved = { useState: React.useState, useEffect: React.useEffect }
  const cleanups = []
  React.useState = (initial) => [initial, () => {}]
  React.useEffect = (fn) => { cleanups.push(fn()) }
  try {
    useSession()
  } finally {
    Object.assign(React, saved)
  }
  try {
    await quietly(async () => {
      await flush()
      assert.equal(requests, 1)
      for (const delay of [3000, 6000, 12000, 24000, 30000, 30000]) {
        const before = requests
        mock.timers.tick(delay - 1)
        await flush()
        assert.equal(requests, before, `no retry before ${delay} ms`)
        mock.timers.tick(1)
        await flush()
        assert.equal(requests, before + 1, `retry after ${delay} ms`)
      }
    })
  } finally {
    cleanups.forEach((cleanup) => cleanup?.())
    mock.timers.reset()
  }
})

// --- The restore request has its own limit: 20 s, 40 s, 80 s ----------------

const flush = () => new Promise((resolve) => setImmediate(resolve))
const hang = () => new Promise(() => {})

// A definitive answer puts the limit of the restore request back at 20 s.
async function startOver() {
  native = null
  respond = reply(200, { session: null })
  assert.deepEqual(await checkAppSession(), { status: 'signed-out' })
}

// Starts a check against the current `respond` and records when it settles.
function watch(promise = checkAppSession()) {
  const state = { settled: false, result: undefined }
  promise.then((result) => { state.settled = true; state.result = result })
  return state
}

async function withMockedTimeouts(run) {
  mock.timers.enable({ apis: ['setTimeout'] })
  try { return await quietly(run) } finally { mock.timers.reset() }
}

async function tick(ms) {
  mock.timers.tick(ms)
  await flush()
}

async function timesOutAfter(limit) {
  respond = hang
  const check = watch()
  await tick(limit - 1)
  assert.equal(check.settled, false, `still waiting just before ${limit} ms`)
  await tick(1)
  assert.deepEqual(check.result, { status: 'unknown', timedOut: true }, `gives up at ${limit} ms`)
}

test('the timeout ladder doubles from 20 s up to 80 s and starts over on reset', () => {
  const { createTimeoutLadder } = require('../src/lib/timeout-ladder.ts')
  const ladder = createTimeoutLadder()
  const seen = [ladder.current()]
  for (let i = 0; i < 4; i++) { ladder.timedOut(); seen.push(ladder.current()) }
  assert.deepEqual(seen, [20000, 40000, 80000, 80000, 80000])
  ladder.reset()
  assert.equal(ladder.current(), 20000)
})

test('a restore that never answers gives up after 20 s, aborts its request and frees the next check', async () => {
  await startOver()
  const signals = []
  respond = (url, options) => { signals.push(options.signal); return hang() }
  await withMockedTimeouts(async () => {
    const first = watch()
    const joined = watch()
    assert.equal(signals.length, 1, 'both callers share one request')
    await tick(19999)
    assert.deepEqual([first.settled, joined.settled, signals[0].aborted], [false, false, false])
    await tick(1)
    // Every caller that joined gets the answer, and it is not a sign-out.
    assert.deepEqual(first.result, { status: 'unknown', timedOut: true })
    assert.deepEqual(joined.result, { status: 'unknown', timedOut: true })
    assert.equal(signals[0].aborted, true)

    // The hung request no longer blocks: the next check sends a new one.
    const next = watch()
    assert.equal(signals.length, 2)
    assert.equal(signals[1].aborted, false)
    await tick(40000)
    assert.equal(next.settled, true)
  })
})

test('the limit of the restore grows 20 s, 40 s, 80 s, 80 s while it keeps timing out', async () => {
  await startOver()
  await withMockedTimeouts(async () => {
    for (const limit of [20000, 40000, 80000, 80000]) await timesOutAfter(limit)
  })
})

test('only an answer starts the limit over at 20 s; a failed request neither lengthens nor resets it', async () => {
  await startOver()
  await withMockedTimeouts(async () => {
    // A quick failure is not a timeout: the limit stays at 20 s.
    respond = async () => { throw new TypeError('Failed to fetch') }
    assert.deepEqual(await checkAppSession(), { status: 'unknown' })
    await timesOutAfter(20000)
    // Nor does a failure bring a longer limit back down.
    respond = reply(503, { error: 'Service Unavailable' })
    assert.deepEqual(await checkAppSession(), { status: 'unknown' })
    await timesOutAfter(40000)
    // Signed out and signed in are answers: both start over.
    respond = reply(401, { error: 'Unauthorized' })
    assert.deepEqual(await checkAppSession(), { status: 'signed-out' })
    await timesOutAfter(20000)
    respond = reply(200, { session: fresh })
    assert.equal((await checkAppSession()).status, 'signed-in')
    native = null
    await timesOutAfter(20000)
  })
})

test('an answer in time leaves no timer behind', async () => {
  await startOver()
  await withMockedTimeouts(async () => {
    const warnings = []
    console.warn = (...args) => warnings.push(args.join(' '))
    const signals = []
    respond = async (url, options) => { signals.push(options.signal); return { status: 200, ok: true, json: async () => ({ session: null }) } }
    assert.deepEqual(await checkAppSession(), { status: 'signed-out' })
    await tick(80000)
    assert.equal(signals[0].aborted, false, 'the answered request is not aborted later')
    assert.deepEqual(warnings, [])
  })
})

test('an answer that arrives after the limit changes nothing', async () => {
  await startOver()
  await withMockedTimeouts(async () => {
    let answer
    respond = () => new Promise((resolve) => { answer = resolve })
    const check = watch()
    await tick(20000)
    assert.deepEqual(check.result, { status: 'unknown', timedOut: true })
    answer({ status: 200, ok: true, json: async () => ({ session: fresh }) })
    await flush()
    assert.equal(native, null, 'the abandoned request does not fill the in-memory session')
  })
})

test('older callers get null from getAppSession() when the restore times out', async () => {
  await startOver()
  respond = hang
  await withMockedTimeouts(async () => {
    const pending = getAppSession()
    await tick(20000)
    assert.equal(await pending, null)
  })
})
