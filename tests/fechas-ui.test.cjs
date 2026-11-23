// Screens and write paths that showed or stored the wrong Chile day. Components
// render once with stubbed hooks; "now" is pinned with mock timers, so the
// results must match under TZ=UTC and TZ=America/Santiago.
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
stubModule('../src/lib/supabase.ts', { supabase: { from: (table) => db.from(table), auth: { async getUser() { return { data: { user: { id: 'admin' } } } } } } })
stubModule('../src/lib/insforge-react.ts', { useSupabaseClient: () => ({ from: (table) => db.from(table) }) })
stubModule('../src/lib/supabase-helpers.ts', { chamosSupabase: {} })
stubModule('../src/lib/supabase-walkin.ts', { async createWalkInClient() { return {} } })
stubModule('../src/context/ConfigContext.tsx', { useFormatCurrency: () => String })
const toast = Object.assign(() => {}, { success() {}, error() {}, loading() {}, dismiss() {} })
stubModule('react-hot-toast', Object.assign(toast, { toast }))

const CHILE_2130 = '2026-11-24T00:30:00Z' // lunes 23 nov 2026, 21:30 en Chile

/** Renders a function component once. `overrides[i]` replaces the i-th useState value. */
function render(Component, props, overrides = {}) {
  const setters = []
  let index = 0
  const originalState = React.useState, originalEffect = React.useEffect, originalRef = React.useRef
  React.useState = (initial) => {
    const i = index++
    const value = i in overrides ? overrides[i] : typeof initial === 'function' ? initial() : initial
    return [value, (next) => setters.push([i, next])]
  }
  React.useEffect = () => {}
  React.useRef = (current) => ({ current })
  try { return { tree: Component(props), setters } }
  finally { React.useState = originalState; React.useEffect = originalEffect; React.useRef = originalRef }
}

function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null
  if (Array.isArray(tree)) return tree.map((child) => find(child, predicate)).find(Boolean) || null
  if (predicate(tree)) return tree
  return find(React.Children.toArray(tree.props?.children), predicate)
}

function at(iso, fn) {
  mock.timers.enable({ apis: ['Date'], now: Date.parse(iso) })
  return Promise.resolve().then(fn).finally(() => mock.timers.reset())
}

test('POS Pendientes shows the stored day of the cita (23 nov, not 22 nov)', () => {
  const ListaVentas = require('../src/components/pos/ListaVentas.tsx').default
  const cita = { id: 'c1', fecha: '2026-11-23', hora: '18:00:00', cliente_nombre: 'Cliente', barbero: { nombre: 'Gustavo', apellido: '' }, servicio: { nombre: 'Corte', precio: 10000 } }
  const { tree } = render(ListaVentas, { usuario: { id: 'u', rol: 'admin' }, recargar: 0 }, { 1: [cita], 2: false })
  const text = JSON.stringify(tree)
  assert.ok(text.includes('"23 nov"," - ","18:00:00"'), 'row shows 23 nov - 18:00:00')
  assert.ok(!text.includes('22 nov'))
})

test('POS cobro modal shows 23/11/2026 for the same cita', () => {
  const ModalCobrarCita = require('../src/components/pos/ModalCobrarCita.tsx').default
  const cita = { id: 'c1', fecha: '2026-11-23', hora: '18:00:00', cliente_nombre: 'Cliente', barbero: { nombre: 'Gustavo', apellido: '' }, servicio: { nombre: 'Corte', precio: 10000 }, barbero_id: 'b', servicio_id: 's' }
  const { tree } = render(ModalCobrarCita, { cita, usuario: { id: 'u', rol: 'admin' }, onClose() {}, onCobrado() {} })
  assert.ok(JSON.stringify(tree).includes('"23/11/2026"," - ","18:00:00"'))
})

