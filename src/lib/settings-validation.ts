export const SETTINGS_KEYS = new Set([
  'sitio_nombre', 'sitio_telefono', 'sitio_email', 'sitio_direccion', 'google_maps_url',
  'facebook_url', 'instagram_url', 'whatsapp_numero', 'pos_clave_seguridad',
  'horario_apertura', 'horario_cierre', 'horario_sabado_apertura', 'horario_sabado_cierre',
  'horario_domingo_apertura', 'horario_domingo_cierre', 'horario_domingo_activo',
  'intervalo_citas', 'sitio_moneda', 'sitio_timezone',
])

export function validateSettings(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Configuración inválida'
  const config = input as Record<string, string>
  if (Object.entries(config).some(([key, value]) => !SETTINGS_KEYS.has(key) || typeof value !== 'string' || value.length > 2000)) return 'Campo de configuración inválido'
  for (const prefix of ['horario', 'horario_sabado', 'horario_domingo']) {
    const open = config[`${prefix}_apertura`], close = config[`${prefix}_cierre`]
    if (![open, close].every(value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value ?? '')) || open >= close) return 'Cada hora de cierre debe ser posterior a la apertura'
  }
  if (!['true', 'false'].includes(config.horario_domingo_activo)) return 'Indica si el domingo está abierto'
  if (!/^\d+$/.test(config.intervalo_citas) || Number(config.intervalo_citas) < 5 || Number(config.intervalo_citas) > 120) return 'El intervalo debe estar entre 5 y 120 minutos'
  try { new Intl.DateTimeFormat('es', { timeZone: config.sitio_timezone || 'America/Santiago' }).format() } catch { return 'Zona horaria inválida' }
  return null
}
