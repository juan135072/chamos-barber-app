import type { NextApiRequest, NextApiResponse } from 'next'
import { getDatabase } from '../../../lib/database'
import { v4 as uuidv4 } from 'uuid'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDatabase()

  if (req.method === 'GET') {
    try {
      const { page = '1', limit = '100', barbero_id, fecha, estado } = req.query
      const pageNum = parseInt(page as string, 10)
      const limitNum = parseInt(limit as string, 10)
      const offset = (pageNum - 1) * limitNum

      let query = `
        SELECT c.*, s.nombre as servicio_nombre, b.nombre as barbero_nombre
        FROM citas c
        LEFT JOIN servicios s ON c.servicio_id = s.id
        LEFT JOIN barberos b ON c.barbero_id = b.id
        WHERE 1=1
      `
      const params: any[] = []

      if (barbero_id) {
        query += ' AND c.barbero_id = ?'
        params.push(barbero_id)
      }

      if (fecha) {
        query += ' AND c.fecha = ?'
        params.push(fecha)
      }

      if (estado) {
        query += ' AND c.estado = ?'
        params.push(estado)
      }

      query += ' ORDER BY c.fecha DESC, c.hora DESC LIMIT ? OFFSET ?'
      params.push(limitNum, offset)

      const citas = db.prepare(query).all(...params)

      // Count total
      let countQuery = 'SELECT COUNT(*) as count FROM citas c WHERE 1=1'
      const countParams: any[] = []
      
      if (barbero_id) {
        countQuery += ' AND c.barbero_id = ?'
        countParams.push(barbero_id)
      }

      if (fecha) {
        countQuery += ' AND c.fecha = ?'
        countParams.push(fecha)
      }

      if (estado) {
        countQuery += ' AND c.estado = ?'
        countParams.push(estado)
      }

      const total = db.prepare(countQuery).get(...countParams) as { count: number }

      res.status(200).json({
        data: citas,
        total: total.count,
        page: pageNum,
        limit: limitNum
      })
    } catch (error) {
      console.error('Error fetching citas:', error)
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  } else if (req.method === 'POST') {
    try {
      const {
        servicio_id,
        barbero_id,
        fecha,
        hora,
        nombre_cliente,
        telefono_cliente,
        email_cliente,
        notas
      } = req.body

      // Validaciones
      if (!servicio_id || !barbero_id || !fecha || !hora || !nombre_cliente || !telefono_cliente) {
        return res.status(400).json({ 
          error: 'Servicio, barbero, fecha, hora, nombre y teléfono son requeridos' 
        })
      }

      // Verificar que el barbero y servicio existen
      const barbero = db.prepare('SELECT * FROM barberos WHERE id = ? AND activo = 1').get(barbero_id)
      const servicio = db.prepare('SELECT * FROM servicios WHERE id = ? AND activo = 1').get(servicio_id)

      if (!barbero) {
        return res.status(400).json({ error: 'Barbero no encontrado' })
      }

      if (!servicio) {
        return res.status(400).json({ error: 'Servicio no encontrado' })
      }

      // Verificar disponibilidad del horario
      const existingCita = db.prepare(`
        SELECT * FROM citas 
        WHERE barbero_id = ? AND fecha = ? AND hora = ? 
        AND estado NOT IN ('cancelada', 'completada')
      `).get(barbero_id, fecha, hora)

      if (existingCita) {
        return res.status(409).json({ error: 'El horario ya está ocupado' })
      }

      const id = uuidv4()
      const now = Date.now()

      const insert = db.prepare(`
        INSERT INTO citas (
          id, servicio_id, barbero_id, fecha, hora, 
          nombre_cliente, telefono_cliente, email_cliente, notas,
          estado, precio, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      insert.run(
        id,
        servicio_id,
        barbero_id,
        fecha,
        hora,
        nombre_cliente,
        telefono_cliente,
        email_cliente || null,
        notas || null,
        'pendiente',
        servicio.precio,
        now,
        now
      )

      // Obtener la cita creada con información completa
      const newCita = db.prepare(`
        SELECT c.*, s.nombre as servicio_nombre, b.nombre as barbero_nombre
        FROM citas c
        LEFT JOIN servicios s ON c.servicio_id = s.id
        LEFT JOIN barberos b ON c.barbero_id = b.id
        WHERE c.id = ?
      `).get(id)
      
      res.status(201).json(newCita)
    } catch (error) {
      console.error('Error creating cita:', error)
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}