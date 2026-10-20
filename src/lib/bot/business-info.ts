import type { BotTenant } from './api'

/**
 * Public site settings the agent may quote. Read with an explicit allow-list
 * so private keys (e.g. pos_clave_seguridad) can never reach the bot.
 */
export const BUSINESS_INFO_KEYS = [
  'sitio_nombre', 'sitio_direccion', 'sitio_telefono', 'sitio_moneda',
  'horario_apertura', 'horario_cierre',
  'horario_sabado_apertura', 'horario_sabado_cierre',
  'horario_domingo_apertura', 'horario_domingo_cierre', 'horario_domingo_activo',
  'intervalo_citas', 'google_maps_url', 'instagram_url', 'facebook_url', 'whatsapp_numero',
]

// Same fallbacks as the database function app_general_hours(), which drives
// the booking calendar, so the agent quotes the hours customers can book.
const DEFAULT_OPEN = '10:30'
const DEFAULT_CLOSE = '20:00'
const DEFAULT_INTERVAL = 30

export function buildBusinessInfo(tenant: BotTenant, config: Record<string, string | null | undefined>) {
  const pick = (key: string) => (config[key] ?? '').trim() || null
  const apertura = pick('horario_apertura') || DEFAULT_OPEN
  const cierre = pick('horario_cierre') || DEFAULT_CLOSE
  const interval = Number.parseInt(pick('intervalo_citas') ?? '', 10)

  return {
    nombre: pick('sitio_nombre') || tenant.nombre,
    direccion: pick('sitio_direccion') || tenant.direccion,
    telefono: pick('sitio_telefono') || tenant.telefono,
    timezone: tenant.timezone,
    moneda: pick('sitio_moneda') || tenant.moneda,
    horarios: {
      // Monday to Friday
      semana: { abierto: true, apertura, cierre },
      sabado: {
        abierto: true,
        apertura: pick('horario_sabado_apertura') || apertura,
        cierre: pick('horario_sabado_cierre') || cierre,
      },
      domingo: {
        abierto: pick('horario_domingo_activo') === 'true',
        apertura: pick('horario_domingo_apertura') || apertura,
        cierre: pick('horario_domingo_cierre') || cierre,
      },
    },
    intervalo_citas_minutos: Number.isFinite(interval) ? Math.min(120, Math.max(5, interval)) : DEFAULT_INTERVAL,
    enlaces: {
      google_maps: pick('google_maps_url'),
      instagram: pick('instagram_url'),
      facebook: pick('facebook_url'),
      whatsapp: pick('whatsapp_numero'),
    },
  }
}
