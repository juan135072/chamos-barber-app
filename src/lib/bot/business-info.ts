import type { BotTenant } from './api'
import { GENERAL_HOURS_KEYS, generalHours } from '@/lib/business-hours'

/**
 * Public site settings the agent may quote. Read with an explicit allow-list
 * so private keys (e.g. pos_clave_seguridad) can never reach the bot.
 */
export const BUSINESS_INFO_KEYS = [
  'sitio_nombre', 'sitio_direccion', 'sitio_telefono', 'sitio_moneda',
  ...GENERAL_HOURS_KEYS,
  'google_maps_url', 'instagram_url', 'facebook_url', 'whatsapp_numero',
]

export function buildBusinessInfo(tenant: BotTenant, config: Record<string, string | null | undefined>) {
  const pick = (key: string) => (config[key] ?? '').trim() || null
  // The same rules as the booking calendar, so the agent quotes the hours customers can book.
  const hours = generalHours(config)

  return {
    nombre: pick('sitio_nombre') || tenant.nombre,
    direccion: pick('sitio_direccion') || tenant.direccion,
    telefono: pick('sitio_telefono') || tenant.telefono,
    timezone: tenant.timezone,
    moneda: pick('sitio_moneda') || tenant.moneda,
    horarios: {
      // Monday to Friday
      semana: hours.semana,
      sabado: hours.sabado,
      domingo: hours.domingo,
    },
    intervalo_citas_minutos: hours.intervaloMinutos,
    enlaces: {
      google_maps: pick('google_maps_url'),
      instagram: pick('instagram_url'),
      facebook: pick('facebook_url'),
      whatsapp: pick('whatsapp_numero'),
    },
  }
}
