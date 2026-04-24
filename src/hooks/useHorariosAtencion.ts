import { useState, useEffect, useCallback } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '@/lib/database.types'

type HorarioAtencion = Database['public']['Tables']['horarios_atencion']['Row']

interface UseHorariosAtencionReturn {
  horarios: HorarioAtencion[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useHorariosAtencion(barberoId?: string): UseHorariosAtencionReturn {
  const supabase = useSupabaseClient<Database>()
  const [horarios, setHorarios] = useState<HorarioAtencion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!barberoId) {
      setHorarios([])
      return
    }
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('horarios_atencion')
        .select('*')
        .eq('barbero_id', barberoId)
        .order('dia_semana')

      if (err) throw err
      setHorarios(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar horarios'
      setError(msg)
      console.error('[useHorariosAtencion]', err)
    } finally {
      setLoading(false)
    }
  }, [barberoId, supabase])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { horarios, loading, error, refetch }
}
