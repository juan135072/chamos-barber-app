// ================================================================
// 📱 HOOK: useDisponibilidad
// Maneja el toggle de disponibilidad del barbero
// ================================================================

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDisponibilidad(barberoId: string | null, disponibilidadInicial: boolean = true) {
  const [disponibilidad, setDisponibilidad] = useState(disponibilidadInicial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleDisponibilidad = useCallback(
    async (nuevaDisponibilidad: boolean) => {
      if (!barberoId) {
        setError('No hay barbero autenticado')
        return { success: false }
      }

      try {
        setLoading(true)
        setError(null)

        const { data, error: rpcError } = await supabase
          .from('barberos')
          .update({ disponible: nuevaDisponibilidad })
          .eq('id', barberoId)
          .select('disponible')
          .single()

        if (rpcError) throw rpcError

        setDisponibilidad(nuevaDisponibilidad)
        
        return { success: true, data }
      } catch (err: any) {
        console.error('Error al cambiar disponibilidad:', err)
        setError(err.message || 'Error al cambiar disponibilidad')
        return { success: false, error: err.message }
      } finally {
        setLoading(false)
      }
    },
    [barberoId]
  )

  return {
    disponibilidad,
    loading,
    error,
    toggle: toggleDisponibilidad,
    toggleDisponibilidad,
    setDisponibilidad // Para actualizar desde props externas
  }
}
