// Staff reschedule from the admin panel (/api/admin/citas/reagendar): GET lists
// the slots a booking can move to and POST moves it, with the availability
// rules of a new booking. The route runs against the fake DB; "now" is pinned
// where the Chile day matters, so results match under TZ=UTC and
// TZ=America/Santiago.
require('./load-typescript.cjs')
const test = require('node:test')
const { mock } = require('node:test')
const assert = require('node:assert/strict')
const { createFakeDb, createResponse, stubModule } = require('./fake-db.cjs')

process.env.NODE_ENV = 'production'

const TZ = 'America/Santiago'
const tenant = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const adminUser = '00000000-0000-4000-8000-000000000001'
const cajeroUser = '00000000-0000-4000-8000-000000000002'
const barberoUser = '00000000-0000-4000-8000-000000000003'
const foreignAdmin = '00000000-0000-4000-8000-000000000004'
const carlos = '11111111-1111-4111-8111-111111111111'
const luis = '44444444-4444-4444-8444-444444444444'
const inactivo = '66666666-6666-4666-8666-666666666666'
const ajeno = '55555555-5555-4555-8555-555555555555'
const corte = '22222222-2222-4222-8222-222222222222'
const barba = '33333333-3333-4333-8333-333333333333'
const cita = '77777777-7777-4777-8777-777777777777' // confirmada, Carlos, 10:00
const pendiente = '88888888-8888-4888-8888-888888888888' // pendiente, Luis, 12:00
const sinBarbero = '99999999-9999-4999-8999-999999999999' // pendiente, no barber, no items
const ajena = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' // other tenant

let db
const pushes = []
// Bearer token -> signed-in user id.
const sessions = { 'admin-token': adminUser, 'cajero-token': cajeroUser, 'barbero-token': barberoUser, 'foreign-token': foreignAdmin }
stubModule('../src/lib/supabase-server.ts', {
  createPagesAdminClient: () => db,
  async getUserFromBearer(token) { return { data: { user: sessions[token] ? { id: sessions[token] } : null }, error: null } },
  createPagesServerClient: () => ({ auth: { async getSession() { return { data: { session: null } } } } }),
})
stubModule('../src/lib/onesignal.ts', { async sendNotificationToBarber(id, title, message) { pushes.push({ id, title, message }); return { success: true } } })
const reagendar = require('../src/pages/api/admin/citas/reagendar.ts').default
const { addDays, formatFechaDynamic, getDynamicHoy } = require('../src/lib/date-utils.ts')
const { localWallTimestamp } = require('../src/lib/booking-validation.ts')
const { wallClock } = require('../src/lib/booking/change-policy.ts')

// Every successful move logs one line; only the test about that line reads it.
console.info = () => {}

const today = getDynamicHoy(TZ)
const day = addDays(today, 3)
const target = addDays(today, 5)
const corteItem = { servicio_id: corte, nombre: 'Corte', precio: 10000, cantidad: 1, duracion_minutos: 30, tiempo_buffer: 5, subtotal: 10000 }

// slots[`${barbero}|${fecha}`] = [{ hora, disponible, motivo }]
let slots
function seed() {
  pushes.length = 0
  slots = {}
  db = createFakeDb({
    tables: {
      comercios: [{ id: tenant, slug: 'chamos', timezone: TZ, activo: true }, { id: other, slug: 'otro', timezone: TZ, activo: true }],
      admin_users: [
        { id: adminUser, rol: 'admin', activo: true, comercio_id: tenant },
        { id: cajeroUser, rol: 'cajero', activo: true, comercio_id: tenant },
        { id: barberoUser, rol: 'barbero', activo: true, comercio_id: tenant },
        { id: foreignAdmin, rol: 'admin', activo: true, comercio_id: other },
      ],
      barberos: [
        { id: carlos, nombre: 'Carlos', apellido: 'Pérez', activo: true, comercio_id: tenant },
        { id: luis, nombre: 'Luis', apellido: 'Rojas', activo: true, comercio_id: tenant },
        { id: inactivo, nombre: 'Ido', apellido: 'Ya', activo: false, comercio_id: tenant },
        { id: ajeno, nombre: 'Ajeno', apellido: 'X', activo: true, comercio_id: other },
      ],
      servicios: [
        { id: corte, nombre: 'Corte', activo: true, duracion_minutos: 30, tiempo_buffer: 5, precio: 10000, comercio_id: tenant },
        { id: barba, nombre: 'Barba', activo: true, duracion_minutos: 20, tiempo_buffer: 10, precio: 6000, comercio_id: tenant },
      ],
      citas: [
        { id: cita, comercio_id: tenant, cliente_nombre: 'Ana', cliente_telefono: '+56911112222', cliente_email: 'ana@example.com', notas: 'Sin gel', barbero_id: carlos, servicio_id: corte, fecha: day, hora: '10:00:00', estado: 'confirmada', items: [corteItem], precio_final: 10000 },
        { id: pendiente, comercio_id: tenant, cliente_nombre: 'Beto', cliente_telefono: '+56933334444', barbero_id: luis, servicio_id: corte, fecha: day, hora: '12:00:00', estado: 'pendiente', items: [corteItem], precio_final: 10000 },
        { id: sinBarbero, comercio_id: tenant, cliente_nombre: 'Caro', cliente_telefono: '+56955556666', barbero_id: null, servicio_id: barba, fecha: day, hora: '13:00:00', estado: 'pendiente', items: [], precio_final: 6000 },
        { id: ajena, comercio_id: other, cliente_nombre: 'Dani', cliente_telefono: '+56977778888', barbero_id: ajeno, servicio_id: corte, fecha: day, hora: '10:00:00', estado: 'confirmada', items: [corteItem], precio_final: 10000 },
      ],
      horarios_bloqueados: [],
    },
    rpc: async (_name, args) => ({ data: slots[`${args.p_barbero_id}|${args.p_fecha}`] || [], error: null }),
  })
}

