// Bot API write routes: create, reschedule and cancel with the website rules.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { createFakeDb, createResponse, stubModule } = require('./fake-db.cjs')

process.env.NODE_ENV = 'production'
let db
const pushes = []
stubModule('../src/lib/supabase-server.ts', { createPagesAdminClient: () => db })
stubModule('../src/lib/onesignal.ts', { async sendNotificationToBarber(id, title, message) { pushes.push({ id, title, message }); return { success: true } } })
const citasRoute = require('../src/pages/api/bot/citas/index.ts').default
const reagendar = require('../src/pages/api/bot/citas/reagendar.ts').default
const cancelar = require('../src/pages/api/bot/citas/cancelar.ts').default
const { getDynamicHoy } = require('../src/lib/date-utils.ts')
const { localWallTimestamp } = require('../src/lib/booking-validation.ts')
const { addDays } = require('../src/lib/bot/validation.ts')
const { isBeforeStart, wallClock } = require('../src/lib/booking/change-policy.ts')
const { isRangeFree } = require('../src/lib/booking/change.ts')
const { presentCita } = require('../src/lib/bot/citas.ts')

const KEY = 'test-bot-key-0123456789-abcdefghijklmnop'
const TZ = 'America/Santiago'
const tenant = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const carlos = '11111111-1111-4111-8111-111111111111'
const luis = '44444444-4444-4444-8444-444444444444'
const ajeno = '55555555-5555-4555-8555-555555555555'
const corte = '22222222-2222-4222-8222-222222222222'
const barba = '33333333-3333-4333-8333-333333333333'
const mine = '77777777-7777-4777-8777-777777777777'
const theirs = '88888888-8888-4888-8888-888888888888'
const phone = '+56912345678'
const today = getDynamicHoy(TZ)
const day = addDays(today, 3)
const corteItem = { servicio_id: corte, nombre: 'Corte', precio: 10000, cantidad: 1, duracion_minutos: 30, tiempo_buffer: 5, subtotal: 10000 }

// slots[`${barbero}|${fecha}`] = [{ hora, disponible, motivo }]
let slots
function seed() {
  pushes.length = 0
  slots = {}
  db = createFakeDb({
    tables: {
      comercios: [{ id: tenant, slug: 'chamos', nombre: 'Chamos', timezone: TZ, moneda: 'CLP', activo: true }],
      barberos: [
        { id: carlos, nombre: 'Carlos', apellido: 'Pérez', activo: true, comercio_id: tenant },
        { id: luis, nombre: 'Luis', apellido: 'Rojas', activo: true, comercio_id: tenant },
        { id: ajeno, nombre: 'Ajeno', apellido: 'X', activo: true, comercio_id: other },
      ],
      servicios: [
        { id: corte, nombre: 'Corte', activo: true, duracion_minutos: 30, tiempo_buffer: 5, precio: 10000, comercio_id: tenant },
        { id: barba, nombre: 'Barba', activo: true, duracion_minutos: 20, tiempo_buffer: 10, precio: 6000, comercio_id: tenant },
      ],
      citas: [
        { id: mine, comercio_id: tenant, cliente_telefono: '912345678', cliente_nombre: 'Ana', barbero_id: carlos, servicio_id: corte, fecha: day, hora: '10:00:00', estado: 'confirmada', items: [corteItem], precio_final: 10000 },
        { id: theirs, comercio_id: tenant, cliente_telefono: '+56987654321', cliente_nombre: 'Otro', barbero_id: luis, servicio_id: corte, fecha: day, hora: '12:00:00', estado: 'pendiente', items: [corteItem], precio_final: 10000 },
      ],
      horarios_bloqueados: [],
    },
    rpc: async (_name, args) => ({ data: slots[`${args.p_barbero_id}|${args.p_fecha}`] || [], error: null }),
  })
}

async function post(handler, body) {
  const res = createResponse()
  await handler({ method: 'POST', headers: { 'x-bot-api-key': KEY }, query: {}, body }, res)
  return res
}

