import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// API Route para eliminar barbero PERMANENTEMENTE
// Usa service_role key para bypasear RLS
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Solo permitir DELETE
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { barberoId } = req.body

    console.log('🔍 DELETE PERMANENT REQUEST:', {
      barberoId,
      barberoIdType: typeof barberoId,
      requestBody: req.body
    })

    if (!barberoId) {
      return res.status(400).json({ error: 'barberoId es requerido' })
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

    // Verificar si tiene citas asociadas
    const { data: citas, error: citasError } = await supabase
      .from('citas')
      .select('id')
      .eq('barbero_id', barberoId)
      .limit(1)

    if (citasError) {
      console.error('Error checking citas:', citasError)
      return res.status(400).json({ 
        error: 'Error al verificar citas',
        details: citasError.message 
      })
    }

    if (citas && citas.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar permanentemente. El barbero tiene citas asociadas.',
        hasCitas: true
      })
    }

    // Eliminar de admin_users primero (relación foreign key)
    console.log('🗑️ Eliminando admin_users con barbero_id:', barberoId)
    const { data: deletedAdmins, error: adminError } = await supabase
      .from('admin_users')
      .delete()
      .eq('barbero_id', barberoId)
      .select()

    console.log('✅ Admin_users eliminados:', deletedAdmins)
    
    if (adminError) {
      console.warn('⚠️ Error deleting admin_user:', adminError)
      // No fallar si no existe admin_user
    }

    // Eliminar barbero permanentemente
    console.log('🗑️ Eliminando barbero con id:', barberoId)
    const { data: deletedBarbero, error: barberoError } = await supabase
      .from('barberos')
      .delete()
      .eq('id', barberoId)
      .select()

    console.log('✅ Barbero eliminado:', deletedBarbero)

    if (barberoError) {
      console.error('❌ Error deleting barbero:', barberoError)
      return res.status(400).json({ 
        error: 'Error al eliminar barbero permanentemente',
        details: barberoError.message 
      })
    }

    return res.status(200).json({ 
      success: true,
      message: 'Barbero eliminado permanentemente',
      deletedBarbero,
      deletedAdmins
    })

  } catch (error: any) {
    console.error('Error en delete-permanent:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    })
  }
}