async function call(method, { token = 'admin-token', body, query = {} } = {}) {
  const res = createResponse()
  await reagendar({ method, headers: token ? { authorization: `Bearer ${token}` } : {}, query, body }, res)
  return res
}
const move = (body, token) => call('POST', { body, token })
const slotsFor = (query, token) => call('GET', { query, token })

const citaRow = (id) => db.tables.citas.find(c => c.id === id)
const stored = () => JSON.stringify(db.tables.citas)
// A refusal must leave every booking as it was and tell nobody.
function assertNothingMoved(before) {
  assert.equal(stored(), before)
  assert.deepEqual(db.calls.updates.filter(u => u.ids.length > 0), [])
  assert.deepEqual(db.calls.published, [])
  assert.deepEqual(pushes, [])
}
const refusal = (code, message) => ({ error: message, message, code })
// Real instant whose wall clock in Santiago is `fecha hora` (for timestamptz fixtures).
function santiagoInstant(fecha, hora) {
  const wall = wallClock(fecha, hora)
  const offset = localWallTimestamp(new Date(wall), TZ) - wall
  return new Date(wall - offset).toISOString()
}
async function capture(method, run) {
  const lines = []
  const real = console[method]
  console[method] = (...args) => lines.push(args.map(String).join(' '))
  try { await run() } finally { console[method] = real }
  return lines
}
function at(iso, fn) {
  mock.timers.enable({ apis: ['Date'], now: Date.parse(iso) })
  return Promise.resolve().then(fn).finally(() => mock.timers.reset())
}

test.beforeEach(seed)

test('only a signed-in admin or cajero reaches the route', async () => {
  slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: true }]
  const before = stored()
  const body = { cita_id: cita, fecha: target, hora: '16:00' }
  const query = { cita_id: cita, fecha: target }
  for (const method of ['GET', 'POST']) {
    const anonymous = await call(method, { token: null, body, query })
    assert.deepEqual([anonymous.statusCode, anonymous.body.message], [401, 'No autenticado'])
    const unknown = await call(method, { token: 'unknown-token', body, query })
    assert.deepEqual([unknown.statusCode, unknown.body.message], [401, 'Sesión inválida'])
    const barbero = await call(method, { token: 'barbero-token', body, query })
    assert.deepEqual([barbero.statusCode, barbero.body.message], [403, 'Sin permisos para esta operación'])
  }
  assert.equal(db.calls.rpc.length, 0)
  assertNothingMoved(before)
})

test('methods other than GET and POST are refused before anything is read', async () => {
  const res = await call('DELETE', { body: { cita_id: cita, fecha: target, hora: '16:00' } })
  assert.equal(res.statusCode, 405)
  assert.equal(res.headers.allow, 'GET, POST')
  assert.deepEqual(res.body, refusal('METODO_NO_PERMITIDO', 'Método no permitido'))
  assert.deepEqual(db.calls.selects, [])
})

