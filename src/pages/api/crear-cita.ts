import { validateBookingInput } from '@/lib/booking-validation'
import { applyRateLimit } from '@/lib/security/rateLimit'
import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient } from '@/lib/supabase-server'
import type { Database } from '@/lib/database.types'
import { RESERVATION_LIMITS, validateReservationLimits } from '@/lib/reservations-config'
import { sendNotificationToBarber } from '../../lib/onesignal'

type CitaInsert = Database['public']['Tables']['citas']['Insert']

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') console.log(...args)
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
    devLog('🔵 [crear-cita] Creating Supabase client...')

    const supabase = createPagesAdminClient()

    const citaData: any = req.body
    devLog('🔵 [crear-cita] Request data:', JSON.stringify(citaData, null, 2))

    const serviciosIds: string[] = citaData.servicios_ids || (citaData.servicio_id ? [citaData.servicio_id] : [])

    if (serviciosIds.length === 0 || !citaData.barbero_id || !citaData.fecha ||
      !citaData.hora || !citaData.cliente_nombre || !citaData.cliente_telefono) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        details: 'servicio(s), barbero_id, fecha, hora, cliente_nombre y cliente_telefono son obligatorios'
      })
    }

    devLog('🔍 [crear-cita] Checking active future appointments for:', citaData.cliente_telefono)

    // Obtener comercio_id del barbero temprano para usarlo en todos los filtros tenant
    const { data: barberoTenant } = await supabase
      .from('barberos')
      .select('comercio_id')
      .eq('id', citaData.barbero_id)
      .single()
    const comercioId = (barberoTenant as any)?.comercio_id
    if (!comercioId) return res.status(400).json({ error: 'Barbero no disponible' })

    // Obtener fecha y hora actual en Santiago de Chile
    const { getChileAhora, getChileHoy } = await import('../../lib/date-utils');
    const currentChileTime = getChileAhora();
    const fechaActual = getChileHoy();
    const horaActual = String(currentChileTime.getHours()).padStart(2, '0') + ':' +
      String(currentChileTime.getMinutes()).padStart(2, '0');

    const { data: citasActivasFuturas, error: errorActivas } = await supabase
      .from('citas')
      .select('id, fecha, hora, estado')
      .eq('cliente_telefono', citaData.cliente_telefono)
      .eq('comercio_id', comercioId)
      .in('estado', RESERVATION_LIMITS.ACTIVE_STATES)
      .or(`fecha.gt.${fechaActual},and(fecha.eq.${fechaActual},hora.gte.${horaActual})`)

    if (errorActivas) {
      console.error('❌ [crear-cita] Error checking active appointments:', errorActivas)
      return res.status(503).json({ error: 'No se pudo verificar la disponibilidad' })
    } else {
      devLog('✅ [crear-cita] Active future appointments:', citasActivasFuturas?.length || 0)
    }

    const validationResult = validateReservationLimits(citasActivasFuturas?.length || 0)

    if (!validationResult.allowed) {
      devLog('⚠️ [crear-cita] Appointment limit reached:', validationResult)
      return res.status(400).json({
        error: validationResult.reason,
        code: 'LIMITE_CITAS_ALCANZADO',
        citas_activas: validationResult.currentCount,
        limite_maximo: validationResult.maxLimit,
        info: RESERVATION_LIMITS.ERROR_MESSAGES.CONTACT_INFO
      })
    }

    // 🛡️ STEP 3: Validación de Disponibilidad Robusta (Rango y Bloqueos)

    // 1. Verificar que el barbero existe y está activo (LO NECESITAMOS PARA CONTINUAR)
    const { data: barbero, error: barberoError } = await supabase
      .from('barberos')
      .select('id, nombre, apellido, activo')
      .eq('id', citaData.barbero_id)
      .single()

    if (barberoError || !barbero || !(barbero as any).activo) {
      return res.status(400).json({
        error: 'El barbero seleccionado no está disponible',
        code: 'BARBERO_NO_DISPONIBLE'
      })
    }

    // 2. Verificar que todos los servicios existen y están activos (LO NECESITAMOS PARA CALCULAR DURACIÓN)
    // Usamos un Set para obtener IDs únicos y cargarlos todos a la vez
    const uniqueServiciosIds = Array.from(new Set(serviciosIds))
    const { data: serviciosData, error: serviciosError } = await supabase
      .from('servicios')
      .select('id, nombre, activo, duracion_minutos, tiempo_buffer, precio')
      .in('id', uniqueServiciosIds)
      .eq('comercio_id', comercioId)

    if (serviciosError || !serviciosData || serviciosData.length !== uniqueServiciosIds.length) {
      return res.status(400).json({
        error: 'Uno o más servicios seleccionados no están disponibles',
        code: 'SERVICIO_NO_DISPONIBLE'
      })
    }

    const serviciosInactivos = (serviciosData as any[]).filter((s: any) => !s.activo)
    if (serviciosInactivos.length > 0) {
      return res.status(400).json({
        error: `Servicio(s) no disponible(s): ${serviciosInactivos.map((s: any) => s.nombre).join(', ')}`,
        code: 'SERVICIO_NO_DISPONIBLE'
      })
    }

    // 3. Calcular duración y tiempos de la nueva cita (incluyendo BUFFER)
    // Crear un mapa para acceso rápido
    const servMap = new Map((serviciosData as any[]).map(s => [s.id, s]))

    // IMPORTANTE: Sumar duración por cada ocurrencia en el array serviciosIds
    const totalServiciosMinutos = serviciosIds.reduce((sum: number, id: string) => {
      const s = servMap.get(id)
      return sum + (s?.duracion_minutos ?? 30)
    }, 0)

    // Usamos el buffer máximo de los servicios seleccionados como margen de limpieza final
    const tiempoBuffer = (serviciosData as any[]).reduce((max: number, s: any) => Math.max(max, s.tiempo_buffer ?? 5), 0)

    const duracionNuevaCita = totalServiciosMinutos + tiempoBuffer
    // Use the same database rules as the booking calendar, including Sunday
    // closures, pauses, full service duration and the business timezone.
    const { data: slots, error: availabilityError } = await supabase.rpc('get_horarios_disponibles', {
      p_barbero_id: citaData.barbero_id, p_fecha: citaData.fecha, p_duracion_minutos: duracionNuevaCita,
    })
    if (availabilityError || !Array.isArray(slots)) return res.status(503).json({ error: 'No se pudo verificar la disponibilidad' })
    if (!slots.some((slot: any) => slot.hora === citaData.hora && slot.disponible === true)) {
      return res.status(409).json({ error: 'El horario ya no está disponible. Selecciona otro horario.', code: 'HORARIO_NO_DISPONIBLE' })
    }

    // PREPARAR DATOS PARA INSERTAR
    // Si hay múltiples servicios, agregar la información a las notas
    let notasCompletas = citaData.notas || ''

    const counts = serviciosIds.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const items = Object.entries(counts).map(([id, quantity]) => {
      const s = servMap.get(id)
      return {
        servicio_id: id,
        nombre: s?.nombre || 'Servicio',
        precio: s?.precio || 0,
        cantidad: quantity,
        duracion_minutos: s?.duracion_minutos ?? 30,
        tiempo_buffer: s?.tiempo_buffer ?? 5,
        subtotal: (s?.precio || 0) * quantity
      }
    })

    const totalCalculado = items.reduce((sum: number, i: any) => sum + i.subtotal, 0)

    if (serviciosIds.length > 1) {
      const nombresServicios = items.map((i: any) => `${i.nombre} (${i.cantidad})`).join(', ')
      const infoServicios = `\n\n[SERVICIOS SOLICITADOS: ${nombresServicios}]`
      notasCompletas = notasCompletas + infoServicios
    }

    // Preparar datos de la cita (usando primer servicio para compatibilidad)
    const citaInsert: any = {
      servicio_id: serviciosIds[0], // Primer servicio (obligatorio por compatibilidad DB)
      barbero_id: citaData.barbero_id,
      comercio_id: comercioId,
      fecha: citaData.fecha,
      hora: citaData.hora,
      cliente_nombre: citaData.cliente_nombre,
      cliente_telefono: citaData.cliente_telefono,
      cliente_email: citaData.cliente_email || null,
      notas: notasCompletas || null,
      estado: 'pendiente',
      items: items,
      precio_final: totalCalculado
    }

    devLog('💾 [crear-cita] Inserting appointment...')
    const { data: nuevaCita, error: insertError } = await supabase
      .from('citas')
      // @ts-ignore - Bypass strict type checking for insert operation in build environment
      .insert([citaInsert])
      .select()
      .single()

    if (insertError) {
      console.error('❌ [crear-cita] Error inserting appointment:', insertError)

      // Manejar error de constraint único (race condition)
      if (['23505', '23P01'].includes(insertError.code)) {
        return res.status(409).json({
          error: '⚠️ Este horario fue reservado mientras completabas el formulario. Por favor selecciona otro horario.',
          code: 'RACE_CONDITION'
        })
      }

      return res.status(500).json({
        error: 'Error al crear la cita',
        details: insertError.message
      })
    }

    devLog('✅ [crear-cita] Appointment created successfully:', (nuevaCita as any)?.id)

    // Realtime: notificar a las pantallas suscritas (panel barbero, /barber-app)
    try {
      const { publishCitaChange } = await import('@/lib/realtime-publish')
      await publishCitaChange(supabase, 'INSERT', nuevaCita as any)
    } catch (rtErr) {
      console.warn('[crear-cita] realtime publish skipped:', rtErr)
    }

    try {
      const { formatFechaChile } = await import('../../lib/date-utils');
      const barberoNombre = (barbero as any)?.nombre || 'Barbero'
      const fechaLegible = formatFechaChile(citaData.fecha);
      await sendNotificationToBarber(
        citaData.barbero_id,
        'Nueva Reserva ✂️',
        `Hola ${barberoNombre}, tienes una nueva reserva de ${citaData.cliente_nombre} para el ${fechaLegible} a las ${citaData.hora}.`
      )
    } catch (pushError) {
      console.error('⚠️ [crear-cita] Error al enviar notificación push:', pushError)
    }

    // Security logging está implementado en src/lib/security/logger.ts
    // Para activarlo, descomentar:
    // const { logSecurityEvent, SecurityEventType } = await import('../../../lib/security/logger')
    // logSecurityEvent({ eventType: SecurityEventType.DATA_MODIFICATION, ... })

    return res.status(201).json({
      success: true,
      data: nuevaCita,
      message: '¡Cita reservada exitosamente! Te contactaremos pronto para confirmar.'
    })

  } catch (error) {
    console.error('❌ [crear-cita] Unexpected error:', error)

    // API error logging está implementado en src/lib/security/logger.ts
    // Para activarlo, descomentar:
    // if (error instanceof Error) {
    //   const { logApiError } = await import('../../../lib/security/logger')
    //   logApiError('/api/crear-cita', 'POST', error, clientIp as string)
    // }

    return res.status(500).json({ error: 'Error interno al crear la cita' })
  }
}