const citaRow = (id) => db.tables.citas.find(c => c.id === id)
// Real instant whose wall clock in Santiago is `fecha hora` (for timestamptz fixtures).
function santiagoInstant(fecha, hora) {
  const wall = wallClock(fecha, hora)
  const offset = localWallTimestamp(new Date(wall), TZ) - wall
  return new Date(wall - offset).toISOString()
}
// fecha/hora of a booking that starts `minutes` from now in Santiago.
function startsIn(minutes) {
  const iso = new Date(localWallTimestamp(new Date(Date.now() + minutes * 60_000), TZ)).toISOString()
  return { fecha: iso.slice(0, 10), hora: iso.slice(11, 16) + ':00' }
}

test.beforeEach(() => {
  process.env.BOT_API_KEY = KEY
  delete process.env.BOT_COMERCIO_SLUG
  seed()
})

test('changes are allowed until the start, compared as wall clocks in the tenant timezone', () => {
  // 2026-01-15 is summer time in Santiago (UTC-3).
  assert.equal(isBeforeStart('2026-01-15', '10:00', TZ, new Date('2026-01-15T11:30:00Z')), true) // 08:30 local
  assert.equal(isBeforeStart('2026-01-15', '10:00', TZ, new Date('2026-01-15T12:59:00Z')), true) // 09:59 local
  assert.equal(isBeforeStart('2026-01-15', '10:00:00', TZ, new Date('2026-01-15T13:00:00Z')), false) // 10:00 local: started
  assert.equal(isBeforeStart('2026-07-15', '10:00', TZ, new Date('2026-07-15T13:59:00Z')), true) // winter UTC-4: 09:59
  assert.equal(isBeforeStart('2026-07-15', '10:00', TZ, new Date('2026-07-15T14:00:00Z')), false) // winter UTC-4: 10:00
})

test('the cita shape is modificable until its start, which is modificable_hasta', () => {
  const cita = { id: mine, fecha: '2026-01-15', hora: '10:00:00', estado: 'confirmada', barbero_id: carlos, items: [corteItem], precio_final: 10000 }
  const at = (iso) => presentCita(cita, TZ, new Date(iso))
  assert.deepEqual([at('2026-01-15T12:30:00Z').modificable, at('2026-01-15T12:30:00Z').modificable_hasta], [true, '2026-01-15 10:00']) // 30 min before
  assert.equal(at('2026-01-15T13:00:00Z').modificable, false) // started
  assert.equal(at('2026-01-16T13:00:00Z').modificable, false) // past
  assert.equal(presentCita({ ...cita, estado: 'cancelada' }, TZ, new Date('2026-01-15T12:30:00Z')).modificable, false)
})

test('range check treats touching ranges as free', () => {
  assert.equal(isRangeFree(10, 20, [{ start: 20, end: 30 }, { start: 0, end: 10 }]), true)
  assert.equal(isRangeFree(10, 20, [{ start: 19, end: 30 }]), false)
})

test('create books through the shared rules with a normalized phone and the bot marker', async () => {
  slots[`${carlos}|${day}`] = [{ hora: '15:00', disponible: true, motivo: 'Disponible' }]
  const res = await post(citasRoute, { telefono: '9 8765 0000', nombre: ' Juan ', servicios_ids: [corte, barba], barbero_id: carlos, fecha: day, hora: '15:00', notas: 'Prefiere fade', precio_final: 1 })
  assert.equal(res.statusCode, 201)
  const { row } = db.calls.inserts[0]
  assert.equal(row.cliente_telefono, '+56987650000')
  assert.equal(row.cliente_nombre, 'Juan')
  assert.equal(row.comercio_id, tenant)
  assert.equal(row.estado, 'pendiente')
  assert.equal(row.precio_final, 16000)
  assert.equal(row.notas, '[RESERVA WHATSAPP/IA] Prefiere fade\n\n[SERVICIOS SOLICITADOS: Corte (1), Barba (1)]')
  assert.equal(db.calls.rpc[0].args.p_duracion_minutos, 60)
  assert.deepEqual(res.body.data, {
    id: row.id, fecha: day, hora: '15:00', estado: 'pendiente',
    barbero: { id: carlos, nombre: 'Carlos', apellido: 'Pérez' },
    servicios: [{ id: corte, nombre: 'Corte', cantidad: 1, precio: 10000 }, { id: barba, nombre: 'Barba', cantidad: 1, precio: 6000 }],
    precio_final: 16000, modificable: true, modificable_hasta: `${day} 15:00`,
  })
  assert.ok(db.calls.published.some(p => p.channel === `citas:barbero:${carlos}` && p.payload.eventType === 'INSERT'))
  assert.equal(pushes[0].title, 'Nueva Reserva ✂️')
})

