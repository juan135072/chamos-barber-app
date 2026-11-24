// Bot API: authentication, tenant scoping and the read-only routes.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { createFakeDb, createResponse, stubModule } = require('./fake-db.cjs')

process.env.NODE_ENV = 'production'
let db
stubModule('../src/lib/supabase-server.ts', { createPagesAdminClient: () => db })
stubModule('../src/lib/onesignal.ts', { async sendNotificationToBarber() { return { success: true } } })
const route = (file) => require(`../src/pages/api/bot/${file}.ts`).default
const info = route('info')
const servicios = route('servicios')
const barberos = route('barberos')
const horarios = route('horarios')
const citas = route('citas/index')
const { getDynamicHoy } = require('../src/lib/date-utils.ts')
const { addDays } = require('../src/lib/bot/validation.ts')
const { botKeyMatches } = require('../src/lib/bot/api.ts')
const { normalizeCustomerPhone, phoneLookupVariants } = require('../src/lib/booking/phone.ts')

const KEY = 'test-bot-key-0123456789-abcdefghijklmnop'
const tenant = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const carlos = '11111111-1111-4111-8111-111111111111'
const pedro = '44444444-4444-4444-8444-444444444444'
const ajeno = '55555555-5555-4555-8555-555555555555'
const corte = '22222222-2222-4222-8222-222222222222'
const barba = '33333333-3333-4333-8333-333333333333'
const today = getDynamicHoy('America/Santiago')

function seed(extra = {}) {
  db = createFakeDb({
    tables: {
      comercios: [
        { id: tenant, slug: 'chamos', nombre: 'Chamos Barber', direccion: 'Av. Siempre Viva 123', telefono: '+56 2 2222 2222', timezone: 'America/Santiago', moneda: 'CLP', activo: true },
        { id: other, slug: 'otra', nombre: 'Otra', activo: true },
      ],
      barberos: [
        { id: carlos, nombre: 'Carlos', apellido: 'Pérez', especialidades: ['Fade'], descripcion: 'Senior', activo: true, comercio_id: tenant },
        { id: pedro, nombre: 'Pedro', apellido: 'Gómez', especialidades: null, descripcion: null, activo: false, comercio_id: tenant },
        { id: ajeno, nombre: 'Ajeno', apellido: 'X', activo: true, comercio_id: other },
      ],
      servicios: [
        { id: corte, nombre: 'Corte', descripcion: 'Clásico', precio: 10000, duracion_minutos: 30, tiempo_buffer: 5, categoria: 'cortes', activo: true, comercio_id: tenant },
        { id: barba, nombre: 'Barba', descripcion: null, precio: 6000, duracion_minutos: 20, tiempo_buffer: 10, categoria: 'barbas', activo: false, comercio_id: tenant },
        { id: '66666666-6666-4666-8666-666666666666', nombre: 'Foráneo', precio: 1, duracion_minutos: 10, activo: true, comercio_id: other },
      ],
      sitio_configuracion: [
        { comercio_id: tenant, clave: 'horario_apertura', valor: '09:00' },
        { comercio_id: tenant, clave: 'horario_sabado_cierre', valor: '18:00' },
        { comercio_id: tenant, clave: 'horario_domingo_activo', valor: 'false' },
        { comercio_id: tenant, clave: 'intervalo_citas', valor: '15' },
        { comercio_id: tenant, clave: 'instagram_url', valor: 'https://instagram.com/chamos' },
        { comercio_id: tenant, clave: 'pos_clave_seguridad', valor: '9999' },
        { comercio_id: other, clave: 'sitio_nombre', valor: 'No soy yo' },
      ],
      citas: [],
    },
    rpc: async (_name, args) => ({ data: [
      { hora: '10:00', disponible: true, motivo: 'Disponible' },
      { hora: '10:30', disponible: false, motivo: 'Ocupado' },
      { hora: '11:00', disponible: args.p_barbero_id === carlos, motivo: 'Disponible' },
    ], error: null }),
    ...extra,
  })
  return db
}

