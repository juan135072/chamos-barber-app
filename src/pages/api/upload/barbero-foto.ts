/**
 * API route to proxy file uploads to InsForge Storage.
 * Avoids Cloudflare connection issues when uploading directly from the browser.
 * Uses raw HTTP to the InsForge storage API (bypasses SDK storage adapter).
 * POST /api/upload/barbero-foto
 * Body: { barberoId: string, fileName: string, base64: string, contentType: string }
 */
import { NextApiRequest, NextApiResponse } from 'next'

const INSFOEGE_URL = process.env.INSFORGE_INTERNAL_URL || process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || 'https://insforge.chamosbarber.com'
const API_KEY = process.env.INSFORGE_API_KEY

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

    if (!API_KEY) {
      return res.status(500).json({ error: 'INSFORGE_API_KEY not configured' })
    }

    // Upload directly to InsForge storage API using admin API key
    const storageUrl = `${INSFOEGE_URL}/api/storage/buckets/barberos-fotos/files/${finalName}`
    
    const uploadRes = await fetch(storageUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': contentType || 'image/jpeg',
        'x-amz-acl': 'public-read',
      },
      body: buffer,
      signal: AbortSignal.timeout(30000),
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => 'unknown error')
      console.error('❌ [upload-proxy] Storage error:', uploadRes.status, errText.substring(0, 200))
      return res.status(500).json({ error: `Upload failed: ${uploadRes.status} ${errText.substring(0, 100)}` })
    }

    // Construct public URL
    const publicUrl = `${INSFOEGE_URL}/api/storage/buckets/barberos-fotos/files/${finalName}`

    console.log('✅ [upload-proxy] Archivo subido:', finalName)
    return res.status(200).json({
      path: finalName,
      publicUrl,
    })

  } catch (error: any) {
    console.error('❌ [upload-proxy] Error:', error?.message ?? error)
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return res.status(504).json({ error: 'La conexión con el servidor de imágenes tardó demasiado. Intentá de nuevo o usá una imagen más pequeña.' })
    }
    return res.status(500).json({ error: error?.message ?? 'Error interno' })
  }
}