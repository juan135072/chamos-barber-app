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

      const servicios = db.prepare(`
        SELECT * FROM servicios 
        WHERE activo = 1 
        ORDER BY nombre
        LIMIT ? OFFSET ?
      `).all(limitNum, offset)

      const total = db.prepare('SELECT COUNT(*) as count FROM servicios WHERE activo = 1').get() as { count: number }

      res.status(200).json({
        data: servicios,
        total: total.count,
        page: pageNum,
        limit: limitNum
      })
    } catch (error) {
      console.error('Error fetching servicios:', error)
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  } else if (req.method === 'POST') {
    try {
      const {
        nombre,
        descripcion,
        precio,
        duracion_minutos
      } = req.body

      if (!nombre || precio === undefined || !duracion_minutos) {
        return res.status(400).json({ error: 'Nombre, precio y duración son requeridos' })
      }

      const id = uuidv4()
      const now = Date.now()

      const insert = db.prepare(`
        INSERT INTO servicios (
          id, nombre, descripcion, precio, duracion_minutos, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      insert.run(
        id,
        nombre,
        descripcion || null,
        parseFloat(precio),
        parseInt(duracion_minutos, 10),
        now,
        now
      )

      const newServicio = db.prepare('SELECT * FROM servicios WHERE id = ?').get(id)
      
      res.status(201).json(newServicio)
    } catch (error) {
      console.error('Error creating servicio:', error)
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}