test('admin and cajero move a booking of any customer in their tenant; only fecha, hora, barbero and updated_by change', async () => {
  for (const [token, userId] of [['admin-token', adminUser], ['cajero-token', cajeroUser]]) {
    seed()
    slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: true, motivo: 'Disponible' }]
    const res = await move({ cita_id: cita, fecha: target, hora: '16:00' }, token)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body, { success: true, cita: { id: cita, fecha: target, hora: '16:00', barbero_id: carlos, estado: 'confirmada' } })
    assert.equal(res.headers['cache-control'], 'no-store')
    assert.deepEqual(db.calls.updates, [{
      table: 'citas',
      patch: { fecha: target, hora: '16:00', barbero_id: carlos, updated_by: userId },
      ids: [cita],
      filters: [['id', 'eq', cita], ['comercio_id', 'eq', tenant], ['estado', 'in', ['pendiente', 'confirmada']]],
    }])
    const row = citaRow(cita)
    assert.deepEqual([row.estado, row.items, row.precio_final, row.cliente_telefono, row.notas], ['confirmada', [corteItem], 10000, '+56911112222', 'Sin gel'])
    assert.deepEqual(db.calls.published.map(p => [p.channel, p.event, p.payload.eventType, p.payload.new.fecha, p.payload.new.hora, p.payload.old.hora]), [
      [`citas:barbero:${carlos}`, 'change', 'UPDATE', target, '16:00', '10:00:00'],
      [`citas:comercio:${tenant}`, 'change', 'UPDATE', target, '16:00', '10:00:00'],
    ])
    // The booking stays confirmada, so its barber is not asked to confirm again.
    assert.deepEqual(pushes, [{ id: carlos, title: 'Cita reagendada 🔄', message: `Hola Carlos, la cita de Ana quedó para el ${formatFechaDynamic(target, TZ)} a las 16:00.` }])
  }
})

test('a pendiente booking stays pendiente and its barber is still asked to confirm', async () => {
  slots[`${luis}|${target}`] = [{ hora: '11:30', disponible: true }]
  const res = await move({ cita_id: pendiente, fecha: target, hora: '11:30' })
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.cita.estado, 'pendiente')
  assert.deepEqual(db.calls.updates[0].patch, { fecha: target, hora: '11:30', barbero_id: luis, updated_by: adminUser })
  assert.equal(citaRow(pendiente).estado, 'pendiente')
  assert.deepEqual(pushes, [{ id: luis, title: 'Cita reagendada 🔄', message: `Hola Luis, la cita de Beto quedó para el ${formatFechaDynamic(target, TZ)} a las 11:30. Queda pendiente de tu confirmación.` }])
})

test('each move writes one log line with the ids, the old and new slot and the staff user, and no customer data', async () => {
  slots[`${luis}|${target}`] = [{ hora: '16:00', disponible: true }]
  const lines = await capture('info', () => move({ cita_id: cita, fecha: target, hora: '16:00', barbero_id: luis }, 'cajero-token'))
  assert.deepEqual(lines, [`[booking] staff reschedule ${JSON.stringify({
    cita_id: cita,
    staff_user_id: cajeroUser,
    from: { fecha: day, hora: '10:00', barbero_id: carlos },
    to: { fecha: target, hora: '16:00', barbero_id: luis },
  })}`])
  for (const secret of ['Ana', '56911112222', 'ana@example.com', 'Sin gel']) assert.ok(!lines[0].includes(secret), secret)

  seed()
  const refused = await capture('info', () => move({ cita_id: cita, fecha: target, hora: '16:00' }))
  assert.deepEqual(refused, [], 'a refused move logs no move')
})

test('a booking of another tenant is reported as not found, whatever tenant the request names', async () => {
  slots[`${ajeno}|${target}`] = [{ hora: '16:00', disponible: true }]
  slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: true }]
  const before = stored()
  const attempts = [
    [{ cita_id: ajena, fecha: target, hora: '16:00' }, 'admin-token'],
    [{ cita_id: ajena, fecha: target, hora: '16:00', comercio_id: other }, 'admin-token'],
    [{ cita_id: cita, fecha: target, hora: '16:00' }, 'foreign-token'],
    [{ cita_id: 'aaaaaaaa-0000-4000-8000-000000000000', fecha: target, hora: '16:00' }, 'admin-token'],
  ]
  for (const [body, token] of attempts) {
    const res = await move(body, token)
    assert.equal(res.statusCode, 404, JSON.stringify(body))
    assert.deepEqual(res.body, refusal('CITA_NO_ENCONTRADA', 'No encontramos esa cita.'))
    const found = await slotsFor({ cita_id: body.cita_id, fecha: target }, token)
    assert.equal(found.statusCode, 404)
    assert.deepEqual(found.body, refusal('CITA_NO_ENCONTRADA', 'No encontramos esa cita.'))
  }
  assert.equal(db.calls.rpc.length, 0)
  assertNothingMoved(before)
})

