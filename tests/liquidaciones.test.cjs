// Liquidations: what the panel sends to the database functions and how it reads
// their answer. Dates travel as Chile calendar days ('YYYY-MM-DD'), never as instants.
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
let rpcCalls = []
let answers = {}
stubModule('../src/lib/supabase.ts', {
  supabase: {
    from: (table) => db.from(table),
    rpc: async (name, args) => { rpcCalls.push([name, args]); return answers[name] ?? { data: null, error: null } },
  },
})
stubModule('../src/lib/pdf-liquidacion.ts', { async generarPDFLiquidacion() {} })
const { calcularComisionesPendientes, crearLiquidacion, pagarLiquidacion, getEstadoLabel } = require('../src/lib/supabase-liquidaciones.ts')

const CHILE_2130 = '2026-11-24T00:30:00Z' // Monday 23 Nov 2026, 21:30 in Chile
// Nothing here is round on purpose, so a hardcoded value cannot pass: the period is
// neither the month start nor today, and the commission is not half the amount.
const FROM = '2026-11-03', TO = '2026-11-20'
const PERIOD = { p_barbero_id: 'b1', p_fecha_inicio: FROM, p_fecha_fin: TO }
// calcular_comisiones_pendientes: total_ventas is the number of sales, monto_total_vendido the money.
const DB_PREVIEW = { total_ventas: 37, monto_total_vendido: 412000, porcentaje_comision: 51.26, total_comision: 211191 }
// In the app total_ventas is the money, as in the liquidaciones table.
const PREVIEW = { total_ventas: 412000, cantidad_servicios: 37, porcentaje_comision: 51.26, total_comision: 211191 }
const NO_SALES = { total_ventas: 0, cantidad_servicios: 0, porcentaje_comision: 0, total_comision: 0 }
const liquidacion = (id, estado) => ({ id, numero_liquidacion: 'LIQ-' + id, barbero_id: 'b1', fecha_inicio: FROM, fecha_fin: TO, total_ventas: 412000, cantidad_servicios: 37, porcentaje_comision: 51.26, total_comision: 211191, estado, monto_efectivo: 0, monto_transferencia: 0, barbero: { nombre: 'Gustavo', apellido: '', email: 'g@example.com', telefono: '' } })

function reset(next = {}) { rpcCalls = []; answers = next }

function at(iso, fn) {
  mock.timers.enable({ apis: ['Date'], now: Date.parse(iso) })
  return Promise.resolve().then(fn).finally(() => mock.timers.reset())
}

async function quietly(run) {
  const realLog = console.log, realError = console.error
  console.log = () => {}
  console.error = () => {}
  try { return await run() } finally { console.log = realLog; console.error = realError }
}

const settled = () => new Promise((resolve) => setImmediate(resolve))

test('the commission preview reads the count and the amount under the names the database returns', async () => {
  reset({ calcular_comisiones_pendientes: { data: [DB_PREVIEW], error: null } })
  assert.deepEqual(await calcularComisionesPendientes('b1', FROM, TO), PREVIEW)
  assert.deepEqual(rpcCalls, [['calcular_comisiones_pendientes', PERIOD]])

  // Numbers that arrive as text are still numbers for the screens.
  answers = { calcular_comisiones_pendientes: { data: [{ total_ventas: '37', monto_total_vendido: '412000.00', porcentaje_comision: '51.26', total_comision: '211191.00' }], error: null } }
  assert.deepEqual(await calcularComisionesPendientes('b1', FROM, TO), PREVIEW)

  answers = { calcular_comisiones_pendientes: { data: [], error: null } }
  assert.deepEqual(await calcularComisionesPendientes('b1'), { total_ventas: 0, cantidad_servicios: 0, porcentaje_comision: 50, total_comision: 0 })
  assert.deepEqual(rpcCalls[2][1], { p_barbero_id: 'b1', p_fecha_inicio: null, p_fecha_fin: null })
})