async function call(handler, { method = 'GET', key = KEY, query = {}, body } = {}) {
  const res = createResponse()
  await handler({ method, headers: key == null ? {} : { 'x-bot-api-key': key }, query, body }, res)
  return res
}

test.beforeEach(() => {
  process.env.BOT_API_KEY = KEY
  delete process.env.BOT_COMERCIO_SLUG
  seed()
})

test('without BOT_API_KEY the API is closed with 503 and never reads data', async () => {
  for (const value of [undefined, '', '   ', 'short-key']) {
    if (value === undefined) delete process.env.BOT_API_KEY
    else process.env.BOT_API_KEY = value
    const res = await call(servicios)
    assert.equal(res.statusCode, 503)
    assert.deepEqual(res.body, { success: false, code: 'BOT_NO_CONFIGURADO', message: 'La API del bot no está configurada en el servidor.' })
  }
  assert.equal(db.calls.selects.length, 0)
})

test('missing or wrong key is rejected with 401', async () => {
  for (const key of [null, '', 'wrong', KEY.slice(0, -1) + 'X', KEY + ' extra', [KEY]]) {
    const res = await call(servicios, { key })
    assert.equal(res.statusCode, 401, `key ${JSON.stringify(key)}`)
    assert.equal(res.body.code, 'NO_AUTORIZADO')
  }
  assert.equal(db.calls.selects.length, 0)
  assert.equal(botKeyMatches(KEY, KEY), true)
  assert.equal(botKeyMatches(undefined, KEY), false)
})

test('unsupported method returns 405 with Allow header after auth', async () => {
  const res = await call(servicios, { method: 'POST' })
  assert.equal(res.statusCode, 405)
  assert.equal(res.body.code, 'METODO_NO_PERMITIDO')
  assert.equal(res.headers.allow, 'GET')
  assert.equal(res.headers['cache-control'], 'no-store')
})

test('unknown or inactive tenant slug means the bot is not configured', async () => {
  process.env.BOT_COMERCIO_SLUG = 'nope'
  assert.equal((await call(servicios)).statusCode, 503)
  process.env.BOT_COMERCIO_SLUG = 'chamos'
  db.tables.comercios[0].activo = false
  const res = await call(servicios)
  assert.equal(res.statusCode, 503)
  assert.equal(res.body.code, 'BOT_NO_CONFIGURADO')
})

test('database errors become a generic 500 without internals', async () => {
  seed({ fail: { 'servicios.select': { message: 'relation "secret_table" does not exist' } } })
  const res = await call(servicios)
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.code, 'ERROR_INTERNO')
  assert.doesNotMatch(JSON.stringify(res.body), /secret_table/)
})

test('servicios lists only active services of the bot tenant', async () => {
  const res = await call(servicios)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { success: true, data: [{ id: corte, nombre: 'Corte', descripcion: 'Clásico', precio: 10000, duracion_minutos: 30, categoria: 'cortes' }] })
})

test('BOT_COMERCIO_SLUG selects the tenant', async () => {
  process.env.BOT_COMERCIO_SLUG = 'otra'
  const res = await call(servicios)
  assert.deepEqual(res.body.data.map(s => s.nombre), ['Foráneo'])
})

test('barberos lists only active barbers of the bot tenant', async () => {
  const res = await call(barberos)
  // The fields that existed before horario_semanal keep their values.
  assert.deepEqual(res.body.data.map(({ horario_semanal, ...barber }) => barber), [{ id: carlos, nombre: 'Carlos', apellido: 'Pérez', especialidades: ['Fade'], descripcion: 'Senior' }])
})

