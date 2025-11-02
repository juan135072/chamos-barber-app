import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/initSupabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { barbero_id, aprobado, activo, limit } = req.query

  try {
    let query = (supabase as any)
      .from('barbero_portfolio')
      .select('*')
      .order('orden_display', { ascending: true })

    // Filtrar por barbero_id si se proporciona
    if (barbero_id && typeof barbero_id === 'string') {
      query = query.eq('barbero_id', barbero_id)
    }

    // Filtrar por aprobado (por defecto true)
    const aprobadoValue = aprobado === 'false' ? false : true
    query = query.eq('aprobado', aprobadoValue)

    // Filtrar por activo (por defecto true)
    const activoValue = activo === 'false' ? false : true
    query = query.eq('activo', activoValue)

    // Limitar resultados si se especifica
    if (limit && typeof limit === 'string') {
      const limitNum = parseInt(limit, 10)
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Error fetching portfolio', details: error.message })
    }

    if (!data) {
      return res.status(200).json({ data: [] })
    }

    return res.status(200).json({ data })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
