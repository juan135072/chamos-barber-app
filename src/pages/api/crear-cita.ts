import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../lib/database.types'

// Usar SERVICE ROLE KEY para bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      servicio_id,
      barbero_id,
      fecha,
      hora,
      cliente_nombre,
      cliente_telefono,
      cliente_email,
      notas
    } = req.body

    // Validaciones básicas
    if (!servicio_id || !barbero_id || !fecha || !hora || !cliente_nombre || !cliente_telefono) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos',
        required: ['servicio_id', 'barbero_id', 'fecha', 'hora', 'cliente_nombre', 'cliente_telefono']
      })
    }

    console.log('📝 Intentando crear cita:', {
      servicio_id,
      barbero_id,
      fecha,
      hora,
      cliente_nombre
    })

    // VALIDACIÓN 1: Verificar disponibilidad
    const { data: existingCitas } = await supabaseAdmin
      .from('citas')
      .select('id, cliente_nombre')
      .eq('barbero_id', barbero_id)
      .eq('fecha', fecha)
      .eq('hora', hora)
      .in('estado', ['pendiente', 'confirmada'])

    if (existingCitas && existingCitas.length > 0) {
      console.log('⚠️ Horario ya reservado')
      return res.status(409).json({ 
        error: 'Lo sentimos, este horario acaba de ser reservado. Por favor selecciona otro horario.' 
      })
    }

    // VALIDACIÓN 2: Verificar que no sea hora pasada
    const fechaHora = new Date(`${fecha}T${hora}`)
    const ahora = new Date()
    
    if (fechaHora <= ahora) {
      console.log('⚠️ Intento de reserva en el pasado')
      return res.status(400).json({ 
        error: 'No puedes reservar una cita en el pasado. Por favor selecciona otra fecha u hora.' 
      })
    }

    // INSERTAR CITA usando Service Role (bypass RLS)
    const { data: nuevaCita, error: insertError } = await supabaseAdmin
      .from('citas')
      .insert([{
        servicio_id,
        barbero_id,
        fecha,
        hora,
        cliente_nombre,
        cliente_telefono,
        cliente_email: cliente_email || null,
        notas: notas || null,
        estado: 'pendiente'
      }])
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error al insertar cita:', insertError)
      
      // Error de constraint único (race condition)
      if (insertError.code === '23505') {
        return res.status(409).json({ 
          error: 'Este horario fue reservado mientras completabas el formulario. Por favor selecciona otro horario.' 
        })
      }
      
      throw insertError
    }

    console.log('✅ Cita creada exitosamente:', nuevaCita.id)

    return res.status(201).json({ 
      success: true,
      cita: nuevaCita,
      message: '¡Cita reservada exitosamente! Te contactaremos pronto para confirmar.'
    })

  } catch (error) {
    console.error('❌ Error en crear-cita API:', error)
    
    return res.status(500).json({ 
      error: 'Error al procesar la reserva. Por favor inténtalo de nuevo.',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
