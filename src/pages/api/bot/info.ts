import { botRoute, sendBotData } from '@/lib/bot/api'
import { BUSINESS_INFO_KEYS, buildBusinessInfo } from '@/lib/bot/business-info'

/** GET /api/bot/info — business name, contact data, opening hours and links. */
export default botRoute({
  GET: async (_req, res, { db, tenant }) => {
    const { data, error } = await db
      .from('sitio_configuracion')
      .select('clave, valor')
      .eq('comercio_id', tenant.id)
      .in('clave', BUSINESS_INFO_KEYS)
    if (error) throw new Error(`Settings lookup failed: ${error.message}`)

    const config = Object.fromEntries((data || []).map((row: any) => [row.clave, row.valor]))
    return sendBotData(res, buildBusinessInfo(tenant, config))
  },
})
