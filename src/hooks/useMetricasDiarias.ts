import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { MetricasDiarias } from '../types/barber-app'

export function useMetricasDiarias(barberoId: string | null) {
  const [metricas, setMetricas] = useState<MetricasDiarias>({
    hoy: { ganancia: 0, total_citas: 0, completadas: 0, pendientes: 0 },
    semana: { ganancia: 0 },
    mes: { ganancia: 0, total_servicios: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetricas = useCallback(async () => {
    if (!barberoId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/barbero/metricas?barberoId=${barberoId}`)
      const result = await response.json()

      if (!response.ok) throw new Error(result.error ?? 'Error al cargar métricas')

      setMetricas(result.data as MetricasDiarias)
    } catch (err: any) {
      console.error('Error al obtener métricas:', err)
      setError(err.message || 'Error al cargar métricas')
    } finally {
      setLoading(false)
    }
  }, [barberoId])

  useEffect(() => {
    fetchMetricas()
  }, [fetchMetricas])

  useEffect(() => {
    const interval = setInterval(fetchMetricas, 30000)
    return () => clearInterval(interval)
  }, [fetchMetricas])

  return {
    metricas,
    loading,
    error,
    refresh: fetchMetricas
  }
}