// The panel values on 2026-11-23: Sunday open with its own hours.
const liveHours = (comercio_id = tenant) => Object.entries({
  horario_apertura: '10:30', horario_cierre: '20:00',
  horario_sabado_apertura: '10:30', horario_sabado_cierre: '20:00',
  horario_domingo_apertura: '12:00', horario_domingo_cierre: '17:00', horario_domingo_activo: 'true',
  intervalo_citas: '30',
}).map(([clave, valor]) => ({ comercio_id, clave, valor }))
const setting = (clave) => db.tables.sitio_configuracion.find((row) => row.comercio_id === tenant && row.clave === clave)
/** horarios_atencion row: dia_semana is 0 = Sunday … 6 = Saturday. */
const schedule = (barbero_id, dia_semana, extra = {}) => ({
  id: `${barbero_id}-${dia_semana}`, barbero_id, comercio_id: tenant, dia_semana,
  hora_inicio: '10:30:00', hora_fin: '20:00:00', activo: true, pausa_inicio: null, pausa_fin: null, ...extra,
})
const HOURS_KEYS = [
  'horario_apertura', 'horario_cierre', 'horario_sabado_apertura', 'horario_sabado_cierre',
  'horario_domingo_apertura', 'horario_domingo_cierre', 'horario_domingo_activo', 'intervalo_citas',
]

test('barberos adds each barber week from the schedule rows and the panel hours', async () => {
  db.tables.sitio_configuracion = [
    ...liveHours(),
    { comercio_id: tenant, clave: 'pos_clave_seguridad', valor: '9999' },
    { comercio_id: other, clave: 'horario_apertura', valor: '06:00' },
    { comercio_id: other, clave: 'horario_domingo_activo', valor: 'false' },
  ]
  db.tables.horarios_atencion = [
    schedule(carlos, 0, { hora_inicio: '12:00:00', hora_fin: '17:00:00' }),
    schedule(carlos, 1),
    schedule(carlos, 2, { pausa_inicio: '14:00:00', pausa_fin: '15:00:00' }),
    schedule(carlos, 3, { activo: false }),
    schedule(carlos, 4, { hora_inicio: '09:00:00', hora_fin: '22:00:00' }), // wider than the shop hours
    schedule(carlos, 5, { hora_inicio: '12:00:00', hora_fin: '18:00:00' }),
    // No Saturday row. Rows of an inactive and of a foreign barber never show up.
    schedule(pedro, 6),
    { ...schedule(ajeno, 6), comercio_id: other },
  ]
  const res = await call(barberos)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.data, [{
    id: carlos, nombre: 'Carlos', apellido: 'Pérez', especialidades: ['Fade'], descripcion: 'Senior',
    horario_semanal: [
      { dia: 'lunes', atiende: true, desde: '10:30', hasta: '20:00', pausa: null },
      { dia: 'martes', atiende: true, desde: '10:30', hasta: '20:00', pausa: { desde: '14:00', hasta: '15:00' } },
      { dia: 'miércoles', atiende: false, desde: null, hasta: null, pausa: null },
      { dia: 'jueves', atiende: true, desde: '10:30', hasta: '20:00', pausa: null },
      { dia: 'viernes', atiende: true, desde: '12:00', hasta: '18:00', pausa: null },
      { dia: 'sábado', atiende: false, desde: null, hasta: null, pausa: null },
      { dia: 'domingo', atiende: true, desde: '12:00', hasta: '17:00', pausa: null },
    ],
  }])
  assert.deepEqual(Object.keys(res.body.data[0]), ['id', 'nombre', 'apellido', 'especialidades', 'descripcion', 'horario_semanal'])
  // Only the listed barbers' rows and this tenant's hours keys are read.
  assert.deepEqual(db.calls.selects.find((s) => s.table === 'horarios_atencion').filters, [['barbero_id', 'in', [carlos]]])
  assert.deepEqual(db.calls.selects.find((s) => s.table === 'sitio_configuracion').filters, [['comercio_id', 'eq', tenant], ['clave', 'in', HOURS_KEYS]])
})

