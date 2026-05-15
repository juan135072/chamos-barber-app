import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient } from '@/lib/supabase-server'
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
    const supabase = createPagesAdminClient()

    // 0. Obtener comercio_id del barbero antes de eliminar (necesario para filtros de seguridad)
    const { data: barberoData } = await supabase
      .from('barberos')
      .select('comercio_id')
      .eq('id', barberoId)
      .single()

    const comercioId = barberoData?.comercio_id

    // 1. Desvincular CITAS (poner barbero_id a NULL para no perder el historial del cliente)
    console.log('🔗 Desvinculando citas del barbero:', barberoId)
    const { error: citasUpdateError } = await supabase
      .from('citas')
      .update({ barbero_id: null })
      .eq('barbero_id', barberoId)

    if (citasUpdateError) {
      console.warn('⚠️ Error unlink citas:', citasUpdateError)
    }

    // 2. Desvincular FACTURAS (poner barbero_id a NULL para no perder el registro de ganancias)
    console.log('💰 Desvinculando facturas del barbero:', barberoId)
    const { error: facturasUpdateError } = await supabase
      .from('facturas')
      .update({ barbero_id: null })
      .eq('barbero_id', barberoId)

    if (facturasUpdateError) {
      console.warn('⚠️ Error unlink facturas:', facturasUpdateError)
      // Si falla aquí es probablemente por el NOT NULL constraint en la BD
    }

    // 3. Eliminar otros registros relacionados que NO son críticos para el balance
    const relatedTables = [
      'horarios_atencion',
      'horarios_bloqueados',
      'notas_clientes',
      'asistencias',
      'liquidaciones'
    ]

    for (const table of relatedTables) {
      console.log(`🗑️ Limpiando tabla ${table} para barbero:`, barberoId)
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('barbero_id', barberoId)

      if (deleteError) {
        console.warn(`⚠️ Error eliminando en ${table}:`, deleteError)
      }
    }

    // 4. Eliminar de admin_users (relación de acceso) — doble filtro para seguridad multi-tenant
    console.log('🗑️ Eliminando admin_users con barbero_id:', barberoId)
    let adminDeleteQuery = supabase
      .from('admin_users')
      .delete()
      .eq('barbero_id', barberoId)

    if (comercioId) {
      adminDeleteQuery = adminDeleteQuery.eq('comercio_id', comercioId)
    }

    const { data: deletedAdmins, error: adminError } = await adminDeleteQuery.select()

    if (adminError) {
      console.warn('⚠️ Error deleting admin_user:', adminError)
    }

    // 5. Eliminar barbero permanentemente
    console.log('🗑️ Eliminando registro maestro del barbero:', barberoId)
    const { data: deletedBarbero, error: barberoError } = await supabase
      .from('barberos')
      .delete()
      .eq('id', barberoId)
      .select()

    if (barberoError) {
      console.error('❌ Error final deleting barbero:', barberoError)
      return res.status(400).json({
        error: 'Error al eliminar barbero permanentemente',
        details: barberoError.message,
        hint: 'Es posible que aún existan registros de facturas que impidan el borrado por restricciones de base de datos.'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Barbero eliminado permanentemente. Se preservaron las citas y facturas para el registro del negocio.',
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
