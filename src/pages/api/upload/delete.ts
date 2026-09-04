/**
 * Deletes an uploaded image from the database.
 * POST /api/upload/delete
 * Body: { entityType: string, fileName: string }
 */
import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { entityType, fileName } = req.body
    if (!entityType || !fileName) {
      return res.status(400).json({ error: 'entityType and fileName are required' })
    }

    const { data, error } = await supabase
      .from('uploads')
      .delete()
      .eq('entity_type', entityType)
      .eq('file_name', fileName)

    if (error) {
      console.error('❌ [upload/delete] DB delete error:', error)
      return res.status(500).json({ error: error.message || 'Error al eliminar' })
    }

    console.log(`🗑️ [upload/delete] Eliminado ${entityType}: ${fileName}`)
    return res.status(200).json({ ok: true })
  } catch (error: any) {
    console.error('❌ [upload/delete] Error:', error?.message ?? error)
    return res.status(500).json({ error: error?.message ?? 'Error interno' })
  }
}