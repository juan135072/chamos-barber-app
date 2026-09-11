require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { appointmentCharge, PAYMENT_METHODS } = require('../src/lib/pos-values.ts')
const { calculateSale } = require('../src/lib/sale-validation.ts')
const { chileDateRange } = require('../src/lib/date-utils.ts')
const catalog = new Map([['servicio:s', { nombre: 'Combo', precio: 14000, activo: true }], ['producto:p', { nombre: 'Cera', precio_venta: 5000, activo: true }]])
const body = { items: [{ servicio_id: 's', cantidad: 1 }], tipo_documento: 'boleta' }
for (const method of PAYMENT_METHODS) test(`POS accepts displayed payment method ${method}`, () => {
  const sale = calculateSale({ ...body, metodo_pago: method, monto_recibido: 20000 }, { porcentaje_comision: 60 }, catalog)
  assert.equal(sale.total, 14000)
  assert.equal(sale.comision_barbero, 8400)
  assert.equal(sale.cambio, method === 'efectivo' ? 6000 : 0)
})
test('booked charge retains all services and quantities', () => {
  const items = [{ servicio_id: 's', cantidad: 2, precio: 14000 }, { servicio_id: 's2', cantidad: 1, precio: 5000 }]
  assert.deepEqual(appointmentCharge({ items, servicio: { precio: 14000 } }), { items, total: 33000 })
  assert.equal(appointmentCharge({ items, precio_final: 30000 }).total, 30000)
})
test('legacy single-service appointment has a complete fallback item', () => {
  const charge = appointmentCharge({ servicio_id: 's', servicio: { nombre: 'Combo', precio: 14000 } })
  assert.equal(charge.total, 14000)
  assert.equal(charge.items[0].cantidad, 1)
})
test('mixed cart uses catalog prices and all quantities', () => {
  const sale = calculateSale({ ...body, metodo_pago: 'tarjeta', items: [{ servicio_id: 's', cantidad: 2 }, { producto_id: 'p', cantidad: 3, precio: 1 }] }, { porcentaje_comision: 0 }, catalog)
  assert.equal(sale.total, 43000)
  assert.equal(sale.ingreso_casa, 43000)
})
for (const [day, start, end] of [
  ['2026-09-11', '2026-09-11T03:00:00.000Z', '2026-09-12T03:00:00.000Z'],
  ['2026-07-15', '2026-07-15T04:00:00.000Z', '2026-07-16T04:00:00.000Z'],
  ['2026-09-06', '2026-09-06T04:00:00.000Z', '2026-09-07T03:00:00.000Z'],
  ['2026-04-04', '2026-04-04T03:00:00.000Z', '2026-04-05T04:00:00.000Z'],
]) test(`Chile sales day ${day} includes the whole day across DST`, () => assert.deepEqual(chileDateRange(day, day), { start, end }))
