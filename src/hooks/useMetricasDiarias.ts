// ================================================================
// 📱 HOOK: useMetricasDiarias
// Obtiene las métricas diarias del barbero
// ================================================================

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

      // Usar nueva función RPC para métricas acumuladas
      const { data, error: rpcError } = await (supabase as any).rpc('get_barber_dashboard_metrics_v2', {
        barbero_uuid: barberoId
      })

      if (rpcError) throw rpcError

      if (data) {
        setMetricas(data as MetricasDiarias)
      }
    } catch (err: any) {
      console.error('Error al obtener métricas:', err)
      setError(err.message || 'Error al cargar métricas')
    } finally {
      setLoading(false)
    }
  }, [barberoId])

  // Cargar métricas iniciales
  useEffect(() => {
    fetchMetricas()
  }, [fetchMetricas])

  // Refrescar métricas cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetricas()
    }, 30000) // 30 segundos

    return () => clearInterval(interval)
  }, [fetchMetricas])

  return {
    metricas,
    loading,
    error,
    refresh: fetchMetricas
  }
}
