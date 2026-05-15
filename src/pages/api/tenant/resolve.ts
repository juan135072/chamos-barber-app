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

  // Lookup by slug, then by bare domain, then by www-prefixed domain.
  // Two .eq() queries are more portable than .or() across PostgREST flavors —
  // the InsForge SDK's .or() translation can silently mismatch.
  const candidates: Array<{ col: 'slug' | 'dominio_custom'; val: string }> = []
  if (slug) {
    candidates.push({ col: 'slug', val: slug as string })
  } else if (normalizedDomain) {
    candidates.push({ col: 'dominio_custom', val: normalizedDomain })
    candidates.push({ col: 'dominio_custom', val: `www.${normalizedDomain}` })
  }

  let lastError: any = null
  for (const { col, val } of candidates) {
    try {
      const { data, error } = await supabase
        .from('comercios')
        .select(COLS)
        .eq(col, val)
        .maybeSingle()

      if (error) {
        lastError = error
        continue
      }
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

  // Distinguish "backend unavailable" (return 503 so the client retries)
  // from "comercio truly missing" (404 — stable, browser may cache).
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
