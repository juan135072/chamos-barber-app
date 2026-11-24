// Barber app history: a barber's past appointments of the last 30 Chile days.
// citas stores fecha (DATE) + hora (TIME); it has no fecha_hora and no duracion column.
import { addDays, getChileHoy } from './date-utils'
import type { Cita } from '../types/barber-app'

export const HISTORIAL_DIAS = 30

export const HISTORIAL_SELECT =
  'id, barbero_id, servicio_id, cliente_nombre, cliente_email, cliente_telefono, fecha, hora, estado, notas, precio_final, created_at, updated_at, servicios:servicio_id (nombre, precio, duracion_minutos)'

const TERMINADAS = ['completada', 'cancelada']

export interface HistorialStats {
  total_citas: number
  total_ganancia: number
  promedio_cita: number
  total_clientes: number
}

/**
 * Appointments of a barber from (hoy - 30 days) to hoy, newest first. `hoy` is the
 * Chile calendar day ('YYYY-MM-DD'). Throws the database error when the query fails.
 */
export async function cargarHistorial(client: any, barberoId: string, hoy: string = getChileHoy()): Promise<Cita[]> {
  const { data, error } = await client
    .from('citas')
    .select(HISTORIAL_SELECT)
    .eq('barbero_id', barberoId)
    .gte('fecha', addDays(hoy, -HISTORIAL_DIAS))
    .lte('fecha', hoy)
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false })

  if (error) throw error

  return (data || [])
    // Today's appointments that are still open belong to the agenda, not to the history.
    .filter((cita: any) => cita.fecha < hoy || TERMINADAS.includes(cita.estado))
    .map((cita: any) => ({
      ...cita,
      duracion: cita.servicios?.duracion_minutos ?? 0,
      servicio_nombre: cita.servicios?.nombre || 'Sin servicio',
      // What was actually charged when the appointment was paid; the list price otherwise.
      servicio_precio: Number(cita.precio_final ?? cita.servicios?.precio ?? 0),
    }))
}

export function resumirHistorial(citas: Cita[]): HistorialStats {
  const completadas = citas.filter((cita) => cita.estado === 'completada')
  const total = completadas.reduce((sum, cita) => sum + (cita.servicio_precio || 0), 0)
  return {
    total_citas: citas.length,
    total_ganancia: total,
    promedio_cita: completadas.length > 0 ? total / completadas.length : 0,
    // The phone is always present; the email is empty for most bookings.
    total_clientes: new Set(completadas.map((cita) => cita.cliente_telefono || cita.cliente_email)).size,
  }
}
