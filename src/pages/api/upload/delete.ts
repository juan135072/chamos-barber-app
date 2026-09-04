/**
 * Deletes an uploaded image from the filesystem.
 * POST /api/upload/delete
 * Body: { entityType: string, fileName: string }
 */
import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { entityType, fileName } = req.body
    if (!entityType || !fileName) {
      return res.status(400).json({ error: 'entityType and fileName are required' })
    }

    const dir = path.join(UPLOAD_DIR, `${entityType}s`)
    const fullPath = path.join(dir, fileName)

    // Security: ensure we stay inside UPLOAD_DIR
    if (!fullPath.startsWith(UPLOAD_DIR)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }

    console.log(`🗑️ [upload/delete] Eliminado ${entityType}: ${fileName}`)
    return res.status(200).json({ ok: true })
  } catch (error: any) {
    console.error('❌ [upload/delete] Error:', error?.message ?? error)
    return res.status(500).json({ error: error?.message ?? 'Error interno' })
  }
}