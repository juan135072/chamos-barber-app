import { useState, useEffect, useCallback } from 'react'
import { chamosSupabase } from '@/lib/supabase-helpers'
import type { Database } from '@/lib/database.types'

type Barbero = Database['public']['Tables']['barberos']['Row']

interface UseBarberosOptions {
  soloActivos?: boolean
  autoFetch?: boolean
}

interface UseBarberosReturn {
  barberos: Barbero[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBarberos(options: UseBarberosOptions = {}): UseBarberosReturn {
  const { soloActivos, autoFetch = true } = options

  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [loading, setLoading] = useState(autoFetch)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await chamosSupabase.getBarberos(soloActivos)
      setBarberos(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar barberos'
      setError(msg)
      console.error('[useBarberos]', err)
    } finally {
      setLoading(false)
    }
  }, [soloActivos])

  useEffect(() => {
    if (autoFetch) refetch()
  }, [autoFetch, refetch])

  return { barberos, loading, error, refetch }
}
