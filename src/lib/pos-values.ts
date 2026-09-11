export const PAYMENT_METHODS = ['efectivo', 'tarjeta', 'transferencia', 'zelle', 'binance', 'pago_movil', 'otro']

export function appointmentCharge(cita: any) {
  const items = Array.isArray(cita.items) && cita.items.length
    ? cita.items
    : [{ servicio_id: cita.servicio_id || cita.servicio?.id, cantidad: 1, precio: Number(cita.servicio?.precio ?? 0), nombre: cita.servicio?.nombre }]
  const subtotal = items.reduce((sum: number, item: any) => sum + Number(item.precio ?? 0) * Number(item.cantidad ?? 1), 0)
  const agreed = cita.precio_final == null ? subtotal : Number(cita.precio_final)
  return { items, total: Number.isFinite(agreed) ? agreed : subtotal }
}
