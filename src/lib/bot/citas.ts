import { appointmentCharge } from '@/lib/pos-values'
import { localWallTimestamp } from '@/lib/booking-validation'
import { changeDeadline, formatWallClock, isActiveEstado, isWithinChangeWindow, wallClock } from '@/lib/booking/change-policy'

/** Columns the bot reads from a cita. Contact data and notes are never selected. */
export const BOT_CITA_COLUMNS =
  'id, fecha, hora, estado, cliente_nombre, barbero_id, servicio_id, items, precio_final, ' +
  'barberos(id, nombre, apellido, activo), servicios(id, nombre, precio)'

/** How many past appointments are scanned to build the customer history. */
export const HISTORY_SCAN_LIMIT = 100
const MAX_RECENT_BARBERS = 3

interface BarberRef {
  id: string
  nombre?: string | null
  apellido?: string | null
}

function presentBarber(cita: any, barbero?: BarberRef | null) {
  const source = barbero ?? cita.barberos
  if (source) return { id: source.id, nombre: source.nombre ?? null, apellido: source.apellido ?? null }
  return cita.barbero_id ? { id: cita.barbero_id, nombre: null, apellido: null } : null
}

/** Public shape of one appointment for the agent. */
export function presentCita(cita: any, timeZone: string, now: Date = new Date(), barbero?: BarberRef | null) {
  const { items, total } = appointmentCharge({ ...cita, servicio: cita.servicios ?? cita.servicio })
  const hora = String(cita.hora).slice(0, 5)
  return {
    id: cita.id,
    fecha: cita.fecha,
    hora,
    estado: cita.estado,
    barbero: presentBarber(cita, barbero),
    servicios: items.map((item: any) => ({
      id: item.servicio_id ?? null,
      nombre: item.nombre ?? null,
      cantidad: Number(item.cantidad ?? 1),
      precio: Number(item.precio ?? 0),
    })),
    precio_final: total,
    // Server-side 2 h rule, exposed so the agent can answer before trying.
    modificable: isActiveEstado(cita.estado) && isWithinChangeWindow(cita.fecha, hora, timeZone, now),
    modificable_hasta: formatWallClock(changeDeadline(cita.fecha, hora)),
  }
}

/**
 * Upcoming bookings plus a short history of one customer. `rows` must already
 * be restricted to that customer's phone and the bot tenant.
 */
export function summarizeCustomer(telefono: string, rows: any[], timeZone: string, now: Date = new Date()) {
  const nowWall = localWallTimestamp(now, timeZone)
  const startOf = (cita: any) => wallClock(cita.fecha, String(cita.hora))

  const upcoming = rows
    .filter(cita => isActiveEstado(cita.estado) && startOf(cita) >= nowWall)
    .sort((a, b) => startOf(a) - startOf(b))
    .map(cita => presentCita(cita, timeZone, now))

  const newestFirst = [...rows].sort((a, b) => startOf(b) - startOf(a))
  const completed = newestFirst.filter(cita => cita.estado === 'completada')
  const barbers = new Map<string, { id: string; nombre: string | null; apellido: string | null; activo: boolean; visitas: number; ultima_visita: string }>()
  for (const cita of completed) {
    if (!cita.barbero_id) continue
    const known = barbers.get(cita.barbero_id)
    if (known) {
      known.visitas += 1
      continue
    }
    barbers.set(cita.barbero_id, {
      id: cita.barbero_id,
      nombre: cita.barberos?.nombre ?? null,
      apellido: cita.barberos?.apellido ?? null,
      activo: cita.barberos?.activo === true,
      visitas: 1,
      ultima_visita: cita.fecha,
    })
  }

  const lastName = newestFirst.find(cita => typeof cita.cliente_nombre === 'string' && cita.cliente_nombre.trim())
  return {
    telefono,
    citas: upcoming,
    historial: {
      cliente_nombre: lastName ? lastName.cliente_nombre.trim() : null,
      visitas_completadas: completed.length,
      ultima_visita: completed[0]?.fecha ?? null,
      // Most recent first; a barber appears once with their visit count.
      barberos_recientes: Array.from(barbers.values()).slice(0, MAX_RECENT_BARBERS),
    },
  }
}
