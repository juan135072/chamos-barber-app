import { useState, useEffect, useCallback } from 'react'
import { chamosSupabase } from '@/lib/supabase-helpers'
import type { Database } from '../../lib/database.types'

type Servicio = Database['public']['Tables']['servicios']['Row']

interface UseServiciosOptions {
  soloActivos?: boolean
  autoFetch?: boolean
}

interface UseServiciosReturn {
  servicios: Servicio[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useServicios(options: UseServiciosOptions = {}): UseServiciosReturn {
  const { soloActivos, autoFetch = true } = options

  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(autoFetch)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await chamosSupabase.getServicios(soloActivos)
      setServicios(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar servicios'
      setError(msg)
      console.error('[useServicios]', err)
    } finally {
      setLoading(false)
    }
  }, [soloActivos])

  useEffect(() => {
    if (autoFetch) refetch()
  }, [autoFetch, refetch])

  return { servicios, loading, error, refetch }
}