test('cancelled and completed bookings cannot be moved', async () => {
  for (const estado of ['cancelada', 'completada']) {
    seed()
    slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: true }]
    citaRow(cita).estado = estado
    const before = stored()
    const res = await move({ cita_id: cita, fecha: target, hora: '16:00' })
    assert.equal(res.statusCode, 409)
    assert.deepEqual(res.body, refusal('CITA_NO_MODIFICABLE', `La cita está ${estado} y ya no se puede reagendar.`))
    const listed = await slotsFor({ cita_id: cita, fecha: target })
    assert.equal(listed.statusCode, 409)
    assert.deepEqual(listed.body, refusal('CITA_NO_MODIFICABLE', `La cita está ${estado} y ya no se puede reagendar.`))
    assert.equal(db.calls.rpc.length, 0)
    assertNothingMoved(before)
  }
})

test('a booking that staff cancelled between the read and the write is refused', async () => {
  slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: true }]
  // The availability check runs after the booking was read and before the update.
  db.rpc = async (_name, args) => { citaRow(cita).estado = 'cancelada'; return { data: slots[`${args.p_barbero_id}|${args.p_fecha}`], error: null } }
  const res = await move({ cita_id: cita, fecha: target, hora: '16:00' })
  assert.equal(res.statusCode, 409)
  assert.deepEqual(res.body, refusal('CITA_NO_MODIFICABLE', 'La cita cambió de estado y ya no se puede reagendar.'))
  assert.deepEqual([citaRow(cita).fecha, citaRow(cita).hora], [day, '10:00:00'])
  assert.deepEqual(db.calls.published, [])
  assert.deepEqual(pushes, [])
})

test('a slot the availability function refuses is never taken, whatever the reason', async () => {
  for (const motivo of ['Horario pasado', 'Fuera de horario', 'Descanso', 'Ocupado', 'Bloqueado']) {
    seed()
    slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: false, motivo }, { hora: '16:30', disponible: true, motivo: 'Disponible' }]
    const before = stored()
    const res = await move({ cita_id: cita, fecha: target, hora: '16:00' })
    assert.equal(res.statusCode, 409, motivo)
    assert.deepEqual(res.body, refusal('HORARIO_NO_DISPONIBLE', `Ese horario no está disponible (${motivo}). Elige otro.`))
    assertNothingMoved(before)
  }
})

test('an hour outside the slot grid is refused', async () => {
  slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: true }, { hora: '16:30', disponible: true }]
  const before = stored()
  const res = await move({ cita_id: cita, fecha: target, hora: '16:10' })
  assert.equal(res.statusCode, 409)
  assert.deepEqual(res.body, refusal('HORARIO_NO_DISPONIBLE', 'Ese horario no está disponible. Elige otro.'))
  // A closed day lists no slots at all.
  const closed = await move({ cita_id: cita, fecha: addDays(target, 1), hora: '16:00' })
  assert.deepEqual([closed.statusCode, closed.body.code], [409, 'HORARIO_NO_DISPONIBLE'])
  assertNothingMoved(before)
})

test('moving to the slot the booking already has is refused', async () => {
  slots[`${carlos}|${day}`] = [{ hora: '10:00', disponible: false, motivo: 'Ocupado' }]
  const before = stored()
  for (const body of [{ cita_id: cita, fecha: day, hora: '10:00' }, { cita_id: cita, fecha: day, hora: '10:00', barbero_id: carlos }]) {
    const res = await move(body)
    assert.equal(res.statusCode, 400)
    assert.deepEqual(res.body, refusal('MISMO_HORARIO', 'La cita ya está agendada en ese horario.'))
  }
  assertNothingMoved(before)
})

