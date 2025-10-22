import type { NextApiRequest, NextApiResponse } from 'next'
import { getDatabase } from '../../lib/database'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { telefono } = req.query

  if (!telefono) {
    return res.status(400).json({ error: 'El teléfono es requerido' })
  }

  try {
    const db = getDatabase()

    const citas = db.prepare(`
      SELECT c.*, s.nombre as servicio_nombre, b.nombre as barbero_nombre
      FROM citas c
      LEFT JOIN servicios s ON c.servicio_id = s.id
      LEFT JOIN barberos b ON c.barbero_id = b.id
      WHERE c.telefono_cliente = ?
      ORDER BY c.fecha DESC, c.hora DESC
    `).all(telefono as string)

    res.status(200).json({ citas })
  } catch (error) {
    console.error('Error consulting citas:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}