// ================================================================
// 📱 HOOK: useCitasRealtime
// Maneja las citas en tiempo real con Supabase Realtime
// ================================================================

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { checkAppSession } from '../lib/app-session'
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

      // Al volver tras un rato en segundo plano el token en memoria pudo vencer y
      // se restaura en este mismo evento: esperar esa restauración antes de consultar.
      if (silent && (await checkAppSession()).status !== 'signed-in') return

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

          // Con la app a la vista, un aviso dentro de la app. Sin notificación del
          // sistema: el push de OneSignal ya avisa de la reserva (serían dos) y el
          // service worker de OneSignal no sabe abrir una notificación que no es suya.
          if (document.visibilityState === 'visible') {
            toast(`Nueva cita: ${newRecord.cliente_nombre}`, { icon: '✂️' })
          }
        }
        break

      case 'UPDATE':
        // Cita actualizada
        if (newRecord) {
          console.log('📝 Cita actualizada:', newRecord)
          // The list is today's agenda, and a cita can be rescheduled to another
          // day, time or barber. Events without `fecha` only refresh a listed cita.
          const porHora = (a: Cita, b: Cita) => (a.hora ?? '').localeCompare(b.hora ?? '')
          setCitas((prevCitas) => {
            const listada = prevCitas.find((cita) => cita.id === newRecord.id)
            if (!listada) {
              // Moved into today, or reassigned to this barber: it joins the agenda.
              return newRecord.fecha && esHoy(newRecord.fecha) ? [...prevCitas, newRecord].sort(porHora) : prevCitas
            }
            // Moved to another day: it leaves the agenda.
            if (newRecord.fecha && newRecord.fecha !== listada.fecha && !esHoy(newRecord.fecha)) {
              return prevCitas.filter((cita) => cita.id !== newRecord.id)
            }
            // Anything else changes it in place; a new time moves it in the list.
            return prevCitas
              .map((cita) => (cita.id === newRecord.id ? { ...cita, ...newRecord } : cita))
              .sort(porHora)
          })
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
