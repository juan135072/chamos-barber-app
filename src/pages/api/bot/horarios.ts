import { botRoute, sendBotData, sendBotError } from '@/lib/bot/api'
import { firstError, readJsonBody, validateBookingDate } from '@/lib/bot/validation'
import { isUuid, validateServiceIds } from '@/lib/booking-validation'
import { availableHours, fetchSlots } from '@/lib/booking/availability'
import { bookingDuration, loadBookableServices } from '@/lib/booking/services'

/**
 * POST /api/bot/horarios — available start times for the requested services
 * on one date, for one barber or for every active barber of the tenant.
 * The duration is always computed server-side from the catalog.
 */
export default botRoute({
  POST: async (req, res, { db, tenant }) => {
    const body = readJsonBody(req)
    if (!body) return sendBotError(res, 400, 'DATOS_INVALIDOS', 'Cuerpo JSON inválido')
    const invalid = firstError(
      validateServiceIds(body.servicios_ids),
      validateBookingDate(body.fecha, tenant.timezone),
      body.barbero_id == null || isUuid(body.barbero_id) ? null : 'Barbero inválido',
    )
    if (invalid) return sendBotError(res, 400, 'DATOS_INVALIDOS', invalid)

    const lookup = await loadBookableServices(db, tenant.id, body.servicios_ids)
    if (!lookup.ok) return sendBotError(res, 400, 'SERVICIO_NO_DISPONIBLE', lookup.message)
    const duracion = bookingDuration(body.servicios_ids, lookup.services)

    let query = db
      .from('barberos')
      .select('id, nombre, apellido')
      .eq('comercio_id', tenant.id)
      .eq('activo', true)
    if (body.barbero_id) query = query.eq('id', body.barbero_id)
    const { data: barberos, error } = await query.order('nombre')
    if (error) throw new Error(`Barbers lookup failed: ${error.message}`)
    if (body.barbero_id && !barberos?.length) {
      return sendBotError(res, 400, 'BARBERO_NO_DISPONIBLE', 'El barbero seleccionado no está disponible')
    }

    const result = await Promise.all((barberos || []).map(async (barbero: any) => {
      const slots = await fetchSlots(db, barbero.id, body.fecha, duracion)
      if (!slots) throw new Error(`Availability lookup failed for barber ${barbero.id}`)
      return { id: barbero.id, nombre: barbero.nombre, apellido: barbero.apellido ?? null, horarios: availableHours(slots) }
    }))

    return sendBotData(res, { fecha: body.fecha, duracion_minutos: duracion, barberos: result })
  },
})
