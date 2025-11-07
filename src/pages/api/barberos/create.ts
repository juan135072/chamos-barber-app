import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// API Route para crear barbero
// Usa service_role key para bypasear RLS
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const barberoData = req.body

    console.log('🎯 CREATE BARBERO REQUEST:', {
      nombre: barberoData.nombre,
      apellido: barberoData.apellido,
      email: barberoData.email
    })

    if (!barberoData.nombre || !barberoData.apellido) {
      return res.status(400).json({ error: 'nombre y apellido son requeridos' })
    }

    // Crear cliente de Supabase con service_role key para bypasear RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Crear barbero
    console.log('💾 Insertando barbero en base de datos...')
    const { data: barbero, error: barberoError } = await supabase
      .from('barberos')
      .insert([barberoData])
      .select()
      .single()

    if (barberoError) {
      console.error('❌ Error creating barbero:', barberoError)
      return res.status(400).json({ 
        error: 'Error al crear barbero',
        details: barberoError.message 
      })
    }

    console.log('✅ Barbero creado:', barbero)

    return res.status(201).json({ 
      success: true,
      barbero,
      message: 'Barbero creado exitosamente'
    })

  } catch (error: any) {
    console.error('❌ Error en create barbero:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    })
  }
}
