import { useEffect, useMemo, useState } from 'react'
import { chamosSupabase } from '@/lib/supabase-helpers'
import { useTenant } from '@/context/TenantContext'

/** Public settings as a key → value map; a setting without a value is ''. */
export type PublicConfig = Record<string, string>

interface ConfigRow {
  clave: string
  valor: string | null
  comercio_id?: string | null
}

/**
 * Public site settings (the `sitio_configuracion` rows anyone may read), read
 * again every time a component mounts: there is no cache that could go stale
 * after the owner edits the admin panel.
 *
 * Returns null while the settings are unknown (still loading, or the read
 * failed), so a screen can tell "unknown" from "not configured". Once the shop
 * is known only its rows are kept, like the database does for the booking
 * calendar; without a resolved shop every public row is used.
 */
export function usePublicConfig(): PublicConfig | null {
  const { tenant, loading: tenantLoading } = useTenant()
  const [rows, setRows] = useState<ConfigRow[] | null>(null)

  useEffect(() => {
    let mounted = true
    chamosSupabase.getConfiguracion()
      .then((data) => { if (mounted) setRows(Array.isArray(data) ? data : null) })
      .catch((error) => console.error('Error loading public config:', error))
    return () => { mounted = false }
  }, [])

  const shopId = tenant?.id
  return useMemo(() => {
    if (!rows || tenantLoading) return null
    const config: PublicConfig = {}
    for (const row of rows) {
      if (shopId && row.comercio_id !== shopId) continue
      config[row.clave] = row.valor || ''
    }
    return config
  }, [rows, shopId, tenantLoading])
}