test('create without notes keeps only the marker', async () => {
  slots[`${carlos}|${day}`] = [{ hora: '15:00', disponible: true }]
  await post(citasRoute, { telefono: phone, nombre: 'Ana', servicios_ids: [corte], barbero_id: carlos, fecha: day, hora: '15:00' })
  assert.equal(db.calls.inserts[0].row.notas, '[RESERVA WHATSAPP/IA]')
})

test('create validates input and rejects barbers of other tenants', async () => {
  const base = { telefono: phone, nombre: 'Ana', servicios_ids: [corte], barbero_id: carlos, fecha: day, hora: '15:00' }
  for (const change of [{ telefono: '12' }, { nombre: '' }, { servicios_ids: [] }, { hora: '25:00' }, { fecha: addDays(today, 40) }, { email: 'nope' }, { notas: 'x'.repeat(2001) }]) {
    const res = await post(citasRoute, { ...base, ...change })
    assert.equal(res.statusCode, 400, JSON.stringify(change))
    assert.equal(res.body.code, 'DATOS_INVALIDOS')
  }
  const res = await post(citasRoute, { ...base, barbero_id: ajeno })
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.code, 'BARBERO_NO_DISPONIBLE')
  assert.equal(db.calls.inserts.length, 0)
})

test('create enforces the active-booking limit across stored phone spellings', async () => {
  slots[`${carlos}|${day}`] = [{ hora: '15:00', disponible: true }]
  for (let i = 0; i < 4; i++) db.tables.citas.push({ id: `extra-${i}`, comercio_id: tenant, cliente_telefono: i % 2 ? '56912345678' : phone, estado: 'pendiente', fecha: addDays(today, 5 + i), hora: '10:00:00' })
  const res = await post(citasRoute, { telefono: phone, nombre: 'Ana', servicios_ids: [corte], barbero_id: carlos, fecha: day, hora: '15:00' })
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.code, 'LIMITE_CITAS_ALCANZADO')
  assert.equal(db.calls.inserts.length, 0)
})

test('create reports unavailable slots and races', async () => {
  slots[`${carlos}|${day}`] = [{ hora: '15:00', disponible: false, motivo: 'Ocupado' }, { hora: '16:00', disponible: true }]
  const base = { telefono: phone, nombre: 'Ana', servicios_ids: [corte], barbero_id: carlos, fecha: day }
  let res = await post(citasRoute, { ...base, hora: '15:00' })
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.code, 'HORARIO_NO_DISPONIBLE')
  db.onInsert = () => ({ code: '23P01', message: 'overlap' })
  res = await post(citasRoute, { ...base, hora: '16:00' })
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.code, 'RACE_CONDITION')
})

test('reschedule and cancel never reveal bookings of another phone or tenant', async () => {
  db.tables.citas.push({ id: '99999999-9999-4999-8999-999999999999', comercio_id: other, cliente_telefono: phone, barbero_id: ajeno, fecha: day, hora: '10:00:00', estado: 'pendiente' })
  for (const cita_id of [theirs, '99999999-9999-4999-8999-999999999999', 'aaaaaaaa-0000-4000-8000-000000000000']) {
    for (const [handler, body] of [[reagendar, { telefono: phone, cita_id, fecha: day, hora: '16:00' }], [cancelar, { telefono: phone, cita_id }]]) {
      const res = await post(handler, body)
      assert.equal(res.statusCode, 404)
      assert.deepEqual(res.body, { success: false, code: 'CITA_NO_ENCONTRADA', message: 'No encontramos esa cita para este teléfono.' })
    }
  }
  assert.equal(db.calls.updates.length, 0)
  assert.equal(citaRow(theirs).estado, 'pendiente')
})

