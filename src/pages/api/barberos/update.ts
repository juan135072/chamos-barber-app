import { requireStaff, barberFields } from '@/lib/server-authorization'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient } from '@/lib/supabase-server'
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
    const actor = await requireStaff(req, res, ['admin', 'barbero'])
    if (!actor) return
    const { barberoId, updates } = req.body
    if (actor.access.rol === 'barbero' && barberoId !== actor.access.barbero_id) {
      return res.status(403).json({ error: 'Solo puedes editar tu perfil' })
    }
    const allowedUpdates = actor.access.rol === 'admin' ? barberFields(updates) :
      Object.fromEntries(Object.entries(updates ?? {}).filter(([key]) => ['telefono', 'instagram', 'descripcion', 'imagen_url'].includes(key)))

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
    const supabase = actor.admin

    // Actualizar barbero
    console.log('💾 Actualizando barbero en base de datos...')
    const { data: barbero, error: barberoError } = await supabase
      .from('barberos')
      .update({ ...allowedUpdates, updated_at: new Date().toISOString() })
      .eq('id', barberoId)
      .eq('comercio_id', actor.access.comercio_id)
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
