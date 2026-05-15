// ================================================================
// 📱 PÁGINA: Barber App - Agenda del Día
// Página principal mobile-first para barberos
// ================================================================

import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useBarberAppAuth } from '../../hooks/useBarberAppAuth'
import { useCitasRealtime } from '../../hooks/useCitasRealtime'
import { useMetricasDiarias } from '../../hooks/useMetricasDiarias'
import BarberAppLayout from '../../components/barber-app/layout/BarberAppLayout'
import { chamosSupabase } from '@/lib/supabase-helpers'
import { useOneSignal } from '../../components/providers/OneSignalProvider'
import MetricasRapidas from '../../components/barber-app/dashboard/MetricasRapidas'
import ProximaCitaCard from '../../components/barber-app/dashboard/ProximaCitaCard'
import CitasList from '../../components/barber-app/citas/CitasList'
import LoadingSpinner from '../../components/barber-app/shared/LoadingSpinner'
import ModalCobro from '../../components/barber-app/cobro/ModalCobro'
import toast from 'react-hot-toast'

export default function BarberAppPage() {
  const router = useRouter()
  const { session, loading: authLoading, error: authError, barbero } = useBarberAppAuth()
  const { citas, loading: citasLoading, refresh, cambiarEstadoCita } = useCitasRealtime(
    session?.barberoId || null
  )
  const { metricas, loading: metricasLoading } = useMetricasDiarias(session?.barberoId || null)

  // Calcular la próxima cita
  const hoyStr = new Date().toISOString().split('T')[0]
  const proximaCita = citas
    ? citas
      .filter(c => c.fecha === hoyStr && (c.estado === 'pendiente' || c.estado === 'confirmada'))
      .sort((a, b) => a.hora.localeCompare(b.hora))[0] || null
    : null

  // Estado para el modal de cobro
  const [citaParaCobrar, setCitaParaCobrar] = useState<any>(null)
  const [modalCobroOpen, setModalCobroOpen] = useState(false)

  const { setExternalId, triggerPrompt, sendTags, permissionStatus } = useOneSignal()

  // Configurar OneSignal con datos del barbero
  useEffect(() => {
    if (!session?.barberoId || !barbero) return

    // Usar el provider central para vincular el ID
    setExternalId(session.barberoId)

    // Enviar tags
    sendTags({
      barbero_id: session.barberoId,
      barbero_nombre: `${barbero.nombre} ${barbero.apellido}`,
      rol: 'barbero',
      email: session.email
    })

    // Mostrar el prompt después de un pequeño delay si no hay permisos
    if (permissionStatus === 'default') {
      const timer = setTimeout(() => {
        triggerPrompt()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [session?.barberoId, barbero, setExternalId, triggerPrompt, sendTags, permissionStatus])

  // Handlers para las acciones de citas
  const handleCheckIn = async (citaId: string) => {
    const result = await cambiarEstadoCita(citaId, 'confirmada')
    if (result.success) {
      console.log('✅ Check-in realizado')
    } else {
      toast.error('Error al realizar check-in')
    }
  }

  const handleCompletar = async (citaId: string) => {
    // Buscar la cita para abrir el modal de cobro
    const cita = citas.find(c => c.id === citaId)
    if (!cita) {
      toast.error('Cita no encontrada')
      return
    }

    // Abrir modal de cobro
    setCitaParaCobrar(cita)
    setModalCobroOpen(true)
  }

  const handleConfirmarCobro = async (
    citaId: string,
    montoCobrado: number,
    metodoPago: string
  ) => {
    try {
      // 1. Completar la cita y registrar el cobro
      const response = await fetch('/api/barbero/completar-cita-con-cobro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cita_id: citaId,
          monto_cobrado: montoCobrado,
          metodo_pago: metodoPago,
          barbero_id: session?.barberoId
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al procesar el cobro')
      }

      // Refrescar las citas
      await refresh()

      console.log('✅ Cita completada y cobro registrado')
      toast.success('Cobro procesado exitosamente')
    } catch (error: any) {
      console.error('Error al confirmar cobro:', error)
      throw error
    }
  }

  const handleCancelar = async (citaId: string) => {
    if (confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
      const result = await cambiarEstadoCita(citaId, 'cancelada')
      if (result.success) {
        console.log('✅ Cita cancelada')
      } else {
        toast.error('Error al cancelar cita')
      }
    }
  }

  // Mostrar loading mientras autentica
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)'
      }}>
        <LoadingSpinner text="Verificando acceso..." />
      </div>
    )
  }

  // Mostrar error de autenticación
  if (authError || !session || !barbero) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        padding: '2rem'
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Acceso Denegado</h2>
          <p style={{ marginBottom: '2rem', opacity: 0.8 }}>{authError || 'No tienes permisos para acceder'}</p>
          <button
            onClick={() => router.push('/chamos-acceso')}
            style={{
              padding: '1rem 2rem',
              background: '#D4AF37',
              border: 'none',
              borderRadius: '12px',
              color: '#121212',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Ir al Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Agenda del Día - Barber App</title>
        <meta name="description" content="Gestiona tus citas del día" />
      </Head>

      <BarberAppLayout barbero={barbero} currentPage="agenda">
        {/* Métricas rápidas */}
        <MetricasRapidas metricas={metricas} loading={metricasLoading} />

        {/* Próxima Cita Highlight */}
        <ProximaCitaCard cita={proximaCita} loading={citasLoading} />

        {/* Lista de citas con Realtime */}
        <CitasList
          citas={citas}
          loading={citasLoading}
          onRefresh={refresh}
          onCheckIn={handleCheckIn}
          onCompletar={handleCompletar}
          onCancelar={handleCancelar}
        />

        {/* Modal de Cobro */}
        {citaParaCobrar && (
          <ModalCobro
            cita={citaParaCobrar}
            isOpen={modalCobroOpen}
            onClose={() => {
              setModalCobroOpen(false)
              setCitaParaCobrar(null)
            }}
            onConfirmar={handleConfirmarCobro}
          />
        )}
      </BarberAppLayout>

      <style jsx global>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
            Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overscroll-behavior: none;
        }

        * {
          box-sizing: border-box;
        }

        /* Prevenir zoom en inputs en iOS */
        input,
        select,
        textarea {
          font-size: 16px !important;
        }

        /* Deshabilitar pull-to-refresh en Chrome mobile */
        body {
          overscroll-behavior-y: contain;
        }
      `}</style>
    </>
  )
}

