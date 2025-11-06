import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../lib/database.types'

// Build Version: 2025-11-06-v4 - Use SERVICE_ROLE_KEY for bypassing RLS

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('🔵 [consultar-citas] Request received:', req.method)
  
  if (req.method !== 'GET') {
    console.log('❌ [consultar-citas] Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { telefono } = req.query
  console.log('🔍 [consultar-citas] Telefono:', telefono)

  if (!telefono || typeof telefono !== 'string') {
    console.log('❌ [consultar-citas] Telefono missing or invalid')
    return res.status(400).json({ error: 'Teléfono es requerido' })
  }

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
          precio
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

    // Mapear los datos al formato esperado por el frontend
    const mappedCitas = citas.map((cita: any) => ({
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
      precio: cita.servicios?.precio || null
    }))

    console.log('✅ [consultar-citas] Returning response with', mappedCitas.length, 'appointments')
    
    return res.status(200).json({ 
      citas: mappedCitas,
      total_citas: citas.length,
      citas_pendientes: citasPendientes
    })
  } catch (error) {
    console.error('❌ [consultar-citas] Unexpected error:', error)
    
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