test('create and pay call the 3 and 6 argument functions by their argument names', () => quietly(async () => {
  reset({ crear_liquidacion: { data: 'liq-1', error: null }, pagar_liquidacion: { data: true, error: null } })
  assert.equal(await crearLiquidacion({ barbero_id: 'b1', fecha_inicio: FROM, fecha_fin: TO }), 'liq-1')
  assert.equal(await pagarLiquidacion({ liquidacion_id: 'liq-1', metodo_pago: 'mixto', monto_efectivo: 100000, monto_transferencia: 111191, referencia_transferencia: 'TRX-1', notas: 'ok' }), true)
  assert.deepEqual(rpcCalls, [
    ['crear_liquidacion', PERIOD],
    ['pagar_liquidacion', { p_liquidacion_id: 'liq-1', p_metodo_pago: 'mixto', p_monto_efectivo: 100000, p_monto_transferencia: 111191, p_numero_transferencia: 'TRX-1', p_notas: 'ok' }],
  ])
}))

test('a database refusal reaches the caller with its message', () => quietly(async () => {
  reset({
    crear_liquidacion: { data: null, error: { code: 'P0001', message: 'No hay ventas en el período seleccionado para liquidar' } },
    pagar_liquidacion: { data: null, error: { code: 'P0001', message: 'Liquidación no encontrada o ya pagada' } },
  })
  await assert.rejects(crearLiquidacion({ barbero_id: 'b1', fecha_inicio: FROM, fecha_fin: TO }), { message: 'No hay ventas en el período seleccionado para liquidar' })
  await assert.rejects(pagarLiquidacion({ liquidacion_id: 'liq-1', metodo_pago: 'efectivo', monto_efectivo: 211191, monto_transferencia: 0 }), { message: 'Liquidación no encontrada o ya pagada' })
}))

test('every liquidation status has a Spanish label, annulled included', () => {
  assert.deepEqual(['pendiente', 'pagada', 'cancelada', 'anulada', 'otro'].map(getEstadoLabel), ['Pendiente', 'Pagada', 'Cancelada', 'Anulada', 'otro'])
})

/**
 * Renders a function component once. `overrides[i]` replaces the i-th useState value.
 * Effects are returned, not run, with the dependencies each one declared.
 */
