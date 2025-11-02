import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data, error } = await supabase
      .from('barberos')
      .select('*')
      .eq('activo', true)
      .order('orden_display', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Error fetching barberos', details: error.message })
    }

    // Mapear los datos de la BD al formato que espera el frontend
    const mappedData = data.map(barbero => ({
      id: barbero.id,
      nombre: `${barbero.nombre} ${barbero.apellido}`,
      biografia: barbero.descripcion || '',
      foto_url: barbero.imagen_url || '',
      especialidades: barbero.especialidad ? [barbero.especialidad] : [],
      experiencia_anos: barbero.experiencia_anos || 0,
      telefono: barbero.telefono,
      instagram: barbero.instagram,
      calificacion: barbero.calificacion
    }))

    return res.status(200).json({ data: mappedData })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
