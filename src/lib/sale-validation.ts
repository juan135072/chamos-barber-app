import { PAYMENT_METHODS } from './pos-values'

export class SaleValidationError extends Error {}
const money = (n: number) => Math.round(n * 100) / 100
const fail = (message: string): never => { throw new SaleValidationError(message) }

export function calculateSale(body: any, barber: any, catalog: Map<string, any>) {
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100) fail('Agrega entre 1 y 100 artículos')
  if (!PAYMENT_METHODS.includes(body.metodo_pago)) fail('Método de pago inválido')
  if (!['boleta', 'factura'].includes(body.tipo_documento)) fail('Tipo de documento inválido')
  if (body.tipo_documento === 'factura' && (typeof body.cliente_rut !== 'string' || !body.cliente_rut.trim())) fail('La factura requiere RUT')
  const items = body.items.map((item: any) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) fail('Artículo inválido')
    const product = item.tipo === 'producto' || !!item.producto_id
    const id = product ? item.producto_id : item.servicio_id
    const entry = catalog.get(`${product ? 'producto' : 'servicio'}:${id}`)
    if (!entry || entry.activo !== true) fail('Artículo no disponible en este comercio')
    const quantity = Number(item.cantidad)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) fail('Cantidad inválida')
    const price = Number(product ? entry.precio_venta : entry.precio)
    if (!Number.isFinite(price) || price < 0) fail('Precio de catálogo inválido')
    return { [product ? 'producto_id' : 'servicio_id']: id, tipo: product ? 'producto' : 'servicio', nombre: entry.nombre, cantidad: quantity, precio: price, subtotal: money(price * quantity) }
  })
  const subtotal = money(items.reduce((sum: number, item: any) => sum + item.subtotal, 0))
  // Staff can explicitly adjust a booked appointment for an agreed discount/tip.
  const total = body.monto_cobrado === undefined ? subtotal : Number(body.monto_cobrado)
  if (body.monto_cobrado !== undefined && !body.cita_id) fail('El ajuste requiere una cita')
  if (!Number.isFinite(total) || total < 0 || total > 100000000) fail('Monto inválido')
  const received = body.metodo_pago === 'efectivo' ? Number(body.monto_recibido ?? total) : total
  if (!Number.isFinite(received) || received < total) fail('Monto recibido insuficiente')
  const commission = Number(barber.porcentaje_comision ?? 50)
  if (!Number.isFinite(commission) || commission < 0 || commission > 100) fail('Comisión inválida')
  const comisionBarbero = Math.round(total * commission / 100)
  return { items, subtotal, descuento: money(subtotal - total), total: money(total), monto_recibido: money(received), cambio: body.metodo_pago === 'efectivo' ? money(received - total) : 0, porcentaje_comision: commission, comision_barbero: comisionBarbero, ingreso_casa: money(total - comisionBarbero) }
}
