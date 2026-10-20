// Characterization tests: /api/crear-cita must keep its exact responses after
// the booking logic moved to src/lib/booking (shared with the bot API).
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { createFakeDb, createResponse, stubModule } = require('./fake-db.cjs')

process.env.NODE_ENV = 'production' // quiet dev logs
let db
const pushes = []
stubModule('../src/lib/supabase-server.ts', { createPagesAdminClient: () => db })
stubModule('../src/lib/onesignal.ts', { async sendNotificationToBarber(...args) { pushes.push(args); return { success: true } } })
stubModule('../src/lib/security/logger.ts', { logRateLimitExceeded() {} })
const handler = require('../src/pages/api/crear-cita.ts').default
const { formatFechaChile } = require('../src/lib/date-utils.ts')

const tenant = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const barberId = '11111111-1111-4111-8111-111111111111'
const corte = '22222222-2222-4222-8222-222222222222'
const barba = '33333333-3333-4333-8333-333333333333'
const phone = '+56912345678'
const body = { barbero_id: barberId, servicios_ids: [corte, corte, barba], fecha: '2099-01-05', hora: '10:30', cliente_nombre: 'Ana', cliente_telefono: phone, notas: 'Hola', precio_final: 1, items: [{ servicio_id: corte, precio: 1 }] }
const slots = [{ hora: '10:30', disponible: true, motivo: 'Disponible' }, { hora: '11:00', disponible: false, motivo: 'Ocupado' }]

function setup(overrides = {}) {
  pushes.length = 0
  db = createFakeDb({
    tables: {
      barberos: [{ id: barberId, nombre: 'Carlos', apellido: 'Pérez', activo: true, comercio_id: tenant }],
      servicios: [
        { id: corte, nombre: 'Corte', activo: true, duracion_minutos: 30, tiempo_buffer: 5, precio: 10000, comercio_id: tenant },
        { id: barba, nombre: 'Barba', activo: true, duracion_minutos: 20, tiempo_buffer: 10, precio: 6000, comercio_id: tenant },
      ],
      citas: [],
    },
    rpc: async () => ({ data: slots, error: null }),
    ...overrides,
  })
  return db
}

let ip = 0
async function call(payload, { method = 'POST', from = `10.0.0.${++ip}` } = {}) {
  const res = createResponse()
  await handler({ method, url: '/api/crear-cita', headers: { 'x-forwarded-for': from }, socket: {}, body: payload }, res)
  return res
}

test('creates a pending booking priced from the catalog and notifies the barber', async () => {
  setup()
  const res = await call(body)
  assert.equal(res.statusCode, 201)
  assert.equal(db.calls.rpc[0].name, 'get_horarios_disponibles')
  assert.deepEqual(db.calls.rpc[0].args, { p_barbero_id: barberId, p_fecha: '2099-01-05', p_duracion_minutos: 90 })
  const { row } = db.calls.inserts[0]
  assert.deepEqual({ ...row, id: undefined }, {
    id: undefined, servicio_id: corte, barbero_id: barberId, comercio_id: tenant, fecha: '2099-01-05', hora: '10:30',
    cliente_nombre: 'Ana', cliente_telefono: phone, cliente_email: null,
    notas: 'Hola\n\n[SERVICIOS SOLICITADOS: Corte (2), Barba (1)]', estado: 'pendiente', precio_final: 26000,
    items: [
      { servicio_id: corte, nombre: 'Corte', precio: 10000, cantidad: 2, duracion_minutos: 30, tiempo_buffer: 5, subtotal: 20000 },
      { servicio_id: barba, nombre: 'Barba', precio: 6000, cantidad: 1, duracion_minutos: 20, tiempo_buffer: 10, subtotal: 6000 },
    ],
  })
  assert.deepEqual(res.body, { success: true, data: row, message: '¡Cita reservada exitosamente! Te contactaremos pronto para confirmar.' })
  assert.deepEqual(db.calls.published.map(p => p.channel), [`citas:barbero:${barberId}`, `citas:comercio:${tenant}`])
  assert.equal(db.calls.published[0].payload.eventType, 'INSERT')
  assert.deepEqual(pushes, [[barberId, 'Nueva Reserva ✂️', `Hola Carlos, tienes una nueva reserva de Ana para el ${formatFechaChile('2099-01-05')} a las 10:30.`]])
})

test('single legacy servicio_id booking keeps notes untouched', async () => {
  setup()
  const res = await call({ ...body, servicios_ids: undefined, servicio_id: corte, notas: undefined, cliente_email: 'ana@example.com' })
  assert.equal(res.statusCode, 201)
  const { row } = db.calls.inserts[0]
  assert.equal(row.notas, null)
  assert.equal(row.cliente_email, 'ana@example.com')
  assert.equal(row.precio_final, 10000)
  assert.equal(db.calls.rpc[0].args.p_duracion_minutos, 35)
})