function render(Component, props, overrides = {}) {
  const setters = []
  const effects = []
  const deps = []
  let index = 0
  const originalState = React.useState, originalEffect = React.useEffect
  React.useState = (initial) => { const i = index++; return [i in overrides ? overrides[i] : initial, (next) => setters.push([i, next])] }
  React.useEffect = (fn, dependencies) => { effects.push(fn); deps.push(dependencies) }
  try { return { tree: Component(props), setters, effects, deps } }
  finally { React.useState = originalState; React.useEffect = originalEffect }
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
const text = (node) => (typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : '')
const button = (tree, label) => findAll(tree, (node) => node.type === 'button' && text(node) === label)[0]
/** What is printed right after a label: the text of the next sibling of the element that holds it. */
function after(tree, label) {
  const holds = (child) => child?.props?.children === label
  const [parent] = findAll(tree, (node) => React.Children.toArray(node.props?.children).some(holds))
  const siblings = React.Children.toArray(parent.props.children)
  return text(siblings[siblings.findIndex(holds) + 1])
}
/** The last value given to each state, by its useState index. */
const lastState = (setters) => Object.fromEntries(setters)

// useState order of the create modal: fechaInicio, fechaFin, calculando, creando, error, comisiones
const CALCULANDO = 2, CREANDO = 3, ERROR = 4, COMISIONES = 5
/** Renders the create modal. `events` records its onSuccess and onClose callbacks. */
function createModal(overrides = {}) {
  const CrearLiquidacionModal = require('../src/components/liquidaciones/CrearLiquidacionModal.tsx').default
  const events = []
  const props = { barbero: { id: 'b1', nombre: 'Gustavo', apellido: '' }, isOpen: true, onClose: () => events.push('close'), onSuccess: () => events.push('success') }
  return { ...render(CrearLiquidacionModal, props, overrides), events }
}
/** Mounts the create modal with a period, runs its effects and waits for the preview. */
async function preview(fechaInicio, fechaFin, extra = {}) {
  const modal = createModal({ 0: fechaInicio, 1: fechaFin, ...extra })
  modal.effects.forEach((fn) => fn())
  await settled()
  return { ...modal, state: lastState(modal.setters) }
}

test('a new liquidation opened at 21:30 Chile covers the Chile month up to today, never a future day', async () => {
  const opened = (iso) => at(iso, async () => (await preview('', '')).setters)
  // 23 Nov, 21:30 in Chile: in UTC it is already the 24th
  assert.deepEqual(await opened(CHILE_2130), [[0, '2026-11-01'], [1, '2026-11-23']])
  // 30 Nov, 21:30 in Chile: in UTC it is already December
  assert.deepEqual(await opened('2026-12-01T00:30:00Z'), [[0, '2026-11-01'], [1, '2026-11-30']])
})

test('the quick periods end on or before today in Chile', () => at(CHILE_2130, () => {
  const period = (label) => { const modal = createModal(); button(modal.tree, label).props.onClick(); return modal.setters.map(([, value]) => value) }
  assert.deepEqual(period('Mes Actual'), ['2026-11-01', '2026-11-23'])
  assert.deepEqual(period('Mes Anterior'), ['2026-10-01', '2026-10-31'])
  assert.deepEqual(period('Últimos 7 días'), ['2026-11-16', '2026-11-23'])
}))

test('the preview asks for the chosen period and shows its count, amount, percentage and commission', () => at(CHILE_2130, async () => {
  reset({ calcular_comisiones_pendientes: { data: [DB_PREVIEW], error: null } })
  const { state } = await preview(FROM, TO)
  assert.deepEqual(rpcCalls, [['calcular_comisiones_pendientes', PERIOD]])
  assert.deepEqual([state[ERROR], state[COMISIONES], state[CALCULANDO]], [null, PREVIEW, false])

  const modal = createModal({ 0: FROM, 1: TO, [COMISIONES]: PREVIEW })
  assert.deepEqual(['Total Ventas', 'Monto Vendido', 'Porcentaje', 'Comisión Total'].map((label) => after(modal.tree, label)), ['37', '$412.000', '51.26%', '$211.191'])

  // Each date field holds and changes its own end of the period.
  const [desde, hasta] = findAll(modal.tree, (node) => node.type === 'input' && node.props.type === 'date')
  assert.deepEqual([desde.props.value, hasta.props.value], [FROM, TO])
  desde.props.onChange({ target: { value: '2026-11-04' } })
  hasta.props.onChange({ target: { value: '2026-11-19' } })
  assert.deepEqual(modal.setters, [[0, '2026-11-04'], [1, '2026-11-19']])
}))

test('creating sends the previewed period, reloads the panel and closes the modal', () => at(CHILE_2130, () => quietly(async () => {
  reset({ crear_liquidacion: { data: 'liq-1', error: null } })
  const modal = createModal({ 0: FROM, 1: TO, [COMISIONES]: PREVIEW })
  const crear = button(modal.tree, 'Crear Liquidación')
  assert.equal(crear.props.disabled, false)
  await crear.props.onClick()
  assert.deepEqual(rpcCalls, [['crear_liquidacion', PERIOD]])
  assert.deepEqual(modal.events, ['success', 'close'])
})))

test('a create the database refuses shows its message and keeps the modal open', () => at(CHILE_2130, () => quietly(async () => {
  for (const [error, shown] of [
    [{ code: 'P0001', message: 'No hay ventas en el período seleccionado para liquidar' }, 'No hay ventas en el período seleccionado para liquidar'],
    [{ code: 'P0001', message: 'Solo un administrador puede crear liquidaciones' }, 'Solo un administrador puede crear liquidaciones'],
    [{ code: 'XX000' }, 'Error al crear liquidación'],
  ]) {
    reset({ crear_liquidacion: { data: null, error } })
    const modal = createModal({ 0: FROM, 1: TO, [COMISIONES]: PREVIEW })
    await button(modal.tree, 'Crear Liquidación').props.onClick()
    assert.deepEqual(rpcCalls, [['crear_liquidacion', PERIOD]])
    const state = lastState(modal.setters)
    assert.deepEqual([state[ERROR], state[CREANDO], modal.events], [shown, false, []], shown)
  }
})))

test('a period without sales says so and cannot be created', () => at(CHILE_2130, async () => {
  reset({ calcular_comisiones_pendientes: { data: [{ total_ventas: 0, monto_total_vendido: 0, porcentaje_comision: 0, total_comision: 0 }], error: null } })
  const { state } = await preview(FROM, TO)
  assert.deepEqual(rpcCalls, [['calcular_comisiones_pendientes', PERIOD]])
  assert.deepEqual([state[ERROR], state[COMISIONES]], ['No hay ventas en este período para liquidar', NO_SALES])

  reset({ crear_liquidacion: { data: 'liq-1', error: null } })
  const empty = createModal({ 0: FROM, 1: TO, [COMISIONES]: NO_SALES })
  const crear = button(empty.tree, 'Crear Liquidación')
  assert.equal(crear.props.disabled, true)
  await crear.props.onClick()
  assert.deepEqual([empty.setters, rpcCalls, empty.events], [[[ERROR, 'No hay comisiones para liquidar']], [], []])
}))

test('a period that ends after today or before it starts is rejected without asking the database', () => at(CHILE_2130, async () => {
  for (const [fechaInicio, fechaFin, message] of [
    ['2026-11-01', '2026-11-24', 'La fecha fin no puede ser posterior a hoy'],
    ['2026-11-01', '2026-11-30', 'La fecha fin no puede ser posterior a hoy'],
    ['2026-11-23', '2026-11-22', 'La fecha fin debe ser posterior a la fecha inicio'],
  ]) {
    reset({ crear_liquidacion: { data: 'liq-1', error: null } })
    // A preview of an earlier, valid period is still on screen.
    const { state } = await preview(fechaInicio, fechaFin, { [COMISIONES]: PREVIEW })
    assert.deepEqual([state[ERROR], state[COMISIONES]], [message, null], `${fechaInicio}..${fechaFin} clears the preview`)
    assert.ok(text(createModal({ 0: fechaInicio, 1: fechaFin, [ERROR]: message }).tree).includes(message), 'the reason is on screen')

    const stale = createModal({ 0: fechaInicio, 1: fechaFin, [COMISIONES]: PREVIEW })
    await button(stale.tree, 'Crear Liquidación').props.onClick()
    assert.deepEqual(stale.setters, [[ERROR, message]], `${fechaInicio}..${fechaFin} is not created`)
    assert.deepEqual(rpcCalls, [])
  }

  // An erased date starts no preview, so the old one stays on screen: "Crear" still refuses.
  const erased = createModal({ 0: '', 1: '2026-11-23', [COMISIONES]: PREVIEW })
  await button(erased.tree, 'Crear Liquidación').props.onClick()
  assert.deepEqual([erased.setters, rpcCalls], [[[ERROR, 'Debes seleccionar ambas fechas']], []])
}))

test('a one-day period that ends today is valid', () => at(CHILE_2130, async () => {
  reset({ calcular_comisiones_pendientes: { data: [DB_PREVIEW], error: null } })
  const { state } = await preview('2026-11-23', '2026-11-23')
  assert.deepEqual(rpcCalls, [['calcular_comisiones_pendientes', { p_barbero_id: 'b1', p_fecha_inicio: '2026-11-23', p_fecha_fin: '2026-11-23' }]])
  assert.deepEqual([state[ERROR], state[COMISIONES]], [null, PREVIEW])
}))

test('a failed preview shows the database message and no amounts', () => at(CHILE_2130, () => quietly(async () => {
  reset({ calcular_comisiones_pendientes: { data: null, error: { code: '42501', message: 'permission denied for function calcular_comisiones_pendientes' } } })
  const { state } = await preview(FROM, TO, { [COMISIONES]: PREVIEW })
  assert.deepEqual([state[ERROR], state[COMISIONES], state[CALCULANDO]], ['Error al calcular comisiones: permission denied for function calcular_comisiones_pendientes', null, false])
})))

test('the sales of a liquidation are printed as money in the pay modal and in the admin list', () => {
  const PagarLiquidacionModal = require('../src/components/liquidaciones/PagarLiquidacionModal.tsx').default
  const pagar = render(PagarLiquidacionModal, { liquidacion: liquidacion('1', 'pendiente'), isOpen: true, onClose() {}, onSuccess() {} })
  assert.deepEqual(['Total Ventas', 'Comisión Total'].map((label) => after(pagar.tree, label)), ['$412.000', '$211.191'])

  const AdminLiquidacionesPanel = require('../src/components/liquidaciones/AdminLiquidacionesPanel.tsx').default
  // useState order: barberos, liquidaciones, comisionesProximas, estadisticas, loading
  const panel = render(AdminLiquidacionesPanel, {}, { 1: [liquidacion('1', 'pendiente'), liquidacion('2', 'anulada')], 4: false })
  const rows = findAll(panel.tree, (node) => node.type === 'tr' && node.key !== null).map((row) => React.Children.toArray(row.props.children).map(text))
  // columns: number, barber, period, sales, commission, status
  assert.deepEqual(rows.map((cells) => [cells[0], cells[3], cells[4], cells[5]]), [
    ['LIQ-1', '$412.000', '$211.191', 'Pendiente'],
    ['LIQ-2', '$412.000', '$211.191', 'Anulada'],
  ])
})

test('the status filter offers the states a liquidation can have and asks the database for the chosen one', () => quietly(async () => {
  const AdminLiquidacionesPanel = require('../src/components/liquidaciones/AdminLiquidacionesPanel.tsx').default
  // useState order: barberos, liquidaciones, comisionesProximas, estadisticas, loading, error, filtroEstado
  const LIQUIDACIONES = 1, FILTRO_ESTADO = 6
  const { tree, setters } = render(AdminLiquidacionesPanel, {}, { 4: false })
  const [select] = findAll(tree, (node) => node.type === 'select')
  assert.deepEqual(React.Children.toArray(select.props.children).map((option) => [option.props.value, text(option)]), [
    ['', 'Todos los estados'], ['pendiente', 'Pendientes'], ['pagada', 'Pagadas'], ['anulada', 'Anuladas'],
  ])
  select.props.onChange({ target: { value: 'anulada' } })
  assert.deepEqual(setters, [[FILTRO_ESTADO, 'anulada']])

  // With that filter the list is what the database holds in that state.
  reset()
  db = createFakeDb({ tables: { liquidaciones: [liquidacion('1', 'pendiente'), liquidacion('2', 'anulada'), liquidacion('3', 'pagada')] } })
  const filtered = render(AdminLiquidacionesPanel, {}, { 4: false, [FILTRO_ESTADO]: 'anulada' })
  filtered.effects.forEach((fn) => fn())
  await settled()
  const asked = db.calls.selects.filter((select) => select.table === 'liquidaciones').map((select) => select.filters[0][2])
  assert.deepEqual(asked.sort(), ['anulada', 'pagada', 'pendiente'], 'the list, plus the two totals of the header')
  assert.deepEqual(lastState(filtered.setters)[LIQUIDACIONES].map((row) => row.id), ['2'])
  // Choosing a state reads the list again: the load depends on the filter.
  assert.notDeepEqual(filtered.deps, render(AdminLiquidacionesPanel, {}, { 4: false }).deps)
}))
