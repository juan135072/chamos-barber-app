import type { NextApiRequest, NextApiResponse } from 'next'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_URL_DIRECT,
})

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

  // Normalize domain
  const normalizedDomain = domain
    ? (domain as string).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    : null

  const COLS = `id, nombre, slug, dominio_custom,
    logo_url, favicon_url,
    color_primario, color_secundario, color_fondo,
    descripcion, telefono, email_contacto, direccion,
    pais, moneda, timezone, activo`

  // Build candidates
  const candidates: Array<{ col: string; val: string }> = []
  if (slug) {
    candidates.push({ col: 'slug', val: slug as string })
    if (normalizedDomain) {
      candidates.push({ col: 'dominio_custom', val: normalizedDomain })
      candidates.push({ col: 'dominio_custom', val: `www.${normalizedDomain}` })
      const parts = normalizedDomain.split('.')
      if (parts.length > 2) {
        const parentDomain = parts.slice(1).join('.')
        candidates.push({ col: 'dominio_custom', val: parentDomain })
        candidates.push({ col: 'dominio_custom', val: `www.${parentDomain}` })
      }
    }
  } else if (normalizedDomain) {
    candidates.push({ col: 'dominio_custom', val: normalizedDomain })
    candidates.push({ col: 'dominio_custom', val: `www.${normalizedDomain}` })
  }

  let lastError: any = null
  for (const { col, val } of candidates) {
    try {
      const result = await pool.query(
        `SELECT ${COLS} FROM comercios WHERE ${col} = $1 LIMIT 1`,
        [val]
      )
      const data = result.rows[0] || null
      if (!data) continue
      if (!data.activo) {
        return res.status(403).json({ error: 'Comercio suspendido' })
      }
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
      return res.status(200).json(data)
    } catch (err: any) {
      console.error('[tenant/resolve] backend error for', col, '=', val, err?.message ?? err)
      lastError = err
    }
  }

  if (lastError) {
    const msg = String(lastError?.message ?? lastError ?? '')
    const isUpstream = /timeout|fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|gateway|503|502|504/i.test(msg)
    if (isUpstream) {
      return res.status(503).json({ error: 'Backend no disponible, reintentá en unos segundos' })
    }
    return res.status(500).json({ error: 'Internal server error', detail: msg })
  }

  return res.status(404).json({ error: 'Comercio no encontrado' })
}