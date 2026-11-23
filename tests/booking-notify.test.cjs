// Booking side effects must never hold the booking response waiting for OneSignal.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { stubModule } = require('./fake-db.cjs')

const pushes = []
let pushBehaviour = () => new Promise(() => {})
stubModule('../src/lib/realtime-publish.ts', { async publishCitaChange() {} })
stubModule('../src/lib/onesignal.ts', { sendNotificationToBarber(...args) { pushes.push(args); return pushBehaviour() } })
const { notifyBookingCreated, notifyBookingCancelled } = require('../src/lib/booking/notify.ts')

const cita = { id: 'cita-1', barbero_id: 'barbero-1', cliente_nombre: 'Ana', fecha: '2099-01-05', hora: '10:30:00' }

// The deadline makes a booking that waits for the push fail instead of hanging the suite.
test('a booking finishes while the push is still in flight', { timeout: 1000 }, async () => {
  pushes.length = 0
  pushBehaviour = () => new Promise(() => {})
  await notifyBookingCreated({}, cita, { barberoId: 'barbero-1', barberoNombre: 'Carlos', clienteNombre: 'Ana', fecha: '2099-01-05', hora: '10:30' })
  assert.equal(pushes.length, 1)
  assert.equal(pushes[0][0], 'barbero-1')
})

test('a failing push is logged and never reaches the booking', async () => {
  pushes.length = 0
  const errors = []
  const realError = console.error
  console.error = (...args) => errors.push(args.join(' '))
  pushBehaviour = () => Promise.reject(new Error('boom'))
  try {
    await notifyBookingCancelled({}, cita, { ...cita, estado: 'cancelada' })
    await new Promise((resolve) => setImmediate(resolve))
  } finally {
    console.error = realError
  }
  assert.equal(pushes.length, 1)
  assert.match(errors[0], /push notification failed/)
})
