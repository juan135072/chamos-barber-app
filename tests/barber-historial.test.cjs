// /barber-app history: it must ask for columns that exist (citas has fecha + hora,
// not fecha_hora) and cover the last 30 Chile days, whatever the device time zone.
require('./load-typescript.cjs')
const test = require('node:test')
const { mock } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const { createFakeDb, stubModule } = require('./fake-db.cjs')
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)
const React = require('react')

let db = createFakeDb()
stubModule('../src/lib/supabase.ts', { supabase: { from: (table) => db.from(table) } })
stubModule('../src/hooks/useBarberAppAuth.ts', { useBarberAppAuth: () => ({ session: { barberoId: 'b1' }, loading: false, error: null, barbero: { id: 'b1', nombre: 'Gustavo', apellido: '' } }) })
stubModule('next/router', { useRouter: () => ({ push() {} }) })

const { cargarHistorial, resumirHistorial, HISTORIAL_SELECT } = require('../src/lib/barber-historial.ts')

// Columns confirmed in the live database on 2026-11-23: every column of public.citas
// and the ones of public.servicios the history may embed. citas has no fecha_hora
// and no duracion; servicios has no duracion. The fake database accepts any name,
// so a select outside these lists would only fail in production.
const CITAS_COLUMNS = ['id', 'barbero_id', 'servicio_id', 'cliente_nombre', 'cliente_email', 'cliente_telefono', 'estado', 'notas', 'created_at', 'updated_at', 'fecha', 'hora', 'estado_pago', 'foto_resultado_url', 'notas_tecnicas', 'items', 'precio_final', 'metodo_pago', 'comercio_id', 'created_by', 'updated_by']
const SERVICIOS_COLUMNS = ['nombre', 'precio', 'duracion_minutos']

const CHILE_2130 = '2026-11-24T00:30:00Z' // lunes 23 nov 2026, 21:30 en Chile
const WINDOW = [['barbero_id', 'eq', 'b1'], ['fecha', 'gte', '2026-10-24'], ['fecha', 'lte', '2026-11-23']]
const LOAD_ERROR = 'No se pudo cargar el historial. Intenta de nuevo.'

const corte = { nombre: 'Corte', precio: 10000, duracion_minutos: 30 }
const cita = (id, fecha, hora, estado, extra = {}) => ({ id, barbero_id: 'b1', fecha, hora, estado, cliente_nombre: 'Cliente ' + id, cliente_telefono: '+569' + id, cliente_email: null, precio_final: null, servicios: corte, ...extra })
const CITAS = [
  cita('old', '2026-10-23', '10:00:00', 'completada'), // 31 days before 23 nov
  cita('first', '2026-10-24', '10:00:00', 'completada'),
  cita('free', '2026-11-18', '10:00:00', 'completada', { servicios: null }),
  cita('unconfirmed', '2026-11-19', '15:00:00', 'pendiente'),
  cita('noshow', '2026-11-20', '12:00:00', 'confirmada'),
  cita('cancel', '2026-11-21', '09:00:00', 'cancelada'),
  cita('today-early', '2026-11-23', '11:00:00', 'completada', { cliente_telefono: '+569first' }),
  cita('today-done', '2026-11-23', '18:00:00', 'completada', { precio_final: 15000 }),
  cita('today-confirmed', '2026-11-23', '20:00:00', 'confirmada'),
  cita('today-open', '2026-11-23', '22:00:00', 'pendiente'),
  cita('tomorrow', '2026-11-24', '11:00:00', 'pendiente'),
  cita('other-barber', '2026-11-22', '11:00:00', 'completada', { barbero_id: 'b2' }),
]
const HISTORY_IDS = ['today-done', 'today-early', 'cancel', 'noshow', 'unconfirmed', 'free', 'first']

function at(iso, fn) {
  mock.timers.enable({ apis: ['Date'], now: Date.parse(iso) })
  return Promise.resolve().then(fn).finally(() => mock.timers.reset())
}

