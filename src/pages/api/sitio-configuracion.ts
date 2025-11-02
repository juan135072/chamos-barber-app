import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/initSupabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data, error } = await (supabase as any)
      .from('configuracion_sitio')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Error fetching configuration', details: error.message })
    }

    if (!data) {
      return res.status(200).json([])
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
