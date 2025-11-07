import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// API Route para desactivar/activar barbero (soft delete)
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
    const { barberoId, activo } = req.body

    console.log('🔍 TOGGLE ACTIVE REQUEST:', {
      barberoId,
      barberoIdType: typeof barberoId,
      activo,
      requestBody: req.body
    })

    if (!barberoId) {
      return res.status(400).json({ error: 'barberoId es requerido' })
    }

    if (typeof activo !== 'boolean') {
      return res.status(400).json({ error: 'activo debe ser boolean' })
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

    // Actualizar estado del barbero (soft delete)
    console.log(`🔄 Actualizando barbero id: ${barberoId} a activo: ${activo}`)
    const { data: barbero, error: barberoError } = await supabase
      .from('barberos')
      .update({ activo })
      .eq('id', barberoId)
      .select()
      .single()

    console.log('✅ Barbero actualizado:', barbero)

    if (barberoError) {
      console.error('❌ Error updating barbero:', barberoError)
      return res.status(400).json({ 
        error: 'Error al actualizar barbero',
        details: barberoError.message 
      })
    }

    // También actualizar el usuario admin asociado
    console.log('🔄 Actualizando admin_users con barbero_id:', barberoId)
    try {
      const { data: updatedAdmin, error: adminError } = await supabase
        .from('admin_users')
        .update({ activo })
        .eq('barbero_id', barberoId)
        .select()
      
      console.log('✅ Admin_users actualizado:', updatedAdmin)
      
      if (adminError) {
        console.warn('⚠️ Error actualizando admin_user:', adminError)
      }
    } catch (adminError) {
      console.warn('⚠️ No se pudo actualizar admin_user asociado:', adminError)
    }

    return res.status(200).json({ 
      success: true,
      barbero,
      message: `Barbero ${activo ? 'activado' : 'desactivado'} exitosamente`
    })

  } catch (error: any) {
    console.error('Error en toggle-active:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    })
  }
}
