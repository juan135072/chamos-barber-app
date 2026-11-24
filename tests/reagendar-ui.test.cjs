// Reschedule from the admin panel: the modal and its two entry points (the
// appointments tab and the appointment detail). Components render once with
// stubbed hooks. The server is a stubbed fetch behind the real posRequest, and
// every browser access to the database is recorded. "Now" is pinned where the
// Chile day matters, so results match under TZ=UTC and TZ=America/Santiago.
require('./load-typescript.cjs')
const test = require('node:test')
const { mock } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const { stubModule } = require('./fake-db.cjs')
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)
const React = require('react')

// A session already in memory, so posRequest sends its bearer without asking the server for one.
const accessToken = 'header.' + Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64url') + '.signature'
// [table, operation] of every database call made from the browser.
const browser = { calls: [] }
const browserClient = {
  from(table) {
    const query = {
      select() { browser.calls.push([table, 'select']); return query },
      insert() { browser.calls.push([table, 'insert']); return query },
      update() { browser.calls.push([table, 'update']); return query },
      delete() { browser.calls.push([table, 'delete']); return query },
      eq() { return query },
      order() { return query },
      then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve) },
    }
    return query
  },
  async rpc(name) { browser.calls.push([name, 'rpc']); return { data: null, error: null } },
  _insforge: { tokenManager: { getSession: () => ({ accessToken, user: { id: 'admin-user' } }) } },
}
stubModule('../src/lib/supabase.ts', { supabase: browserClient })
stubModule('../src/lib/insforge-react.ts', { useSupabaseClient: () => browserClient })
stubModule('../src/lib/supabase-helpers.ts', { chamosSupabase: {} })
stubModule('../src/context/ConfigContext.tsx', { useFormatCurrency: () => String })
const toasts = []
const toast = Object.assign((m) => toasts.push(['toast', m]), { success: (m) => toasts.push(['success', m]), error: (m) => toasts.push(['error', m]), loading() {}, dismiss() {} })
stubModule('react-hot-toast', Object.assign(toast, { toast, default: toast }))
const barberos = [{ id: 'carlos', nombre: 'Carlos', apellido: 'Pérez' }, { id: 'luis', nombre: 'Luis', apellido: 'Rojas' }]
let barberosHook = { barberos, loading: false, error: null, refetch: async () => {} }
const barberosOptions = []
stubModule('../src/hooks/useBarberos.ts', { useBarberos: (options) => { barberosOptions.push(options); return barberosHook } })

// The server, as the browser reaches it.
let requests = []
let respond = () => ({ status: 200, body: { success: true } })
global.fetch = async (url, options = {}) => {
  const request = { url, method: options.method, authorization: options.headers?.Authorization, body: options.body ? JSON.parse(options.body) : undefined }
  requests.push(request)
  const { status, body } = respond(request)
  return { ok: status < 400, status, json: async () => body }
}

const ReagendarCitaModal = require('../src/components/admin/modals/ReagendarCitaModal.tsx').default
const CitasTab = require('../src/components/admin/tabs/CitasTab.tsx').default
const CitaDetailModal = require('../src/components/admin/modals/CitaDetailModal.tsx').default

const CHILE_2130 = '2026-11-24T00:30:00Z' // Monday 23 Nov 2026, 21:30 in Chile
const ENDPOINT = '/api/admin/citas/reagendar'
// ReagendarCitaModal useState order.
const BARBERO = 0, FECHA = 1, HORA = 2, SLOTS = 3, LOADING = 4, ERROR = 5, SAVING = 6, RECARGA = 7
const cita = { id: 'cita-1', cliente_nombre: 'Ana', cliente_telefono: '+56911112222', fecha: '2026-11-25', hora: '10:00:00', estado: 'confirmada', barbero_id: 'carlos', barberos: { nombre: 'Carlos', apellido: 'Pérez' }, items: [] }
const slots = [
  { hora: '10:00', disponible: false, motivo: 'Horario actual' },
  { hora: '10:30', disponible: false, motivo: 'Ocupado' },
  { hora: '16:00', disponible: true, motivo: 'Disponible' },
  { hora: '16:30', disponible: true, motivo: 'Disponible' },
]

