import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/initSupabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { telefono } = req.query

  if (!telefono || typeof telefono !== 'string') {
    return res.status(400).json({ error: 'Teléfono es requerido' })
  }

  try {
    // Buscar citas por teléfono del cliente
    const { data: citas, error: citasError } = await (supabase as any)
      .from('citas')
      .select(`
        id,
        fecha,
        hora,
        estado,
        notas,
        servicios (
          nombre,
          precio
        ),
        barberos (
          nombre,
          apellido
        )
      `)
      .eq('cliente_telefono', telefono)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false })

    if (citasError) {
      console.error('Supabase error:', citasError)
      return res.status(500).json({ error: 'Error fetching citas', details: citasError.message })
    }

    if (!citas) {
      return res.status(200).json({ citas: [] })
    }

    // Mapear los datos al formato esperado por el frontend
    const mappedCitas = citas.map((cita: any) => ({
      id: cita.id,
      fecha: cita.fecha,
      hora: cita.hora,
      estado: cita.estado,
      notas: cita.notas,
      servicio_nombre: cita.servicios?.nombre || 'Servicio no especificado',
      barbero_nombre: cita.barberos 
        ? `${cita.barberos.nombre} ${cita.barberos.apellido}`
        : 'Barbero no asignado',
      precio: cita.servicios?.precio || null
    }))

    return res.status(200).json({ citas: mappedCitas })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
