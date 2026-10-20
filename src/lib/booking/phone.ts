import { normalizePhone } from '@/lib/phone-utils'
import { validateTelefono } from '@/lib/booking-validation'

/**
 * Canonical storage form of a customer phone, e.g. "+56 9 1234-5678",
 * "56912345678" and "912345678" all become "+56912345678". Returns null when
 * the value cannot be a phone (same rule as the website form, 8–15 digits).
 */
export function normalizeCustomerPhone(raw: unknown): string | null {
  if (validateTelefono(raw)) return null
  const value = (raw as string).trim()
  const digits = value.replace(/\D/g, '')
  const normalized = normalizePhone(value.startsWith('+') ? `+${digits}` : digits)
  const length = normalized.replace(/\D/g, '').length
  return length >= 8 && length <= 15 ? normalized : null
}

/**
 * Spellings under which the same customer may already be stored, matching
 * /api/consultar-citas: "+569XXXXXXXX", "569XXXXXXXX" and "9XXXXXXXX".
 */
export function phoneLookupVariants(normalized: string): string[] {
  return Array.from(new Set([normalized, normalized.replace(/^\+/, ''), normalized.replace(/^\+56/, '')]))
}
