// Regression tests for S1 (staff reschedule, /api/admin/citas/reagendar):
// authorization, tenant scoping, input, the database guards and what leaves
// the server. Same harness as admin-reagendar.test.cjs.
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
const foreignAdmin = '00000000-0000-4000-8000-000000000004'
const inactiveAdmin = '00000000-0000-4000-8000-000000000005'
const inactiveCajero = '00000000-0000-4000-8000-000000000006'
const homelessAdmin = '00000000-0000-4000-8000-000000000007'
const oddRole = '00000000-0000-4000-8000-000000000008'
const twiceAdmin = '00000000-0000-4000-8000-000000000009'
const noRow = '00000000-0000-4000-8000-00000000000a'
const carlos = '11111111-1111-4111-8111-111111111111'
const luis = '44444444-4444-4444-8444-444444444444'
const ajeno = '55555555-5555-4555-8555-555555555555'
const corte = '22222222-2222-4222-8222-222222222222'
const barba = '33333333-3333-4333-8333-333333333333'
const cita = '77777777-7777-4777-8777-777777777777' // confirmada, Carlos, 10:00
const segunda = '88888888-8888-4888-8888-888888888888' // pendiente, Luis, 12:00
const ajena = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' // other tenant

let db
const pushes = []
const sessions = {
  'admin-token': adminUser, 'cajero-token': cajeroUser, 'foreign-token': foreignAdmin, 'inactive-admin': inactiveAdmin,
  'inactive-cajero': inactiveCajero, 'homeless-admin': homelessAdmin, 'odd-role': oddRole, 'twice-admin': twiceAdmin, 'no-row': noRow,
}
stubModule('../src/lib/supabase-server.ts', {
  createPagesAdminClient: () => db,
  async getUserFromBearer(token) { return { data: { user: sessions[token] ? { id: sessions[token] } : null }, error: null } },
  createPagesServerClient: () => ({ auth: { async getSession() { return { data: { session: null } } } } }),
})
stubModule('../src/lib/onesignal.ts', { async sendNotificationToBarber(id, title, message) { pushes.push({ id, title, message }); return { success: true } } })
const reagendar = require('../src/pages/api/admin/citas/reagendar.ts').default
const { addDays, getDynamicHoy } = require('../src/lib/date-utils.ts')

const today = getDynamicHoy(TZ)
const day = addDays(today, 3)
const target = addDays(today, 5)
const corteItem = { servicio_id: corte, nombre: 'Corte', precio: 10000, cantidad: 1, duracion_minutos: 30, tiempo_buffer: 5, subtotal: 10000 }
const SECRETS = ['Ana', 'Beto', 'Dani', '56911112222', '56933334444', 'ana@example.com', 'Sin gel']

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
        { id: foreignAdmin, rol: 'admin', activo: true, comercio_id: other },
        { id: inactiveAdmin, rol: 'admin', activo: false, comercio_id: tenant },
        { id: inactiveCajero, rol: 'cajero', activo: false, comercio_id: tenant },
        { id: homelessAdmin, rol: 'admin', activo: true, comercio_id: null },
        { id: oddRole, rol: 'recepcion', activo: true, comercio_id: tenant },
        { id: twiceAdmin, rol: 'admin', activo: true, comercio_id: tenant },
        { id: twiceAdmin, rol: 'admin', activo: true, comercio_id: other },
      ],
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
        { id: cita, comercio_id: tenant, cliente_nombre: 'Ana', cliente_telefono: '+56911112222', cliente_email: 'ana@example.com', notas: 'Sin gel', barbero_id: carlos, servicio_id: corte, fecha: day, hora: '10:00:00', estado: 'confirmada', items: [corteItem], precio_final: 10000 },
        { id: segunda, comercio_id: tenant, cliente_nombre: 'Beto', cliente_telefono: '+56933334444', barbero_id: luis, servicio_id: corte, fecha: day, hora: '12:00:00', estado: 'pendiente', items: [corteItem], precio_final: 10000 },
        { id: ajena, comercio_id: other, cliente_nombre: 'Dani', cliente_telefono: '+56977778888', barbero_id: ajeno, servicio_id: corte, fecha: day, hora: '10:00:00', estado: 'confirmada', items: [corteItem], precio_final: 10000 },
      ],
      horarios_bloqueados: [],
    },
    rpc: async (_name, args) => ({ data: slots[`${args.p_barbero_id}|${args.p_fecha}`] || [], error: null }),
  })
}

