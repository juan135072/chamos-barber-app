import { botRoute, sendBotData, sendBotError } from '@/lib/bot/api'
import { presentStoredCita, sendBookingFailure } from '@/lib/bot/citas'
import { firstError, readJsonBody, validateBookingDate } from '@/lib/bot/validation'
import { isUuid, validateHora } from '@/lib/booking-validation'
import { rescheduleBooking } from '@/lib/booking/change'
import { normalizeCustomerPhone, phoneLookupVariants } from '@/lib/booking/phone'

/**
 * POST /api/bot/citas/reagendar — moves the customer's booking to a new
 * date/time (and optionally another barber). See docs/bot-api.md for the 2 h
 * rule and how the booking's own slot is handled.
 */
export default botRoute({
  POST: async (req, res, { db, tenant }) => {
    const body = readJsonBody(req)
    if (!body) return sendBotError(res, 400, 'DATOS_INVALIDOS', 'Cuerpo JSON inválido')
    const telefono = normalizeCustomerPhone(body.telefono)
    const invalid = firstError(
      telefono ? null : 'Teléfono inválido',
      isUuid(body.cita_id) ? null : 'Cita inválida',
      validateBookingDate(body.fecha, tenant.timezone),
      validateHora(body.hora),
      body.barbero_id == null || isUuid(body.barbero_id) ? null : 'Barbero inválido',
    )
    if (invalid || !telefono) return sendBotError(res, 400, 'DATOS_INVALIDOS', invalid ?? 'Teléfono inválido')

    const result = await rescheduleBooking(db, {
      comercioId: tenant.id,
      citaId: body.cita_id,
      telefonos: phoneLookupVariants(telefono),
      fecha: body.fecha,
      hora: body.hora,
      barberoId: body.barbero_id ?? undefined,
      timeZone: tenant.timezone,
    })
    if (!result.ok) return sendBookingFailure(res, result.failure)

    return sendBotData(res, await presentStoredCita(db, tenant, result.cita, result.barbero))
  },
})
