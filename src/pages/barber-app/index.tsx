// ================================================================
// 📱 PÁGINA: Barber App - Agenda del Día
// Página principal mobile-first para barberos
// ================================================================

import React, { useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useBarberAppAuth } from '../../hooks/useBarberAppAuth'
import { useCitasRealtime } from '../../hooks/useCitasRealtime'
import { useMetricasDiarias } from '../../hooks/useMetricasDiarias'
import BarberAppLayout from '../../components/barber-app/layout/BarberAppLayout'
import MetricasRapidas from '../../components/barber-app/dashboard/MetricasRapidas'
import CitasList from '../../components/barber-app/citas/CitasList'
import LoadingSpinner from '../../components/barber-app/shared/LoadingSpinner'

export default function BarberAppPage() {
  const router = useRouter()
  const { session, loading: authLoading, error: authError, barbero } = useBarberAppAuth()
  const { citas, loading: citasLoading, refresh, cambiarEstadoCita } = useCitasRealtime(
    session?.barberoId || null
  )
  const { metricas, loading: metricasLoading } = useMetricasDiarias(session?.barberoId || null)

  // Solicitar permisos de notificaciones al montar
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('✅ Permisos de notificación concedidos')
        }
      })
    }
  }, [])

  // Handlers para las acciones de citas
  const handleCheckIn = async (citaId: string) => {
    const result = await cambiarEstadoCita(citaId, 'confirmada')
    if (result.success) {
      console.log('✅ Check-in realizado')
    } else {
      alert('Error al realizar check-in')
    }
  }

  const handleCompletar = async (citaId: string) => {
    const result = await cambiarEstadoCita(citaId, 'completada')
    if (result.success) {
      console.log('✅ Cita completada')
    } else {
      alert('Error al completar cita')
    }
  }

  const handleCancelar = async (citaId: string) => {
    if (confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
      const result = await cambiarEstadoCita(citaId, 'cancelada')
      if (result.success) {
        console.log('✅ Cita cancelada')
      } else {
        alert('Error al cancelar cita')
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
            onClick={() => router.push('/login')}
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

        {/* Lista de citas con Realtime */}
        <CitasList
          citas={citas}
          loading={citasLoading}
          onRefresh={refresh}
          onCheckIn={handleCheckIn}
          onCompletar={handleCompletar}
          onCancelar={handleCancelar}
        />
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
