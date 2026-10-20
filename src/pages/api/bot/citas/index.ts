import { botRoute, sendBotData, sendBotError } from '@/lib/bot/api'
import {
  BOT_CITA_COLUMNS,
  HISTORY_SCAN_LIMIT,
  botBookingNotes,
  presentStoredCita,
  sendBookingFailure,
  summarizeCustomer,
} from '@/lib/bot/citas'
import { firstError, readJsonBody, validateBookingDate } from '@/lib/bot/validation'
import { isUuid, validateClienteNombre, validateEmail, validateHora, validateNotas, validateServiceIds } from '@/lib/booking-validation'
import { createBooking } from '@/lib/booking/create'
import { normalizeCustomerPhone, phoneLookupVariants } from '@/lib/booking/phone'

/**
 * GET  /api/bot/citas?telefono= — upcoming bookings and history of one customer.
 * POST /api/bot/citas          — books an appointment with the website rules.
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

  POST: async (req, res, { db, tenant }) => {
    const body = readJsonBody(req)
    if (!body) return sendBotError(res, 400, 'DATOS_INVALIDOS', 'Cuerpo JSON inválido')
    const telefono = normalizeCustomerPhone(body.telefono)
    const invalid = firstError(
      telefono ? null : 'Teléfono inválido',
      validateClienteNombre(body.nombre),
      validateServiceIds(body.servicios_ids),
      isUuid(body.barbero_id) ? null : 'Barbero inválido',
      validateBookingDate(body.fecha, tenant.timezone),
      validateHora(body.hora),
      validateEmail(body.email),
      validateNotas(body.notas),
    )
    if (invalid || !telefono) return sendBotError(res, 400, 'DATOS_INVALIDOS', invalid ?? 'Teléfono inválido')

    const result = await createBooking(db, {
      barbero_id: body.barbero_id,
      servicios_ids: body.servicios_ids,
      fecha: body.fecha,
      hora: body.hora,
      cliente_nombre: body.nombre.trim(),
      cliente_telefono: telefono,
      cliente_email: body.email || null,
      notas: botBookingNotes(body.notas),
    }, {
      comercioId: tenant.id,
      telefonosCliente: phoneLookupVariants(telefono),
      timeZone: tenant.timezone,
    })
    if (!result.ok) return sendBookingFailure(res, result.failure)

    return sendBotData(res, await presentStoredCita(db, tenant, result.cita, result.barbero), 201)
  },
})