test('a barber of another tenant or an inactive barber cannot receive the booking', async () => {
  slots[`${ajeno}|${target}`] = [{ hora: '16:00', disponible: true }]
  slots[`${inactivo}|${target}`] = [{ hora: '16:00', disponible: true }]
  const before = stored()
  for (const barbero_id of [ajeno, inactivo, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd']) {
    const res = await move({ cita_id: cita, fecha: target, hora: '16:00', barbero_id })
    assert.equal(res.statusCode, 400, barbero_id)
    assert.deepEqual(res.body, refusal('BARBERO_NO_DISPONIBLE', 'El barbero seleccionado no está disponible.'))
    const listed = await slotsFor({ cita_id: cita, fecha: target, barbero_id })
    assert.deepEqual([listed.statusCode, listed.body.code], [400, 'BARBERO_NO_DISPONIBLE'])
  }
  assert.equal(db.calls.rpc.length, 0)
  assertNothingMoved(before)
})

test('a booking without a barber needs one to be chosen, and then moves to that barber', async () => {
  slots[`${luis}|${target}`] = [{ hora: '16:00', disponible: true }]
  const before = stored()
  const missing = refusal('BARBERO_REQUERIDO', 'Esta cita no tiene barbero asignado. Elige un barbero para reagendarla.')
  const refused = await move({ cita_id: sinBarbero, fecha: target, hora: '16:00' })
  assert.equal(refused.statusCode, 400)
  assert.deepEqual(refused.body, missing)
  const unlisted = await slotsFor({ cita_id: sinBarbero, fecha: target })
  assert.equal(unlisted.statusCode, 400)
  assert.deepEqual(unlisted.body, missing)
  assert.equal(db.calls.rpc.length, 0)
  assertNothingMoved(before)

  const res = await move({ cita_id: sinBarbero, fecha: target, hora: '16:00', barbero_id: luis })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(db.calls.updates[0].patch, { fecha: target, hora: '16:00', barbero_id: luis, updated_by: adminUser })
  // Nobody had the booking before, so there is no previous barber to tell.
  assert.deepEqual(db.calls.published.map(p => [p.channel, p.payload.eventType]), [[`citas:barbero:${luis}`, 'UPDATE'], [`citas:comercio:${tenant}`, 'UPDATE']])
  assert.deepEqual(pushes.map(p => [p.id, p.title]), [[luis, 'Cita reagendada 🔄']])
})

test('a booking without items keeps the duration of its service, or 35 minutes without one', async () => {
  slots[`${luis}|${target}`] = [{ hora: '16:00', disponible: true }]
  const listed = await slotsFor({ cita_id: sinBarbero, fecha: target, barbero_id: luis })
  assert.deepEqual([listed.statusCode, listed.body.slots], [200, [{ hora: '16:00', disponible: true }]])
  const moved = await move({ cita_id: sinBarbero, fecha: target, hora: '16:00', barbero_id: luis })
  assert.equal(moved.statusCode, 200)
  // Barba: 20 minutes + 10 of buffer.
  assert.deepEqual(db.calls.rpc.map(c => c.args), [
    { p_barbero_id: luis, p_fecha: target, p_duracion_minutos: 30 },
    { p_barbero_id: luis, p_fecha: target, p_duracion_minutos: 30 },
  ])

  seed()
  slots[`${luis}|${target}`] = [{ hora: '16:00', disponible: true }]
  Object.assign(citaRow(sinBarbero), { servicio_id: null, items: null })
  const res = await move({ cita_id: sinBarbero, fecha: target, hora: '16:00', barbero_id: luis })
  assert.equal(res.statusCode, 200)
  assert.equal(db.calls.rpc[0].args.p_duracion_minutos, 35)
})

test('invalid input is refused before availability is asked', async () => {
  const before = stored()
  const base = { cita_id: cita, fecha: target, hora: '16:00' }
  const window = `La fecha debe estar entre ${today} y ${addDays(today, 30)}`
  const cases = [
    [{ cita_id: 'nope' }, 'Cita inválida'],
    [{ cita_id: undefined }, 'Cita inválida'],
    [{ fecha: '2026-02-30' }, 'Fecha inválida'],
    [{ fecha: '26-11-2026' }, 'Fecha inválida'],
    [{ fecha: addDays(today, -1) }, window],
    [{ fecha: addDays(today, 31) }, window],
    [{ hora: '25:00' }, 'Hora inválida'],
    [{ hora: '16:00:00' }, 'Hora inválida'],
    [{ barbero_id: 'nope' }, 'Barbero inválido'],
  ]
  for (const [change, message] of cases) {
    const res = await move({ ...base, ...change })
    assert.equal(res.statusCode, 400, JSON.stringify(change))
    assert.deepEqual(res.body, refusal('DATOS_INVALIDOS', message))
    if ('hora' in change) continue
    const { hora, ...query } = { ...base, ...change }
    const listed = await slotsFor(query)
    assert.equal(listed.statusCode, 400, JSON.stringify(change))
    assert.deepEqual(listed.body, refusal('DATOS_INVALIDOS', message))
  }
  for (const body of [undefined, null, 'cita', [base]]) {
    const res = await move(body)
    assert.equal(res.statusCode, 400)
    assert.deepEqual(res.body, refusal('DATOS_INVALIDOS', 'Datos inválidos'))
  }
  assert.equal(db.calls.rpc.length, 0)
  assertNothingMoved(before)
})

test('the booking window is today to 30 days ahead in Chile, also at 21:30 when UTC is already tomorrow', () => at('2026-11-24T00:30:00Z', async () => {
  seed()
  Object.assign(citaRow(cita), { fecha: '2026-11-25', hora: '10:00:00' })
  for (const fecha of ['2026-11-23', '2026-12-23']) slots[`${carlos}|${fecha}`] = [{ hora: '22:00', disponible: true }]
  const window = 'La fecha debe estar entre 2026-11-23 y 2026-12-23'

  for (const fecha of ['2026-11-22', '2026-12-24']) {
    const res = await move({ cita_id: cita, fecha, hora: '22:00' })
    assert.equal(res.statusCode, 400, fecha)
    assert.deepEqual(res.body, refusal('DATOS_INVALIDOS', window))
    const listed = await slotsFor({ cita_id: cita, fecha })
    assert.deepEqual([listed.statusCode, listed.body.message], [400, window])
  }
  assert.equal(db.calls.rpc.length, 0)

  for (const fecha of ['2026-11-23', '2026-12-23']) {
    const listed = await slotsFor({ cita_id: cita, fecha })
    assert.equal(listed.statusCode, 200, fecha)
    const res = await move({ cita_id: cita, fecha, hora: '22:00' })
    assert.equal(res.statusCode, 200, fecha)
    assert.equal(citaRow(cita).fecha, fecha)
  }
}))

test('staff can move a booking whose time already passed, to a free future slot', async () => {
  for (const start of [{ fecha: addDays(today, -1), hora: '10:00:00' }, { fecha: addDays(today, -40), hora: '18:30:00' }]) {
    seed()
    Object.assign(citaRow(cita), start)
    slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: true }, { hora: '16:30', disponible: false, motivo: 'Horario pasado' }]
    const listed = await slotsFor({ cita_id: cita, fecha: target })
    assert.equal(listed.statusCode, 200, JSON.stringify(start))
    const res = await move({ cita_id: cita, fecha: target, hora: '16:00' })
    assert.equal(res.statusCode, 200, JSON.stringify(start))
    assert.deepEqual([citaRow(cita).fecha, citaRow(cita).hora, citaRow(cita).estado], [target, '16:00', 'confirmada'])

    // Still only to a slot the availability function accepts.
    const past = await move({ cita_id: cita, fecha: target, hora: '16:30' })
    assert.deepEqual([past.statusCode, past.body.message], [409, 'Ese horario no está disponible (Horario pasado). Elige otro.'])
    assert.equal(citaRow(cita).hora, '16:00')
  }
})

