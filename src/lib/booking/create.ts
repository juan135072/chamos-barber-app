/**
 * Appointment creation shared by the website (/api/crear-cita) and the bot
 * API. Inputs must already be validated (see booking-validation.ts); every
 * business rule is enforced here so both channels book with the same rules.
 */
import { RESERVATION_LIMITS, validateReservationLimits } from '@/lib/reservations-config'
import { getDynamicAhora, getDynamicHoy } from '@/lib/date-utils'
import { fetchSlots, isSlotAvailable } from './availability'
import { DEFAULT_TIMEZONE, notifyBookingCreated } from './notify'
import { bookingDuration, buildBookingItems, loadBookableServices, requestedServicesNote } from './services'

export interface CreateBookingInput {
  barbero_id: string
  servicios_ids: string[]
  fecha: string
  hora: string
  cliente_nombre: string
  cliente_telefono: string
  cliente_email?: string | null
  notas?: string | null
}

export interface CreateBookingOptions {
  /** Tenant the barber must belong to. The website derives the tenant from the barber alone. */
  comercioId?: string
  /** Every stored spelling of the customer's phone, for the active-booking limit. */
  telefonosCliente?: string[]
  /** Tenant timezone for "not started yet" in the limit and for push texts. */
  timeZone?: string
}

export type CreateBookingFailure =
  | { code: 'BARBERO_SIN_COMERCIO' }
  | { code: 'BARBERO_NO_DISPONIBLE' }
  | { code: 'VERIFICACION_FALLIDA' }
  | { code: 'LIMITE_CITAS_ALCANZADO'; message: string; citasActivas: number; limiteMaximo: number }
  | { code: 'SERVICIO_NO_DISPONIBLE'; message: string }
  | { code: 'HORARIO_NO_DISPONIBLE' }
  | { code: 'RACE_CONDITION' }
  | { code: 'ERROR_INSERCION'; detail: string }

export interface BookingBarber {
  id: string
  nombre: string
  apellido: string | null
  activo: boolean
  comercio_id: string | null
}

export type CreateBookingResult =
  | { ok: true; cita: any; barbero: BookingBarber }
  | { ok: false; failure: CreateBookingFailure }

/** The active-start unique index (23505) and the overlap trigger (23P01) both mean "slot just taken". */
export function isSlotConflict(error: { code?: string } | null | undefined): boolean {
  return ['23505', '23P01'].includes(error?.code ?? '')
}

/** Pending/confirmed bookings of the customer that have not started yet; null when the check failed. */
export async function countActiveFutureBookings(db: any, comercioId: string, telefonos: string[], timeZone: string): Promise<number | null> {
  const ahora = getDynamicAhora(timeZone)
  const hoy = getDynamicHoy(timeZone)
  const horaActual = String(ahora.getHours()).padStart(2, '0') + ':' + String(ahora.getMinutes()).padStart(2, '0')

  const { data, error } = await db
    .from('citas')
    .select('id, fecha, hora, estado')
    .in('cliente_telefono', telefonos)
    .eq('comercio_id', comercioId)
    .in('estado', RESERVATION_LIMITS.ACTIVE_STATES)
    .or(`fecha.gt.${hoy},and(fecha.eq.${hoy},hora.gte.${horaActual})`)

  if (error) {
    console.error('[booking] active appointments check failed:', error)
    return null
  }
  return data?.length || 0
}

export async function createBooking(db: any, input: CreateBookingInput, options: CreateBookingOptions = {}): Promise<CreateBookingResult> {
  const timeZone = options.timeZone || DEFAULT_TIMEZONE
  const fail = (failure: CreateBookingFailure): CreateBookingResult => ({ ok: false, failure })

  // The tenant always comes from the barber, never from the request.
  const { data: barbero } = await db
    .from('barberos')
    .select('id, nombre, apellido, activo, comercio_id')
    .eq('id', input.barbero_id)
    .single()
  const comercioId: string | undefined = barbero?.comercio_id
  if (!comercioId || (options.comercioId && comercioId !== options.comercioId)) return fail({ code: 'BARBERO_SIN_COMERCIO' })

  const activas = await countActiveFutureBookings(db, comercioId, options.telefonosCliente ?? [input.cliente_telefono], timeZone)
  if (activas === null) return fail({ code: 'VERIFICACION_FALLIDA' })
  const limit = validateReservationLimits(activas)
  if (!limit.allowed) {
    return fail({
      code: 'LIMITE_CITAS_ALCANZADO',
      message: limit.reason ?? '',
      citasActivas: limit.currentCount ?? activas,
      limiteMaximo: limit.maxLimit ?? RESERVATION_LIMITS.MAX_ACTIVE_APPOINTMENTS,
    })
  }

  if (!barbero.activo) return fail({ code: 'BARBERO_NO_DISPONIBLE' })

  const lookup = await loadBookableServices(db, comercioId, input.servicios_ids)
  if (!lookup.ok) return fail({ code: 'SERVICIO_NO_DISPONIBLE', message: lookup.message })

  // Same database rules as the booking calendar, including Sunday closures,
  // pauses, the full service duration and the business timezone.
  const slots = await fetchSlots(db, input.barbero_id, input.fecha, bookingDuration(input.servicios_ids, lookup.services))
  if (!slots) return fail({ code: 'VERIFICACION_FALLIDA' })
  if (!isSlotAvailable(slots, input.hora)) return fail({ code: 'HORARIO_NO_DISPONIBLE' })

  const items = buildBookingItems(input.servicios_ids, lookup.services)
  let notas = input.notas || ''
  if (input.servicios_ids.length > 1) notas += requestedServicesNote(items)

  const { data: cita, error } = await db
    .from('citas')
    .insert([{
      servicio_id: input.servicios_ids[0], // first service, required by older readers
      barbero_id: input.barbero_id,
      comercio_id: comercioId,
      fecha: input.fecha,
      hora: input.hora,
      cliente_nombre: input.cliente_nombre,
      cliente_telefono: input.cliente_telefono,
      cliente_email: input.cliente_email || null,
      notas: notas || null,
      estado: 'pendiente',
      items,
      precio_final: items.reduce((sum, item) => sum + item.subtotal, 0),
    }])
    .select()
    .single()

  if (error) {
    console.error('[booking] insert failed:', error)
    return fail(isSlotConflict(error) ? { code: 'RACE_CONDITION' } : { code: 'ERROR_INSERCION', detail: error.message })
  }

  await notifyBookingCreated(db, cita, {
    barberoId: input.barbero_id,
    barberoNombre: barbero.nombre,
    clienteNombre: input.cliente_nombre,
    fecha: input.fecha,
    hora: input.hora,
    timeZone,
  })
  return { ok: true, cita, barbero }
}
