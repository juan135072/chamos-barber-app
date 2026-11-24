/**
 * Reschedule and cancellation of an existing booking.
 *
 * Customer rules (shared by every channel that lets customers change bookings):
 * - the booking must belong to the tenant AND to the customer's phone;
 *   otherwise it is reported as not found, never as "exists but not yours";
 * - only pendiente/confirmada bookings can change;
 * - a booking can change until its current start time, with no earlier
 *   cutoff (change-policy.ts); once it started or passed it is locked;
 * - a rescheduled booking returns to 'pendiente' so the barber confirms again.
 *
 * Staff rules (admin panel, rescheduleBookingAsStaff):
 * - the booking only has to belong to the tenant, whoever its customer is;
 * - it can still move after its start time passed (late arrival), and it
 *   keeps its estado;
 * - the new slot passes the same availability check as a customer's move:
 *   staff cannot take a time the availability function refuses.
 *
 * Database failures throw; callers turn them into a generic 500.
 */
import { appointmentDuration, localWallTimestamp } from '@/lib/booking-validation'
import { fetchSlots, type Slot } from './availability'
import { ACTIVE_ESTADOS, isActiveEstado, isBeforeStart, wallClock } from './change-policy'
import { isSlotConflict } from './create'
import { notifyBookingCancelled, notifyBookingRescheduled } from './notify'

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

export type ChangeFailure =
  | { code: 'CITA_NO_ENCONTRADA' }
  /** `estado`: not pendiente/confirmada; `started`: its start time already arrived. */
  | { code: 'CITA_NO_MODIFICABLE'; estado?: string; started?: true }
  /** `unassigned`: the booking has no barber and the request did not choose one. */
  | { code: 'BARBERO_NO_DISPONIBLE'; unassigned?: true }
  | { code: 'MISMO_HORARIO' }
  /** `motivo`: why the database refuses that time ('Ocupado', 'Descanso', ...), when it lists it. */
  | { code: 'HORARIO_NO_DISPONIBLE'; motivo?: string }
  | { code: 'RACE_CONDITION' }

interface BookingBarberRef {
  id: string
  nombre: string
  apellido: string | null
}

export type ChangeResult =
  | { ok: true; cita: any; barbero?: BookingBarberRef }
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

export interface StaffRescheduleInput {
  comercioId: string
  citaId: string
  fecha: string
  hora: string
  /** New barber; defaults to the current one. */
  barberoId?: string
  timeZone: string
  /** Signed-in staff user (auth.users id), recorded in updated_by. */
  staffUserId: string
}

export interface StaffSlotsInput {
  comercioId: string
  citaId: string
  fecha: string
  /** Barber whose day is listed; defaults to the current one. */
  barberoId?: string
  timeZone: string
}

export type StaffSlotsResult =
  | { ok: true; slots: Slot[] }
  | { ok: false; failure: ChangeFailure }

/** `motivo` of the booking's own current time in the staff slot list: moving there is MISMO_HORARIO. */
const OWN_SLOT_MOTIVO = 'Horario actual'

interface MoveTarget {
  fecha: string
  hora: string
  barberoId?: string
}