test('moving inside its own occupied range is allowed, with the same barber and day only', async () => {
  // The RPC still counts the booking itself (10:00-10:35), so 10:15 shows 'Ocupado'.
  slots[`${carlos}|${day}`] = [{ hora: '10:00', disponible: false, motivo: 'Ocupado' }, { hora: '10:15', disponible: false, motivo: 'Ocupado' }]
  const res = await move({ cita_id: cita, fecha: day, hora: '10:15' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(db.calls.rpc[0].args, { p_barbero_id: carlos, p_fecha: day, p_duracion_minutos: 35 })
  assert.deepEqual(db.calls.updates[0].patch, { fecha: day, hora: '10:15', barbero_id: carlos, updated_by: adminUser })

  seed()
  slots[`${luis}|${day}`] = [{ hora: '10:15', disponible: false, motivo: 'Ocupado' }]
  slots[`${carlos}|${addDays(day, 1)}`] = [{ hora: '10:15', disponible: false, motivo: 'Ocupado' }]
  const before = stored()
  for (const change of [{ fecha: day, barbero_id: luis }, { fecha: addDays(day, 1) }]) {
    const refused = await move({ cita_id: cita, hora: '10:15', ...change })
    assert.equal(refused.statusCode, 409, JSON.stringify(change))
    assert.deepEqual(refused.body, refusal('HORARIO_NO_DISPONIBLE', 'Ese horario no está disponible (Ocupado). Elige otro.'))
  }
  assertNothingMoved(before)
})

test('the own-range exemption still respects a neighbour booking and a blocked range', async () => {
  slots[`${carlos}|${day}`] = [{ hora: '10:15', disponible: false, motivo: 'Ocupado' }]
  db.tables.citas.push({ id: 'neighbour', comercio_id: tenant, cliente_telefono: '+56900000000', barbero_id: carlos, fecha: day, hora: '10:40:00', estado: 'pendiente', items: [corteItem] })
  let before = stored()
  let res = await move({ cita_id: cita, fecha: day, hora: '10:15' })
  assert.equal(res.statusCode, 409)
  assert.deepEqual(res.body, refusal('HORARIO_NO_DISPONIBLE', 'Ese horario no está disponible (Ocupado). Elige otro.'))
  assertNothingMoved(before)

  seed()
  slots[`${carlos}|${day}`] = [{ hora: '10:15', disponible: false, motivo: 'Ocupado' }]
  db.tables.horarios_bloqueados.push({ barbero_id: carlos, fecha_hora_inicio: santiagoInstant(day, '10:45'), fecha_hora_fin: santiagoInstant(day, '11:30') })
  before = stored()
  res = await move({ cita_id: cita, fecha: day, hora: '10:15' })
  assert.equal(res.statusCode, 409)
  assert.equal(res.body.code, 'HORARIO_NO_DISPONIBLE')
  assertNothingMoved(before)

  // A cancelled neighbour and a block of another barber do not count.
  seed()
  slots[`${carlos}|${day}`] = [{ hora: '10:15', disponible: false, motivo: 'Ocupado' }]
  db.tables.citas.push({ id: 'cancelled', comercio_id: tenant, cliente_telefono: '+56900000000', barbero_id: carlos, fecha: day, hora: '10:40:00', estado: 'cancelada', items: [corteItem] })
  db.tables.horarios_bloqueados.push({ barbero_id: luis, fecha_hora_inicio: santiagoInstant(day, '10:45'), fecha_hora_fin: santiagoInstant(day, '11:30') })
  res = await move({ cita_id: cita, fecha: day, hora: '10:15' })
  assert.equal(res.statusCode, 200)
})

test('moving to another barber takes the booking off the previous agenda and tells both barbers', async () => {
  slots[`${luis}|${target}`] = [{ hora: '16:00', disponible: true }]
  const res = await move({ cita_id: cita, fecha: target, hora: '16:00', barbero_id: luis })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.cita, { id: cita, fecha: target, hora: '16:00', barbero_id: luis, estado: 'confirmada' })
  assert.equal(citaRow(cita).barbero_id, luis)
  assert.deepEqual(db.calls.published.map(p => [p.channel, p.payload.eventType]), [
    [`citas:barbero:${luis}`, 'UPDATE'], [`citas:comercio:${tenant}`, 'UPDATE'], [`citas:barbero:${carlos}`, 'DELETE'],
  ])
  assert.deepEqual(pushes.map(p => [p.id, p.title]), [[carlos, 'Cita reasignada 🔄'], [luis, 'Cita reagendada 🔄']])
  assert.equal(pushes[1].message, `Hola Luis, la cita de Ana quedó para el ${formatFechaDynamic(target, TZ)} a las 16:00.`)
})

test('a slot taken by someone else between the check and the write is reported, and nothing moves', async () => {
  for (const code of ['23P01', '23505']) {
    seed()
    slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: true }]
    db.onUpdate = () => ({ code, message: 'conflict' })
    const before = stored()
    const res = await move({ cita_id: cita, fecha: target, hora: '16:00' })
    assert.equal(res.statusCode, 409, code)
    assert.deepEqual(res.body, refusal('RACE_CONDITION', 'Ese horario se acaba de ocupar. Elige otro.'))
    assertNothingMoved(before)
  }
})