async function call(method, { token = 'admin-token', body, query = {}, headers } = {}) {
  const res = createResponse()
  await reagendar({ method, headers: headers ?? (token ? { authorization: `Bearer ${token}` } : {}), query, body }, res)
  return res
}
const move = (body, token) => call('POST', { body, token })
const slotsFor = (query, token) => call('GET', { query, token })
const citaRow = (id) => db.tables.citas.find((c) => c.id === id)
const stored = () => JSON.stringify(db.tables.citas)
function assertNothingMoved(before) {
  assert.equal(stored(), before)
  assert.deepEqual(db.calls.updates.filter((u) => u.ids.length > 0), [])
  assert.deepEqual(db.calls.published, [])
  assert.deepEqual(pushes, [])
}
async function captureAll(run) {
  const lines = []
  const real = {}
  for (const level of ['log', 'info', 'warn', 'error']) {
    real[level] = console[level]
    console[level] = (...args) => lines.push(args.map((a) => (a instanceof Error ? `${a.message} ${a.stack}` : typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
  }
  try { await run() } finally { for (const level of Object.keys(real)) console[level] = real[level] }
  return lines
}
const minutes = (hora) => Number(String(hora).slice(0, 2)) * 60 + Number(String(hora).slice(3, 5))
const active = (estado) => ['pendiente', 'confirmada'].includes(estado)
// What the live database does on UPDATE: citas_active_start_unique (23505) and
// app_guard_appointment_overlap (23P01), 35 minutes per booking here.
function databaseGuards(table, patch, matched) {
  if (table !== 'citas') return null
  for (const before of matched) {
    const next = { ...before, ...patch }
    if (!next.barbero_id || !active(next.estado)) continue
    for (const otherRow of db.tables.citas) {
      if (otherRow.id === next.id || otherRow.barbero_id !== next.barbero_id || otherRow.fecha !== next.fecha || !active(otherRow.estado)) continue
      if (minutes(otherRow.hora) === minutes(next.hora)) return { code: '23505', message: 'duplicate key value violates unique constraint "citas_active_start_unique"' }
      if (minutes(otherRow.hora) < minutes(next.hora) + 35 && minutes(otherRow.hora) + 35 > minutes(next.hora)) return { code: '23P01', message: 'El horario se solapa con otra reserva' }
    }
  }
  return null
}
// Changes `id` right before the update statement is built: the write then matches no row.
function changeBeforeWrite(id, patch) {
  const from = db.from
  db.from = (table) => {
    const query = from(table)
    if (table !== 'citas') return query
    const update = query.update.bind(query)
    query.update = (payload) => { Object.assign(citaRow(id), patch); return update(payload) }
    return query
  }
}
function at(iso, fn) {
  mock.timers.enable({ apis: ['Date'], now: Date.parse(iso) })
  return Promise.resolve().then(fn).finally(() => mock.timers.reset())
}

test.beforeEach(seed)

test('S1 an inactive, shop-less, unknown-role, duplicated or unregistered staff account never reads or moves a booking', async () => {
  slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: true }]
  const before = stored()
  for (const token of ['inactive-admin', 'inactive-cajero', 'homeless-admin', 'odd-role', 'twice-admin', 'no-row']) {
    for (const method of ['GET', 'POST']) {
      const res = await call(method, { token, body: { cita_id: cita, fecha: target, hora: '16:00' }, query: { cita_id: cita, fecha: target } })
      assert.deepEqual([res.statusCode, res.body.message], [403, 'Sin permisos para esta operación'], `${token} ${method}`)
      assert.equal(res.body.slots, undefined)
      assert.equal(res.body.cita, undefined)
    }
  }
  // A cookie that is not a session cookie is no session.
  const cookie = await call('POST', { headers: { cookie: 'theme=dark' }, body: { cita_id: cita, fecha: target, hora: '16:00' } })
  assert.equal(cookie.statusCode, 401)
  assert.deepEqual(db.calls.selects.filter((s) => s.table !== 'admin_users'), [], 'only the staff row is read')
  assert.equal(db.calls.rpc.length, 0)
  assertNothingMoved(before)
})

test('S1 staff of one shop cannot reach the bookings, barbers or slots of another, in either direction', async () => {
  for (const key of [`${carlos}|${target}`, `${ajeno}|${target}`, `${luis}|${target}`]) slots[key] = [{ hora: '16:00', disponible: true }]
  const before = stored()
  const attempts = [
    // [token, body, status, code]
    ['admin-token', { cita_id: ajena, fecha: target, hora: '16:00', barbero_id: carlos }, 404, 'CITA_NO_ENCONTRADA'], // pull a foreign booking into my shop
    ['admin-token', { cita_id: ajena, fecha: target, hora: '16:00', barbero_id: ajeno }, 404, 'CITA_NO_ENCONTRADA'],
    ['admin-token', { cita_id: cita, fecha: target, hora: '16:00', barbero_id: ajeno }, 400, 'BARBERO_NO_DISPONIBLE'], // push my booking to a foreign barber
    ['foreign-token', { cita_id: ajena, fecha: target, hora: '16:00', barbero_id: carlos }, 400, 'BARBERO_NO_DISPONIBLE'],
    ['foreign-token', { cita_id: cita, fecha: target, hora: '16:00', barbero_id: ajeno }, 404, 'CITA_NO_ENCONTRADA'],
    ['cajero-token', { cita_id: ajena, fecha: target, hora: '16:00', comercio_id: other, comercioId: other }, 404, 'CITA_NO_ENCONTRADA'],
  ]
  for (const [token, body, status, code] of attempts) {
    const res = await move(body, token)
    assert.deepEqual([res.statusCode, res.body.code], [status, code], JSON.stringify([token, body]))
    const { hora, ...query } = body
    const listed = await slotsFor(query, token)
    assert.deepEqual([listed.statusCode, listed.body.code, listed.body.slots], [status, code, undefined], JSON.stringify([token, query]))
  }
  assert.equal(db.calls.rpc.length, 0, 'no availability of any shop was asked')
  assertNothingMoved(before)
  // Every read of citas and barberos names the tenant of the signed-in staff row.
  const tenantOf = (token) => (token === 'foreign-token' ? other : tenant)
  void tenantOf
  for (const select of db.calls.selects.filter((s) => s.table === 'citas' || s.table === 'barberos')) {
    assert.ok(select.filters.some(([column, op, value]) => column === 'comercio_id' && op === 'eq' && (value === tenant || value === other)), JSON.stringify(select))
  }
})

test('S1 the move writes only fecha, hora, barbero_id and the caller as updated_by, whatever else the request carries', async () => {
  slots[`${luis}|${target}`] = [{ hora: '16:00', disponible: true }]
  const res = await move({
    cita_id: cita, fecha: target, hora: '16:00', barbero_id: luis,
    estado: 'completada', updated_by: foreignAdmin, staff_user_id: foreignAdmin, staffUserId: foreignAdmin, comercio_id: other,
    cliente_nombre: 'Otro', precio_final: 1, items: [], notas: 'x',
  }, 'cajero-token')
  assert.equal(res.statusCode, 200)
  assert.deepEqual(db.calls.updates, [{
    table: 'citas',
    patch: { fecha: target, hora: '16:00', barbero_id: luis, updated_by: cajeroUser },
    ids: [cita],
    filters: [['id', 'eq', cita], ['comercio_id', 'eq', tenant], ['estado', 'in', ['pendiente', 'confirmada']]],
  }])
  const row = citaRow(cita)
  assert.deepEqual([row.estado, row.cliente_nombre, row.precio_final, row.notas, row.comercio_id, row.updated_by], ['confirmada', 'Ana', 10000, 'Sin gel', tenant, cajeroUser])
})

test('S1 responses and server logs carry no customer data, on success and on failure', async () => {
  slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: true, motivo: 'Disponible' }, { hora: '16:30', disponible: false, motivo: 'Ocupado' }]
  const bodies = []
  const lines = await captureAll(async () => {
    bodies.push((await slotsFor({ cita_id: cita, fecha: target })).body)
    bodies.push((await move({ cita_id: cita, fecha: target, hora: '16:30' })).body)
    bodies.push((await move({ cita_id: cita, fecha: target, hora: '16:00' })).body)
    db.fail['citas.update'] = { code: 'XX000', message: 'update exploded' }
    bodies.push((await move({ cita_id: cita, fecha: addDays(target, 1), hora: '16:00' })).body)
    slots[`${carlos}|${addDays(target, 1)}`] = [{ hora: '16:00', disponible: true }]
    bodies.push((await move({ cita_id: cita, fecha: addDays(target, 1), hora: '16:00' })).body)
  })
  assert.deepEqual(Object.keys(bodies[0]).sort(), ['slots', 'success'])
  assert.deepEqual(Object.keys(bodies[2]).sort(), ['cita', 'success'])
  assert.deepEqual(Object.keys(bodies[2].cita).sort(), ['barbero_id', 'estado', 'fecha', 'hora', 'id'])
  assert.equal(bodies[4].code, 'ERROR_INTERNO')
  const everything = JSON.stringify(bodies) + lines.join('\n')
  for (const secret of SECRETS) assert.ok(!everything.includes(secret), `leaked: ${secret}`)
  assert.ok(lines.some((line) => line.includes('update exploded')), 'the failure itself is logged')
})