test('block "Hoy completo" at 21:30 Chile blocks today and stores Chile instants', () => at(CHILE_2130, async () => {
  db = createFakeDb()
  const BloqueoModal = require('../src/components/admin/modals/BloqueoModal.tsx').default
  const props = { isOpen: true, bloqueo: null, barberoId: 'b1', onClose() {}, onSuccess() {} }
  const first = render(BloqueoModal, props)
  find(first.tree, (n) => n.props?.onClick?.name === 'setHoyCompleto').props.onClick()
  const formData = first.setters.find(([i]) => i === 1)[1]
  assert.deepEqual([formData.fecha_inicio, formData.fecha_fin], ['2026-11-23', '2026-11-23'])

  const second = render(BloqueoModal, props, { 1: formData })
  await find(second.tree, (n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.deepEqual(db.calls.inserts.map(({ row }) => [row.fecha_hora_inicio, row.fecha_hora_fin]), [['2026-11-23T03:00:00.000Z', '2026-11-24T02:59:00.000Z']])
}))

test('block form 09:00-19:00 Chile is stored as 12:00Z-22:00Z, and editing a late block keeps its day', () => at(CHILE_2130, async () => {
  db = createFakeDb({ tables: { horarios_bloqueados: [{ id: 'blk', barbero_id: 'b1', fecha_hora_inicio: '2026-11-24T01:00:00+00:00', fecha_hora_fin: '2026-11-24T02:00:00+00:00' }] } })
  const BloqueoModal = require('../src/components/admin/modals/BloqueoModal.tsx').default
  const nuevo = render(BloqueoModal, { isOpen: true, bloqueo: null, barberoId: 'b1', onClose() {}, onSuccess() {} })
  await find(nuevo.tree, (n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.deepEqual(db.calls.inserts.map(({ row }) => [row.fecha_hora_inicio, row.fecha_hora_fin]), [['2026-11-23T12:00:00.000Z', '2026-11-23T22:00:00.000Z']])

  const bloqueo = db.tables.horarios_bloqueados[0]
  const editar = render(BloqueoModal, { isOpen: true, bloqueo, barberoId: 'b1', onClose() {}, onSuccess() {} })
  const fields = JSON.stringify(editar.tree)
  assert.ok(fields.includes('"value":"2026-11-23"') && fields.includes('"value":"22:00"'), 'form shows 23 nov 22:00')
  await find(editar.tree, (n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.deepEqual(db.calls.updates.map(({ patch }) => [patch.fecha_hora_inicio, patch.fecha_hora_fin]), [['2026-11-24T01:00:00.000Z', '2026-11-24T02:00:00.000Z']])
}))

test('quick block from an agenda slot sends the Chile instant with its zone', () => at(CHILE_2130, async () => {
  db = createFakeDb()
  const CrearBloqueoModal = require('../src/components/admin/modals/CrearBloqueoModal.tsx').default
  const { tree } = render(CrearBloqueoModal, { isOpen: true, barberoId: 'b1', fecha: '2026-11-23', horaInicio: '13:00', onClose() {}, onSuccess() {} })
  await find(tree, (n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.deepEqual(db.calls.inserts.map(({ row }) => [row.fecha_hora_inicio, row.fecha_hora_fin]), [['2026-11-23T16:00:00.000Z', '2026-11-23T17:00:00.000Z']])
}))

test('manual walk-in booking opened at 21:30 Chile defaults to today, not tomorrow', () => at(CHILE_2130, () => {
  const RegistrarWalkInModal = require('../src/components/walkin/RegistrarWalkInModal.tsx').default
  const { tree } = render(RegistrarWalkInModal, { isOpen: true, onClose() {}, onSuccess() {} })
  const text = JSON.stringify(tree)
  assert.ok(text.includes('"value":"2026-11-23"'), 'fecha de la reserva = hoy en Chile')
  assert.ok(text.includes('"value":"21:30"'), 'hora de la reserva = hora de Chile')
  assert.ok(!text.includes('2026-11-24'))
}))

test('a new expense entered at 21:30 Chile is stored with today', () => at(CHILE_2130, async () => {
  db = createFakeDb()
  const AdminGastosManager = require('../src/components/admin/gastos/AdminGastosManager.tsx').default
  // useState order: gastos, loading, categorias, filterDate, showForm, descripcion, monto, tipo, categoriaId
  const { tree } = render(AdminGastosManager, {}, { 1: false, 4: true, 5: 'Luz', 6: '15000', 8: 'cat-1' })
  await find(tree, (n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.deepEqual(db.calls.inserts.map(({ table, row }) => [table, row.fecha]), [['gastos', '2026-11-23']])
}))