test('a database failure answers a generic error and moves nothing', async () => {
  const failures = [
    (d) => { d.rpc = async () => ({ data: null, error: { message: 'rpc down' } }) },
    (d) => { d.fail['citas.update'] = { code: 'XX000', message: 'update exploded' } },
    (d) => { d.fail['comercios.select'] = { message: 'tenant lookup exploded' } },
  ]
  for (const breakIt of failures) {
    seed()
    slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: true }]
    const before = stored()
    breakIt(db)
    let res
    const errors = await capture('error', async () => { res = await move({ cita_id: cita, fecha: target, hora: '16:00' }) })
    assert.equal(res.statusCode, 500)
    assert.deepEqual(res.body, refusal('ERROR_INTERNO', 'No se pudo reagendar la cita. Intenta de nuevo.'))
    assert.equal(errors.length, 1)
    assertNothingMoved(before)
  }

  seed()
  db.rpc = async () => ({ data: null, error: { message: 'rpc down' } })
  let listed
  await capture('error', async () => { listed = await slotsFor({ cita_id: cita, fecha: target }) })
  assert.equal(listed.statusCode, 500)
  assert.deepEqual(listed.body, refusal('ERROR_INTERNO', 'No se pudieron cargar los horarios. Intenta de nuevo.'))
})

