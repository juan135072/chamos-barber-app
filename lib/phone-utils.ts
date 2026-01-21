/**
 * Utilidades para formateo y normalización de números telefónicos
 * Soporta múltiples países con sus respectivos códigos
 */

export const COUNTRIES = [
  { name: 'Chile', code: '+56', flag: '🇨🇱', pattern: '9 XXXX XXXX', length: 9 },
  { name: 'Venezuela', code: '+58', flag: '🇻🇪', pattern: '4XX XXX XXXX', length: 10 },
  { name: 'Colombia', code: '+57', flag: '🇨🇴', pattern: '3XX XXX XXXX', length: 10 },
  { name: 'Argentina', code: '+54', flag: '🇦🇷', pattern: '9 XX XXXX XXXX', length: 11 },
  { name: 'Perú', code: '+51', flag: '🇵🇪', pattern: '9XX XXX XXX', length: 9 },
  { name: 'España', code: '+34', flag: '🇪🇸', pattern: 'X XX XX XX XX', length: 9 },
] as const

export type CountryCode = typeof COUNTRIES[number]['code']

/**
 * Formatea un número de teléfono mientras el usuario escribe
 * Ahora es más genérico pero mantiene compatibilidad
 */
export function formatPhoneInput(value: string, countryCode: string = '+56'): string {
  // Remover todo excepto dígitos
  let cleaned = value.replace(/\D/g, '')

  // Si coincide con el código de país al inicio, removerlo para el input visual
  const codeDigits = countryCode.replace(/\D/g, '')
  if (cleaned.startsWith(codeDigits)) {
    cleaned = cleaned.slice(codeDigits.length)
  }

  // En Chile, a veces ponen el 0 al inicio, removerlo
  if (countryCode === '+56') {
    cleaned = cleaned.replace(/^0+/, '')
  }

  // Limitar según el país (default 12 por seguridad)
  const country = COUNTRIES.find(c => c.code === countryCode)
  const maxLength = country ? country.length : 12
  cleaned = cleaned.slice(0, maxLength)

  return cleaned
}

/**
 * Normaliza un número de teléfono a formato estándar para almacenamiento
 * Retorna: +56912345678 (sin espacios)
 */
export function normalizePhone(value: string, selectedCountryCode: string = '+56'): string {
  // Si ya tiene un +, asumimos que ya está normalizado o tiene código
  if (value.startsWith('+')) {
    return value.replace(/\s/g, '')
  }

  // Remover todo excepto dígitos
  let cleaned = value.replace(/\D/g, '')

  // Si empieza con el código del país seleccionado (sin el +), removerlo
  const countryDigits = selectedCountryCode.replace(/\D/g, '')
  if (cleaned.startsWith(countryDigits)) {
    cleaned = cleaned.slice(countryDigits.length)
  }

  // Retornar con código de país
  return selectedCountryCode + cleaned
}

/**
 * Valida si un número de teléfono es válido según el país
 */
export function isValidPhone(value: string, countryCode: string = '+56'): boolean {
  const cleaned = value.replace(/\D/g, '')
  const country = COUNTRIES.find(c => c.code === countryCode)

  if (!country) return cleaned.length >= 8

  // Para Chile específicamente: 9 dígitos y empieza con 9
  if (countryCode === '+56') {
    const digits = cleaned.startsWith('56') ? cleaned.slice(2) : cleaned
    return digits.length === 9 && digits.startsWith('9')
  }

  // Para otros, validación básica de longitud
  const digits = cleaned.startsWith(countryCode.replace(/\D/g, ''))
    ? cleaned.slice(countryCode.replace(/\D/g, '').length)
    : cleaned

  return digits.length === country.length
}

/**
 * Obtiene el placeholder según el país
 */
export function getPhonePlaceholder(countryCode: string = '+56'): string {
  const country = COUNTRIES.find(c => c.code === countryCode)
  return country ? country.pattern : '912345678'
}

/**
 * Obtiene el hint/ayuda para el usuario
 */
export function getPhoneHint(countryCode: string = '+56'): string {
  const country = COUNTRIES.find(c => c.code === countryCode)
  return country
    ? `Formato ${country.name}: ${country.code} ${country.pattern}`
    : 'Ingresa tu número de teléfono'
}

/**
 * Convierte un número normalizado a formato legible
 */
export function formatPhoneDisplay(value: string): string {
  if (!value) return ''

  // Intentar encontrar qué país es por el código
  for (const country of COUNTRIES) {
    if (value.startsWith(country.code)) {
      const digits = value.slice(country.code.length)
      if (country.code === '+56' && digits.length === 9) {
        return `${country.code} ${digits.charAt(0)} ${digits.slice(1, 5)} ${digits.slice(5, 9)}`
      }
      return `${country.code} ${digits}`
    }
  }

  return value
}

export function phonesMatch(phone1: string, phone2: string): boolean {
  if (!phone1 || !phone2) return false

  const n1 = phone1.startsWith('+') ? phone1.replace(/\s/g, '') : normalizePhone(phone1)
  const n2 = phone2.startsWith('+') ? phone2.replace(/\s/g, '') : normalizePhone(phone2)

  return n1 === n2
}
