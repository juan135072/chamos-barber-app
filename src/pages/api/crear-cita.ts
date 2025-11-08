import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../lib/database.types'
import { RESERVATION_LIMITS, validateReservationLimits } from '../../../lib/reservations-config'

// Build Version: 2025-11-08-v4 - Smart reservation limits (future appointments only)

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
  console.log('🔵 [crear-cita] Request received:', req.method)
  
  // Solo permitir POST
  if (req.method !== 'POST') {
    console.log('❌ [crear-cita] Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

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

    const citaData: CitaInsert = req.body
    console.log('🔵 [crear-cita] Request data:', JSON.stringify(citaData, null, 2))

    // VALIDACIÓN 1: Verificar que tenemos todos los campos requeridos
    if (!citaData.servicio_id || !citaData.barbero_id || !citaData.fecha || 
        !citaData.hora || !citaData.cliente_nombre || !citaData.cliente_telefono) {
      console.log('❌ [crear-cita] Missing required fields')
      return res.status(400).json({ 
        error: 'Faltan campos requeridos',
        details: 'servicio_id, barbero_id, fecha, hora, cliente_nombre y cliente_telefono son obligatorios'
      })
    }

    // VALIDACIÓN 2: Verificar límite de citas FUTURAS activas (sistema inteligente)
    // Solo cuenta citas pendientes/confirmadas que aún no han pasado
    // Esto permite a clientes frecuentes seguir reservando después de completar sus citas
    console.log('🔍 [crear-cita] Checking active future appointments for:', citaData.cliente_telefono)
    
    const fechaActual = new Date().toISOString().split('T')[0] // YYYY-MM-DD formato
    const horaActual = new Date().toTimeString().split(' ')[0].substring(0, 5) // HH:MM formato
    
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

    // VALIDACIÓN 3: Verificar disponibilidad (evitar duplicados)
    const { data: existingCitas } = await supabase
      .from('citas')
      .select('id, cliente_nombre')
      .eq('barbero_id', citaData.barbero_id)
      .eq('fecha', citaData.fecha)
      .eq('hora', citaData.hora)
      .in('estado', ['pendiente', 'confirmada'])

    if (existingCitas && existingCitas.length > 0) {
      return res.status(409).json({ 
        error: '⚠️ Lo sentimos, este horario acaba de ser reservado por otro cliente. Por favor selecciona otro horario.',
        code: 'HORARIO_OCUPADO'
      })
    }

    // VALIDACIÓN 4: Verificar que no sea una hora pasada
    const fechaHora = new Date(`${citaData.fecha}T${citaData.hora}`)
    const ahora = new Date()
    
    if (fechaHora <= ahora) {
      return res.status(400).json({ 
        error: '⚠️ No puedes reservar una cita en el pasado. Por favor selecciona otra fecha u hora.',
        code: 'FECHA_PASADA'
      })
    }

    // VALIDACIÓN 4: Verificar que el barbero existe y está activo
    const { data: barbero, error: barberoError } = await supabase
      .from('barberos')
      .select('id, nombre, apellido, activo')
      .eq('id', citaData.barbero_id)
      .single()

    // @ts-ignore - Bypass strict type checking for barbero.activo in build environment
    if (barberoError || !barbero || !barbero.activo) {
      return res.status(400).json({ 
        error: 'El barbero seleccionado no está disponible',
        code: 'BARBERO_NO_DISPONIBLE'
      })
    }

    // VALIDACIÓN 6: Verificar que el servicio existe y está activo
    const { data: servicio, error: servicioError } = await supabase
      .from('servicios')
      .select('id, nombre, activo')
      .eq('id', citaData.servicio_id)
      .single()

    // @ts-ignore - Bypass strict type checking for servicio.activo in build environment
    if (servicioError || !servicio || !servicio.activo) {
      return res.status(400).json({ 
        error: 'El servicio seleccionado no está disponible',
        code: 'SERVICIO_NO_DISPONIBLE'
      })
    }

    // INSERTAR LA CITA
    // Usando SERVICE_ROLE_KEY, esto bypassa RLS
    console.log('💾 [crear-cita] Inserting appointment...')
    const { data: nuevaCita, error: insertError } = await supabase
      .from('citas')
      // @ts-ignore - Bypass strict type checking for insert operation in build environment
      .insert([citaData])
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
    
    return res.status(201).json({ 
      success: true,
      data: nuevaCita,
      message: '¡Cita reservada exitosamente! Te contactaremos pronto para confirmar.'
    })

  } catch (error) {
    console.error('❌ [crear-cita] Unexpected error:', error)
    
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
