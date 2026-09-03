/**
 * API route to upload barber photos directly to the server filesystem.
 * Avoids InsForge Storage API issues.
 * POST /api/upload/barbero-foto
 * Body: { barberoId: string, fileName: string, base64: string, contentType: string }
 */
import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads/barberos')
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://old.chamosbarber.com'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { barberoId, fileName, base64, contentType } = req.body

    if (!barberoId || !base64) {
      return res.status(400).json({ error: 'barberoId and base64 required' })
    }

    // Ensure upload directory exists
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })

    // Decode base64 and save
    const buffer = Buffer.from(base64, 'base64')
    const ext = fileName?.split('.').pop() || 'jpg'
    const finalName = `${barberoId}-${Date.now()}.${ext}`
    const filePath = path.join(UPLOAD_DIR, finalName)
    
    fs.writeFileSync(filePath, buffer)

    const publicUrl = `${BASE_URL}/uploads/barberos/${finalName}`

    console.log('✅ [upload-barbero] Archivo guardado:', finalName)
    return res.status(200).json({
      path: finalName,
      publicUrl,
    })

  } catch (error: any) {
    console.error('❌ [upload-barbero] Error:', error?.message ?? error)
    return res.status(500).json({ error: error?.message ?? 'Error interno' })
  }
}