test('barberos gives each barber the week of their own rows', async () => {
  const luis = '77777777-7777-4777-8777-777777777777'
  db.tables.barberos.push({ id: luis, nombre: 'Luis', apellido: null, especialidades: null, descripcion: null, activo: true, comercio_id: tenant })
  db.tables.sitio_configuracion = liveHours()
  db.tables.horarios_atencion = [
    schedule(luis, 1, { hora_inicio: '12:00:00', hora_fin: '16:00:00' }),
    ...[2, 3, 4, 5, 6].map((day) => schedule(carlos, day)),
  ]
  const { data } = (await call(barberos)).body
  const working = (barber) => barber.horario_semanal.filter((day) => day.atiende).map((day) => `${day.dia} ${day.desde}-${day.hasta}`)
  assert.deepEqual(data.map((barber) => barber.nombre), ['Carlos', 'Luis'])
  assert.deepEqual(working(data[0]), ['martes', 'miércoles', 'jueves', 'viernes', 'sábado'].map((dia) => `${dia} 10:30-20:00`))
  assert.deepEqual(working(data[1]), ['lunes 12:00-16:00'])
  assert.deepEqual(data[1], { id: luis, nombre: 'Luis', apellido: null, especialidades: [], descripcion: null, horario_semanal: data[1].horario_semanal })
  assert.deepEqual(db.calls.selects.find((s) => s.table === 'horarios_atencion').filters, [['barbero_id', 'in', [carlos, luis]]])
})

test('barberos follows the panel: new hours change the week on the next request', async () => {
  db.tables.sitio_configuracion = liveHours()
  db.tables.horarios_atencion = [0, 1, 2, 3, 4, 5, 6].map((day) => schedule(carlos, day))
  const week = async () => (await call(barberos)).body.data[0].horario_semanal
  const before = await week()
  assert.deepEqual(before[0], { dia: 'lunes', atiende: true, desde: '10:30', hasta: '20:00', pausa: null })
  assert.deepEqual(before[6], { dia: 'domingo', atiende: true, desde: '12:00', hasta: '17:00', pausa: null })

  // The owner closes Sundays and moves the weekday closing time in the panel.
  setting('horario_domingo_activo').valor = 'false'
  setting('horario_cierre').valor = '19:00'
  const after = await week()
  assert.deepEqual(after[0], { dia: 'lunes', atiende: true, desde: '10:30', hasta: '19:00', pausa: null })
  assert.deepEqual(after[5], { dia: 'sábado', atiende: true, desde: '10:30', hasta: '20:00', pausa: null })
  assert.deepEqual(after[6], { dia: 'domingo', atiende: false, desde: null, hasta: null, pausa: null })
})

test('barberos keeps listing barbers, without the week, when the schedule cannot be read', async (t) => {
  const logged = t.mock.method(console, 'error', () => {})
  const listed = { success: true, data: [{ id: carlos, nombre: 'Carlos', apellido: 'Pérez', especialidades: ['Fade'], descripcion: 'Senior' }] }
  // Neither guessed hours nor a failed list: the field is left out and the error is logged.
  for (const table of ['horarios_atencion', 'sitio_configuracion']) {
    seed({ fail: { [`${table}.select`]: { message: 'relation "secret_table" does not exist' } } })
    db.tables.horarios_atencion = [1, 2, 3, 4, 5].map((day) => schedule(carlos, day))
    const res = await call(barberos)
    assert.deepEqual([res.statusCode, res.body], [200, listed], table)
  }
  assert.equal(logged.mock.callCount(), 2)

  seed()
  db.tables.barberos = db.tables.barberos.filter((barber) => barber.id !== carlos)
  const empty = await call(barberos)
  assert.deepEqual([empty.statusCode, empty.body], [200, { success: true, data: [] }])
  assert.equal(db.calls.selects.some((s) => s.table === 'horarios_atencion'), false, 'no barbers, no schedule lookup')
})

test('info returns calendar hours with database defaults and never private settings', async () => {
  const res = await call(info)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.data, {
    nombre: 'Chamos Barber', direccion: 'Av. Siempre Viva 123', telefono: '+56 2 2222 2222', timezone: 'America/Santiago', moneda: 'CLP',
    horarios: {
      semana: { abierto: true, apertura: '09:00', cierre: '20:00' },
      sabado: { abierto: true, apertura: '09:00', cierre: '18:00' },
      domingo: { abierto: false, apertura: '09:00', cierre: '20:00' },
    },
    intervalo_citas_minutos: 15,
    enlaces: { google_maps: null, instagram: 'https://instagram.com/chamos', facebook: null, whatsapp: null },
  })
  assert.doesNotMatch(JSON.stringify(res.body), /9999|No soy yo/)
})

