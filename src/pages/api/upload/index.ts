/**
 * Unified upload API route for all entity images (barberos, servicios, productos, cortes).
 * POST /api/upload
 * Body: { entityType: string, entityId: string, fileName: string, base64: string, contentType: string }
 */
import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

const BASE_UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads')
const BASE_URL = process.env.COOLIFY_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://old.chamosbarber.com'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { entityType, entityId, fileName, base64, contentType } = req.body

    if (!entityType || !entityId || !base64) {
      return res.status(400).json({ error: 'entityType, entityId and base64 are required' })
    }

    if (!ALLOWED_TYPES.includes(contentType)) {
      return res.status(400).json({ error: 'Tipo de archivo no válido. Solo JPG, PNG, WEBP, GIF' })
    }

    // Validate entityType
    const validTypes = ['barbero', 'servicio', 'producto', 'corte']
    if (!validTypes.includes(entityType)) {
      return res.status(400).json({ error: 'entityType inválido. Use: barbero, servicio, producto, corte' })
    }

    const buffer = Buffer.from(base64, 'base64')
    if (buffer.length > MAX_SIZE) {
      return res.status(400).json({ error: 'La imagen excede 5MB' })
    }

    const ext = fileName?.split('.').pop() || 'jpg'
    const finalName = `${entityId}-${Date.now()}.${ext}`
    const uploadDir = path.join(BASE_UPLOAD_DIR, `${entityType}s`)
    const filePath = path.join(uploadDir, finalName)

    fs.mkdirSync(uploadDir, { recursive: true })
    fs.writeFileSync(filePath, buffer)

    const publicUrl = `${BASE_URL}/api/upload/serve/${entityType}s/${finalName}`

    console.log(`✅ [upload] ${entityType} ${finalName}`)
    return res.status(200).json({ path: finalName, publicUrl })

  } catch (error: any) {
    console.error('❌ [upload] Error:', error?.message ?? error)
    return res.status(500).json({ error: error?.message ?? 'Error interno' })
  }
}