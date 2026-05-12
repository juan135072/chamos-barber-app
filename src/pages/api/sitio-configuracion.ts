import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Usa service_role key para bypasear RLS (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { slug, comercio_id } = req.query

  if (!slug && !comercio_id) {
    return res.status(400).json({ error: 'slug o comercio_id requerido' })
  }

  try {
    let tenantId = comercio_id as string | undefined

    // Resolver comercio_id desde slug si no viene directo
    if (!tenantId && slug) {
      const { data: comercio } = await supabase
        .from('comercios')
        .select('id')
        .eq('slug', slug as string)
        .single()
      tenantId = comercio?.id
    }

    if (!tenantId) {
      return res.status(404).json({ error: 'Comercio no encontrado' })
    }

    const { data, error } = await supabase
      .from('sitio_configuracion')
      .select('clave, valor, tipo, categoria')
      .eq('comercio_id', tenantId)
      .eq('publico', true)

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Error fetching configuration', details: error.message })
    }

    return res.status(200).json(data || [])
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
