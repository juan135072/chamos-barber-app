const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateBookingInput(body: any): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Datos de reserva inválidos'
  const ids = body.servicios_ids ?? (body.servicio_id ? [body.servicio_id] : [])
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 20 || ids.some(id => typeof id !== 'string' || !UUID.test(id))) return 'Selecciona entre 1 y 20 servicios válidos'
  if (typeof body.barbero_id !== 'string' || !UUID.test(body.barbero_id)) return 'Barbero inválido'
  if (typeof body.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.fecha) ||
    !Number.isFinite(Date.parse(body.fecha)) || new Date(body.fecha).toISOString().slice(0, 10) !== body.fecha) return 'Fecha inválida'
  if (typeof body.hora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.hora)) return 'Hora inválida'
  if (typeof body.cliente_nombre !== 'string' || !body.cliente_nombre.trim() || body.cliente_nombre.length > 150) return 'Nombre inválido'
  if (typeof body.cliente_telefono !== 'string' || !/^\+?[\d ()-]{8,25}$/.test(body.cliente_telefono) || body.cliente_telefono.replace(/\D/g, '').length < 8) return 'Teléfono inválido'
  if (body.notas != null && (typeof body.notas !== 'string' || body.notas.length > 2000)) return 'Notas inválidas'
  if (body.cliente_email && (typeof body.cliente_email !== 'string' || body.cliente_email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.cliente_email))) return 'Email inválido'
  return null
}

export function appointmentDuration(cita: any, services: Map<string, any>): number {
  const items = Array.isArray(cita.items) ? cita.items.filter((i: any) => i?.servicio_id && Number(i.cantidad) > 0) : []
  if (!items.length) {
    const service = services.get(cita.servicio_id)
    return Number(service?.duracion_minutos ?? 30) + Number(service?.tiempo_buffer ?? 5)
  }
  return items.reduce((total: number, item: any) => total + Number(item.duracion_minutos ?? services.get(item.servicio_id)?.duracion_minutos ?? 30) * Number(item.cantidad), 0)
    + Math.max(...items.map((item: any) => Number(item.tiempo_buffer ?? services.get(item.servicio_id)?.tiempo_buffer ?? 5)))
}

export function localWallTimestamp(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]))
  return Date.parse(`${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}Z`)
}
