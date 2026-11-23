// ================================================================
// 📱 HOOK: useCitasRealtime
// Maneja las citas en tiempo real con Supabase Realtime
// ================================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getChileHoy } from '../lib/date-utils'
import type { Cita, RealtimePayload } from '../types/barber-app'

export function useCitasRealtime(barberoId: string | null) {
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Función para obtener citas de hoy.
  // silent: recarga en segundo plano (al volver a la app), sin spinner ni error en pantalla.
  const fetchCitasHoy = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!barberoId) {
      setLoading(false)
      return
    }

    try {
      if (!silent) {
        setLoading(true)
        setError(null)
      }

      const hoy = getChileHoy()

      const { data, error: rpcError } = await supabase
        .from('citas')
        .select('*')
        .eq('barbero_id', barberoId)
        .eq('fecha', hoy)
        .order('hora', { ascending: true })

      if (rpcError) throw rpcError

      setCitas((data || []) as any)
      setLastUpdate(new Date())
      if (silent) setError(null)
    } catch (err: any) {
      if (silent) {
        console.warn('No se pudieron recargar las citas en segundo plano:', err)
        return
      }
      console.error('Error al obtener citas:', err)
      setError(err.message || 'Error al cargar citas')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [barberoId])

  // Cargar citas iniciales
  useEffect(() => {
    fetchCitasHoy()
  }, [fetchCitasHoy])

  // Con la app en segundo plano o sin conexión el canal de Realtime pudo perder
  // eventos (o cambió el día): recargar al volver o al recuperar la conexión.
  useEffect(() => {
    if (!barberoId) return
    const resync = () => {
      if (document.visibilityState === 'visible') fetchCitasHoy({ silent: true })
    }
    document.addEventListener('visibilitychange', resync)
    window.addEventListener('online', resync)
    return () => {
      document.removeEventListener('visibilitychange', resync)
      window.removeEventListener('online', resync)
    }
  }, [barberoId, fetchCitasHoy])

  // Configurar Supabase Realtime
  useEffect(() => {
    if (!barberoId) return

    console.log('🔔 Configurando Supabase Realtime para barbero:', barberoId)

    // Crear canal de Realtime
    const channel = supabase
      .channel(`citas-barbero-${barberoId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar todos los eventos: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'citas',
          filter: `barbero_id=eq.${barberoId}` // Solo citas de este barbero
        },
        (payload: any) => {
          console.log('📬 Cambio detectado en tiempo real:', payload)
          handleRealtimeChange(payload)
        }
      )
      .subscribe((status: any) => {
        console.log('📡 Estado de Realtime:', status)

        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado a Realtime')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en canal de Realtime')
          setError('Error en conexión en tiempo real')
        }
      })

    // Cleanup al desmontar
    return () => {
      console.log('🔌 Desconectando Realtime')
      supabase.removeChannel(channel)
    }
  }, [barberoId])

  // Manejar cambios en tiempo real
  const handleRealtimeChange = (payload: RealtimePayload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    // Compare date strings directly — avoids UTC-vs-local off-by-one when parsing
    // bare DATE values (e.g. "2026-05-15") with new Date(), which treats them as
    // UTC midnight and returns the previous local day in UTC-4/-5 timezones.
    const esHoy = (fecha: string) => fecha === getChileHoy()

    switch (eventType) {
      case 'INSERT':
        // Nueva cita insertada
        // citas uses separate fecha (DATE) + hora (TIME) columns, not fecha_hora
        if (newRecord && newRecord.fecha && esHoy(newRecord.fecha)) {
          console.log('➕ Nueva cita insertada:', newRecord)
          setCitas((prevCitas) => {
            // Evitar duplicados
            if (prevCitas.some((c) => c.id === newRecord.id)) {
              return prevCitas
            }
            // Insertar y ordenar por hora
            return [...prevCitas, newRecord].sort(
              (a, b) => {
                const timeA = a.hora ?? ''
                const timeB = b.hora ?? ''
                return timeA.localeCompare(timeB)
              }
            )
          })
          setLastUpdate(new Date())

          // Mostrar notificación (opcional)
          showNotification('Nueva cita', `${newRecord.cliente_nombre}`)
        }
        break

      case 'UPDATE':
        // Cita actualizada
        if (newRecord) {
          console.log('📝 Cita actualizada:', newRecord)
          setCitas((prevCitas) =>
            prevCitas.map((cita) =>
              cita.id === newRecord.id ? { ...cita, ...newRecord } : cita
            )
          )
          setLastUpdate(new Date())
        }
        break

      case 'DELETE':
        // Cita eliminada
        if (oldRecord) {
          console.log('🗑️ Cita eliminada:', oldRecord)
          setCitas((prevCitas) => prevCitas.filter((cita) => cita.id !== oldRecord.id))
          setLastUpdate(new Date())
        }
        break
    }
  }

  // Función auxiliar para notificaciones.
  // `new Notification()` lanza "Illegal constructor" en Chrome Android: se usa el
  // service worker registrado (OneSignal) y, si no hay ninguno, no se muestra nada.
  const showNotification = (title: string, body: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistration()
      .then((registration) => registration?.showNotification(title, {
        body,
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        tag: 'barber-app-cita',
        requireInteraction: false
      }))
      .catch((err) => console.warn('Notificación local omitida:', err))
  }

  // Función para refrescar manualmente
  const refresh = useCallback(() => {
    fetchCitasHoy()
  }, [fetchCitasHoy])

  // Funciones para cambiar estado de citas
  const cambiarEstadoCita = useCallback(
    async (citaId: string, nuevoEstado: 'confirmada' | 'completada' | 'cancelada') => {
      if (!barberoId) return { success: false, error: 'No hay barbero autenticado' }

      try {
        const { data, error: rpcError } = await supabase
          .from('citas')
          .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
          .eq('id', citaId)
          .eq('barbero_id', barberoId)
          .select()
          .single()

        if (rpcError) throw rpcError

        // Realtime: notificar al resto de pantallas suscritas (admin panel,
        // otras instancias del mismo barbero abiertas en otros dispositivos).
        // El cambio en el dispositivo actual se refleja al hacer setCitas via
        // el siguiente render — no dependemos del round-trip.
        try {
          const { publishCitaChange } = await import('@/lib/realtime-publish')
          await publishCitaChange(supabase, 'UPDATE', (data as any) ?? { id: citaId, barbero_id: barberoId, comercio_id: null, estado: nuevoEstado })
        } catch (rtErr) {
          console.warn('[useCitasRealtime] realtime publish skipped:', rtErr)
        }

        return { success: true, data }
      } catch (err: any) {
        console.error('Error al cambiar estado de cita:', err)
        return { success: false, error: err.message }
      }
    },
    [barberoId]
  )

  // Estadísticas de citas
  const stats = {
    total: citas.length,
    pendientes: citas.filter((c) => c.estado === 'pendiente').length,
    confirmadas: citas.filter((c) => c.estado === 'confirmada').length,
    completadas: citas.filter((c) => c.estado === 'completada').length,
    canceladas: citas.filter((c) => c.estado === 'cancelada').length
  }

  return {
    citas,
    loading,
    error,
    lastUpdate,
    refresh,
    cambiarEstadoCita,
    stats
  }
}
