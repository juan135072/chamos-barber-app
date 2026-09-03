/**
 * Serves uploaded images by entity type.
 * GET /api/upload/serve/[entityType]/[fileName]
 */
import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads')

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

  const { entityType, path: filePath } = req.query
  const entityDir = Array.isArray(entityType) ? entityType.join('/') : entityType
  const fileName = Array.isArray(filePath) ? filePath.join('/') : filePath

  if (!entityDir || !fileName) {
    return res.status(400).json({ error: 'entityType and fileName required' })
  }

  if (fileName.includes('..') || entityDir.includes('..')) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const fullPath = path.join(UPLOAD_DIR, entityDir, fileName)

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
    console.error('❌ [serve-upload] Error:', error?.message ?? error)
    return res.status(500).json({ error: 'Error reading file' })
  }
}