interface MovePolicy {
  timeZone: string
  now?: Date
  /** Customers cannot change a booking once it started; staff still can (late arrival). */
  lockStarted: boolean
  /** 'pendiente' sends the booking back to its barber to confirm the new time; 'keep' leaves its estado. */
  estado: 'pendiente' | 'keep'
  /** Staff user recorded in citas.updated_by (references auth.users). */
  updatedBy?: string
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

/** A booking inside the tenant, whoever its customer is, or null. Staff channels only. */
async function findTenantCita(db: any, comercioId: string, citaId: string): Promise<any | null> {
  const { data, error } = await db
    .from('citas')
    .select('*')
    .eq('id', citaId)
    .eq('comercio_id', comercioId)
    .limit(1)
  if (error) throw new Error(`Appointment lookup failed: ${error.message}`)
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

function changeBlocker(cita: any, timeZone: string, now?: Date, lockStarted = true): ChangeFailure | null {
  if (!cita) return { code: 'CITA_NO_ENCONTRADA' }
  if (!isActiveEstado(cita.estado)) return { code: 'CITA_NO_MODIFICABLE', estado: cita.estado }
  // Measured from the CURRENT start time, not the requested one.
  if (lockStarted && !isBeforeStart(cita.fecha, String(cita.hora), timeZone, now)) return { code: 'CITA_NO_MODIFICABLE', started: true }
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
 * busyExceptSelf() loads what both checks compare against. The overlap trigger
 * app_guard_appointment_overlap() also ignores the row itself and stays the
 * final guard against concurrent bookings.
 */
async function busyExceptSelf(db: any, cita: any, fecha: string, timeZone: string): Promise<BusyRange[]> {
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

  return busy
}

/** True when a booking of `duracion` minutes starting at `hora` overlaps nothing in `busy`. */
function fitsAt(busy: BusyRange[], fecha: string, hora: string, duracion: number): boolean {
  const start = wallClock(fecha, hora)
  return isRangeFree(start, start + duracion * MINUTE_MS, busy)
}

type ResolvedTarget =
  | { ok: true; barbero: BookingBarberRef; barberoId: string; sameBarberAndDay: boolean }
  | { ok: false; failure: ChangeFailure }

/**
 * Checks shared by a move and by the staff slot list: the booking can still
 * change and the target barber is an active barber of the tenant.
 */
async function resolveTarget(
  db: any,
  comercioId: string,
  cita: any,
  target: { fecha: string; barberoId?: string },
  policy: Pick<MovePolicy, 'timeZone' | 'now' | 'lockStarted'>
): Promise<ResolvedTarget> {
  const blocker = changeBlocker(cita, policy.timeZone, policy.now, policy.lockStarted)
  if (blocker) return { ok: false, failure: blocker }

  const barberoId: string | null = target.barberoId || cita.barbero_id
  if (!barberoId) return { ok: false, failure: { code: 'BARBERO_NO_DISPONIBLE', unassigned: true } }
  const { data: barberos, error: barberoError } = await db
    .from('barberos')
    .select('id, nombre, apellido')
    .eq('id', barberoId)
    .eq('comercio_id', comercioId)
    .eq('activo', true)
    .limit(1)
  if (barberoError) throw new Error(`Barber lookup failed: ${barberoError.message}`)
  const barbero = Array.isArray(barberos) ? barberos[0] : null
  if (!barbero) return { ok: false, failure: { code: 'BARBERO_NO_DISPONIBLE' } }

  return { ok: true, barbero, barberoId, sameBarberAndDay: barberoId === cita.barbero_id && target.fecha === cita.fecha }
}

/** The barber's slots that day for the booking's own duration: it keeps its services. */
async function slotsForBooking(db: any, cita: any, barberoId: string, fecha: string): Promise<{ duracion: number; slots: Slot[] }> {
  const duracion = appointmentDuration(cita, await serviceDurations(db, [cita]))
  const slots = await fetchSlots(db, barberoId, fecha, duracion)
  if (!slots) throw new Error('Availability lookup failed')
  return { duracion, slots }
}

/** Moves `cita`, already looked up by the caller's own rule (customer phone or staff tenant). */
async function moveBooking(db: any, comercioId: string, cita: any, target: MoveTarget, policy: MovePolicy): Promise<ChangeResult> {
  const fail = (failure: ChangeFailure): ChangeResult => ({ ok: false, failure })
  const resolved = await resolveTarget(db, comercioId, cita, target, policy)
  if (!resolved.ok) return fail(resolved.failure)
  const { barbero, barberoId, sameBarberAndDay } = resolved
  if (sameBarberAndDay && target.hora === String(cita.hora).slice(0, 5)) return fail({ code: 'MISMO_HORARIO' })

  const { duracion, slots } = await slotsForBooking(db, cita, barberoId, target.fecha)
  const slot = slots.find(s => s.hora === target.hora)
  // With the same barber and day, 'Ocupado' may only be the booking itself (see busyExceptSelf).
  const available = slot?.disponible === true ||
    (slot?.motivo === 'Ocupado' && sameBarberAndDay &&
      fitsAt(await busyExceptSelf(db, cita, target.fecha, policy.timeZone), target.fecha, target.hora, duracion))
  if (!available) return fail(slot?.motivo ? { code: 'HORARIO_NO_DISPONIBLE', motivo: slot.motivo } : { code: 'HORARIO_NO_DISPONIBLE' })

  // Prices are per service, so items and precio_final stay as booked.
  const patch: Record<string, unknown> = { fecha: target.fecha, hora: target.hora, barbero_id: barberoId }
  // Back to 'pendiente' so the barber confirms the new time.
  if (policy.estado === 'pendiente') patch.estado = 'pendiente'
  if (policy.updatedBy) patch.updated_by = policy.updatedBy
  const { data: updated, error } = await db
    .from('citas')
    .update(patch)
    .eq('id', cita.id)
    .eq('comercio_id', comercioId)
    .in('estado', ACTIVE_ESTADOS)
    .select()
  if (error) {
    if (isSlotConflict(error)) return fail({ code: 'RACE_CONDITION' })
    throw new Error(`Reschedule failed: ${error.message}`)
  }
  const row = Array.isArray(updated) ? updated[0] : null
  // Cancelled or completed by staff between the read and the write.
  if (!row) return fail({ code: 'CITA_NO_MODIFICABLE' })

  await notifyBookingRescheduled(db, cita, row, { barberoNombre: barbero.nombre, timeZone: policy.timeZone })
  return { ok: true, cita: row, barbero }
}

export async function rescheduleBooking(db: any, input: RescheduleInput): Promise<ChangeResult> {
  const cita = await findCustomerCita(db, input.comercioId, input.citaId, input.telefonos)
  return moveBooking(db, input.comercioId, cita, input, { timeZone: input.timeZone, now: input.now, lockStarted: true, estado: 'pendiente' })
}

/**
 * Staff move from the admin panel. Unlike a customer's move, it reaches any
 * booking of the tenant, also one whose start time passed, and keeps its
 * estado. The target slot is checked in exactly the same way.
 */
export async function rescheduleBookingAsStaff(db: any, input: StaffRescheduleInput): Promise<ChangeResult> {
  const cita = await findTenantCita(db, input.comercioId, input.citaId)
  const result = await moveBooking(db, input.comercioId, cita, input, { timeZone: input.timeZone, lockStarted: false, estado: 'keep', updatedBy: input.staffUserId })
  if (result.ok) {
    // The row keeps no trace of where the booking was, so each move leaves one
    // log line. Ids, dates and times only: never customer data.
    const slotOf = (row: any) => ({ fecha: row.fecha, hora: String(row.hora).slice(0, 5), barbero_id: row.barbero_id ?? null })
    const entry = { cita_id: cita.id, staff_user_id: input.staffUserId, from: slotOf(cita), to: slotOf(result.cita) }
    console.info(`[booking] staff reschedule ${JSON.stringify(entry)}`)
  }
  return result
}

/**
 * The slots a staff move can take that day, for the slot picker: what the
 * availability function answers for the booking's own duration, corrected for
 * the booking's own range so the list shows exactly what
 * rescheduleBookingAsStaff() accepts.
 */
export async function staffMoveSlots(db: any, input: StaffSlotsInput): Promise<StaffSlotsResult> {
  const cita = await findTenantCita(db, input.comercioId, input.citaId)
  const resolved = await resolveTarget(db, input.comercioId, cita, input, { timeZone: input.timeZone, lockStarted: false })
  if (!resolved.ok) return { ok: false, failure: resolved.failure }
  const { duracion, slots } = await slotsForBooking(db, cita, resolved.barberoId, input.fecha)
  if (!resolved.sameBarberAndDay) return { ok: true, slots }

  // Same barber and day: judge each time the way the move will (see busyExceptSelf).
  const ownHora = String(cita.hora).slice(0, 5)
  let busy: BusyRange[] | undefined
  const judged: Slot[] = []
  for (const slot of slots) {
    if (slot.hora === ownHora) {
      judged.push({ hora: slot.hora, disponible: false, motivo: OWN_SLOT_MOTIVO })
    } else if (slot.disponible !== true && slot.motivo === 'Ocupado') {
      busy ??= await busyExceptSelf(db, cita, input.fecha, input.timeZone)
      judged.push(fitsAt(busy, input.fecha, slot.hora, duracion) ? { hora: slot.hora, disponible: true, motivo: 'Disponible' } : slot)
    } else {
      judged.push(slot)
    }
  }
  return { ok: true, slots: judged }
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
