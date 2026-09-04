/**
 * Serves uploaded images from the database (persists across deploys).
 * GET /api/upload/serve/[entityType]/[fileName]
 *
 * The `data` column is TEXT containing a base64-encoded image.
 */
import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { entityType, path: filePath } = req.query
  const entityDir = Array.isArray(entityType) ? entityType.join('/') : entityType
  const fileName = Array.isArray(filePath) ? filePath.join('/') : filePath

  if (!entityDir || !fileName || fileName.includes('..')) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  try {
    const entityType = entityDir.endsWith('s') ? entityDir.slice(0, -1) : entityDir

    const { data, error } = await supabase
      .from('uploads')
      .select('data, content_type')
      .eq('entity_type', entityType)
      .eq('file_name', fileName)
      .limit(1)

    if (error || !data || data.length === 0) {
      console.error('❌ [serve-upload] No encontrado:', entityType, fileName, error)
      return res.status(404).json({ error: 'File not found' })
    }

    const record = data[0]
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    const contentType = MIME_TYPES[`.${ext}`] || record.content_type || 'application/octet-stream'

    // data is TEXT containing base64-encoded image
    let buffer: Buffer
    if (typeof record.data === 'string') {
      buffer = Buffer.from(record.data, 'base64')
    } else if (ArrayBuffer.isView(record.data)) {
      buffer = Buffer.from(record.data.buffer, record.data.byteOffset, record.data.byteLength)
    } else {
      buffer = Buffer.from(record.data)
    }

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
    res.status(200).send(buffer)
  } catch (error: any) {
    console.error('❌ [serve-upload] Error:', error?.message ?? error)
    return res.status(500).json({ error: 'Error reading file' })
  }
}