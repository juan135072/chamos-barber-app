/**
 * Serves uploaded barber photos from the filesystem.
 * GET /api/upload/barbero-foto/[path]
 */
import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads/barberos')

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

function getMime(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { path: filePath } = req.query
  const fileName = Array.isArray(filePath) ? filePath.join('/') : filePath

  if (!fileName || fileName.includes('..')) {
    return res.status(400).json({ error: 'Invalid path' })
  }

  const fullPath = path.join(UPLOAD_DIR, fileName)

  // Security: ensure we're still inside UPLOAD_DIR
  if (!fullPath.startsWith(UPLOAD_DIR)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' })
    }

    const data = fs.readFileSync(fullPath)
    const contentType = getMime(fileName)

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
    res.status(200).send(data)
  } catch (error: any) {
    console.error('❌ [serve-barbero-foto] Error:', error?.message ?? error)
    return res.status(500).json({ error: 'Error reading file' })
  }
}