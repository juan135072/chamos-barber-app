import { localWallTimestamp } from '@/lib/booking-validation'

/** Terms §4.2: a booking can be changed or cancelled for free up to 2 hours before it starts. */
export const CHANGE_DEADLINE_HOURS = 2

const HOUR_MS = 3_600_000

export const ACTIVE_ESTADOS = ['pendiente', 'confirmada'] as const

export function isActiveEstado(estado: unknown): boolean {
  return (ACTIVE_ESTADOS as readonly unknown[]).includes(estado)
}

/** Wall-clock time of a booking ("YYYY-MM-DD" + "HH:MM[:SS]") as milliseconds read in UTC. */
export function wallClock(fecha: string, hora: string): number {
  return Date.parse(`${fecha}T${hora.slice(0, 5)}:00Z`)
}

/** Formats a wall-clock value from wallClock()/localWallTimestamp() as "YYYY-MM-DD HH:MM". */
export function formatWallClock(value: number): string {
  return new Date(value).toISOString().slice(0, 16).replace('T', ' ')
}

/**
 * Latest wall-clock moment, in the tenant timezone, at which the customer may
 * still change or cancel the booking.
 */
export function changeDeadline(fecha: string, hora: string): number {
  return wallClock(fecha, hora) - CHANGE_DEADLINE_HOURS * HOUR_MS
}

/**
 * True while the customer may still change or cancel. Both sides are compared
 * as wall-clock times in the tenant timezone, the same way
 * get_horarios_disponibles() compares slots with now(). Around a DST switch
 * the window can therefore be one real hour longer or shorter.
 */
export function isWithinChangeWindow(fecha: string, hora: string, timeZone: string, now: Date = new Date()): boolean {
  return localWallTimestamp(now, timeZone) < changeDeadline(fecha, hora)
}
