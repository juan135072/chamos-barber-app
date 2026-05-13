import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'

export interface Tenant {
  id: string
  nombre: string
  slug: string
  dominio_custom: string | null
  logo_url: string | null
  favicon_url: string | null
  color_primario: string
  color_secundario: string
  color_fondo: string
  descripcion: string | null
  telefono: string | null
  email_contacto: string | null
  direccion: string | null
  pais: string
  moneda: string
  timezone: string
  plan: 'trial' | 'pro' | 'enterprise'
  activo: boolean
  max_barberos: number
}

interface TenantContextType {
  tenant: Tenant | null
  loading: boolean
  error: string | null
  isSaasLanding: boolean
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true,
  error: null,
  isSaasLanding: false,
})

function getSlugFromBrowser(): string {
  if (typeof window === 'undefined') return ''
  
  // 1. Check for slug in URL query params (useful for local development redirects)
  const params = new URLSearchParams(window.location.search)
  const urlSlug = params.get('slug')
  if (urlSlug) return urlSlug

  const hostname = window.location.hostname
  // 2. Check hostname for subdomains
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return process.env.NEXT_PUBLIC_TENANT_SLUG || 'chamos'
  }
  const parts = hostname.split('.')
  if (parts.length > 2) {
    const sub = parts[0]
    return sub === 'www' ? '' : sub
  }
  return ''
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaasLanding, setIsSaasLanding] = useState(false)

  useEffect(() => {
    const slug = getSlugFromBrowser()
    const hostname = typeof window !== 'undefined' ? window.location.hostname : ''

    // Resolve order: explicit ?slug, then subdomain slug, then bare-domain
    // custom_domain match. The bare-domain branch is what makes the
    // production site (chamosbarber.com) resolve to its comercio — without
    // it, useTenant() returns null forever and any page that gates on
    // tenant.id (e.g. /equipo) stays in a loading spinner.
    const resolveUrl = slug
      ? `/api/tenant/resolve?slug=${encodeURIComponent(slug)}`
      : hostname && hostname !== 'localhost' && hostname !== '127.0.0.1'
        ? `/api/tenant/resolve?domain=${encodeURIComponent(hostname)}`
        : null

    if (!resolveUrl) {
      setIsSaasLanding(true)
      setLoading(false)
      return
    }

    fetch(resolveUrl)
      .then(res => {
        if (!res.ok) throw new Error('Comercio no encontrado')
        return res.json()
      })
      .then((data: Tenant) => {
        setTenant(data)
        document.documentElement.style.setProperty('--tenant-primary', data.color_primario)
        document.documentElement.style.setProperty('--tenant-bg', data.color_fondo)
        document.documentElement.style.setProperty('--tenant-secondary', data.color_secundario)
      })
      .catch(err => {
        console.error('[TenantContext] Error:', err)
        setError(err.message)
        // No tenant resolved via slug or custom domain → treat as SaaS landing
        // so pages that read isSaasLanding can branch correctly.
        setIsSaasLanding(true)
      })
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo(() => ({ tenant, loading, error, isSaasLanding }), [tenant, loading, error, isSaasLanding])

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => useContext(TenantContext)
