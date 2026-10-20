/**
 * Side effects after an appointment write, shared by every booking channel:
 * a realtime event for the open dashboards and a push to the barber.
 * Failures are logged and swallowed because the write already succeeded.
 */
import { publishCitaChange, type CitaChangeEventType } from '@/lib/realtime-publish'
import { sendNotificationToBarber } from '@/lib/onesignal'
import { formatFechaDynamic } from '@/lib/date-utils'

export const DEFAULT_TIMEZONE = 'America/Santiago'

async function publishSafely(db: any, eventType: CitaChangeEventType, cita: any, oldRow?: any) {
  try {
    await publishCitaChange(db, eventType, cita, oldRow)
  } catch (error) {
    console.warn('[booking] realtime publish skipped:', error)
  }
}

async function pushSafely(barberoId: string | null | undefined, title: string, buildMessage: () => string) {
  if (!barberoId) return
  try {
    await sendNotificationToBarber(barberoId, title, buildMessage())
  } catch (error) {
    console.error('[booking] push notification failed:', error)
  }
}

export interface CreatedBookingNotice {
  barberoId: string
  barberoNombre: string | null | undefined
  clienteNombre: string
  fecha: string
  hora: string
  timeZone?: string
}

export async function notifyBookingCreated(db: any, cita: any, notice: CreatedBookingNotice): Promise<void> {
  await publishSafely(db, 'INSERT', cita)
  await pushSafely(notice.barberoId, 'Nueva Reserva ✂️', () =>
    `Hola ${notice.barberoNombre || 'Barbero'}, tienes una nueva reserva de ${notice.clienteNombre} para el ${formatFechaDynamic(notice.fecha, notice.timeZone || DEFAULT_TIMEZONE)} a las ${notice.hora}.`)
}

const shortHora = (hora: unknown) => String(hora).slice(0, 5)

/** `previous` and `updated` are full citas rows before and after the move. */
export async function notifyBookingRescheduled(
  db: any,
  previous: any,
  updated: any,
  notice: { barberoNombre: string | null | undefined; timeZone?: string }
): Promise<void> {
  const timeZone = notice.timeZone || DEFAULT_TIMEZONE
  await publishSafely(db, 'UPDATE', updated, previous)

  if (previous.barbero_id && previous.barbero_id !== updated.barbero_id) {
    // The booking left the previous barber's agenda. The tenant channel already
    // received the UPDATE above, so only that barber's channel gets a DELETE
    // (comercio_id null keeps the tenant channel out of it).
    await publishSafely(db, 'DELETE', { id: previous.id, barbero_id: previous.barbero_id, comercio_id: null }, { ...previous, comercio_id: null })
    await pushSafely(previous.barbero_id, 'Cita reasignada 🔄', () =>
      `La cita de ${previous.cliente_nombre} del ${formatFechaDynamic(previous.fecha, timeZone)} a las ${shortHora(previous.hora)} fue reasignada a otro barbero.`)
  }

  await pushSafely(updated.barbero_id, 'Cita reagendada 🔄', () =>
    `Hola ${notice.barberoNombre || 'Barbero'}, la cita de ${updated.cliente_nombre} quedó para el ${formatFechaDynamic(updated.fecha, timeZone)} a las ${shortHora(updated.hora)}. Queda pendiente de tu confirmación.`)
}

export async function notifyBookingCancelled(db: any, previous: any, updated: any, timeZone: string = DEFAULT_TIMEZONE): Promise<void> {
  await publishSafely(db, 'UPDATE', updated, previous)
  await pushSafely(updated.barbero_id, 'Cita cancelada ❌', () =>
    `${updated.cliente_nombre} canceló su cita del ${formatFechaDynamic(updated.fecha, timeZone)} a las ${shortHora(updated.hora)}.`)
}
