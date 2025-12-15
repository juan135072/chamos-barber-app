// ================================================================
// 📱 PÁGINA: Barber App - Historial de Citas
// Historial completo con filtros
// ================================================================

import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Calendar, DollarSign, TrendingUp, Users } from 'lucide-react'
import { useBarberAppAuth } from '../../hooks/useBarberAppAuth'
import { supabase } from '../../lib/supabase'
import BarberAppLayout from '../../components/barber-app/layout/BarberAppLayout'
import LoadingSpinner from '../../components/barber-app/shared/LoadingSpinner'
import EmptyState from '../../components/barber-app/shared/EmptyState'
import type { Cita } from '../../types/barber-app'

interface HistorialStats {
  total_citas: number
  total_ganancia: number
  promedio_cita: number
  total_clientes: number
}

export default function HistoryPage() {
  const router = useRouter()
  const { session, loading: authLoading, error: authError, barbero } = useBarberAppAuth()
  const [citas, setCitas] = useState<Cita[]>([])
  const [stats, setStats] = useState<HistorialStats>({
    total_citas: 0,
    total_ganancia: 0,
    promedio_cita: 0,
    total_clientes: 0
  })
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | 'completadas' | 'canceladas'>('todos')

  // Cargar historial
  useEffect(() => {
    if (!session?.barberoId) return

    const fetchHistorial = async () => {
      try {
        setLoading(true)

        // Obtener citas históricas (últimos 30 días)
        const { data: citasData, error: citasError } = await supabase
          .from('citas')
          .select(`
            id,
            barbero_id,
            servicio_id,
            cliente_nombre,
            cliente_email,
            cliente_telefono,
            fecha_hora,
            duracion,
            estado,
            notas,
            created_at,
            updated_at,
            servicios:servicio_id (
              nombre,
              precio,
              duracion
            )
          `)
          .eq('barbero_id', session.barberoId)
          .gte('fecha_hora', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('fecha_hora', { ascending: false })

        if (citasError) throw citasError

        // Transformar datos
        const citasTransformadas: Cita[] = (citasData || []).map((cita: any) => ({
          ...cita,
          servicio_nombre: cita.servicios?.nombre || 'Sin servicio',
          servicio_precio: cita.servicios?.precio || 0
        }))

        setCitas(citasTransformadas)

        // Calcular estadísticas
        const citasCompletadas = citasTransformadas.filter(c => c.estado === 'completada')
        const totalGanancia = citasCompletadas.reduce((sum, c) => sum + (c.servicio_precio || 0), 0)
        const clientesUnicos = new Set(citasCompletadas.map(c => c.cliente_email)).size

        setStats({
          total_citas: citasTransformadas.length,
          total_ganancia: totalGanancia,
          promedio_cita: citasCompletadas.length > 0 ? totalGanancia / citasCompletadas.length : 0,
          total_clientes: clientesUnicos
        })
      } catch (err) {
        console.error('Error al cargar historial:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistorial()
  }, [session?.barberoId])

  // Filtrar citas
  const citasFiltradas = citas.filter(cita => {
    if (filtro === 'todos') return true
    if (filtro === 'completadas') return cita.estado === 'completada'
    if (filtro === 'canceladas') return cita.estado === 'cancelada'
    return true
  })

  // Formatear fecha
  const formatFecha = (fecha: string) => {
    const date = new Date(fecha)
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Formatear dinero
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Mostrar loading mientras autentica
  if (authLoading) {
    return <LoadingSpinner text="Cargando historial..." fullScreen />
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
        <title>Historial - Barber App</title>
        <meta name="description" content="Historial de citas y estadísticas" />
      </Head>

      <BarberAppLayout barbero={barbero} currentPage="history">
        <div className="history-container">
          {/* Estadísticas generales */}
          <div className="stats-grid">
            <div className="stat-card">
              <Calendar size={24} className="stat-icon" />
              <div className="stat-content">
                <p className="stat-label">Total Citas</p>
                <p className="stat-value">{stats.total_citas}</p>
              </div>
            </div>
            <div className="stat-card">
              <DollarSign size={24} className="stat-icon" />
              <div className="stat-content">
                <p className="stat-label">Ganancia Total</p>
                <p className="stat-value">{formatMoney(stats.total_ganancia)}</p>
              </div>
            </div>
            <div className="stat-card">
              <TrendingUp size={24} className="stat-icon" />
              <div className="stat-content">
                <p className="stat-label">Promedio x Cita</p>
                <p className="stat-value">{formatMoney(stats.promedio_cita)}</p>
              </div>
            </div>
            <div className="stat-card">
              <Users size={24} className="stat-icon" />
              <div className="stat-content">
                <p className="stat-label">Clientes Únicos</p>
                <p className="stat-value">{stats.total_clientes}</p>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="filters">
            <button
              className={`filter-btn ${filtro === 'todos' ? 'active' : ''}`}
              onClick={() => setFiltro('todos')}
            >
              Todas ({citas.length})
            </button>
            <button
              className={`filter-btn ${filtro === 'completadas' ? 'active' : ''}`}
              onClick={() => setFiltro('completadas')}
            >
              Completadas ({citas.filter(c => c.estado === 'completada').length})
            </button>
            <button
              className={`filter-btn ${filtro === 'canceladas' ? 'active' : ''}`}
              onClick={() => setFiltro('canceladas')}
            >
              Canceladas ({citas.filter(c => c.estado === 'cancelada').length})
            </button>
          </div>

          {/* Lista de citas históricas */}
          {loading ? (
            <LoadingSpinner text="Cargando historial..." />
          ) : citasFiltradas.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Sin historial"
              message="No hay citas en el historial de los últimos 30 días"
            />
          ) : (
            <div className="citas-history">
              {citasFiltradas.map((cita) => (
                <div key={cita.id} className={`history-card ${cita.estado}`}>
                  <div className="history-header">
                    <div className="history-client">
                      <p className="client-name">{cita.cliente_nombre}</p>
                      <p className="client-service">{cita.servicio_nombre}</p>
                    </div>
                    <div className="history-badge">
                      <span className={`badge ${cita.estado}`}>
                        {cita.estado === 'completada' ? 'Completada' : 'Cancelada'}
                      </span>
                    </div>
                  </div>
                  <div className="history-details">
                    <p className="history-date">{formatFecha(cita.fecha_hora)}</p>
                    {cita.estado === 'completada' && cita.servicio_precio && (
                      <p className="history-price">{formatMoney(cita.servicio_precio)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <style jsx>{`
          .history-container {
            width: 100%;
            padding-bottom: 2rem;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            margin-bottom: 2rem;
          }

          .stat-card {
            display: flex;
            align-items: center;
            gap: 1rem;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.25rem;
          }

          .stat-card :global(.stat-icon) {
            color: #D4AF37;
            flex-shrink: 0;
          }

          .stat-content {
            flex: 1;
          }

          .stat-label {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.6);
            margin: 0 0 0.25rem 0;
          }

          .stat-value {
            font-size: 1.125rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
          }

          .filters {
            display: flex;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .filter-btn {
            flex-shrink: 0;
            padding: 0.75rem 1.25rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .filter-btn.active {
            background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
            border-color: transparent;
            color: #121212;
          }

          .filter-btn:hover:not(.active) {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
          }

          .citas-history {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .history-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.25rem;
            transition: all 0.3s ease;
          }

          .history-card.completada {
            border-left: 4px solid #10b981;
          }

          .history-card.cancelada {
            border-left: 4px solid #ef4444;
          }

          .history-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 0.75rem;
          }

          .client-name {
            font-size: 1rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 0.25rem 0;
          }

          .client-service {
            font-size: 0.875rem;
            color: rgba(255, 255, 255, 0.7);
            margin: 0;
          }

          .history-badge .badge {
            padding: 0.375rem 0.75rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
          }

          .badge.completada {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
          }

          .badge.cancelada {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
          }

          .history-details {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 0.75rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }

          .history-date {
            font-size: 0.813rem;
            color: rgba(255, 255, 255, 0.6);
            margin: 0;
          }

          .history-price {
            font-size: 1rem;
            font-weight: 700;
            color: #D4AF37;
            margin: 0;
          }

          @media (max-width: 360px) {
            .stats-grid {
              gap: 0.75rem;
            }

            .stat-card {
              padding: 1rem;
            }

            .stat-value {
              font-size: 1rem;
            }

            .history-card {
              padding: 1rem;
            }
          }
        `}</style>
      </BarberAppLayout>
    </>
  )
}
