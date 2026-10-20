/**
 * Customer-initiated reschedule and cancellation of an existing booking.
 *
 * Rules (shared by every channel that lets customers change bookings):
 * - the booking must belong to the tenant AND to the customer's phone;
 *   otherwise it is reported as not found, never as "exists but not yours";
 * - only pendiente/confirmada bookings can change;
 * - the 2 h deadline of the terms (change-policy.ts) is enforced here;
 * - a rescheduled booking returns to 'pendiente' so the barber confirms again.
 *
 * Database failures throw; callers turn them into a generic 500.
 */
import { appointmentDuration, localWallTimestamp } from '@/lib/booking-validation'
import { fetchSlots } from './availability'
import { ACTIVE_ESTADOS, isActiveEstado, isWithinChangeWindow, wallClock } from './change-policy'
import { isSlotConflict } from './create'
import { notifyBookingCancelled, notifyBookingRescheduled } from './notify'

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

export type ChangeFailure =
  | { code: 'CITA_NO_ENCONTRADA' }
  | { code: 'CITA_NO_MODIFICABLE'; estado?: string }
  | { code: 'FUERA_DE_PLAZO' }
  | { code: 'BARBERO_NO_DISPONIBLE' }
  | { code: 'MISMO_HORARIO' }
  | { code: 'HORARIO_NO_DISPONIBLE' }
  | { code: 'RACE_CONDITION' }

export type ChangeResult =
  | { ok: true; cita: any; barbero?: { id: string; nombre: string; apellido: string | null } }
  | { ok: false; failure: ChangeFailure }

interface CustomerCitaRef {
  comercioId: string
  citaId: string
  /** Every stored spelling of the customer's phone (see phoneLookupVariants). */
  telefonos: string[]
  timeZone: string
  now?: Date
}

export interface RescheduleInput extends CustomerCitaRef {
  fecha: string
  hora: string
  /** New barber; defaults to the current one. */
  barberoId?: string
}

export interface BusyRange {
  start: number
  end: number
}

/** True when [start, end) does not overlap any busy range. */
export function isRangeFree(start: number, end: number, busy: BusyRange[]): boolean {
  return busy.every(range => !(range.start < end && range.end > start))
}

