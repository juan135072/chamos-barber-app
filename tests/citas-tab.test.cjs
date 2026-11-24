// Admin appointments tab: cleaning up the cancelled appointments. The database
// function eliminar_citas_canceladas answers { success: true, count, message } when
// it deletes and { success: false, error } when it refuses or fails.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const { createFakeDb, stubModule } = require('./fake-db.cjs')
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)
const React = require('react')

let db = createFakeDb()
stubModule('../src/lib/insforge-react.ts', { useSupabaseClient: () => db })
const toast = Object.assign(() => {}, { success() {}, error() {} })
stubModule('react-hot-toast', Object.assign(toast, { toast }))
// The reschedule modal has its own tests (tests/reagendar-ui.test.cjs); it never opens here.
stubModule('../src/components/admin/modals/ReagendarCitaModal.tsx', { __esModule: true, default: () => null })
const CitasTab = require('../src/components/admin/tabs/CitasTab.tsx').default

// useState order of the tab: citas, loading, filtroEstado, filtroFecha, searchTerm, showConfirm, errorBorrado, citaReagendar
const LOADING = 1, SHOW_CONFIRM = 5, ERROR_BORRADO = 6
const REFUSAL = 'Solo un administrador puede eliminar citas canceladas'

/** Renders the tab once. `overrides[i]` replaces the i-th useState value; effects do not run. */
function render(overrides = {}) {
  const setters = []
  let index = 0
  const originalState = React.useState, originalEffect = React.useEffect
  React.useState = (initial) => { const i = index++; return [i in overrides ? overrides[i] : initial, (next) => setters.push([i, next])] }
  React.useEffect = () => {}
  try { return { tree: CitasTab(), setters } }
  finally { React.useState = originalState; React.useEffect = originalEffect }
}
const text = (node) => (typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : '')
function find(node, predicate) {
  if (Array.isArray(node)) { for (const child of node) { const hit = find(child, predicate); if (hit) return hit } return null }
  if (!node || typeof node !== 'object') return null
  return predicate(node) ? node : find(node.props?.children, predicate)
}
const cleanupButton = (tree) => find(tree, (node) => node.type === 'button' && /Eliminar Canceladas|ESTÁS SEGURO/.test(text(node)))

/** Clicks the cleanup button with the database answering `answer`; returns the last value given to each state. */
async function cleanup(answer, { confirming = true } = {}) {
  db = createFakeDb({ rpc: () => answer })
  const tab = render({ [LOADING]: false, [SHOW_CONFIRM]: confirming })
  const realLog = console.log, realError = console.error
  console.log = () => {}
  console.error = () => {}
  try { await cleanupButton(tab.tree).props.onClick({ preventDefault() {}, stopPropagation() {} }) }
  finally { console.log = realLog; console.error = realError }
  return { setters: tab.setters, state: Object.fromEntries(tab.setters) }
}

test('a refused cleanup shows the reason the database gives', async () => {
  const { state } = await cleanup({ data: { success: false, error: REFUSAL }, error: null })
  assert.deepEqual(db.calls.rpc.map((call) => call.name), ['eliminar_citas_canceladas'])
  assert.deepEqual([state[ERROR_BORRADO], state[LOADING]], [REFUSAL, false])
  assert.deepEqual(db.calls.selects, [], 'nothing was deleted, so the list is not read again')
  assert.ok(!(SHOW_CONFIRM in state), 'the confirmation stays as it was')

  const shown = render({ [LOADING]: false, [ERROR_BORRADO]: REFUSAL })
  assert.ok(text(shown.tree).includes(REFUSAL), 'the reason is on screen')
})

test('a cleanup that fails without a reason shows the generic message', async () => {
  for (const data of [{ success: false }, { success: false, error: '' }, null]) {
    const { state } = await cleanup({ data, error: null })
    assert.equal(state[ERROR_BORRADO], 'Error desconocido del servidor', JSON.stringify(data))
  }
})

test('a cleanup the server cannot run shows the error it returns', async () => {
  const { state } = await cleanup({ data: null, error: { code: '42501', message: 'permission denied for function eliminar_citas_canceladas' } })
  assert.deepEqual([state[ERROR_BORRADO], state[LOADING]], ['permission denied for function eliminar_citas_canceladas', false])
  assert.equal((await cleanup({ data: null, error: {} })).state[ERROR_BORRADO], 'Error de conexión', 'an error without a message')
})

test('a cleanup that worked reads the list again and leaves the confirmation', async () => {
  const { state } = await cleanup({ data: { success: true, count: 2, message: 'Se eliminaron 2 citas canceladas.' }, error: null })
  assert.deepEqual(db.calls.selects, [{ table: 'citas', filters: [] }])
  assert.deepEqual([state[ERROR_BORRADO], state[SHOW_CONFIRM], state[LOADING]], [null, false, false])
})

test('the first click only asks for confirmation', async () => {
  const { setters } = await cleanup({ data: { success: true }, error: null }, { confirming: false })
  assert.deepEqual([setters, db.calls.rpc], [[[SHOW_CONFIRM, true]], []])
})
