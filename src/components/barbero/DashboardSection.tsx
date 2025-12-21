import { useState, useEffect } from 'react'
import { DollarSign, Calendar, TrendingUp, Clock, Scissors, Award, Star } from 'lucide-react'
import { MetricasDiarias } from '@/types/barber-app'

interface DashboardSectionProps {
    barberoId: string
    nombreBarbero: string
}

export default function DashboardSection({ barberoId, nombreBarbero }: DashboardSectionProps) {
    const [metricas, setMetricas] = useState<MetricasDiarias | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (barberoId) {
            fetchMetricas()
        }
    }, [barberoId])

    const fetchMetricas = async () => {
        try {
            setLoading(true)
            // Usar la misma lógica que el mobile app
            const response = await fetch(`/api/barbero/metricas?barberoId=${barberoId}`)
            const result = await response.json()
            if (result.success) {
                setMetricas(result.data)
            } else {
                // Fallback or manual fetch if API doesn't exist yet
                // For now, let's assume we might need a direct call if API is missing
            }
        } catch (error) {
            console.error('Error fetching dashboard metrics:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div className="dashboard-container">
            <div className="welcome-header">
                <h1>¡Hola, {nombreBarbero}! 👋</h1>
                <p>Este es el resumen de tu actividad y ganancias acumuladas.</p>
            </div>

            {loading ? (
                <div className="loading-state">Cargando métricas...</div>
            ) : metricas ? (
                <>
                    <div className="metrics-grid">
                        {/* Card Principal: Acumulado Mes */}
                        <div className="info-card premium-card tall">
                            <div className="card-header">
                                <TrendingUp className="icon gold" />
                                <span>Acumulado del Mes</span>
                            </div>
                            <div className="card-body">
                                <div className="main-value gold-text">{formatCurrency(metricas.mes.ganancia)}</div>
                                <div className="sub-value">{metricas.mes.total_servicios} servicios realizados</div>
                            </div>
                            <div className="card-footer">
                                <div className="stat">
                                    <span className="stat-label">Esta Semana</span>
                                    <span className="stat-val">{formatCurrency(metricas.semana.ganancia)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Hoy */}
                        <div className="info-card">
                            <div className="card-header">
                                <DollarSign className="icon green" />
                                <span>Ganancia Hoy</span>
                            </div>
                            <div className="card-body">
                                <div className="main-value">{formatCurrency(metricas.hoy.ganancia)}</div>
                                <div className="sub-value">Realizado hoy</div>
                            </div>
                        </div>

                        {/* Agenda */}
                        <div className="info-card">
                            <div className="card-header">
                                <Calendar className="icon blue" />
                                <span>Citas Agendadas</span>
                            </div>
                            <div className="card-body">
                                <div className="main-value">{metricas.hoy.total_citas}</div>
                                <div className="sub-value">{metricas.hoy.pendientes} pendientes por atender</div>
                            </div>
                        </div>

                        {/* Rating / Meta (Mock por ahora) */}
                        <div className="info-card">
                            <div className="card-header">
                                <Star className="icon yellow" />
                                <span>Tu Calificación</span>
                            </div>
                            <div className="card-body">
                                <div className="main-value">4.9/5.0</div>
                                <div className="sub-value">Basado en últimas reseñas</div>
                            </div>
                        </div>
                    </div>

                    <div className="quick-stats-row">
                        <div className="quick-stat-card">
                            <Clock className="qs-icon" />
                            <div>
                                <strong>Próxima Cita</strong>
                                <p>En 25 minutos</p>
                            </div>
                        </div>
                        <div className="quick-stat-card">
                            <Scissors className="qs-icon" />
                            <div>
                                <strong>Servicio más pedido</strong>
                                <p>Corte Degradado</p>
                            </div>
                        </div>
                        <div className="quick-stat-card">
                            <Award className="qs-icon" />
                            <div>
                                <strong>Meta Mensual</strong>
                                <p>85% completado</p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="error-state">No se pudieron cargar las métricas.</div>
            )}

            <style jsx>{`
        .dashboard-container {
          padding: 1rem 0;
        }
        .welcome-header {
          margin-bottom: 2rem;
        }
        .welcome-header h1 {
          font-size: 2rem;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }
        .welcome-header p {
          color: var(--text-secondary);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .info-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: transform 0.3s;
        }

        .info-card:hover {
          transform: translateY(-5px);
          border-color: var(--accent-color);
        }

        .premium-card {
          grid-column: span 1;
          background: linear-gradient(145deg, var(--bg-secondary), #1a1a1a);
          border: 1px solid rgba(212, 175, 55, 0.3);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .icon { width: 24px; height: 24px; }
        .gold { color: #D4AF37; }
        .green { color: #10B981; }
        .blue { color: #3B82F6; }
        .yellow { color: #F59E0B; }

        .card-body {
          flex: 1;
        }

        .main-value {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .gold-text {
          color: #D4AF37;
        }

        .sub-value {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .card-footer {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .stat {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
        }

        .stat-label { color: var(--text-secondary); }
        .stat-val { font-weight: 600; color: var(--text-primary); }

        .quick-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .quick-stat-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border: 1px solid transparent;
        }

        .qs-icon {
          color: var(--accent-color);
          opacity: 0.8;
        }

        .quick-stat-card strong {
          display: block;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .quick-stat-card p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin: 0;
        }

        @media (max-width: 1200px) {
          .metrics-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 768px) {
          .metrics-grid { grid-template-columns: 1fr; }
          .quick-stats-row { grid-template-columns: 1fr; }
        }
      `}</style>
        </div>
    )
}