/** The customer's booking inside the tenant, or null. */
export async function findCustomerCita(db: any, comercioId: string, citaId: string, telefonos: string[]): Promise<any | null> {
  const { data, error } = await db
    .from('citas')
    .select('*')
    .eq('id', citaId)
    .eq('comercio_id', comercioId)
    .in('cliente_telefono', telefonos)
    .limit(1)
  if (error) throw new Error(`Appointment lookup failed: ${error.message}`)
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

function changeBlocker(cita: any, timeZone: string, now?: Date): ChangeFailure | null {
  if (!cita) return { code: 'CITA_NO_ENCONTRADA' }
  if (!isActiveEstado(cita.estado)) return { code: 'CITA_NO_MODIFICABLE', estado: cita.estado }
  // Measured from the CURRENT start time, not the requested one.
  if (!isWithinChangeWindow(cita.fecha, String(cita.hora), timeZone, now)) return { code: 'FUERA_DE_PLAZO' }
  return null
}

/** Catalog durations for booking rows whose items do not carry them (older rows). */
async function serviceDurations(db: any, citas: any[]): Promise<Map<string, any>> {
  const ids = new Set<string>()
  for (const cita of citas) {
    const items = Array.isArray(cita.items) ? cita.items : []
    if (items.length === 0 && cita.servicio_id) ids.add(cita.servicio_id)
    for (const item of items) {
      if (item?.servicio_id && (item.duracion_minutos == null || item.tiempo_buffer == null)) ids.add(item.servicio_id)
    }
  }
  if (ids.size === 0) return new Map()
  const { data, error } = await db.from('servicios').select('id, duracion_minutos, tiempo_buffer').in('id', Array.from(ids))
  if (error) throw new Error(`Service durations lookup failed: ${error.message}`)
  return new Map((data || []).map((s: any) => [s.id, s]))
}

/**
 * Reschedule nuance: get_horarios_disponibles() cannot leave out the booking
 * being moved, so when it moves to another time with the SAME barber on the
 * SAME day, its own current slot makes nearby candidate times show 'Ocupado'.
 *
 * The RPC evaluates reasons in a fixed order (past, out of hours, break,
 * occupied, blocked), so 'Ocupado' already proves the new time is in the
 * future, inside opening hours and outside breaks. Two checks remain:
 *   1. the only active booking overlapping the new range is the one being moved;
 *   2. no blocked range overlaps it ('Ocupado' masks 'Bloqueado').
 * The overlap trigger app_guard_appointment_overlap() also ignores the row
 * itself and stays the final guard against concurrent bookings.
 */
async function isFreeExceptSelf(db: any, cita: any, fecha: string, hora: string, duracion: number, timeZone: string): Promise<boolean> {
  const start = wallClock(fecha, hora)
  const end = start + duracion * MINUTE_MS

  const { data: others, error } = await db
    .from('citas')
    .select('id, hora, items, servicio_id')
    .eq('barbero_id', cita.barbero_id)
    .eq('fecha', fecha)
    .in('estado', ACTIVE_ESTADOS)
    .neq('id', cita.id)
  if (error) throw new Error(`Overlap lookup failed: ${error.message}`)
  const durations = await serviceDurations(db, others || [])
  const busy: BusyRange[] = (others || []).map((other: any) => {
    const otherStart = wallClock(fecha, String(other.hora))
    return { start: otherStart, end: otherStart + appointmentDuration(other, durations) * MINUTE_MS }
  })

  // Coarse UTC window around the day; the exact comparison happens on wall-clock values below.
  const dayStart = Date.parse(`${fecha}T00:00:00Z`)
  const { data: blocks, error: blocksError } = await db
    .from('horarios_bloqueados')
    .select('fecha_hora_inicio, fecha_hora_fin')
    .eq('barbero_id', cita.barbero_id)
    .lt('fecha_hora_inicio', new Date(dayStart + 2 * DAY_MS).toISOString())
    .gt('fecha_hora_fin', new Date(dayStart - DAY_MS).toISOString())
  if (blocksError) throw new Error(`Blocked ranges lookup failed: ${blocksError.message}`)
  for (const block of blocks || []) {
    busy.push({
      start: localWallTimestamp(new Date(block.fecha_hora_inicio), timeZone),
      end: localWallTimestamp(new Date(block.fecha_hora_fin), timeZone),
    })
  }

  return isRangeFree(start, end, busy)
}

export async function rescheduleBooking(db: any, input: RescheduleInput): Promise<ChangeResult> {
  const fail = (failure: ChangeFailure): ChangeResult => ({ ok: false, failure })
  const cita = await findCustomerCita(db, input.comercioId, input.citaId, input.telefonos)
  const blocker = changeBlocker(cita, input.timeZone, input.now)
  if (blocker) return fail(blocker)

  const barberoId: string | null = input.barberoId || cita.barbero_id
  if (!barberoId) return fail({ code: 'BARBERO_NO_DISPONIBLE' })
  const { data: barberos, error: barberoError } = await db
    .from('barberos')
    .select('id, nombre, apellido')
    .eq('id', barberoId)
    .eq('comercio_id', input.comercioId)
    .eq('activo', true)
    .limit(1)
  if (barberoError) throw new Error(`Barber lookup failed: ${barberoError.message}`)
  const barbero = Array.isArray(barberos) ? barberos[0] : null
  if (!barbero) return fail({ code: 'BARBERO_NO_DISPONIBLE' })

  const sameBarberAndDay = barberoId === cita.barbero_id && input.fecha === cita.fecha
  if (sameBarberAndDay && input.hora === String(cita.hora).slice(0, 5)) return fail({ code: 'MISMO_HORARIO' })

  // The booking keeps its services, so it keeps its duration.
  const duracion = appointmentDuration(cita, await serviceDurations(db, [cita]))
  const slots = await fetchSlots(db, barberoId, input.fecha, duracion)
  if (!slots) throw new Error('Availability lookup failed')
  const slot = slots.find(s => s.hora === input.hora)
  const available = slot?.disponible === true ||
    (slot?.motivo === 'Ocupado' && sameBarberAndDay && await isFreeExceptSelf(db, cita, input.fecha, input.hora, duracion, input.timeZone))
  if (!available) return fail({ code: 'HORARIO_NO_DISPONIBLE' })

  // Prices are per service, so items and precio_final stay as booked.
  // Back to 'pendiente' so the barber confirms the new time.
  const { data: updated, error } = await db
    .from('citas')
    .update({ fecha: input.fecha, hora: input.hora, barbero_id: barberoId, estado: 'pendiente' })
    .eq('id', cita.id)
    .eq('comercio_id', input.comercioId)
    .in('estado', ACTIVE_ESTADOS)
    .select()
  if (error) {
    if (isSlotConflict(error)) return fail({ code: 'RACE_CONDITION' })
    throw new Error(`Reschedule failed: ${error.message}`)
  }
  const row = Array.isArray(updated) ? updated[0] : null
  // Cancelled or completed by staff between the read and the write.
  if (!row) return fail({ code: 'CITA_NO_MODIFICABLE' })

  await notifyBookingRescheduled(db, cita, row, { barberoNombre: barbero.nombre, timeZone: input.timeZone })
  return { ok: true, cita: row, barbero }
}

export async function cancelBooking(db: any, input: CustomerCitaRef): Promise<ChangeResult> {
  const fail = (failure: ChangeFailure): ChangeResult => ({ ok: false, failure })
  const cita = await findCustomerCita(db, input.comercioId, input.citaId, input.telefonos)
  const blocker = changeBlocker(cita, input.timeZone, input.now)
  if (blocker) return fail(blocker)

  const { data: updated, error } = await db
    .from('citas')
    .update({ estado: 'cancelada' })
    .eq('id', cita.id)
    .eq('comercio_id', input.comercioId)
    .in('estado', ACTIVE_ESTADOS)
    .select()
  if (error) throw new Error(`Cancellation failed: ${error.message}`)
  const row = Array.isArray(updated) ? updated[0] : null
  if (!row) return fail({ code: 'CITA_NO_MODIFICABLE' })

  await notifyBookingCancelled(db, cita, row, input.timeZone)
  return { ok: true, cita: row }
}
