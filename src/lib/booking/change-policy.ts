import { localWallTimestamp } from '@/lib/booking-validation'

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
 * True while the booking has not started yet. A customer may change or cancel
 * an active booking at any moment before its start; there is no earlier
 * cutoff. Both sides are compared as wall-clock times in the tenant timezone,
 * the same way get_horarios_disponibles() compares slots with now(). Around a
 * DST switch the comparison can therefore be off by one real hour.
 */
export function isBeforeStart(fecha: string, hora: string, timeZone: string, now: Date = new Date()): boolean {
  return localWallTimestamp(now, timeZone) < wallClock(fecha, hora)
}
