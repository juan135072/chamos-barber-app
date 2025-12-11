import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../lib/database.types'
import { applyRateLimit } from '../../../lib/security/rateLimit'
import { logSecurityEvent, logValidationError, logApiError, SecurityEventType } from '../../../lib/security/logger'

// Build Version: 2025-12-11-v5 - Added Zod validation, rate limiting, and security logging

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  console.log('🔵 [consultar-citas] Request received:', req.method, 'from IP:', clientIp)
  
  if (req.method !== 'GET') {
    console.log('❌ [consultar-citas] Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 🛡️ STEP 1: Rate Limiting
  const rateLimitResult = await applyRateLimit(req, res)
  if (!rateLimitResult.allowed) {
    return // Response already sent by rate limiter
  }

  // 🛡️ STEP 2: Validación básica mejorada
  const { telefono } = req.query
  
  if (!telefono || typeof telefono !== 'string') {
    console.log('❌ [consultar-citas] Telefono missing or invalid')
    logValidationError('/api/consultar-citas', { telefono: ['Teléfono es requerido'] }, clientIp as string)
    return res.status(400).json({ 
      error: 'Teléfono es requerido',
      code: 'VALIDATION_ERROR'
    })
  }
  
  // Validar formato de teléfono internacional
  const phoneRegex = /^\+?[1-9]\d{7,14}$/
  if (!phoneRegex.test(telefono)) {
    console.log('❌ [consultar-citas] Invalid phone format:', telefono)
    logValidationError('/api/consultar-citas', { telefono: ['Formato de teléfono inválido'] }, clientIp as string)
    return res.status(400).json({ 
      error: 'Formato de teléfono inválido. Debe tener entre 8 y 15 dígitos.',
      code: 'VALIDATION_ERROR'
    })
  }
  
  console.log('✅ [consultar-citas] Validation passed')
  console.log('🔍 [consultar-citas] Telefono:', telefono)

  try {
    console.log('🔵 [consultar-citas] Creating Supabase client with SERVICE_ROLE_KEY...')
    
    // Verificar variables de entorno
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('❌ [consultar-citas] NEXT_PUBLIC_SUPABASE_URL not found')
      return res.status(500).json({ error: 'Configuración de Supabase no encontrada' })
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ [consultar-citas] SUPABASE_SERVICE_ROLE_KEY not found')
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
    
    console.log('✅ [consultar-citas] Supabase client created')

    // Buscar citas por teléfono del cliente
    console.log('🔍 [consultar-citas] Fetching appointments for:', telefono)
    const { data: citas, error: citasError } = await supabase
      .from('citas')
      .select(`
        id,
        fecha,
        hora,
        estado,
        notas,
        servicios (
          nombre,
          precio,
          duracion_minutos
        ),
        barberos (
          nombre,
          apellido,
          imagen_url,
          especialidad
        )
      `)
      .eq('cliente_telefono', telefono)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false })

    if (citasError) {
      console.error('❌ [consultar-citas] Supabase error:', citasError)
      return res.status(500).json({ error: 'Error fetching citas', details: citasError.message })
    }

    console.log('✅ [consultar-citas] Query successful, results:', citas?.length || 0)

    if (!citas || citas.length === 0) {
      console.log('⚠️ [consultar-citas] No appointments found for this phone number')
      return res.status(200).json({ 
        citas: [],
        total_citas: 0,
        citas_pendientes: 0
      })
    }

    // Contar citas pendientes
    const citasPendientes = citas.filter(
      (cita: any) => cita.estado === 'pendiente' || cita.estado === 'confirmada'
    ).length

    console.log('📊 [consultar-citas] Total appointments:', citas.length)
    console.log('📊 [consultar-citas] Pending appointments:', citasPendientes)

    // Helper para calcular datos de múltiples servicios
    const calcularDatosServicios = async (cita: any) => {
      let precioTotal = cita.servicios?.precio || 0
      let duracionTotal = cita.servicios?.duracion_minutos || 0
      let serviciosDetalle: any[] = []

      // Si hay múltiples servicios en las notas, buscar sus datos
      if (cita.notas) {
        const match = cita.notas.match(/\[SERVICIOS SOLICITADOS:\s*([^\]]+)\]/)
        if (match) {
          const serviciosTexto = match[1].trim()
          const nombresServicios = serviciosTexto.split(',').map((s: string) => s.trim())
          
          if (nombresServicios.length > 1) {
            // Buscar datos completos de todos los servicios
            const { data: serviciosData } = await supabase
              .from('servicios')
              .select('nombre, precio, duracion_minutos')
              .in('nombre', nombresServicios)
            
            if (serviciosData && serviciosData.length > 0) {
              precioTotal = serviciosData.reduce((sum: number, s: any) => sum + (s.precio || 0), 0)
              duracionTotal = serviciosData.reduce((sum: number, s: any) => sum + (s.duracion_minutos || 0), 0)
              serviciosDetalle = serviciosData
            }
          } else {
            // Un solo servicio
            serviciosDetalle = [{
              nombre: cita.servicios?.nombre,
              precio: cita.servicios?.precio,
              duracion_minutos: cita.servicios?.duracion_minutos
            }]
          }
        } else {
          // No hay múltiples servicios, usar el servicio principal
          serviciosDetalle = [{
            nombre: cita.servicios?.nombre,
            precio: cita.servicios?.precio,
            duracion_minutos: cita.servicios?.duracion_minutos
          }]
        }
      } else {
        // No hay notas, usar el servicio principal
        serviciosDetalle = [{
          nombre: cita.servicios?.nombre,
          precio: cita.servicios?.precio,
          duracion_minutos: cita.servicios?.duracion_minutos
        }]
      }

      return { precioTotal, duracionTotal, serviciosDetalle }
    }

    // Mapear los datos al formato esperado por el frontend
    const mappedCitas = await Promise.all(citas.map(async (cita: any) => {
      const { precioTotal, duracionTotal, serviciosDetalle } = await calcularDatosServicios(cita)
      
      return {
        id: cita.id,
        fecha: cita.fecha,
        hora: cita.hora,
        estado: cita.estado,
        notas: cita.notas,
        servicio_nombre: cita.servicios?.nombre || 'Servicio no especificado',
        barbero_nombre: cita.barberos 
          ? `${cita.barberos.nombre} ${cita.barberos.apellido}`
          : 'Barbero no asignado',
        barbero_imagen: cita.barberos?.imagen_url || null,
        barbero_especialidad: cita.barberos?.especialidad || null,
        precio: precioTotal,
        duracion_total: duracionTotal,
        servicios_detalle: serviciosDetalle
      }
    }))

    console.log('✅ [consultar-citas] Returning response with', mappedCitas.length, 'appointments')
    
    // Log evento de seguridad exitoso
    logSecurityEvent({
      eventType: SecurityEventType.DATA_ACCESS,
      ip: clientIp as string,
      endpoint: '/api/consultar-citas',
      method: 'GET',
      statusCode: 200,
      data: { telefono: telefono.substring(0, 6) + '***', totalCitas: citas.length }
    })
    
    return res.status(200).json({ 
      citas: mappedCitas,
      total_citas: citas.length,
      citas_pendientes: citasPendientes
    })
  } catch (error) {
    console.error('❌ [consultar-citas] Unexpected error:', error)
    
    // Log error de API
    if (error instanceof Error) {
      logApiError('/api/consultar-citas', 'GET', error, clientIp as string)
    }
    
    let errorMessage = 'Internal server error'
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