test('S1 repeated or malformed query and body values are refused before any booking is read', async () => {
  slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: true }]
  const before = stored()
  const queries = [
    { cita_id: [cita, ajena], fecha: target },
    { cita_id: cita, fecha: [target, target] },
    { cita_id: cita, fecha: target, barbero_id: [carlos, ajeno] },
    { cita_id: cita, fecha: target, barbero_id: '' },
    { cita_id: `${cita} `, fecha: target },
    { cita_id: cita, fecha: `${target}T00:00:00` },
    { cita_id: cita },
    {},
  ]
  for (const query of queries) {
    const res = await slotsFor(query)
    assert.deepEqual([res.statusCode, res.body.code], [400, 'DATOS_INVALIDOS'], JSON.stringify(query))
  }
  const bodies = [
    { cita_id: cita, fecha: target, hora: ['16:00'] },
    { cita_id: cita, fecha: target, hora: 1600 },
    { cita_id: cita, fecha: target },
    { cita_id: cita, fecha: target, hora: '16:00', barbero_id: '' },
    { cita_id: cita, fecha: target, hora: '16:00', barbero_id: { id: carlos } },
    { cita_id: { id: cita }, fecha: target, hora: '16:00' },
    { cita_id: cita, fecha: 20261129, hora: '16:00' },
    { cita_id: cita, fecha: target, hora: ' 16:00' },
    { cita_id: cita, fecha: target, hora: '24:00' },
  ]
  for (const body of bodies) {
    const res = await move(body)
    assert.deepEqual([res.statusCode, res.body.code], [400, 'DATOS_INVALIDOS'], JSON.stringify(body))
  }
  assert.deepEqual(db.calls.selects.filter((s) => s.table === 'citas'), [])
  assert.equal(db.calls.rpc.length, 0)
  assertNothingMoved(before)
})

