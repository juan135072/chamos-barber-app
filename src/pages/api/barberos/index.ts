import type { NextApiRequest, NextApiResponse } from 'next'
import { getDatabase } from '../../../lib/database'
import { v4 as uuidv4 } from 'uuid'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDatabase()

  if (req.method === 'GET') {
    try {
      const { page = '1', limit = '100' } = req.query
      const pageNum = parseInt(page as string, 10)
      const limitNum = parseInt(limit as string, 10)
      const offset = (pageNum - 1) * limitNum

      const barberos = db.prepare(`
        SELECT * FROM barberos 
        WHERE activo = 1 
        ORDER BY nombre
        LIMIT ? OFFSET ?
      `).all(limitNum, offset)

      const total = db.prepare('SELECT COUNT(*) as count FROM barberos WHERE activo = 1').get() as { count: number }

      // Parse specialties JSON
      const barberosFormatted = barberos.map((barbero: any) => ({
        ...barbero,
        especialidades: barbero.especialidades ? JSON.parse(barbero.especialidades) : []
      }))

      res.status(200).json({
        data: barberosFormatted,
        total: total.count,
        page: pageNum,
        limit: limitNum
      })
    } catch (error) {
      console.error('Error fetching barberos:', error)
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  } else if (req.method === 'POST') {
    try {
      const {
        nombre,
        biografia,
        foto_url,
        especialidades,
        experiencia_anos,
        telefono,
        instagram
      } = req.body

      if (!nombre) {
        return res.status(400).json({ error: 'El nombre es requerido' })
      }

      const id = uuidv4()
      const now = Date.now()

      const insert = db.prepare(`
        INSERT INTO barberos (
          id, nombre, biografia, foto_url, especialidades, 
          experiencia_anos, telefono, instagram, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      insert.run(
        id,
        nombre,
        biografia || null,
        foto_url || null,
        especialidades ? JSON.stringify(especialidades) : null,
        experiencia_anos || null,
        telefono || null,
        instagram || null,
        now,
        now
      )

      const newBarbero = db.prepare('SELECT * FROM barberos WHERE id = ?').get(id)
      
      res.status(201).json({
        ...newBarbero,
        especialidades: newBarbero.especialidades ? JSON.parse(newBarbero.especialidades) : []
      })
    } catch (error) {
      console.error('Error creating barbero:', error)
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}