test('info quotes the Sunday hours when the panel opens Sundays, and follows a later change', async () => {
  db.tables.sitio_configuracion = [...liveHours(), { comercio_id: other, clave: 'horario_domingo_cierre', valor: '23:00' }]
  const res = await call(info)
  assert.deepEqual(res.body.data.horarios, {
    semana: { abierto: true, apertura: '10:30', cierre: '20:00' },
    sabado: { abierto: true, apertura: '10:30', cierre: '20:00' },
    domingo: { abierto: true, apertura: '12:00', cierre: '17:00' },
  })
  assert.equal(res.body.data.intervalo_citas_minutos, 30)

  // The owner edits the panel: the next request answers the new hours.
  setting('horario_domingo_cierre').valor = '18:00'
  setting('horario_sabado_apertura').valor = ''
  setting('horario_apertura').valor = '09:30'
  const { horarios: updated } = (await call(info)).body.data
  assert.deepEqual(updated.domingo, { abierto: true, apertura: '12:00', cierre: '18:00' })
  assert.deepEqual(updated.sabado, { abierto: true, apertura: '09:30', cierre: '20:00' })
})

test('horarios validates dates against the 30-day booking window', async () => {
  for (const fecha of ['2026-02-30', addDays(today, -1), addDays(today, 31)]) {
    const res = await call(horarios, { method: 'POST', body: { fecha, servicios_ids: [corte] } })
    assert.equal(res.statusCode, 400, fecha)
    assert.equal(res.body.code, 'DATOS_INVALIDOS')
  }
  for (const body of [null, { fecha: today, servicios_ids: [] }, { fecha: today, servicios_ids: [corte], barbero_id: 'x' }]) {
    assert.equal((await call(horarios, { method: 'POST', body })).body.code, 'DATOS_INVALIDOS')
  }
  assert.equal(db.calls.rpc.length, 0)
})

test('horarios computes duration server-side and returns only available slots', async () => {
  const fecha = addDays(today, 2)
  const res = await call(horarios, { method: 'POST', body: { fecha, servicios_ids: [corte, corte], duracion_minutos: 5 } })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.data, { fecha, duracion_minutos: 65, barberos: [{ id: carlos, nombre: 'Carlos', apellido: 'Pérez', horarios: ['10:00', '11:00'] }] })
  assert.deepEqual(db.calls.rpc, [{ name: 'get_horarios_disponibles', args: { p_barbero_id: carlos, p_fecha: fecha, p_duracion_minutos: 65 } }])
})

test('horarios rejects foreign or inactive barbers and services', async () => {
  const fecha = addDays(today, 2)
  for (const barbero_id of [ajeno, pedro]) {
    const res = await call(horarios, { method: 'POST', body: { fecha, servicios_ids: [corte], barbero_id } })
    assert.equal(res.statusCode, 400)
    assert.equal(res.body.code, 'BARBERO_NO_DISPONIBLE')
  }
  const res = await call(horarios, { method: 'POST', body: { fecha, servicios_ids: [barba] } })
  assert.equal(res.body.code, 'SERVICIO_NO_DISPONIBLE')
})

test('phone normalization matches the website storage format', () => {
  for (const raw of ['+56 9 1234 5678', '+56912345678', '56912345678', '912345678', '9 1234-5678']) {
    assert.equal(normalizeCustomerPhone(raw), '+56912345678', raw)
  }
  for (const raw of ['123', '', null, ['912345678'], 'abc12345678']) assert.equal(normalizeCustomerPhone(raw), null)
  assert.deepEqual(phoneLookupVariants('+56912345678'), ['+56912345678', '56912345678', '912345678'])
})