test('GET lists the slots of the chosen barber and day for the real duration of the booking', async () => {
  const listed = [{ hora: '15:30', disponible: false, motivo: 'Descanso' }, { hora: '16:00', disponible: true, motivo: 'Disponible' }, { hora: '16:30', disponible: false, motivo: 'Ocupado' }]
  slots[`${carlos}|${target}`] = listed
  slots[`${luis}|${day}`] = [{ hora: '10:00', disponible: true, motivo: 'Disponible' }, { hora: '12:00', disponible: false, motivo: 'Ocupado' }]
  const before = stored()
  for (const token of ['admin-token', 'cajero-token']) {
    const res = await slotsFor({ cita_id: cita, fecha: target }, token)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body, { success: true, slots: listed })
    assert.equal(res.headers['cache-control'], 'no-store')
  }
  // Another barber on the booking's own day: nothing there is its own range.
  const res = await slotsFor({ cita_id: cita, fecha: day, barbero_id: luis })
  assert.deepEqual(res.body, { success: true, slots: slots[`${luis}|${day}`] })
  assert.deepEqual(db.calls.rpc.map(c => c.args), [
    { p_barbero_id: carlos, p_fecha: target, p_duracion_minutos: 35 },
    { p_barbero_id: carlos, p_fecha: target, p_duracion_minutos: 35 },
    { p_barbero_id: luis, p_fecha: day, p_duracion_minutos: 35 },
  ])
  assertNothingMoved(before)
})

test('GET offers the times inside the own range of the booking, and exactly the slots POST accepts', async () => {
  // Booking 10:00-10:35 with Carlos; a neighbour at 11:00 and a block from 12:00.
  db.tables.citas.push({ id: 'neighbour', comercio_id: tenant, cliente_telefono: '+56900000000', barbero_id: carlos, fecha: day, hora: '11:00:00', estado: 'confirmada', items: [corteItem] })
  db.tables.horarios_bloqueados.push({ barbero_id: carlos, fecha_hora_inicio: santiagoInstant(day, '12:00'), fecha_hora_fin: santiagoInstant(day, '13:00') })
  const fromDb = () => [
    { hora: '09:00', disponible: false, motivo: 'Horario pasado' },
    { hora: '09:30', disponible: false, motivo: 'Ocupado' }, // 09:30-10:05 overlaps only the booking itself
    { hora: '10:00', disponible: false, motivo: 'Ocupado' }, // its current time
    { hora: '10:15', disponible: false, motivo: 'Ocupado' }, // only itself
    { hora: '10:30', disponible: false, motivo: 'Ocupado' }, // 10:30-11:05 reaches the neighbour
    { hora: '11:00', disponible: false, motivo: 'Ocupado' }, // the neighbour
    { hora: '11:30', disponible: false, motivo: 'Ocupado' }, // the neighbour until 11:35, and 11:30-12:05 reaches the block
    { hora: '12:00', disponible: false, motivo: 'Bloqueado' },
    { hora: '13:00', disponible: true, motivo: 'Disponible' },
    { hora: '19:30', disponible: false, motivo: 'Fuera de horario' },
  ]
  slots[`${carlos}|${day}`] = fromDb()
  const res = await slotsFor({ cita_id: cita, fecha: day })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.slots, [
    { hora: '09:00', disponible: false, motivo: 'Horario pasado' },
    { hora: '09:30', disponible: true, motivo: 'Disponible' },
    { hora: '10:00', disponible: false, motivo: 'Horario actual' },
    { hora: '10:15', disponible: true, motivo: 'Disponible' },
    { hora: '10:30', disponible: false, motivo: 'Ocupado' },
    { hora: '11:00', disponible: false, motivo: 'Ocupado' },
    { hora: '11:30', disponible: false, motivo: 'Ocupado' },
    { hora: '12:00', disponible: false, motivo: 'Bloqueado' },
    { hora: '13:00', disponible: true, motivo: 'Disponible' },
    { hora: '19:30', disponible: false, motivo: 'Fuera de horario' },
  ])

  // The picker and the write agree on every slot.
  const pristine = structuredClone(db.tables)
  for (const slot of res.body.slots) {
    db.tables.citas = structuredClone(pristine.citas)
    slots[`${carlos}|${day}`] = fromDb()
    const moved = await move({ cita_id: cita, fecha: day, hora: slot.hora })
    assert.equal(moved.statusCode === 200, slot.disponible, `${slot.hora} ${slot.motivo}: ${moved.statusCode}`)
  }
})
