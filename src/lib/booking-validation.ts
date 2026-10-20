const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)

// Field validators return the Spanish message shown to the customer, or null.
// The website booking route and the bot API share them so both accept the
// same input.
export function validateServiceIds(ids: unknown): string | null {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 20 || ids.some(id => !isUuid(id))) return 'Selecciona entre 1 y 20 servicios válidos'
  return null
}

export function validateFecha(fecha: unknown): string | null {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha) return 'Fecha inválida'
  return null
}

export function validateHora(hora: unknown): string | null {
  if (typeof hora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return 'Hora inválida'
  return null
}

export function validateClienteNombre(nombre: unknown): string | null {
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 150) return 'Nombre inválido'
  return null
}

export function validateTelefono(telefono: unknown): string | null {
  if (typeof telefono !== 'string' || !/^\+?[\d ()-]{8,25}$/.test(telefono) || telefono.replace(/\D/g, '').length < 8) return 'Teléfono inválido'
  return null
}

export function validateNotas(notas: unknown): string | null {
  if (notas != null && (typeof notas !== 'string' || notas.length > 2000)) return 'Notas inválidas'
  return null
}

export function validateEmail(email: unknown): string | null {
  if (email && (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return 'Email inválido'
  return null
}

export function validateBookingInput(body: any): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Datos de reserva inválidos'
  return validateServiceIds(body.servicios_ids ?? (body.servicio_id ? [body.servicio_id] : []))
    ?? (isUuid(body.barbero_id) ? null : 'Barbero inválido')
    ?? validateFecha(body.fecha)
    ?? validateHora(body.hora)
    ?? validateClienteNombre(body.cliente_nombre)
    ?? validateTelefono(body.cliente_telefono)
    ?? validateNotas(body.notas)
    ?? validateEmail(body.cliente_email)
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
