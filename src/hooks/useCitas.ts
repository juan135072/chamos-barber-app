import { useState, useEffect, useCallback } from 'react'
import { chamosSupabase } from '@/lib/supabase-helpers'

interface CitaFilters {
  barbero_id?: string
  fecha?: string
  estado?: string
}

interface UseCitasOptions {
  filters?: CitaFilters
  autoFetch?: boolean
}

interface UseCitasReturn {
  citas: ReturnType<typeof chamosSupabase.getCitas> extends Promise<infer T> ? T : never
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCitas(options: UseCitasOptions = {}): { citas: any[]; loading: boolean; error: string | null; refetch: () => Promise<void> } {
  const { filters, autoFetch = true } = options

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [citas, setCitas] = useState<any[]>([])
  const [loading, setLoading] = useState(autoFetch)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await chamosSupabase.getCitas(filters)
      setCitas(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar citas'
      setError(msg)
      console.error('[useCitas]', err)
    } finally {
      setLoading(false)
    }
  }, [filters?.barbero_id, filters?.fecha, filters?.estado]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoFetch) refetch()
  }, [autoFetch, refetch])

  return { citas, loading, error, refetch }
}