async function quietly(run) {
  const realError = console.error
  console.error = () => {}
  try { return await run() } finally { console.error = realError }
}

const settled = () => new Promise((resolve) => setImmediate(resolve))

test('the history query only asks for columns that exist (fecha + hora, no fecha_hora or duracion)', async () => {
  const embed = /(\w+):(\w+)\s*\(([^)]*)\)/.exec(HISTORIAL_SELECT)
  assert.deepEqual([embed[1], embed[2]], ['servicios', 'servicio_id'])
  const names = (list) => list.split(',').map((name) => name.trim()).filter(Boolean)
  assert.deepEqual(names(embed[3]).filter((name) => !SERVICIOS_COLUMNS.includes(name)), [])
  const own = names(HISTORIAL_SELECT.replace(embed[0], ''))
  assert.deepEqual(own.filter((name) => !CITAS_COLUMNS.includes(name)), [])
  assert.ok(own.includes('fecha') && own.includes('hora'))

  // That checked list is what the query sends.
  db = createFakeDb()
  const sent = []
  const client = { from(table) { const query = db.from(table); const select = query.select; query.select = (columns) => { sent.push(columns); return select.call(query, columns) }; return query } }
  await cargarHistorial(client, 'b1', '2026-11-23')
  assert.deepEqual(sent, [HISTORIAL_SELECT])
})

test('history of the last 30 Chile days, newest first, without what is still open today', async () => {
  db = createFakeDb({ tables: { citas: structuredClone(CITAS) } })
  const citas = await cargarHistorial(db, 'b1', '2026-11-23')
  assert.deepEqual(db.calls.selects, [{ table: 'citas', filters: WINDOW }])
  assert.deepEqual(citas.map((c) => c.id), HISTORY_IDS)
  assert.deepEqual([citas[0].servicio_nombre, citas[0].servicio_precio, citas[0].duracion], ['Corte', 15000, 30], 'the charged price wins over the list price')
  assert.equal(citas[1].servicio_precio, 10000)
  assert.deepEqual([citas[5].servicio_nombre, citas[5].servicio_precio, citas[5].duracion], ['Sin servicio', 0, 0], 'a cita without a service still loads')
  // Completed: today-done 15000, today-early 10000, free 0 and first 10000; today-early and first share a phone.
  assert.deepEqual(resumirHistorial(citas), { total_citas: 7, total_ganancia: 35000, promedio_cita: 8750, total_clientes: 3 })
})

test('at 21:30 Chile "today" is the Chile day, not the UTC day', () => at(CHILE_2130, async () => {
  db = createFakeDb({ tables: { citas: structuredClone(CITAS) } })
  const citas = await cargarHistorial(db, 'b1')
  assert.deepEqual(db.calls.selects[0].filters, WINDOW)
  assert.ok(!citas.some((c) => c.id === 'tomorrow'))
}))

test('a failed query is reported, not shown as an empty history', async () => {
  db = createFakeDb({ fail: { 'citas.select': { code: '42703', message: 'column citas.fecha_hora does not exist' } } })
  await assert.rejects(cargarHistorial(db, 'b1', '2026-11-23'), { code: '42703' })
})

/** Renders the page once. `overrides[i]` replaces the i-th useState value; effects are returned, not run. */
function renderPage(overrides = {}) {
  const HistoryPage = require('../src/pages/barber-app/history.tsx').default
  const setters = []
  const effects = []
  let index = 0
  const original = { useState: React.useState, useEffect: React.useEffect, useCallback: React.useCallback }
  React.useState = (initial) => { const i = index++; return [i in overrides ? overrides[i] : initial, (next) => setters.push([i, next])] }
  React.useEffect = (fn) => { effects.push(fn) }
  React.useCallback = (fn) => fn
  try { return { tree: HistoryPage(), setters, effects } }
  finally { Object.assign(React, original) }
}

