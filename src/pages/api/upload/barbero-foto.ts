/**
 * API route to proxy file uploads to InsForge Storage.
 * Avoids Cloudflare connection issues when uploading directly from the browser.
 * POST /api/upload/barbero-foto
 * Body: { barberoId: string, fileName: string, base64: string, contentType: string }
 */
import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient } from '@/lib/supabase-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { barberoId, fileName, base64, contentType } = req.body

    if (!barberoId || !base64) {
      return res.status(400).json({ error: 'barberoId and base64 required' })
    }

    // Decode base64 to buffer
    const buffer = Buffer.from(base64, 'base64')
    const ext = fileName?.split('.').pop() || 'jpg'
    const finalName = `${barberoId}-${Date.now()}.${ext}`
    const blob = new Blob([buffer], { type: contentType || 'image/jpeg' })

    // Upload to InsForge using admin client (server-to-server, no Cloudflare browser limits)
    const supabase = createPagesAdminClient()
    const { data, error } = await supabase.storage
      .from('barberos-fotos')
      .upload(finalName, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType || 'image/jpeg',
      })

    if (error) {
      console.error('❌ [upload-proxy] Error:', error)
      return res.status(500).json({ error: error.message })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('barberos-fotos')
      .getPublicUrl(data.path)

    return res.status(200).json({
      path: data.path,
      publicUrl: urlData.publicUrl,
    })

  } catch (error: any) {
    console.error('❌ [upload-proxy] Error:', error?.message ?? error)
    return res.status(500).json({ error: error?.message ?? 'Error interno' })
  }
}