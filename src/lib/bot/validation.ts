import type { NextApiRequest } from 'next'
import { getDynamicHoy } from '@/lib/date-utils'
import { validateFecha } from '@/lib/booking-validation'

/** The website calendar offers dates from today up to 30 days ahead; the bot keeps that window. */
export const BOOKING_WINDOW_DAYS = 30

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

/** Valid calendar date inside [today, today + 30 days] in the tenant timezone. */
export function validateBookingDate(fecha: unknown, timeZone: string, today: string = getDynamicHoy(timeZone)): string | null {
  const invalid = validateFecha(fecha)
  if (invalid) return invalid
  const last = addDays(today, BOOKING_WINDOW_DAYS)
  const day = fecha as string
  if (day < today || day > last) return `La fecha debe estar entre ${today} y ${last}`
  return null
}

/** Next.js parses JSON bodies; anything that is not a plain object is rejected. */
export function readJsonBody(req: NextApiRequest): Record<string, any> | null {
  const body = req.body
  return body && typeof body === 'object' && !Array.isArray(body) ? body : null
}

/** First failing message among the given checks. */
export function firstError(...errors: Array<string | null>): string | null {
  return errors.find(Boolean) ?? null
}