/** Every element of a rendered tree that matches, in document order. */
function findAll(node, predicate, found = []) {
  if (Array.isArray(node)) node.forEach((child) => findAll(child, predicate, found))
  else if (node && typeof node === 'object') {
    if (predicate(node)) found.push(node)
    findAll(node.props?.children, predicate, found)
  }
  return found
}
const hasClass = (name) => (node) => typeof node.props?.className === 'string' && node.props.className.split(' ').includes(name)

// useState order of the page: citas, stats, loading, errorCarga, filtro
test('the history page loads the Chile window of its barber', () => at(CHILE_2130, async () => {
  db = createFakeDb({ tables: { citas: structuredClone(CITAS) } })
  const { effects, setters } = renderPage()
  effects.forEach((fn) => fn())
  await settled()
  assert.deepEqual(db.calls.selects, [{ table: 'citas', filters: WINDOW }])
  const state = Object.fromEntries(setters) // last value given to each state
  assert.deepEqual(state[0].map((c) => c.id), HISTORY_IDS)
  assert.deepEqual([state[1].total_citas, state[1].total_ganancia], [7, 35000])
  assert.deepEqual([state[2], state[3]], [false, null], 'loading ends without an error')
}))

test('the history page shows the stored day and time and the real status of each cita', async () => {
  db = createFakeDb({ tables: { citas: structuredClone(CITAS) } })
  const citas = await cargarHistorial(db, 'b1', '2026-11-23')
  const { tree } = renderPage({ 0: citas, 1: resumirHistorial(citas), 2: false })
  const cards = findAll(tree, hasClass('history-card'))
  const shown = (card, name) => findAll(card, hasClass(name))[0]?.props.children ?? null
  assert.deepEqual(cards.map((card) => ['client-name', 'badge', 'history-date', 'history-price'].map((name) => shown(card, name))), [
    ['Cliente today-done', 'Completada', '23 nov 2026, 18:00', '$15.000'],
    ['Cliente today-early', 'Completada', '23 nov 2026, 11:00', '$10.000'],
    ['Cliente cancel', 'Cancelada', '21 nov 2026, 09:00', null],
    ['Cliente noshow', 'Confirmada', '20 nov 2026, 12:00', null],
    ['Cliente unconfirmed', 'Pendiente', '19 nov 2026, 15:00', null],
    ['Cliente free', 'Completada', '18 nov 2026, 10:00', null],
    ['Cliente first', 'Completada', '24 oct 2026, 10:00', '$10.000'],
  ])
  const details = findAll(cards[5], hasClass('history-details'))[0]
  assert.equal(React.Children.toArray(details.props.children).length, 1, 'a completed cita without a price shows only its date, no stray 0')
})

test('a failed load shows an error with a retry, not an empty history', () => at(CHILE_2130, () => quietly(async () => {
  db = createFakeDb({ fail: { 'citas.select': { code: '42703', message: 'column citas.fecha_hora does not exist' } } })
  const first = renderPage()
  first.effects.forEach((fn) => fn())
  await settled()
  const state = Object.fromEntries(first.setters)
  assert.deepEqual([state[0], state[2], state[3]], [undefined, false, LOAD_ERROR], 'loading ends with the error and no citas')

  const failed = renderPage({ 2: false, 3: LOAD_ERROR })
  const [notice] = findAll(failed.tree, (node) => node.props?.message !== undefined)
  assert.deepEqual([notice.props.icon, notice.props.message, notice.props.action.label], ['alert', LOAD_ERROR, 'Reintentar'])
  assert.ok(!JSON.stringify(failed.tree).includes('Sin historial'))

  // "Reintentar" asks again; a good answer replaces the error with the history.
  db = createFakeDb({ tables: { citas: structuredClone(CITAS) } })
  await notice.props.action.onClick()
  assert.deepEqual(db.calls.selects, [{ table: 'citas', filters: WINDOW }])
  const retried = Object.fromEntries(failed.setters)
  assert.deepEqual([retried[0].map((c) => c.id), retried[2], retried[3]], [HISTORY_IDS, false, null])
})))