/**
 * Renders a function component once. `overrides[i]` replaces the i-th useState
 * value. Effects do not run: they are returned so a test can run them.
 */
function render(Component, props, overrides = {}) {
  const setters = []
  const effects = []
  let index = 0
  const originalState = React.useState, originalEffect = React.useEffect, originalRef = React.useRef
  React.useState = (initial) => {
    const i = index++
    const value = i in overrides ? overrides[i] : typeof initial === 'function' ? initial() : initial
    return [value, (next) => setters.push([i, typeof next === 'function' ? next(value) : next])]
  }
  React.useEffect = (fn) => { effects.push(fn) }
  React.useRef = (current) => ({ current })
  try { return { tree: Component(props), setters, effects } }
  finally { React.useState = originalState; React.useEffect = originalEffect; React.useRef = originalRef }
}

function findAll(tree, predicate, found = []) {
  if (!tree || typeof tree !== 'object') return found
  if (Array.isArray(tree)) { tree.forEach((child) => findAll(child, predicate, found)); return found }
  if (predicate(tree)) found.push(tree)
  return findAll(React.Children.toArray(tree.props?.children), predicate, found)
}
const find = (tree, predicate) => findAll(tree, predicate)[0] || null
function text(node) {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node !== 'object') return String(node)
  if (Array.isArray(node)) return node.map(text).join('')
  return text(node.props?.children)
}
const valuesOf = (setters, index) => setters.filter(([i]) => i === index).map(([, value]) => value)
// React.Children.toArray, used by find(), prefixes an explicit key with '.$'.
const keyOf = (element) => String(element.key).replace(/^\.\$/, '')
const settle = () => new Promise((resolve) => setTimeout(resolve, 5))
const submit = (tree) => find(tree, (n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
const submitButton = (tree) => find(tree, (n) => n.type === 'button' && n.props.type === 'submit')
const slotButtons = (tree) => findAll(tree, (n) => n.type === 'button' && /^\d\d:\d\d/.test(text(n)))
const dateInput = (tree) => find(tree, (n) => n.type === 'input' && n.props.type === 'date')
const barberSelect = (tree) => find(tree, (n) => n.type === 'select')

function at(iso, fn) {
  mock.timers.enable({ apis: ['Date'], now: Date.parse(iso) })
  return Promise.resolve().then(fn).finally(() => mock.timers.reset())
}

let closed
function modalProps(overrides = {}) {
  return { isOpen: true, cita, onClose: () => closed.push('close'), onSuccess: () => closed.push('success'), ...overrides }
}

test.beforeEach(() => {
  browser.calls = []
  requests = []
  toasts.length = 0
  closed = []
  barberosOptions.length = 0
  barberosHook = { barberos, loading: false, error: null, refetch: async () => {} }
  respond = () => ({ status: 200, body: { success: true } })
})

test('the date starts on the day of the appointment or today in Chile, inside the booking window (21:30 in Chile)', () => at(CHILE_2130, () => {
  const cases = [
    ['2026-11-20', '2026-11-23'], // already passed: today
    ['2026-11-23', '2026-11-23'], // today in Chile, although UTC is already the 24th
    ['2026-11-27', '2026-11-27'],
    ['2026-12-23', '2026-12-23'], // last day of the window
    ['2026-12-24', '2026-11-23'], // beyond the window: today
  ]
  for (const [fecha, value] of cases) {
    const input = dateInput(render(ReagendarCitaModal, modalProps({ cita: { ...cita, fecha } })).tree).props
    assert.deepEqual([input.min, input.max, input.value], ['2026-11-23', '2026-12-23', value], fecha)
  }
}))

test('the modal offers only active barbers and starts on the barber of the appointment', () => {
  const { tree } = render(ReagendarCitaModal, modalProps())
  assert.deepEqual(barberosOptions, [{ soloActivos: true }])
  const select = barberSelect(tree)
  assert.equal(select.props.value, 'carlos')
  assert.deepEqual(findAll(select, (n) => n.type === 'option').map((o) => [o.props.value, text(o)]), [['', 'Selecciona un barbero'], ['carlos', 'Carlos Pérez'], ['luis', 'Luis Rojas']])
  assert.ok(text(tree).includes('Ana'))
  assert.equal(render(ReagendarCitaModal, modalProps({ isOpen: false })).tree, null)
  assert.equal(render(ReagendarCitaModal, modalProps({ cita: null })).tree, null)
})

test('opening loads the slots of that barber and day from the server, never from the browser database', async () => {
  respond = () => ({ status: 200, body: { success: true, slots } })
  const { setters, effects } = render(ReagendarCitaModal, modalProps())
  assert.deepEqual(requests, [], 'nothing is asked before the effect runs')
  effects.forEach((effect) => effect())
  await settle()
  assert.deepEqual(requests, [{ url: `${ENDPOINT}?cita_id=cita-1&fecha=2026-11-25&barbero_id=carlos`, method: 'GET', authorization: `Bearer ${accessToken}`, body: undefined }])
  assert.deepEqual(valuesOf(setters, SLOTS), [slots])
  assert.deepEqual(valuesOf(setters, HORA), [''], 'a new list clears the chosen time')
  assert.deepEqual(valuesOf(setters, LOADING), [true, false])
  assert.deepEqual(valuesOf(setters, ERROR), [null])
  assert.deepEqual(browser.calls, [])

  // Another barber and day ask for their own list.
  requests = []
  render(ReagendarCitaModal, modalProps(), { [BARBERO]: 'luis', [FECHA]: '2026-11-28' }).effects.forEach((effect) => effect())
  await settle()
  assert.deepEqual(requests.map((r) => r.url), [`${ENDPOINT}?cita_id=cita-1&fecha=2026-11-28&barbero_id=luis`])
})

test('a slot list the server refuses shows its message and offers no slot', async () => {
  const message = 'La fecha debe estar entre 2026-11-23 y 2026-12-23'
  respond = () => ({ status: 400, body: { error: message, message, code: 'DATOS_INVALIDOS' } })
  const { setters, effects } = render(ReagendarCitaModal, modalProps(), { [SLOTS]: slots })
  effects.forEach((effect) => effect())
  await settle()
  assert.deepEqual(valuesOf(setters, ERROR), [null, message])
  assert.deepEqual(valuesOf(setters, SLOTS), [[]])
  assert.deepEqual(valuesOf(setters, LOADING), [true, false])

  const shown = render(ReagendarCitaModal, modalProps(), { [ERROR]: message })
  assert.ok(text(shown.tree).includes(message))
  assert.deepEqual(slotButtons(shown.tree), [])
  assert.equal(submitButton(shown.tree).props.disabled, true)
})

test('free slots can be chosen; refused ones are disabled and say why', () => {
  const { tree, setters } = render(ReagendarCitaModal, modalProps(), { [SLOTS]: slots })
  const buttons = slotButtons(tree)
  assert.deepEqual(buttons.map((b) => [text(b).slice(0, 5), b.props.disabled, b.props.title]), [
    ['10:00', true, 'Horario actual'],
    ['10:30', true, 'Ocupado'],
    ['16:00', false, undefined],
    ['16:30', false, undefined],
  ])
  assert.equal(submitButton(tree).props.disabled, true, 'nothing to send until a time is chosen')
  buttons[2].props.onClick()
  assert.deepEqual(valuesOf(setters, HORA), ['16:00'])

  const chosen = render(ReagendarCitaModal, modalProps(), { [SLOTS]: slots, [HORA]: '16:00' })
  assert.deepEqual(slotButtons(chosen.tree).map((b) => b.props['aria-pressed']), [false, false, true, false])
  assert.equal(submitButton(chosen.tree).props.disabled, false)

  const empty = render(ReagendarCitaModal, modalProps(), { [SLOTS]: [] })
  assert.ok(text(empty.tree).includes('No hay horarios para ese día'))
})

test('submitting sends the move to the server and writes nothing to citas from the browser', async () => {
  respond = () => ({ status: 200, body: { success: true, cita: { id: 'cita-1', fecha: '2026-11-26', hora: '16:00', barbero_id: 'luis', estado: 'confirmada' } } })
  const { tree, setters } = render(ReagendarCitaModal, modalProps(), { [BARBERO]: 'luis', [FECHA]: '2026-11-26', [HORA]: '16:00', [SLOTS]: slots })
  await submit(tree)
  assert.deepEqual(requests, [{ url: ENDPOINT, method: 'POST', authorization: `Bearer ${accessToken}`, body: { cita_id: 'cita-1', fecha: '2026-11-26', hora: '16:00', barbero_id: 'luis' } }])
  assert.deepEqual(browser.calls, [])
  assert.deepEqual(closed, ['success', 'close'])
  assert.deepEqual(toasts, [['success', 'Cita reagendada']])
  assert.deepEqual(valuesOf(setters, SAVING), [true, false])
})

test('a refused move shows the server message, keeps the modal open and reloads the slots', async () => {
  const message = 'Ese horario se acaba de ocupar. Elige otro.'
  respond = () => ({ status: 409, body: { error: message, message, code: 'RACE_CONDITION' } })
  const { tree, setters } = render(ReagendarCitaModal, modalProps(), { [HORA]: '16:00', [SLOTS]: slots, [RECARGA]: 3 })
  await submit(tree)
  assert.equal(requests.length, 1)
  assert.deepEqual(toasts, [['error', message]])
  assert.deepEqual(closed, [], 'neither onSuccess nor onClose')
  assert.deepEqual(valuesOf(setters, RECARGA), [4])
  assert.deepEqual(valuesOf(setters, SAVING), [true, false])
  assert.deepEqual(browser.calls, [])

  // The reload asks the server again.
  requests = []
  render(ReagendarCitaModal, modalProps(), { [RECARGA]: 4 }).effects.forEach((effect) => effect())
  await settle()
  assert.equal(requests.length, 1)
})

test('an appointment without a barber makes staff choose one before anything is asked or sent', async () => {
  const sinBarbero = { ...cita, barbero_id: null, barberos: null }
  const { tree, setters, effects } = render(ReagendarCitaModal, modalProps({ cita: sinBarbero }), { [HORA]: '16:00', [SLOTS]: slots })
  assert.equal(barberSelect(tree).props.value, '')
  assert.ok(text(tree).includes('Esta cita no tiene barbero asignado. Elige uno para ver los horarios.'))
  assert.deepEqual(slotButtons(tree), [], 'no slots without a barber')
  assert.equal(submitButton(tree).props.disabled, true)
  effects.forEach((effect) => effect())
  await submit(tree)
  await settle()
  assert.deepEqual(requests, [])
  assert.deepEqual(closed, [])

  barberSelect(tree).props.onChange({ target: { value: 'luis' } })
  assert.deepEqual(valuesOf(setters, BARBERO), ['luis'])
  const chosen = render(ReagendarCitaModal, modalProps({ cita: sinBarbero }), { [BARBERO]: 'luis', [HORA]: '16:00', [SLOTS]: slots })
  chosen.effects.forEach((effect) => effect())
  await submit(chosen.tree)
  await settle()
  assert.deepEqual(requests.map((r) => [r.method, r.url, r.body?.barbero_id]), [
    ['GET', `${ENDPOINT}?cita_id=cita-1&fecha=2026-11-25&barbero_id=luis`, undefined],
    ['POST', ENDPOINT, 'luis'],
  ])
})

test('a barber who is no longer active is not kept: staff must choose another', async () => {
  const { tree, effects } = render(ReagendarCitaModal, modalProps({ cita: { ...cita, barbero_id: 'retirado' } }), { [HORA]: '16:00' })
  assert.equal(barberSelect(tree).props.value, '')
  assert.ok(text(tree).includes('El barbero de esta cita ya no está activo. Elige otro para ver los horarios.'))
  assert.equal(submitButton(tree).props.disabled, true)
  effects.forEach((effect) => effect())
  await submit(tree)
  await settle()
  assert.deepEqual(requests, [])

  // While the barbers load, nobody is told to choose yet.
  barberosHook = { barberos: [], loading: true, error: null, refetch: async () => {} }
  const loading = text(render(ReagendarCitaModal, modalProps()).tree)
  assert.ok(!loading.includes('ya no está activo') && !loading.includes('no tiene barbero asignado'))
  assert.ok(loading.includes('Cargando barberos'))
})

test('nothing is sent twice and the modal cannot be closed while a move is being saved', async () => {
  const { tree } = render(ReagendarCitaModal, modalProps(), { [HORA]: '16:00', [SLOTS]: slots, [SAVING]: true })
  assert.equal(submitButton(tree).props.disabled, true)
  assert.ok(text(submitButton(tree)).includes('Guardando'))
  assert.ok(slotButtons(tree).every((b) => b.props.disabled))
  await submit(tree)
  assert.deepEqual(requests, [])
  for (const close of findAll(tree, (n) => n.type === 'button' && n.props.type === 'button' && /Cancelar|Cerrar/.test(text(n) + (n.props['aria-label'] || '')))) close.props.onClick()
  tree.props.onClick({ target: tree, currentTarget: tree })
  assert.deepEqual(closed, [])

  const idle = render(ReagendarCitaModal, modalProps(), { [HORA]: '16:00', [SLOTS]: slots })
  idle.tree.props.onClick({ target: idle.tree, currentTarget: idle.tree })
  assert.deepEqual(closed, ['close'])
})

test('the appointments tab offers Reagendar only on pendiente and confirmada rows', async () => {
  const rows = ['pendiente', 'confirmada', 'completada', 'cancelada'].map((estado, i) => ({ ...cita, id: `cita-${i}`, estado, cliente_nombre: `Cliente ${i}` }))
  // CitasTab useState order: citas, loading, filtroEstado, filtroFecha, searchTerm, showConfirm, errorBorrado, citaReagendar
  const CITA_REAGENDAR = 7
  const { tree, setters } = render(CitasTab, {}, { 0: rows, 1: false })
  const buttons = findAll(tree, (n) => n.type === 'button' && n.props.title === 'Reagendar cita')
  assert.equal(buttons.length, 2)
  assert.equal(find(tree, (n) => n.type === ReagendarCitaModal), null, 'closed until a row is chosen')
  buttons.forEach((button) => button.props.onClick())
  assert.deepEqual(valuesOf(setters, CITA_REAGENDAR).map((c) => [c.id, c.estado]), [['cita-0', 'pendiente'], ['cita-1', 'confirmada']])

  const open = render(CitasTab, {}, { 0: rows, 1: false, [CITA_REAGENDAR]: rows[1] })
  const modal = find(open.tree, (n) => n.type === ReagendarCitaModal)
  assert.deepEqual([modal.props.isOpen, modal.props.cita, keyOf(modal)], [true, rows[1], 'cita-1'])
  modal.props.onClose()
  assert.deepEqual(valuesOf(open.setters, CITA_REAGENDAR), [null])
  // After a move the list is read again; the tab itself never writes the move.
  await modal.props.onSuccess()
  assert.deepEqual(browser.calls, [['citas', 'select']])
})

test('the appointment detail offers Reagendar for an active appointment and refreshes its owner after a move', () => {
  // CitaDetailModal useState order: items, servicios, isSaving, loadingServicios, reagendando
  const REAGENDANDO = 4
  const events = []
  const detailProps = (estado) => ({ isOpen: true, cita: { ...cita, estado }, onClose: () => events.push('close'), onUpdate: () => events.push('update') })
  const isReagendar = (n) => n.type === 'button' && text(n).trim() === 'Reagendar'
  for (const estado of ['completada', 'cancelada']) assert.equal(find(render(CitaDetailModal, detailProps(estado)).tree, isReagendar), null, estado)

  for (const estado of ['pendiente', 'confirmada']) {
    const { tree, setters } = render(CitaDetailModal, detailProps(estado))
    assert.equal(find(tree, (n) => n.type === ReagendarCitaModal), null, 'closed until asked')
    find(tree, isReagendar).props.onClick()
    assert.deepEqual(valuesOf(setters, REAGENDANDO), [true], estado)
  }

  const open = render(CitaDetailModal, detailProps('confirmada'), { [REAGENDANDO]: true })
  const modal = find(open.tree, (n) => n.type === ReagendarCitaModal)
  assert.deepEqual([modal.props.isOpen, modal.props.cita.id, keyOf(modal)], [true, 'cita-1', 'cita-1'])
  modal.props.onClose()
  assert.deepEqual(valuesOf(open.setters, REAGENDANDO), [false])
  modal.props.onSuccess()
  assert.deepEqual(events, ['update', 'close'])
  assert.deepEqual(browser.calls, [])
})