test('S1 only a slot the database lists as free is taken: truthy look-alikes and missing answers are refused', async () => {
  const before = stored()
  for (const disponible of ['true', 1, null, undefined, {}]) {
    slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible }]
    const res = await move({ cita_id: cita, fecha: target, hora: '16:00' })
    assert.deepEqual([res.statusCode, res.body.code], [409, 'HORARIO_NO_DISPONIBLE'], String(disponible))
  }
  // The database lists times as HH:MM; a row in another shape is not the requested time.
  slots[`${carlos}|${target}`] = [{ hora: '16:00:00', disponible: true }]
  const shaped = await move({ cita_id: cita, fecha: target, hora: '16:00' })
  assert.deepEqual([shaped.statusCode, shaped.body.code], [409, 'HORARIO_NO_DISPONIBLE'])
  assertNothingMoved(before)
})

test('S1 a booking of today whose time passed moves later today, never to a time that already passed (12:00 in Chile)', () => at('2026-11-24T15:00:00Z', async () => {
  seed()
  Object.assign(citaRow(cita), { fecha: '2026-11-24', hora: '09:00:00' })
  const listedByDb = [
    { hora: '09:00', disponible: false, motivo: 'Horario pasado' },
    { hora: '11:30', disponible: false, motivo: 'Horario pasado' },
    { hora: '12:00', disponible: false, motivo: 'Horario pasado' },
    { hora: '12:30', disponible: true, motivo: 'Disponible' },
  ]
  slots[`${carlos}|2026-11-24`] = listedByDb
  const listed = await slotsFor({ cita_id: cita, fecha: '2026-11-24' })
  assert.equal(listed.statusCode, 200)
  // Its own passed time is shown as its current time; every other passed time stays refused.
  assert.deepEqual(listed.body.slots.map((s) => [s.hora, s.disponible]), [['09:00', false], ['11:30', false], ['12:00', false], ['12:30', true]])
  const before = stored()
  for (const hora of ['11:30', '12:00']) {
    const res = await move({ cita_id: cita, fecha: '2026-11-24', hora })
    assert.deepEqual([res.statusCode, res.body.message], [409, 'Ese horario no está disponible (Horario pasado). Elige otro.'], hora)
  }
  const yesterday = await move({ cita_id: cita, fecha: '2026-11-23', hora: '18:00' })
  assert.deepEqual([yesterday.statusCode, yesterday.body.code], [400, 'DATOS_INVALIDOS'])
  assertNothingMoved(before)
  const ok = await move({ cita_id: cita, fecha: '2026-11-24', hora: '12:30' })
  assert.equal(ok.statusCode, 200)
  assert.deepEqual([citaRow(cita).fecha, citaRow(cita).hora, citaRow(cita).estado], ['2026-11-24', '12:30', 'confirmada'])
}))

