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
