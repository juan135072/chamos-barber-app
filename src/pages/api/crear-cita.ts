import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../lib/database.types'
import { RESERVATION_LIMITS, validateReservationLimits } from '../../../lib/reservations-config'
import { sendNotificationToBarber } from '../../lib/onesignal'

// Build Version: 2025-12-11-v6 - Security improvements (rate limiting ready, inline implementation)

type CitaInsert = Database['public']['Tables']['citas']['Insert']

/**
 * API Route para crear citas usando SERVICE_ROLE_KEY
 * Bypassa las políticas RLS para permitir INSERT público
 * 
 * Esta solución es necesaria porque las políticas RLS actuales
 * no permiten INSERT con ANON_KEY
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  console.log('🔵 [crear-cita] Request received:', req.method, 'from IP:', clientIp)

  // Solo permitir POST
  if (req.method !== 'POST') {
    console.log('❌ [crear-cita] Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 🛡️ Rate Limiting está implementado en src/lib/security/rateLimit.ts
  // Para activarlo, descomentar:
  // const { applyRateLimit } = await import('../../../lib/security/rateLimit')
  // const rateLimitResult = await applyRateLimit(req, res)
  // if (!rateLimitResult.allowed) return

  try {
    console.log('🔵 [crear-cita] Creating Supabase client...')

    // Verificar variables de entorno
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('❌ [crear-cita] NEXT_PUBLIC_SUPABASE_URL not found')
      return res.status(500).json({ error: 'Configuración de Supabase no encontrada' })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ [crear-cita] SUPABASE_SERVICE_ROLE_KEY not found')
      return res.status(500).json({ error: 'Clave de servicio de Supabase no encontrada' })
    }

    // Crear cliente Supabase con SERVICE_ROLE_KEY
    // Esto bypassa todas las políticas RLS
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('✅ [crear-cita] Supabase client created')

    // 🛡️ STEP 2: Validación mejorada
    const citaData: any = req.body
    console.log('🔵 [crear-cita] Request data:', JSON.stringify(citaData, null, 2))

    // Extraer servicios_ids (nuevo formato) o servicio_id (legacy)
    const serviciosIds: string[] = citaData.servicios_ids || (citaData.servicio_id ? [citaData.servicio_id] : [])

    console.log('🔵 [crear-cita] Services to book:', serviciosIds)

    // VALIDACIÓN 1: Verificar que tenemos todos los campos requeridos
    if (serviciosIds.length === 0 || !citaData.barbero_id || !citaData.fecha ||
      !citaData.hora || !citaData.cliente_nombre || !citaData.cliente_telefono) {
      console.log('❌ [crear-cita] Missing required fields')
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        details: 'servicio(s), barbero_id, fecha, hora, cliente_nombre y cliente_telefono son obligatorios'
      })
    }

    // VALIDACIÓN 2: Verificar límite de citas FUTURAS activas (sistema inteligente)
    // Solo cuenta citas pendientes/confirmadas que aún no han pasado
    // Esto permite a clientes frecuentes seguir reservando después de completar sus citas
    console.log('🔍 [crear-cita] Checking active future appointments for:', citaData.cliente_telefono)

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
      .in('estado', RESERVATION_LIMITS.ACTIVE_STATES)
      .or(`fecha.gt.${fechaActual},and(fecha.eq.${fechaActual},hora.gte.${horaActual})`)

    if (errorActivas) {
      console.error('❌ [crear-cita] Error checking active appointments:', errorActivas)
    } else {
      console.log('✅ [crear-cita] Active future appointments:', citasActivasFuturas?.length || 0)
      // @ts-ignore - Detailed logging for debugging
      if (citasActivasFuturas && citasActivasFuturas.length > 0) {
        console.log('📊 [crear-cita] Appointments details:', JSON.stringify(citasActivasFuturas))
      }
    }

    // Validar límites usando la función helper
    const validationResult = validateReservationLimits(citasActivasFuturas?.length || 0)

    if (!validationResult.allowed) {
      console.log('⚠️ [crear-cita] Appointment limit reached:', validationResult)
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
    const { data: serviciosData, error: serviciosError } = await supabase
      .from('servicios')
      .select('id, nombre, activo, duracion_minutos, tiempo_buffer')
      .in('id', serviciosIds)

    if (serviciosError || !serviciosData || serviciosData.length !== serviciosIds.length) {
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
    const totalServiciosMinutos = (serviciosData as any[]).reduce((sum: number, s: any) => sum + (s.duracion_minutos || 30), 0)
    // Usamos el buffer máximo de los servicios seleccionados como margen de limpieza final
    const tiempoBuffer = (serviciosData as any[]).reduce((max: number, s: any) => Math.max(max, s.tiempo_buffer || 5), 0)

    const duracionNuevaCita = totalServiciosMinutos + tiempoBuffer
    const [hStart, mStart] = citaData.hora.split(':').map(Number)
    const totalMinutosInicio = hStart * 60 + mStart
    const totalMinutosFin = totalMinutosInicio + duracionNuevaCita

    console.log(`⏱️ [crear-cita] Validando rango: ${citaData.hora} (${totalMinutosInicio}m) -> Serv: ${totalServiciosMinutos}m + Buff: ${tiempoBuffer}m -> Final: (${totalMinutosFin}m)`)

    // 4. Verificar Horario de Atención (horarios_atencion)
    const diaSemana = new Date(citaData.fecha + 'T12:00:00').getDay()
    const { data: horarioAtencion } = await supabase
      .from('horarios_atencion')
      .select('hora_inicio, hora_fin, activo')
      .eq('barbero_id', citaData.barbero_id)
      .eq('dia_semana', diaSemana)
      .eq('activo', true)
      .single()

    if (horarioAtencion) {
      const hAtStartStr = (horarioAtencion as any).hora_inicio
      const hAtEndStr = (horarioAtencion as any).hora_fin
      const [hAtStart, mAtStart] = hAtStartStr.split(':').map(Number)
      const [hAtEnd, mAtEnd] = hAtEndStr.split(':').map(Number)
      const minAtStart = hAtStart * 60 + mAtStart
      const minAtEnd = hAtEnd * 60 + mAtEnd

      if (totalMinutosInicio < minAtStart || totalMinutosFin > minAtEnd) {
        return res.status(400).json({
          error: `⚠️ El barbero no atiende en este horario o el servicio excede su hora de salida (${hAtEndStr}).`,
          code: 'FUERA_DE_HORARIO'
        })
      }
    }

    // 5. Verificar Solapamientos con Citas Existentes (Rango)
    const { data: citasDelDia } = await supabase
      .from('citas')
      .select('id, hora, notas, servicio_id')
      .eq('barbero_id', citaData.barbero_id)
      .eq('fecha', citaData.fecha)
      .in('estado', ['pendiente', 'confirmada'])

    // Obtener todos los servicios para validar duraciones exactas de citas existentes
    const { data: allServices } = await supabase
      .from('servicios')
      .select('id, duracion_minutos, tiempo_buffer')

    const servicesMap = new Map<string, any>(allServices?.map((s: any) => [s.id, s]) || [])

    for (const cita of (citasDelDia || [])) {
      const citaAny = cita as any
      const [hCita, mCita] = citaAny.hora.split(':').map(Number)
      const minCitaInicio = hCita * 60 + mCita

      let duracionExistente = 30
      if (citaAny.notas && citaAny.notas.includes('[SERVICIOS SOLICITADOS:')) {
        duracionExistente = 60 + 5 // Estimación con buffer
      } else {
        const sInfo = servicesMap.get(citaAny.servicio_id)
        duracionExistente = (sInfo?.duracion_minutos || 30) + (sInfo?.tiempo_buffer || 5)
      }

      const minCitaFin = minCitaInicio + duracionExistente

      if (totalMinutosInicio < minCitaFin && totalMinutosFin > minCitaInicio) {
        return res.status(409).json({
          error: '⚠️ Este horario se solapa con otra cita ya reservada. Por favor selecciona otro horario.',
          code: 'HORARIO_OCUPADO_SOLAPAMIENTO'
        })
      }
    }

    // 6. Verificar Solapamientos con Horarios Bloqueados (Descansos, etc)
    const { data: bloqueos } = await supabase
      .from('horarios_bloqueados')
      .select('fecha_hora_inicio, fecha_hora_fin')
      .eq('barbero_id', citaData.barbero_id)

    const bloqueosDelDia = (bloqueos || []).filter(b => {
      const inicio = new Date((b as any).fecha_hora_inicio)
      return inicio.toISOString().split('T')[0] === citaData.fecha
    })

    for (const bloqueo of bloqueosDelDia) {
      const bAny = bloqueo as any
      const dInicio = new Date(bAny.fecha_hora_inicio)
      const dFin = new Date(bAny.fecha_hora_fin)
      const minBlInicio = dInicio.getHours() * 60 + dInicio.getMinutes()
      const minBlFin = dFin.getHours() * 60 + dFin.getMinutes()

      if (totalMinutosInicio < minBlFin && totalMinutosFin > minBlInicio) {
        return res.status(409).json({
          error: '⚠️ El barbero tiene este horario bloqueado (descanso o compromiso).',
          code: 'HORARIO_BLOQUEADO'
        })
      }
    }

    // 7. Verificar que no sea una hora pasada (Diferencia horaria Chile)
    const fechaHoraReserva = new Date(`${citaData.fecha}T${citaData.hora}:00`)

    if (fechaHoraReserva <= currentChileTime) {
      return res.status(400).json({
        error: '⚠️ No puedes reservar una cita en el pasado. Por favor selecciona otra fecha u hora.',
        code: 'FECHA_PASADA'
      })
    }

    // PREPARAR DATOS PARA INSERTAR
    // Si hay múltiples servicios, agregar la información a las notas
    let notasCompletas = citaData.notas || ''

    if (serviciosIds.length > 1) {
      const nombresServicios = (serviciosData as any[]).map((s: any) => s.nombre).join(', ')
      const infoServicios = `\n\n[SERVICIOS SOLICITADOS: ${nombresServicios}]`
      notasCompletas = notasCompletas + infoServicios
    }

    // Preparar datos de la cita (usando primer servicio para compatibilidad)
    const citaInsert: CitaInsert = {
      servicio_id: serviciosIds[0], // Primer servicio (obligatorio por compatibilidad DB)
      barbero_id: citaData.barbero_id,
      fecha: citaData.fecha,
      hora: citaData.hora,
      cliente_nombre: citaData.cliente_nombre,
      cliente_telefono: citaData.cliente_telefono,
      cliente_email: citaData.cliente_email || null,
      notas: notasCompletas || null,
      estado: citaData.estado || 'pendiente'
    }

    // INSERTAR LA CITA
    // Usando SERVICE_ROLE_KEY, esto bypassa RLS
    console.log('💾 [crear-cita] Inserting appointment...')
    const { data: nuevaCita, error: insertError } = await supabase
      .from('citas')
      // @ts-ignore - Bypass strict type checking for insert operation in build environment
      .insert([citaInsert])
      .select()
      .single()

    if (insertError) {
      console.error('❌ [crear-cita] Error inserting appointment:', insertError)

      // Manejar error de constraint único (race condition)
      if (insertError.code === '23505') {
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

    // ÉXITO
    // @ts-ignore - nuevaCita is guaranteed to exist here if no insertError
    console.log('✅ [crear-cita] Appointment created successfully:', nuevaCita.id)

    // 🔔 Enviar notificación push al barbero
    try {
      const { formatFechaChile } = await import('../../lib/date-utils');
      const barberoNombre = (barbero as any)?.nombre || 'Barbero'
      const fechaLegible = formatFechaChile(citaData.fecha);

      console.log(`🔔 [crear-cita] Intentando notificar a barbero ${citaData.barbero_id} (${barberoNombre})`)
      const pushResult = await sendNotificationToBarber(
        citaData.barbero_id,
        'Nueva Reserva ✂️',
        `Hola ${barberoNombre}, tienes una nueva reserva de ${citaData.cliente_nombre} para el ${fechaLegible} a las ${citaData.hora}.`
      )
      console.log('📊 [crear-cita] Resultado OneSignal:', JSON.stringify(pushResult))
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

    // Manejo de error más detallado
    let errorMessage = 'Error interno del servidor'
    let errorDetails = 'Unknown error'

    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = error.stack || error.message
    }

    return res.status(500).json({
      error: errorMessage,
      details: errorDetails
    })
  }
}