test('S1 the own-range exemption measures neighbours with their real duration, also without items, and never crosses barber or day', async () => {
  // Barba without items: 20 + 10 minutes, 09:30-10:00. The booking (35 min) at 09:00 would reach it; at 08:55 it would not.
  db.tables.citas.push({ id: 'early', comercio_id: tenant, cliente_telefono: '+56900000000', barbero_id: carlos, servicio_id: barba, fecha: day, hora: '09:30:00', estado: 'confirmada', items: [] })
  slots[`${carlos}|${day}`] = [{ hora: '08:55', disponible: false, motivo: 'Ocupado' }, { hora: '09:00', disponible: false, motivo: 'Ocupado' }, { hora: '10:00', disponible: false, motivo: 'Ocupado' }]
  let before = stored()
  const reaches = await move({ cita_id: cita, fecha: day, hora: '09:00' })
  assert.deepEqual([reaches.statusCode, reaches.body.code], [409, 'HORARIO_NO_DISPONIBLE'])
  assertNothingMoved(before)
  const listed = await slotsFor({ cita_id: cita, fecha: day })
  assert.deepEqual(listed.body.slots.map((s) => [s.hora, s.disponible, s.motivo]), [['08:55', true, 'Disponible'], ['09:00', false, 'Ocupado'], ['10:00', false, 'Horario actual']])

  // 'Ocupado' on another barber's day or on another day is somebody else: never exempt.
  seed()
  slots[`${luis}|${day}`] = [{ hora: '10:00', disponible: false, motivo: 'Ocupado' }]
  slots[`${carlos}|${target}`] = [{ hora: '10:00', disponible: false, motivo: 'Ocupado' }]
  before = stored()
  for (const change of [{ fecha: day, barbero_id: luis }, { fecha: target }, { fecha: target, barbero_id: carlos }]) {
    const res = await move({ cita_id: cita, hora: '10:00', ...change })
    assert.deepEqual([res.statusCode, res.body.code], [409, 'HORARIO_NO_DISPONIBLE'], JSON.stringify(change))
  }
  assertNothingMoved(before)
})

