import type { NextApiRequest, NextApiResponse } from 'next'
import { getDatabase } from '../../../lib/database'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  const db = getDatabase()

  if (req.method === 'GET') {
    try {
      const barbero = db.prepare('SELECT * FROM barberos WHERE id = ? AND activo = 1').get(id as string)
      
      if (!barbero) {
        return res.status(404).json({ error: 'Barbero no encontrado' })
      }

      const barberosFormatted = {
        ...barbero,
        especialidades: barbero.especialidades ? JSON.parse(barbero.especialidades) : []
      }

      res.status(200).json(barberosFormatted)
    } catch (error) {
      console.error('Error fetching barbero:', error)
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  } else if (req.method === 'PUT') {
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

      const now = Date.now()

      const update = db.prepare(`
        UPDATE barberos SET 
          nombre = ?, biografia = ?, foto_url = ?, especialidades = ?, 
          experiencia_anos = ?, telefono = ?, instagram = ?, updated_at = ?
        WHERE id = ?
      `)

      const result = update.run(
        nombre,
        biografia || null,
        foto_url || null,
        especialidades ? JSON.stringify(especialidades) : null,
        experiencia_anos || null,
        telefono || null,
        instagram || null,
        now,
        id as string
      )

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Barbero no encontrado' })
      }

      const updatedBarbero = db.prepare('SELECT * FROM barberos WHERE id = ?').get(id as string)
      
      res.status(200).json({
        ...updatedBarbero,
        especialidades: updatedBarbero.especialidades ? JSON.parse(updatedBarbero.especialidades) : []
      })
    } catch (error) {
      console.error('Error updating barbero:', error)
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  } else if (req.method === 'DELETE') {
    try {
      const now = Date.now()
      
      // Soft delete
      const update = db.prepare('UPDATE barberos SET activo = 0, updated_at = ? WHERE id = ?')
      const result = update.run(now, id as string)

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Barbero no encontrado' })
      }

      res.status(204).end()
    } catch (error) {
      console.error('Error deleting barbero:', error)
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}