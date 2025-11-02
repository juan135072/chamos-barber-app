import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data, error } = await supabase
      .from('enlaces_sociales')
      .select('*')
      .eq('activo', true)
      .order('orden_display', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Error fetching social links', details: error.message })
    }

    return res.status(200).json({ data: data || [] })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