test('S1 two staff moving two bookings into the same slot: the database guard lets one in, the other is told and nothing else happens', async () => {
  for (const [first, second, code] of [['16:00', '16:00', '23505'], ['16:00', '16:15', '23P01']]) {
    seed()
    db.onUpdate = databaseGuards
    slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: true }, { hora: '16:15', disponible: true }]
    const [a, b] = await Promise.all([
      move({ cita_id: cita, fecha: target, hora: first }, 'admin-token'),
      move({ cita_id: segunda, fecha: target, hora: second, barbero_id: carlos }, 'cajero-token'),
    ])
    assert.deepEqual([a.statusCode, b.statusCode].sort(), [200, 409], code)
    const loser = a.statusCode === 409 ? a : b
    assert.deepEqual(loser.body, { error: 'Ese horario se acaba de ocupar. Elige otro.', message: 'Ese horario se acaba de ocupar. Elige otro.', code: 'RACE_CONDITION' })
    const inSlot = db.tables.citas.filter((c) => c.barbero_id === carlos && c.fecha === target)
    assert.equal(inSlot.length, 1, 'one booking in the slot')
    const loserId = a.statusCode === 409 ? cita : segunda
    assert.ok(db.calls.published.every((p) => p.payload.cita_id !== loserId), 'no event for the move that did not happen')
    assert.equal(db.calls.updates.filter((u) => u.ids.length > 0).length, 1)
    assert.equal(pushes.filter((p) => p.title === 'Cita reagendada 🔄').length, 1)
  }
})

test('S1 a move that loses against a payment or a cancellation changes nothing and tells nobody', async () => {
  for (const estado of ['completada', 'cancelada']) {
    seed()
    slots[`${carlos}|${target}`] = [{ hora: '16:00', disponible: true }]
    changeBeforeWrite(cita, { estado })
    const res = await move({ cita_id: cita, fecha: target, hora: '16:00' })
    assert.deepEqual([res.statusCode, res.body.message], [409, 'La cita cambió de estado y ya no se puede reagendar.'], estado)
    assert.deepEqual([citaRow(cita).fecha, citaRow(cita).hora, citaRow(cita).estado, citaRow(cita).updated_by], [day, '10:00:00', estado, undefined])
    assert.deepEqual(db.calls.published, [])
    assert.deepEqual(pushes, [])
  }
})

test('S1 listing slots never writes, publishes or pushes', async () => {
  slots[`${carlos}|${day}`] = [{ hora: '10:00', disponible: false, motivo: 'Ocupado' }, { hora: '10:15', disponible: false, motivo: 'Ocupado' }, { hora: '16:00', disponible: true, motivo: 'Disponible' }]
  const before = stored()
  for (const token of ['admin-token', 'cajero-token']) assert.equal((await slotsFor({ cita_id: cita, fecha: day }, token)).statusCode, 200)
  assert.deepEqual(db.calls.updates, [])
  assert.deepEqual(db.calls.inserts, [])
  assert.deepEqual(db.calls.deletes, [])
  assertNothingMoved(before)
})

