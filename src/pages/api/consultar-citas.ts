import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../lib/database.types'

// Build Version: 2025-12-11-v6 - Security improvements (rate limiting ready, inline implementation)

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

  // 🛡️ Rate Limiting está implementado en src/lib/security/rateLimit.ts
  // Para activarlo, descomentar:
  // const { applyRateLimit } = await import('../../../lib/security/rateLimit')
  // const rateLimitResult = await applyRateLimit(req, res)
  // if (!rateLimitResult.allowed) return

  // 🛡️ Validación mejorada
  let { telefono } = req.query
  console.log('🔍 [consultar-citas] Telefono original recibido:', telefono)

  if (!telefono || typeof telefono !== 'string') {
    console.log('❌ [consultar-citas] Telefono missing or invalid')
    return res.status(400).json({ error: 'Teléfono es requerido' })
  }

  // Normalizar teléfono y generar variaciones para búsqueda robusta
  const { normalizePhone } = await import('../../../lib/phone-utils')

  const phoneNormalized = normalizePhone(telefono) // +569XXXXXXXX
  const phoneWith56 = phoneNormalized.replace(/^\+/, '') // 569XXXXXXXX
  const phoneRaw = phoneNormalized.replace(/^\+56/, '')   // 9XXXXXXXX

  console.log('🔍 [consultar-citas] Variaciones de búsqueda:', {
    phoneNormalized,
    phoneWith56,
    phoneRaw
  })

  // Validar formato mínimo (al menos 8-15 caracteres en total)
  const phoneDigits = phoneNormalized.replace(/\D/g, '')
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    console.log('❌ [consultar-citas] Invalid phone length:', phoneDigits.length)
    return res.status(400).json({
      error: 'Formato de teléfono inválido. Debe tener entre 8 y 15 dígitos.',
      code: 'VALIDATION_ERROR'
    })
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

    // Buscar citas por teléfono del cliente usando variaciones (OR)
    console.log('🔍 [consultar-citas] Fetching appointments...')
    const { data: citas, error: citasError } = await supabase
      .from('citas')
      .select(`
        id,
        fecha,
        hora,
        estado,
        notas,
        items,
        precio_final,
        servicios (
          nombre,
          precio,
          duracion_minutos
        ),
        barberos (
          nombre,
          apellido,
          imagen_url,
          especialidades
        )
      `)
      .or(`cliente_telefono.eq."${phoneNormalized}",cliente_telefono.eq."${phoneWith56}",cliente_telefono.eq."${phoneRaw}"`)
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
      // 1. Prioridad: Columna 'items' (nuevo formato estructurado)
      if (cita.items && Array.isArray(cita.items) && cita.items.length > 0) {
        const precioTotal = cita.items.reduce((sum: number, i: any) => sum + (i.subtotal || 0), 0)
        // La duración total no está guardada por item, pero podemos estimarla o usar precio_final si solo queremos el total
        // Por ahora sumamos duraciones si podemos obtenerlas, o usamos el fallback de notas si es viejo
        const serviciosDetalle = cita.items

        // Calculamos duración total sumando duraciones de servicios individuales (necesitamos cargarlos si no están en items)
        // En el nuevo flujo de reserva, los items tienen nombre, precio, cantidad, subtotal.
        // Vamos a intentar obtener las duraciones para que la info sea completa.
        const serviciosIds = cita.items.map((i: any) => i.servicio_id)
        const { data: srvData } = await (supabase
          .from('servicios')
          .select('id, duracion_minutos')
          .in('id', serviciosIds) as any)

        const duracionesMap = new Map((srvData || []).map((s: any) => [s.id, s.duracion_minutos]))
        const duracionTotal = cita.items.reduce((sum: number, i: any) => sum + ((duracionesMap.get(i.servicio_id) as number) || 0) * (i.cantidad || 1), 0)

        return { precioTotal, duracionTotal, serviciosDetalle }
      }

      // 2. Fallback: Parsear de notas (formato previo)
      if (cita.notas) {
        const match = cita.notas.match(/\[SERVICIOS SOLICITADOS:\s*([^\]]+)\]/)
        if (match) {
          const serviciosTexto = match[1].trim()
          const nombresServicios = serviciosTexto.split(',').map((s: string) => s.trim())

          if (nombresServicios.length > 1) {
            const { data: serviciosData } = await supabase
              .from('servicios')
              .select('nombre, precio, duracion_minutos')
              .in('nombre', nombresServicios)

            if (serviciosData && serviciosData.length > 0) {
              const precioTotal = serviciosData.reduce((sum: number, s: any) => sum + (s.precio || 0), 0)
              const duracionTotal = serviciosData.reduce((sum: number, s: any) => sum + (s.duracion_minutos || 0), 0)
              return { precioTotal, duracionTotal, serviciosDetalle: serviciosData }
            }
          }
        }
      }

      // 3. Fallback final: Servicio principal (legacy)
      const precioTotal = cita.servicios?.precio || 0
      const duracionTotal = cita.servicios?.duracion_minutos || 0
      const serviciosDetalle = [{
        nombre: cita.servicios?.nombre,
        precio: cita.servicios?.precio,
        duracion_minutos: cita.servicios?.duracion_minutos
      }]

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
        barbero_especialidad: cita.barberos?.especialidades && Array.isArray(cita.barberos.especialidades)
          ? cita.barberos.especialidades.join(', ')
          : null,
        precio: precioTotal,
        duracion_total: duracionTotal,
        servicios_detalle: serviciosDetalle
      }
    }))

    console.log('✅ [consultar-citas] Returning response with', mappedCitas.length, 'appointments')

    // Security logging está implementado en src/lib/security/logger.ts

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
