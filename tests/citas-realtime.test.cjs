// /barber-app agenda: resume refetch and new-booking notice, with React hooks faked.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const { stubModule } = require('./fake-db.cjs')

const token = (exp) => 'header.' + Buffer.from(JSON.stringify({ exp })).toString('base64url') + '.signature'
const inSeconds = (seconds) => token(Math.floor(Date.now() / 1000) + seconds)
const user = { id: 'barbero-user' }
const tick = () => new Promise((resolve) => setTimeout(resolve, 20))

let native = null
let sessionRequests = 0
let respond = async () => { throw new Error('offline') }
// Access token held in memory when each citas query went out.
const queries = []
const toasts = []
const systemNotifications = []
let realtimeHandler = null
const listeners = []

global.window = {
  addEventListener: (type, fn) => listeners.push({ type, fn }),
  removeEventListener() {},
}
global.document = {
  visibilityState: 'visible',
  addEventListener: (type, fn) => listeners.push({ type, fn }),
  removeEventListener() {},
}
global.fetch = (...args) => { sessionRequests++; return respond(...args) }
// What the old code used for its local notification; it must stay unused.
global.Notification = { permission: 'granted' }
global.window.Notification = global.Notification
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { serviceWorker: { getRegistration: async () => ({ showNotification: (...args) => systemNotifications.push(args) }) } },
})

const citasQuery = {
  select() { return this },
  eq() { return this },
  order() {
    queries.push(native?.accessToken ?? null)
    return Promise.resolve({ data: [{ id: 'cita-1', hora: '10:00' }], error: null })
  },
}
stubModule('../src/lib/supabase.ts', {
  supabase: {
    _insforge: { tokenManager: { getSession: () => native, saveSession: (value) => { native = value } } },
    from: () => citasQuery,
    channel: () => ({ on(_event, _filter, handler) { realtimeHandler = handler; return this }, subscribe() { return this } }),
    removeChannel() {},
  },
})
stubModule('react-hot-toast', (...args) => toasts.push(args))

const { useCitasRealtime } = require('../src/hooks/useCitasRealtime.ts')
const { checkAppSession } = require('../src/lib/app-session.ts')
const { getChileHoy } = require('../src/lib/date-utils.ts')

async function quietly(run) {
  const realLog = console.log
  const realWarn = console.warn
  console.log = () => {}
  console.warn = () => {}
  try { return await run() } finally { console.log = realLog; console.warn = realWarn }
}

// One render: every effect runs once, state setters are no-ops.
function mountHook(barberoId) {
  const effects = []
  React.useState = (initial) => [initial, () => {}]
  React.useCallback = (fn) => fn
  React.useEffect = (fn) => { effects.push(fn) }
  const result = useCitasRealtime(barberoId)
  effects.forEach((effect) => effect())
  return result
}

function fire(type) {
  listeners.filter((listener) => listener.type === type).forEach((listener) => listener.fn())
}

test('the resume refetch waits for the expired token to be restored', async () => {
  native = { accessToken: inSeconds(900), user }
  await quietly(async () => { mountHook('barbero-1'); await tick() })
  assert.equal(queries.length, 1)

  // Twenty minutes in the background: the token in memory expired.
  native = { accessToken: inSeconds(-60), user }
  const restored = inSeconds(900)
  sessionRequests = 0
  respond = () => new Promise((resolve) => setTimeout(() => resolve({ status: 200, ok: true, json: async () => ({ session: { user, access_token: restored } }) }), 5))

  await quietly(async () => {
    // useBarberAppAuth checks the session on the same event.
    const authCheck = checkAppSession()
    fire('visibilitychange')
    await authCheck
    await tick()
  })

  assert.equal(queries.length, 2)
  assert.equal(queries[1], restored)
  assert.equal(sessionRequests, 1)
})

test('a resume without a confirmed session does not query', async () => {
  queries.length = 0
  native = { accessToken: inSeconds(-60), user }
  respond = async () => { throw new TypeError('Failed to fetch') }
  await quietly(async () => { fire('online'); await tick() })
  assert.equal(queries.length, 0)
})

test('a new booking today shows an in-app notice, never a second system notification', async () => {
  const booking = { eventType: 'INSERT', new: { id: 'cita-2', fecha: getChileHoy(), hora: '11:00', cliente_nombre: 'Ana' } }
  toasts.length = 0
  await quietly(async () => { realtimeHandler(booking); await tick() })
  assert.deepEqual(toasts, [['Nueva cita: Ana', { icon: '✂️' }]])

  // In the background the OneSignal push already tells the barber.
  global.document.visibilityState = 'hidden'
  toasts.length = 0
  await quietly(async () => { realtimeHandler({ ...booking, new: { ...booking.new, id: 'cita-3' } }); await tick() })
  global.document.visibilityState = 'visible'
  assert.deepEqual(toasts, [])
  assert.deepEqual(systemNotifications, [])
})
