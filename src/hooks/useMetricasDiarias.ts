// ================================================================
// 📱 HOOK: useMetricasDiarias
// Obtiene las métricas diarias del barbero
// ================================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { MetricasDiarias } from '../types/barber-app'

export function useMetricasDiarias(barberoId: string | null) {
  const [metricas, setMetricas] = useState<MetricasDiarias>({
    total_citas: 0,
    citas_completadas: 0,
    citas_pendientes: 0,
    ganancia_total: 0,
    promedio_por_cita: 0
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

      // Usar función RPC optimizada
      const { data, error: rpcError } = await supabase.rpc('obtener_metricas_diarias_barbero', {
        barbero_uuid: barberoId
      } as any)

      if (rpcError) throw rpcError

      if (data && (data as any).length > 0) {
        setMetricas((data as any)[0])
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