test('citas returns only this customer upcoming bookings plus history', async () => {
  const future = addDays(today, 3)
  const carlosRef = { id: carlos, nombre: 'Carlos', apellido: 'Pérez', activo: true }
  db.tables.citas = [
    { id: 'up-1', comercio_id: tenant, cliente_telefono: '912345678', cliente_nombre: 'Ana', fecha: future, hora: '10:00:00', estado: 'confirmada', barbero_id: carlos, barberos: carlosRef, items: [{ servicio_id: corte, nombre: 'Corte', precio: 10000, cantidad: 2, subtotal: 20000 }], precio_final: 20000 },
    { id: 'up-cancelled', comercio_id: tenant, cliente_telefono: '+56912345678', cliente_nombre: 'Ana', fecha: future, hora: '12:00:00', estado: 'cancelada', barbero_id: carlos, barberos: carlosRef },
    { id: 'old-1', comercio_id: tenant, cliente_telefono: '+56912345678', cliente_nombre: 'Ana María', fecha: addDays(today, -7), hora: '10:00:00', estado: 'completada', barbero_id: carlos, barberos: carlosRef, servicio_id: corte, servicios: { id: corte, nombre: 'Corte', precio: 10000 } },
    { id: 'old-2', comercio_id: tenant, cliente_telefono: '56912345678', cliente_nombre: 'Ana', fecha: addDays(today, -30), hora: '10:00:00', estado: 'completada', barbero_id: pedro, barberos: { id: pedro, nombre: 'Pedro', apellido: 'Gómez', activo: false } },
    { id: 'old-3', comercio_id: tenant, cliente_telefono: '+56912345678', cliente_nombre: 'Ana', fecha: addDays(today, -60), hora: '10:00:00', estado: 'completada', barbero_id: carlos, barberos: carlosRef },
    { id: 'past-pending', comercio_id: tenant, cliente_telefono: '+56912345678', cliente_nombre: 'Ana', fecha: addDays(today, -1), hora: '10:00:00', estado: 'pendiente', barbero_id: carlos },
    { id: 'someone-else', comercio_id: tenant, cliente_telefono: '+56987654321', cliente_nombre: 'Otro', fecha: future, hora: '11:00:00', estado: 'pendiente', barbero_id: carlos },
    { id: 'other-tenant', comercio_id: other, cliente_telefono: '+56912345678', cliente_nombre: 'Ana', fecha: future, hora: '11:00:00', estado: 'pendiente', barbero_id: ajeno },
  ]
  const res = await call(citas, { query: { telefono: '+56 9 1234 5678' } })
  assert.equal(res.statusCode, 200)
  const { data } = res.body
  assert.equal(data.telefono, '+56912345678')
  assert.deepEqual(data.citas, [{
    id: 'up-1', fecha: future, hora: '10:00', estado: 'confirmada',
    barbero: { id: carlos, nombre: 'Carlos', apellido: 'Pérez' },
    servicios: [{ id: corte, nombre: 'Corte', cantidad: 2, precio: 10000 }],
    precio_final: 20000, modificable: true, modificable_hasta: `${future} 10:00`,
  }])
  assert.deepEqual(data.historial, {
    cliente_nombre: 'Ana',
    visitas_completadas: 3,
    ultima_visita: addDays(today, -7),
    barberos_recientes: [
      { id: carlos, nombre: 'Carlos', apellido: 'Pérez', activo: true, visitas: 2, ultima_visita: addDays(today, -7) },
      { id: pedro, nombre: 'Pedro', apellido: 'Gómez', activo: false, visitas: 1, ultima_visita: addDays(today, -30) },
    ],
  })
  assert.doesNotMatch(JSON.stringify(data), /someone-else|other-tenant|Otro|987654321/)
  const filters = db.calls.selects.find(s => s.table === 'citas').filters
  assert.deepEqual(filters, [['comercio_id', 'eq', tenant], ['cliente_telefono', 'in', ['+56912345678', '56912345678', '912345678']]])
})

test('citas requires a valid phone', async () => {
  for (const telefono of [undefined, '12', ['912345678', '911111111']]) {
    const res = await call(citas, { query: { telefono } })
    assert.equal(res.statusCode, 400)
    assert.equal(res.body.code, 'DATOS_INVALIDOS')
  }
})
