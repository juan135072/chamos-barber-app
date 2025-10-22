import type { NextApiRequest, NextApiResponse } from 'next'
import { getDatabase } from '../../lib/database'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { barbero_id, fecha } = req.query

  if (!barbero_id || !fecha) {
    return res.status(400).json({ error: 'barbero_id y fecha son requeridos' })
  }

  try {
    const db = getDatabase()

    // Obtener citas existentes para el barbero en esa fecha
    const citasExistentes = db.prepare(`
      SELECT hora FROM citas 
      WHERE barbero_id = ? AND fecha = ? 
      AND estado NOT IN ('cancelada', 'completada')
    `).all(barbero_id as string, fecha as string)

    const horasOcupadas = citasExistentes.map((cita: any) => cita.hora)

    // Horarios disponibles (esto debería idealmente venir de una configuración)
    const todoLosHorarios = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
    ]

    // Verificar si la fecha es hoy y filtrar horarios pasados
    const fechaSeleccionada = new Date(fecha as string)
    const hoy = new Date()
    const esHoy = fechaSeleccionada.toDateString() === hoy.toDateString()
    
    let horariosDisponibles = todoLosHorarios.filter(hora => !horasOcupadas.includes(hora))

    if (esHoy) {
      const horaActual = hoy.getHours()
      const minutoActual = hoy.getMinutes()
      
      horariosDisponibles = horariosDisponibles.filter(hora => {
        const [horaSlot, minutoSlot] = hora.split(':').map(Number)
        return horaSlot > horaActual || (horaSlot === horaActual && minutoSlot > minutoActual)
      })
    }

    res.status(200).json({ horarios: horariosDisponibles })
  } catch (error) {
    console.error('Error getting available slots:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}