test('rejects other methods and invalid input before touching the database', async () => {
  setup()
  let res = await call(body, { method: 'GET' })
  assert.equal(res.statusCode, 405)
  assert.deepEqual(res.body, { error: 'Method not allowed' })
  res = await call({ ...body, fecha: '2099-02-30' })
  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, { error: 'Fecha inválida' })
  assert.equal(db.calls.selects.length, 0)
})

test('unknown barber and inactive barber keep their distinct responses', async () => {
  setup()
  db.tables.barberos = []
  let res = await call(body)
  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, { error: 'Barbero no disponible' })
  setup()
  db.tables.barberos[0].activo = false
  res = await call(body)
  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, { error: 'El barbero seleccionado no está disponible', code: 'BARBERO_NO_DISPONIBLE' })
})

test('active booking limit is counted per phone inside the barber tenant', async () => {
  setup()
  db.tables.citas = Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, cliente_telefono: phone, comercio_id: tenant, estado: 'pendiente', fecha: '2099-01-0' + (i + 1), hora: '10:00:00' }))
  db.tables.citas.push({ id: 'foreign', cliente_telefono: phone, comercio_id: 'other', estado: 'pendiente', fecha: '2099-01-01', hora: '10:00:00' })
  const res = await call(body)
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.code, 'LIMITE_CITAS_ALCANZADO')
  assert.equal(res.body.citas_activas, 5)
  assert.equal(res.body.limite_maximo, 5)
  assert.equal(res.body.info, '📞 Si necesitas hacer más reservas, contáctanos directamente.')
  assert.match(res.body.error, /Tienes 5 citas/)
  assert.match(db.calls.or[0].expression, /^fecha\.gt\.\d{4}-\d{2}-\d{2},and\(fecha\.eq\.\d{4}-\d{2}-\d{2},hora\.gte\.\d{2}:\d{2}\)$/)
  assert.equal(db.calls.inserts.length, 0)
})

test('services must exist in the tenant and be active', async () => {
  setup()
  db.tables.servicios[1].comercio_id = 'other'
  let res = await call(body)
  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, { error: 'Uno o más servicios seleccionados no están disponibles', code: 'SERVICIO_NO_DISPONIBLE' })
  setup()
  db.tables.servicios[0].activo = false
  res = await call(body)
  assert.deepEqual(res.body, { error: 'Servicio(s) no disponible(s): Corte', code: 'SERVICIO_NO_DISPONIBLE' })
})

test('slot must be offered as available by the database', async () => {
  setup()
  let res = await call({ ...body, hora: '11:00' })
  assert.equal(res.statusCode, 409)
  assert.deepEqual(res.body, { error: 'El horario ya no está disponible. Selecciona otro horario.', code: 'HORARIO_NO_DISPONIBLE' })
  setup({ rpc: async () => ({ data: null, error: { message: 'boom' } }) })
  res = await call(body)
  assert.equal(res.statusCode, 503)
  assert.deepEqual(res.body, { error: 'No se pudo verificar la disponibilidad' })
  setup({ fail: { 'citas.select': { message: 'down' } } })
  res = await call(body)
  assert.equal(res.statusCode, 503)
  assert.deepEqual(res.body, { error: 'No se pudo verificar la disponibilidad' })
})

for (const code of ['23505', '23P01']) {
  test(`database conflict ${code} is reported as a race condition`, async () => {
    setup({ onInsert: () => ({ code, message: 'conflict' }) })
    const res = await call(body)
    assert.equal(res.statusCode, 409)
    assert.deepEqual(res.body, { error: '⚠️ Este horario fue reservado mientras completabas el formulario. Por favor selecciona otro horario.', code: 'RACE_CONDITION' })
    assert.equal(pushes.length, 0)
  })
}

test('other insert errors keep the legacy 500 body', async () => {
  setup({ onInsert: () => ({ code: 'XX000', message: 'disk full' }) })
  const res = await call(body)
  assert.equal(res.statusCode, 500)
  assert.deepEqual(res.body, { error: 'Error al crear la cita', details: 'disk full' })
})

test('per-IP rate limit still protects the public booking route', async () => {
  setup()
  const statuses = []
  for (let i = 0; i < 6; i++) statuses.push((await call({ ...body, hora: '11:00' }, { from: '192.0.2.99' })).statusCode)
  assert.deepEqual(statuses, [409, 409, 409, 409, 409, 429])
})