test('reschedule and cancel still work 30 minutes before the start', async () => {
  Object.assign(citaRow(mine), startsIn(30))
  slots[`${carlos}|${day}`] = [{ hora: '16:00', disponible: true }]
  let res = await post(reagendar, { telefono: phone, cita_id: mine, fecha: day, hora: '16:00' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(db.calls.updates[0].patch, { fecha: day, hora: '16:00', barbero_id: carlos, estado: 'pendiente' })
  assert.equal(res.body.data.modificable, true)
  assert.equal(res.body.data.modificable_hasta, `${day} 16:00`)

  seed()
  Object.assign(citaRow(mine), startsIn(30))
  res = await post(cancelar, { telefono: phone, cita_id: mine })
  assert.equal(res.statusCode, 200)
  assert.equal(citaRow(mine).estado, 'cancelada')
})

test('changes are refused once the current start time arrived or passed', async () => {
  for (const start of [startsIn(0), startsIn(-1), startsIn(-90), { fecha: addDays(today, -1), hora: '10:00:00' }]) {
    seed()
    Object.assign(citaRow(mine), start)
    for (const [handler, body] of [[reagendar, { telefono: phone, cita_id: mine, fecha: day, hora: '16:00' }], [cancelar, { telefono: phone, cita_id: mine }]]) {
      const res = await post(handler, body)
      assert.equal(res.statusCode, 409, JSON.stringify(start))
      assert.deepEqual(res.body, { success: false, code: 'CITA_NO_MODIFICABLE', message: 'La cita ya comenzó o ya pasó y no se puede modificar.' })
    }
    assert.equal(db.calls.updates.length, 0)
  }
})

test('cancelled or completed bookings cannot change', async () => {
  citaRow(mine).estado = 'cancelada'
  const res = await post(reagendar, { telefono: phone, cita_id: mine, fecha: day, hora: '16:00' })
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.code, 'CITA_NO_MODIFICABLE')
})

test('moving within its own occupied range is allowed and returns to pendiente', async () => {
  // The RPC still counts the booking itself (10:00–10:35), so 10:15 shows 'Ocupado'.
  slots[`${carlos}|${day}`] = [{ hora: '10:00', disponible: false, motivo: 'Ocupado' }, { hora: '10:15', disponible: false, motivo: 'Ocupado' }]
  const res = await post(reagendar, { telefono: '+56 9 1234 5678', cita_id: mine, fecha: day, hora: '10:15' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(db.calls.rpc[0].args, { p_barbero_id: carlos, p_fecha: day, p_duracion_minutos: 35 })
  assert.deepEqual(db.calls.updates[0].patch, { fecha: day, hora: '10:15', barbero_id: carlos, estado: 'pendiente' })
  assert.deepEqual(citaRow(mine).items, [corteItem])
  assert.equal(citaRow(mine).precio_final, 10000)
  assert.equal(res.body.data.hora, '10:15')
  assert.equal(res.body.data.estado, 'pendiente')
  assert.ok(db.calls.published.some(p => p.payload.eventType === 'UPDATE' && p.channel === `citas:barbero:${carlos}`))
  assert.deepEqual(pushes.map(p => [p.id, p.title]), [[carlos, 'Cita reagendada 🔄']])
})

test('own-range exemption still respects other bookings and blocked ranges', async () => {
  slots[`${carlos}|${day}`] = [{ hora: '10:15', disponible: false, motivo: 'Ocupado' }]
  db.tables.citas.push({ id: 'neighbour', comercio_id: tenant, cliente_telefono: '+56911111111', barbero_id: carlos, fecha: day, hora: '10:40:00', estado: 'pendiente', items: [corteItem] })
  let res = await post(reagendar, { telefono: phone, cita_id: mine, fecha: day, hora: '10:15' })
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.code, 'HORARIO_NO_DISPONIBLE')

  seed()
  slots[`${carlos}|${day}`] = [{ hora: '10:15', disponible: false, motivo: 'Ocupado' }]
  db.tables.horarios_bloqueados.push({ barbero_id: carlos, fecha_hora_inicio: santiagoInstant(day, '10:45'), fecha_hora_fin: santiagoInstant(day, '11:30') })
  res = await post(reagendar, { telefono: phone, cita_id: mine, fecha: day, hora: '10:15' })
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.code, 'HORARIO_NO_DISPONIBLE')

  seed()
  slots[`${carlos}|${day}`] = [{ hora: '10:15', disponible: false, motivo: 'Bloqueado' }]
  res = await post(reagendar, { telefono: phone, cita_id: mine, fecha: day, hora: '10:15' })
  assert.equal(res.body.code, 'HORARIO_NO_DISPONIBLE')
  assert.equal(db.calls.updates.length, 0)
})

test('occupied slots of another barber or day get no exemption', async () => {
  slots[`${luis}|${day}`] = [{ hora: '10:15', disponible: false, motivo: 'Ocupado' }]
  slots[`${carlos}|${addDays(day, 1)}`] = [{ hora: '10:15', disponible: false, motivo: 'Ocupado' }]
  for (const body of [{ fecha: day, barbero_id: luis }, { fecha: addDays(day, 1) }]) {
    const res = await post(reagendar, { telefono: phone, cita_id: mine, hora: '10:15', ...body })
    assert.equal(res.statusCode, 409)
    assert.equal(res.body.code, 'HORARIO_NO_DISPONIBLE')
  }
})

test('moving to another barber notifies both barbers', async () => {
  slots[`${luis}|${day}`] = [{ hora: '16:00', disponible: true }]
  const res = await post(reagendar, { telefono: phone, cita_id: mine, fecha: day, hora: '16:00', barbero_id: luis })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.data.barbero, { id: luis, nombre: 'Luis', apellido: 'Rojas' })
  assert.equal(citaRow(mine).barbero_id, luis)
  const published = db.calls.published.map(p => [p.channel, p.payload.eventType])
  assert.deepEqual(published, [[`citas:barbero:${luis}`, 'UPDATE'], [`citas:comercio:${tenant}`, 'UPDATE'], [`citas:barbero:${carlos}`, 'DELETE']])
  assert.deepEqual(pushes.map(p => [p.id, p.title]), [[carlos, 'Cita reasignada 🔄'], [luis, 'Cita reagendada 🔄']])
})

