/**
 * Service catalog rules shared by every booking channel (website and bot API).
 *
 * Duration follows the booking calendar and the database function
 * app_appointment_duration(): every occurrence of a service adds its duration
 * and the largest cleaning buffer is added once at the end.
 */

export const DEFAULT_SERVICE_MINUTES = 30
export const DEFAULT_BUFFER_MINUTES = 5

export interface BookableService {
  id: string
  nombre: string
  activo: boolean
  duracion_minutos: number | null
  tiempo_buffer: number | null
  precio: number | null
}

export interface BookingItem {
  servicio_id: string
  nombre: string
  precio: number
  cantidad: number
  duracion_minutos: number
  tiempo_buffer: number
  subtotal: number
}

export type ServicesLookup =
  | { ok: true; services: Map<string, BookableService> }
  | { ok: false; message: string }

/** Loads the requested services of one tenant; every one must exist and be active. */
export async function loadBookableServices(db: any, comercioId: string, serviceIds: string[]): Promise<ServicesLookup> {
  const uniqueIds = Array.from(new Set(serviceIds))
  const { data, error } = await db
    .from('servicios')
    .select('id, nombre, activo, duracion_minutos, tiempo_buffer, precio')
    .in('id', uniqueIds)
    .eq('comercio_id', comercioId)

  if (error || !data || data.length !== uniqueIds.length) {
    return { ok: false, message: 'Uno o más servicios seleccionados no están disponibles' }
  }
  const services = data as BookableService[]
  const inactive = services.filter(s => !s.activo)
  if (inactive.length > 0) {
    return { ok: false, message: `Servicio(s) no disponible(s): ${inactive.map(s => s.nombre).join(', ')}` }
  }
  return { ok: true, services: new Map(services.map(s => [s.id, s])) }
}

/** Minutes the barber is blocked: every requested service (repetitions included) plus the largest buffer. */
export function bookingDuration(serviceIds: string[], services: Map<string, BookableService>): number {
  const serviceMinutes = serviceIds.reduce((sum, id) => sum + (services.get(id)?.duracion_minutos ?? DEFAULT_SERVICE_MINUTES), 0)
  const buffer = Array.from(services.values()).reduce((max, s) => Math.max(max, s.tiempo_buffer ?? DEFAULT_BUFFER_MINUTES), 0)
  return serviceMinutes + buffer
}

/** Line items priced from the catalog; prices sent by a client are never trusted. */
export function buildBookingItems(serviceIds: string[], services: Map<string, BookableService>): BookingItem[] {
  const counts = serviceIds.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(counts).map(([id, cantidad]) => {
    const service = services.get(id)
    const precio = service?.precio || 0
    return {
      servicio_id: id,
      nombre: service?.nombre || 'Servicio',
      precio,
      cantidad,
      duracion_minutos: service?.duracion_minutos ?? DEFAULT_SERVICE_MINUTES,
      tiempo_buffer: service?.tiempo_buffer ?? DEFAULT_BUFFER_MINUTES,
      subtotal: precio * cantidad,
    }
  })
}

/** Readable summary appended to the notes of multi-service bookings (older screens parse it). */
export function requestedServicesNote(items: BookingItem[]): string {
  return `\n\n[SERVICIOS SOLICITADOS: ${items.map(i => `${i.nombre} (${i.cantidad})`).join(', ')}]`
}
