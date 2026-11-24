// Booking side effects must never hold the booking response waiting for OneSignal.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { stubModule } = require('./fake-db.cjs')

const pushes = []
let pushBehaviour = () => new Promise(() => {})
stubModule('../src/lib/realtime-publish.ts', { async publishCitaChange() {} })
stubModule('../src/lib/onesignal.ts', { sendNotificationToBarber(...args) { pushes.push(args); return pushBehaviour() } })
const { notifyBookingCreated, notifyBookingCancelled, notifyBookingRescheduled } = require('../src/lib/booking/notify.ts')

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

// A customer's reschedule goes back to pendiente; a staff move keeps the estado.
test('the reschedule push asks the barber to confirm only while the booking is pendiente', async () => {
  pushes.length = 0
  pushBehaviour = async () => ({ success: true })
  const moved = { ...cita, fecha: '2099-01-06', hora: '11:00:00' }
  for (const estado of ['pendiente', 'confirmada']) {
    await notifyBookingRescheduled({}, { ...cita, estado: 'confirmada' }, { ...moved, estado }, { barberoNombre: 'Carlos' })
  }
  assert.deepEqual(pushes, [
    ['barbero-1', 'Cita reagendada 🔄', 'Hola Carlos, la cita de Ana quedó para el martes, 6 de enero de 2099 a las 11:00. Queda pendiente de tu confirmación.'],
    ['barbero-1', 'Cita reagendada 🔄', 'Hola Carlos, la cita de Ana quedó para el martes, 6 de enero de 2099 a las 11:00.'],
  ])
})
