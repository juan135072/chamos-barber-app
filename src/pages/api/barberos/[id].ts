import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../../lib/initSupabase'
import type { Database } from '../../../../lib/database.types'

type Barbero = Database['public']['Tables']['barberos']['Row']

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID or slug is required' })
  }

  try {
    // Intentar buscar por UUID primero, luego por slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    
    let query = (supabase as any)
      .from('barberos')
      .select('*')
      .eq('activo', true)

    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return res.status(404).json({ error: 'Barbero no encontrado' })
      }
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Error fetching barbero', details: error.message })
    }

    if (!data) {
      return res.status(404).json({ error: 'Barbero no encontrado' })
    }

    // Mapear los datos de la BD al formato que espera el frontend
    const barbero = data as Barbero
    const mappedData = {
      id: barbero.id,
      slug: barbero.slug || '',
      nombre: `${barbero.nombre} ${barbero.apellido}`,
      biografia: barbero.descripcion || '',
      foto_url: barbero.imagen_url || '',
      especialidades: barbero.especialidades || [],
      experiencia_anos: 5, // Valor por defecto
      telefono: barbero.telefono,
      instagram: barbero.instagram,
      calificacion: 4.5 // Valor por defecto
    }

    return res.status(200).json(mappedData)
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
