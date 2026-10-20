import { botRoute, sendBotData, sendBotError } from '@/lib/bot/api'
import { presentStoredCita, sendBookingFailure } from '@/lib/bot/citas'
import { firstError, readJsonBody } from '@/lib/bot/validation'
import { isUuid } from '@/lib/booking-validation'
import { cancelBooking } from '@/lib/booking/change'
import { normalizeCustomerPhone, phoneLookupVariants } from '@/lib/booking/phone'

/** POST /api/bot/citas/cancelar — cancels the customer's booking (2 h rule applies). */
export default botRoute({
  POST: async (req, res, { db, tenant }) => {
    const body = readJsonBody(req)
    if (!body) return sendBotError(res, 400, 'DATOS_INVALIDOS', 'Cuerpo JSON inválido')
    const telefono = normalizeCustomerPhone(body.telefono)
    const invalid = firstError(
      telefono ? null : 'Teléfono inválido',
      isUuid(body.cita_id) ? null : 'Cita inválida',
    )
    if (invalid || !telefono) return sendBotError(res, 400, 'DATOS_INVALIDOS', invalid ?? 'Teléfono inválido')

    const result = await cancelBooking(db, {
      comercioId: tenant.id,
      citaId: body.cita_id,
      telefonos: phoneLookupVariants(telefono),
      timeZone: tenant.timezone,
    })
    if (!result.ok) return sendBookingFailure(res, result.failure)

    return sendBotData(res, await presentStoredCita(db, tenant, result.cita))
  },
})
