import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/initSupabase'
import type { Database } from '../../../lib/database.types'

type Barbero = Database['public']['Tables']['barberos']['Row']

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
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Error fetching barberos', details: error.message })
    }

    if (!data) {
      return res.status(200).json({ data: [] })
    }

    // Mapear los datos de la BD al formato que espera el frontend
    const mappedData = (data as Barbero[]).map(barbero => ({
      id: barbero.id,
      slug: barbero.slug || '',
      nombre: `${barbero.nombre} ${barbero.apellido}`,
      biografia: barbero.descripcion || 'Barbero profesional con experiencia',
      foto_url: barbero.imagen_url || '',
      especialidades: barbero.especialidades || [],
      experiencia_anos: 5, // Default
      telefono: barbero.telefono,
      instagram: barbero.instagram
    }))

    return res.status(200).json({ data: mappedData })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
