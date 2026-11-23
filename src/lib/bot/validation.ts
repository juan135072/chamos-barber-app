import type { NextApiRequest } from 'next'
import { addDays, getDynamicHoy } from '@/lib/date-utils'
import { validateFecha } from '@/lib/booking-validation'

export { addDays }

/** The website calendar offers dates from today up to 30 days ahead; the bot keeps that window. */
export const BOOKING_WINDOW_DAYS = 30

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
