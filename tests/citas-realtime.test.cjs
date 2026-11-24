// /barber-app agenda: resume refetch, new-booking notice and rescheduled citas,
// with React hooks faked.
require('./load-typescript.cjs')
const test = require('node:test')
const { mock } = require('node:test')
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

// The agenda is the list of today's citas of one barber (the first useState).
// Staff and customers can move a cita to another day, time or barber, and the
// barber app learns it from an UPDATE event.
const HOY = '2026-11-23'
const MANANA = '2026-11-24'
const agenda = [
  { id: 'a', barbero_id: 'barbero-1', fecha: HOY, hora: '10:00:00', estado: 'confirmada', cliente_nombre: 'Ana' },
  { id: 'b', barbero_id: 'barbero-1', fecha: HOY, hora: '12:00:00', estado: 'pendiente', cliente_nombre: 'Beto' },
]

// Mounts the hook recording what its realtime handler does to the agenda, and
// returns `citas` after `event`. "Now" is 21:30 on 23 Nov 2026 in Chile, when
// the UTC day is already the 24th, so the result must not depend on TZ.
async function agendaAfter(event, citas) {
  mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-24T00:30:00Z') })
  try {
    const updates = []
    const effects = []
    let index = 0
    React.useState = (initial) => { const i = index++; return [initial, (next) => { if (i === 0) updates.push(next) }] }
    React.useCallback = (fn) => fn
    React.useEffect = (fn) => { effects.push(fn) }
    return await quietly(() => {
      useCitasRealtime('barbero-1')
      effects.forEach((effect) => effect())
      updates.length = 0
      realtimeHandler(event)
      return updates.reduce((list, update) => (typeof update === 'function' ? update(list) : update), citas)
    })
  } finally {
    mock.timers.reset()
  }
}

test('a cita rescheduled to another day leaves the agenda of today', async () => {
  const moved = { ...agenda[0], fecha: MANANA, hora: '16:00:00' }
  assert.deepEqual(await agendaAfter({ eventType: 'UPDATE', new: moved, old: agenda[0] }, agenda), [agenda[1]])
})

test('a cita rescheduled into today joins the agenda in time order, without a new-booking notice', async () => {
  const arriving = { id: 'c', barbero_id: 'barbero-1', fecha: HOY, hora: '11:00:00', estado: 'confirmada', cliente_nombre: 'Caro' }
  toasts.length = 0
  assert.deepEqual(await agendaAfter({ eventType: 'UPDATE', new: arriving, old: { ...arriving, fecha: MANANA, hora: '09:00:00' } }, agenda), [agenda[0], arriving, agenda[1]])
  assert.deepEqual(await agendaAfter({ eventType: 'UPDATE', new: { ...arriving, hora: '09:30:00' } }, agenda), [{ ...arriving, hora: '09:30:00' }, ...agenda])
  // The 24th is tomorrow in Chile, although it is already today in UTC.
  assert.deepEqual(await agendaAfter({ eventType: 'UPDATE', new: { ...arriving, fecha: MANANA } }, agenda), agenda)
  assert.deepEqual(toasts, [])
})

test('a cita moved to another time today is listed at its new time', async () => {
  const later = { ...agenda[0], hora: '13:00:00' }
  assert.deepEqual(await agendaAfter({ eventType: 'UPDATE', new: later, old: agenda[0] }, agenda), [agenda[1], later])
})

test('other updates still change a listed cita in place and ignore unknown ones', async () => {
  // A full row with the same day and time: an estado change.
  const done = { ...agenda[0], estado: 'completada' }
  assert.deepEqual(await agendaAfter({ eventType: 'UPDATE', new: done }, agenda), [done, agenda[1]])
  // An event without fecha, like the fallback published after an estado change.
  const partial = { id: 'b', barbero_id: 'barbero-1', comercio_id: null, estado: 'cancelada' }
  assert.deepEqual(await agendaAfter({ eventType: 'UPDATE', new: partial }, agenda), [agenda[0], { ...agenda[1], comercio_id: null, estado: 'cancelada' }])
  // A list loaded yesterday keeps its citas when only their estado changes.
  const stale = agenda.map((cita) => ({ ...cita, fecha: '2026-11-22' }))
  assert.deepEqual(await agendaAfter({ eventType: 'UPDATE', new: { ...stale[0], estado: 'completada' } }, stale), [{ ...stale[0], estado: 'completada' }, stale[1]])
  // Citas that are not listed and do not belong to today.
  for (const unknown of [{ id: 'z', fecha: MANANA, hora: '09:00:00' }, { id: 'z', estado: 'cancelada' }]) {
    assert.deepEqual(await agendaAfter({ eventType: 'UPDATE', new: unknown }, agenda), agenda)
  }
})

test('new and deleted citas keep working as before', async () => {
  const booked = { id: 'c', barbero_id: 'barbero-1', fecha: HOY, hora: '11:00:00', estado: 'pendiente', cliente_nombre: 'Caro' }
  assert.deepEqual(await agendaAfter({ eventType: 'INSERT', new: booked }, agenda), [agenda[0], booked, agenda[1]])
  assert.deepEqual(await agendaAfter({ eventType: 'INSERT', new: { ...booked, fecha: MANANA } }, agenda), agenda)
  // What the previous barber receives when a cita is reassigned.
  assert.deepEqual(await agendaAfter({ eventType: 'DELETE', new: null, old: agenda[0] }, agenda), [agenda[1]])
})
