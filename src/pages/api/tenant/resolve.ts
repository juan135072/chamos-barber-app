import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient } from '@/lib/supabase-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { slug, domain } = req.query

  if (!slug && !domain) {
    return res.status(400).json({ error: 'slug or domain is required' })
  }

  if (slug && !/^[a-z0-9-]{2,50}$/.test(slug as string)) {
    return res.status(400).json({ error: 'slug inválido' })
  }

  const supabase = createPagesAdminClient()

  try {
    // Normalize domain: strip scheme and www so "chamosbarber.com",
    // "www.chamosbarber.com", "https://chamosbarber.com" all match the same record.
    const normalizedDomain = domain
      ? (domain as string).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      : null

    const COLS = `
      id, nombre, slug, dominio_custom,
      logo_url, favicon_url,
      color_primario, color_secundario, color_fondo,
      descripcion, telefono, email_contacto, direccion,
      pais, moneda, timezone, activo
    `

    let query = supabase.from('comercios').select(COLS)

    if (slug) {
      query = query.eq('slug', slug as string)
    } else if (normalizedDomain) {
      // Match bare domain OR www-prefixed variant regardless of how it was stored
      query = query.or(
        `dominio_custom.eq.${normalizedDomain},dominio_custom.eq.www.${normalizedDomain}`
      )
    }

    const { data, error } = await query.single()

    if (error || !data) {
      return res.status(404).json({ error: 'Comercio no encontrado' })
    }

    if (!data.activo) {
      return res.status(403).json({ error: 'Comercio suspendido' })
    }

    // Cache 5 minutos — los datos de tenant cambian muy poco
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return res.status(200).json(data)
  } catch (err) {
    console.error('[tenant/resolve] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
