import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// API Route para actualizar barbero
// Usa service_role key para bypasear RLS
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Solo permitir PUT/PATCH
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { barberoId, updates } = req.body

    console.log('🎯 UPDATE BARBERO REQUEST:', {
      barberoId,
      updates
    })

    if (!barberoId) {
      return res.status(400).json({ error: 'barberoId es requerido' })
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'updates es requerido' })
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

    // Actualizar barbero
    console.log('💾 Actualizando barbero en base de datos...')
    const { data: barbero, error: barberoError } = await supabase
      .from('barberos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', barberoId)
      .select()
      .single()

    if (barberoError) {
      console.error('❌ Error updating barbero:', barberoError)
      return res.status(400).json({ 
        error: 'Error al actualizar barbero',
        details: barberoError.message 
      })
    }

    console.log('✅ Barbero actualizado:', barbero)

    return res.status(200).json({ 
      success: true,
      barbero,
      message: 'Barbero actualizado exitosamente'
    })

  } catch (error: any) {
    console.error('❌ Error en update barbero:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    })
  }
}
