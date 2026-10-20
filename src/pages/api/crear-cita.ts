import { validateBookingInput } from '@/lib/booking-validation'
import { applyRateLimit } from '@/lib/security/rateLimit'
import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient } from '@/lib/supabase-server'
import { RESERVATION_LIMITS } from '@/lib/reservations-config'
import { createBooking, type CreateBookingFailure } from '@/lib/booking/create'

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') console.log(...args)
}

/** Public website responses for each shared booking failure (kept byte-for-byte). */
function failureResponse(failure: CreateBookingFailure): { status: number; body: Record<string, unknown> } {
  switch (failure.code) {
    case 'BARBERO_SIN_COMERCIO':
      return { status: 400, body: { error: 'Barbero no disponible' } }
    case 'VERIFICACION_FALLIDA':
      return { status: 503, body: { error: 'No se pudo verificar la disponibilidad' } }
    case 'LIMITE_CITAS_ALCANZADO':
      return {
        status: 400,
        body: {
          error: failure.message,
          code: failure.code,
          citas_activas: failure.citasActivas,
          limite_maximo: failure.limiteMaximo,
          info: RESERVATION_LIMITS.ERROR_MESSAGES.CONTACT_INFO,
        },
      }
    case 'BARBERO_NO_DISPONIBLE':
      return { status: 400, body: { error: 'El barbero seleccionado no está disponible', code: failure.code } }
    case 'SERVICIO_NO_DISPONIBLE':
      return { status: 400, body: { error: failure.message, code: failure.code } }
    case 'HORARIO_NO_DISPONIBLE':
      return { status: 409, body: { error: 'El horario ya no está disponible. Selecciona otro horario.', code: failure.code } }
    case 'RACE_CONDITION':
      return {
        status: 409,
        body: { error: '⚠️ Este horario fue reservado mientras completabas el formulario. Por favor selecciona otro horario.', code: failure.code },
      }
    case 'ERROR_INSERCION':
      return { status: 500, body: { error: 'Error al crear la cita', details: failure.detail } }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  devLog('🔵 [crear-cita] Request received:', req.method, 'from IP:', clientIp)

  // Solo permitir POST
  if (req.method !== 'POST') {
    console.log('❌ [crear-cita] Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!(await applyRateLimit(req, res)).allowed) return
  const invalidInput = validateBookingInput(req.body)
  if (invalidInput) return res.status(400).json({ error: invalidInput })

  try {
    const supabase = createPagesAdminClient()

    const citaData: any = req.body
    const serviciosIds: string[] = citaData.servicios_ids || (citaData.servicio_id ? [citaData.servicio_id] : [])

    if (serviciosIds.length === 0 || !citaData.barbero_id || !citaData.fecha ||
      !citaData.hora || !citaData.cliente_nombre || !citaData.cliente_telefono) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        details: 'servicio(s), barbero_id, fecha, hora, cliente_nombre y cliente_telefono son obligatorios'
      })
    }

    // Prices, duration, tenant and availability are resolved server-side;
    // client-sent items/precio_final are ignored.
    const result = await createBooking(supabase, {
      barbero_id: citaData.barbero_id,
      servicios_ids: serviciosIds,
      fecha: citaData.fecha,
      hora: citaData.hora,
      cliente_nombre: citaData.cliente_nombre,
      cliente_telefono: citaData.cliente_telefono,
      cliente_email: citaData.cliente_email || null,
      notas: citaData.notas || '',
    })

    if (!result.ok) {
      devLog('⚠️ [crear-cita] Booking rejected:', result.failure.code)
      const { status, body } = failureResponse(result.failure)
      return res.status(status).json(body)
    }

    devLog('✅ [crear-cita] Appointment created successfully:', result.cita?.id)

    return res.status(201).json({
      success: true,
      data: result.cita,
      message: '¡Cita reservada exitosamente! Te contactaremos pronto para confirmar.'
    })

  } catch (error) {
    console.error('❌ [crear-cita] Unexpected error:', error)
    return res.status(500).json({ error: 'Error interno al crear la cita' })
  }
}
