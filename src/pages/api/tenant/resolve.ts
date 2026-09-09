import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient } from '@/lib/supabase-server'

const LEGACY_DOMAIN_SLUGS: Record<string, string> = {
  'old.chamosbarber.com': 'chamos',
}

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

  const normalizedDomain = domain
    ? (domain as string).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    : null

  const COLS = 'id,nombre,slug,dominio_custom,logo_url,favicon_url,color_primario,color_secundario,color_fondo,descripcion,telefono,email_contacto,direccion,pais,moneda,timezone,plan,activo,max_barberos'

  const candidates: Array<{ col: string; val: string }> = []
  const legacySlug = normalizedDomain ? LEGACY_DOMAIN_SLUGS[normalizedDomain] : undefined

  // old.chamosbarber.com is the legacy production hostname for the original
  // Chamos tenant. Resolve it explicitly before interpreting "old" as a SaaS slug.
  if (legacySlug) {
    candidates.push({ col: 'slug', val: legacySlug })
  }

  if (slug) {
    candidates.push({ col: 'slug', val: slug as string })
  }

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

  // Remove duplicate candidate lookups while preserving priority.
  const uniqueCandidates = candidates.filter(
    (candidate, index, all) =>
      all.findIndex(item => item.col === candidate.col && item.val === candidate.val) === index
  )

  try {
    // Tenant resolution used to call the retired api-insforge/PostgREST host.
    // Use the same current InsForge server client as the rest of the application.
    const admin = createPagesAdminClient()
    let lastError: any = null

    for (const { col, val } of uniqueCandidates) {
      const { data, error } = await admin
        .from('comercios')
        .select(COLS)
        .eq(col, val)
        .limit(1)

      if (error) {
        lastError = error
        console.error('[tenant/resolve] lookup error for', col, '=', val, error)
        continue
      }

      const tenant = Array.isArray(data) ? data[0] : data
      if (!tenant) continue

      if (!tenant.activo) {
        return res.status(403).json({ error: 'Comercio suspendido' })
      }

      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
      return res.status(200).json(tenant)
    }

    if (lastError) {
      return res.status(503).json({ error: 'Backend no disponible, reintentá en unos segundos' })
    }

    return res.status(404).json({ error: 'Comercio no encontrado' })
  } catch (error: any) {
    console.error('[tenant/resolve] fatal error:', error?.message ?? error)
    return res.status(503).json({ error: 'Backend no disponible, reintentá en unos segundos' })
  }
}
