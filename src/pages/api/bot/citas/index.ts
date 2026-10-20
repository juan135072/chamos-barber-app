import { botRoute, sendBotData, sendBotError } from '@/lib/bot/api'
import { BOT_CITA_COLUMNS, HISTORY_SCAN_LIMIT, summarizeCustomer } from '@/lib/bot/citas'
import { normalizeCustomerPhone, phoneLookupVariants } from '@/lib/booking/phone'

/**
 * GET  /api/bot/citas?telefono= — upcoming bookings and history of one customer.
 */
export default botRoute({
  GET: async (req, res, { db, tenant }) => {
    const telefono = normalizeCustomerPhone(req.query.telefono)
    if (!telefono) return sendBotError(res, 400, 'DATOS_INVALIDOS', 'Teléfono inválido')

    // Scoped to the tenant and to this phone only: no other customer's data.
    const { data, error } = await db
      .from('citas')
      .select(BOT_CITA_COLUMNS)
      .eq('comercio_id', tenant.id)
      .in('cliente_telefono', phoneLookupVariants(telefono))
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false })
      .limit(HISTORY_SCAN_LIMIT)
    if (error) throw new Error(`Appointments lookup failed: ${error.message}`)

    return sendBotData(res, summarizeCustomer(telefono, data || [], tenant.timezone))
  },
})
