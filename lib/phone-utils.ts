/**
 * Utilidades para formateo y normalización de números telefónicos chilenos
 * Formato estándar: +56 9 1234 5678
 */

/**
 * Formatea un número de teléfono chileno mientras el usuario escribe
 * Acepta: 912345678, 9 1234 5678, +56912345678, +56 9 1234 5678, etc.
 * Retorna formato: +56 9 1234 5678
 */
export function formatPhoneInput(value: string): string {
  // Remover todo excepto dígitos y el signo +
  let cleaned = value.replace(/[^\d+]/g, '')
  
  // Si empieza con +56, removerlo temporalmente para procesamiento
  const hasCountryCode = cleaned.startsWith('+56') || cleaned.startsWith('56')
  if (hasCountryCode) {
    cleaned = cleaned.replace(/^\+?56/, '')
  }
  
  // Remover ceros iniciales
  cleaned = cleaned.replace(/^0+/, '')
  
  // Limitar a 9 dígitos
  cleaned = cleaned.slice(0, 9)
  
  // Si no hay dígitos, retornar vacío
  if (!cleaned) return ''
  
  // Formatear: +56 9 1234 5678
  let formatted = '+56'
  
  if (cleaned.length >= 1) {
    formatted += ' ' + cleaned.charAt(0)
  }
  
  if (cleaned.length >= 2) {
    formatted += ' ' + cleaned.slice(1, 5)
  }
  
  if (cleaned.length >= 6) {
    formatted += ' ' + cleaned.slice(5, 9)
  }
  
  return formatted.trim()
}

/**
 * Normaliza un número de teléfono a formato estándar para almacenamiento
 * Acepta cualquier formato y retorna: +56912345678 (sin espacios)
 */
export function normalizePhone(value: string): string {
  // Remover todo excepto dígitos
  let cleaned = value.replace(/\D/g, '')
  
  // Si empieza con 56, asumimos que ya tiene código de país
  if (cleaned.startsWith('56')) {
    cleaned = cleaned.slice(2)
  }
  
  // Remover ceros iniciales
  cleaned = cleaned.replace(/^0+/, '')
  
  // Debe tener exactamente 9 dígitos (formato chileno)
  if (cleaned.length !== 9) {
    return value // Retornar original si no es válido
  }
  
  // Retornar con código de país
  return '+56' + cleaned
}

/**
 * Valida si un número de teléfono chileno es válido
 * Debe tener 9 dígitos y empezar con 9
 */
export function isValidChileanPhone(value: string): boolean {
  const cleaned = value.replace(/\D/g, '')
  const digits = cleaned.startsWith('56') ? cleaned.slice(2) : cleaned
  
  // Debe tener 9 dígitos y empezar con 9 (celulares en Chile)
  return digits.length === 9 && digits.startsWith('9')
}

/**
 * Obtiene el placeholder formateado
 */
export function getPhonePlaceholder(): string {
  return '+56 9 1234 5678'
}

/**
 * Obtiene el hint/ayuda para el usuario
 */
export function getPhoneHint(): string {
  return 'Formato: +56 9 1234 5678 (código de país + número celular)'
}

/**
 * Convierte un número normalizado a formato legible
 * +56912345678 → +56 9 1234 5678
 */
export function formatPhoneDisplay(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  const digits = cleaned.startsWith('56') ? cleaned.slice(2) : cleaned
  
  if (digits.length !== 9) return value
  
  return `+56 ${digits.charAt(0)} ${digits.slice(1, 5)} ${digits.slice(5, 9)}`
}

/**
 * Compara dos números de teléfono normalizados
 * Útil para búsquedas y comparaciones
 */
export function phonesMatch(phone1: string, phone2: string): boolean {
  return normalizePhone(phone1) === normalizePhone(phone2)
}
