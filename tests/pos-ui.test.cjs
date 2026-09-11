require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)
const React = require('react')
const originalState = React.useState, originalEffect = React.useEffect
const posPath = require.resolve('../src/lib/pos-client.ts')
let calls = []
require.cache[posPath] = { id: posPath, filename: posPath, loaded: true, exports: { posRequest: async (...args) => { calls.push(args); return { success: true } } } }
const toastPath = require.resolve('react-hot-toast')
require.cache[toastPath] = { id: toastPath, filename: toastPath, loaded: true, exports: { success() {}, error() {} } }
const Modal = require('../src/components/pos/ModalEditarBarberoVenta.tsx').default
function findButton(tree) {
  if (!tree || typeof tree !== 'object') return null
  if (tree.type === 'button' && tree.props.onClick?.name === 'handleGuardar') return tree
  return React.Children.toArray(tree.props?.children).map(findButton).find(Boolean)
}
for (const [label, service, method] of [['payment-only', 's', 'tarjeta'], ['service-only', 's2', 'efectivo']]) {
  test(`correction dialog submits ${label} change`, async () => {
    calls = []
    const state = ['b', service, method, 'test-pin', false]
    React.useState = () => [state.shift(), () => {}]
    React.useEffect = () => {}
    try {
      const tree = Modal({ venta: { id: 'invoice', barbero_id: 'b', metodo_pago: 'efectivo', items: [{ servicio_id: 's', nombre: 'Combo' }] }, barberos: [], servicios: [], onClose() {}, onSuccess() {} })
      const button = findButton(tree)
      assert.ok(button, 'save button exists')
      await button.props.onClick()
      assert.equal(calls.length, 1)
      assert.equal(calls[0][0], '/api/pos/corregir-venta')
      assert.equal(calls[0][1].nuevoMetodoPago, method)
      assert.equal(calls[0][1].nuevoServicioId, service === 's' ? undefined : service)
    } finally { React.useState = originalState; React.useEffect = originalEffect }
  })
}
test('receipt PDF includes mixed cart, adjustment and change', async () => {
  const { FacturaTermica } = require('../src/components/pos/FacturaTermica.tsx')
  const savedFetch = global.fetch
  global.fetch = async () => { throw new Error('No logo in test') }
  try {
    const receipt = new FacturaTermica()
    await receipt.generarFactura({ id: 'receipt', numero_factura: 'B-10000', cliente_nombre: 'POS TEST', tipo_documento: 'boleta', items: [{ nombre: 'Combo', cantidad: 2, precio: 14000, subtotal: 28000 }, { nombre: 'Cera', cantidad: 1, precio: 5000, subtotal: 5000 }], subtotal: 33000, total: 30000, metodo_pago: 'efectivo', monto_recibido: 40000, cambio: 10000, created_at: '2026-09-11T12:00:00Z' })
    const blob = receipt.obtenerBlob()
    assert.ok(blob.size > 2000)
    const content = Buffer.from(await blob.arrayBuffer()).toString('latin1')
    assert.ok(content.includes('B-10000'))
    assert.ok(content.includes('Descuento:'))
    assert.ok(content.includes('Cambio:'))
  } finally { global.fetch = savedFetch }
})

test('open shift keeps its close button visible after an earlier closure', () => {
  for (const [module, exports] of [
    ['../src/lib/supabase.ts', { supabase: {} }],
    ['../src/lib/supabase-helpers.ts', { chamosSupabase: {} }],
    ['../src/lib/supabase-liquidaciones.ts', { formatCLP: String }],
    ['../src/context/ConfigContext.tsx', { useFormatCurrency: () => String }],
  ]) {
    const path = require.resolve(module)
    require.cache[path] = { id: path, filename: path, loaded: true, exports }
  }
  const Summary = require('../src/components/pos/ResumenDia.tsx').default
  let index = 0
  React.useState = initial => [index++ === 1 ? false : initial, () => {}]
  React.useEffect = () => {}
  try {
    const tree = Summary({ usuario: { id: 'owner', rol: 'admin' }, recargar: 0, sesionCaja: { id: 'shift', estado: 'abierta' } })
    const text = JSON.stringify(tree)
    assert.ok(text.includes('Cerrar Caja del Turno'))
  } finally { React.useState = originalState; React.useEffect = originalEffect }
})
