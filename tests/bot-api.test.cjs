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
  assert.deepEqual(res.body.data, [{ id: carlos, nombre: 'Carlos', apellido: 'Pérez', especialidades: ['Fade'], descripcion: 'Senior' }])
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