test('reschedule rejects the same slot, foreign barbers and database races', async () => {
  let res = await post(reagendar, { telefono: phone, cita_id: mine, fecha: day, hora: '10:00' })
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.code, 'DATOS_INVALIDOS')
  res = await post(reagendar, { telefono: phone, cita_id: mine, fecha: day, hora: '16:00', barbero_id: ajeno })
  assert.equal(res.body.code, 'BARBERO_NO_DISPONIBLE')
  slots[`${carlos}|${day}`] = [{ hora: '16:00', disponible: true }]
  db.onUpdate = () => ({ code: '23505', message: 'duplicate' })
  res = await post(reagendar, { telefono: phone, cita_id: mine, fecha: day, hora: '16:00' })
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.code, 'RACE_CONDITION')
  assert.equal(citaRow(mine).hora, '10:00:00')
})

test('cancel marks the booking cancelada and notifies the barber', async () => {
  const res = await post(cancelar, { telefono: '56912345678', cita_id: mine })
  assert.equal(res.statusCode, 200)
  assert.equal(citaRow(mine).estado, 'cancelada')
  assert.deepEqual(db.calls.updates[0].patch, { estado: 'cancelada' })
  assert.equal(res.body.data.estado, 'cancelada')
  assert.equal(res.body.data.modificable, false)
  assert.ok(db.calls.published.some(p => p.payload.eventType === 'UPDATE' && p.payload.new.estado === 'cancelada'))
  assert.deepEqual(pushes.map(p => [p.id, p.title]), [[carlos, 'Cita cancelada ❌']])
  const again = await post(cancelar, { telefono: phone, cita_id: mine })
  assert.equal(again.statusCode, 409)
  assert.equal(again.body.code, 'CITA_NO_MODIFICABLE')
})
