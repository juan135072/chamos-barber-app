// ================================================================
// 📱 COMPONENTE: MetricasRapidas
// Muestra ganancia de hoy, acumulado y citas restantes
// ================================================================

import React from 'react'
import { DollarSign, Calendar, TrendingUp, Clock } from 'lucide-react'
import { MetricasRapidasProps } from '../../../types/barber-app'

export default function MetricasRapidas({ metricas, loading }: MetricasRapidasProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="metricas-grid loading">
        <div className="metric-card skeleton" />
        <div className="metric-card skeleton" />
        <div className="metric-card wide skeleton" />
      </div>
    )
  }

  return (
    <>
      <div className="metricas-grid">
        {/* Ganancia de Hoy */}
        <div className="metric-card gold">
          <div className="metric-header">
            <div className="metric-icon">
              <DollarSign size={20} />
            </div>
            <span className="metric-label">Hoy</span>
          </div>
          <div className="metric-body">
            <span className="metric-value">{formatCurrency(metricas.hoy.ganancia)}</span>
            <div className="metric-footer">
              <TrendingUp size={12} className="trend-icon" />
              <span>{metricas.hoy.completadas} servicios</span>
            </div>
          </div>
        </div>

        {/* Citas del Día */}
        <div className="metric-card blue">
          <div className="metric-header">
            <div className="metric-icon">
              <Calendar size={20} />
            </div>
            <span className="metric-label">Agenda</span>
          </div>
          <div className="metric-body">
            <span className="metric-value">{metricas.hoy.total_citas}</span>
            <div className="metric-footer">
              <Clock size={12} className="trend-icon" />
              <span>{metricas.hoy.pendientes} pendientes</span>
            </div>
          </div>
        </div>

        {/* Acumulado Mes - Card Grande */}
        <div className="metric-card wide premium">
          <div className="metric-header">
            <div className="metric-icon">
              <TrendingUp size={20} />
            </div>
            <span className="metric-label">Acumulado Mes</span>
          </div>
          <div className="metric-body-row">
            <div className="metric-main">
              <span className="metric-value large">{formatCurrency(metricas.mes.ganancia)}</span>
              <span className="metric-subtitle">Total Comisiones</span>
            </div>
            <div className="metric-stats">
              <div className="stat-item">
                <span className="stat-value">{metricas.mes.total_servicios}</span>
                <span className="stat-label">Servicios</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{formatCurrency(metricas.semana.ganancia)}</span>
                <span className="stat-label">Esta Sem.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .metricas-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .metric-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .metric-card.wide {
          grid-column: span 2;
        }

        .metric-card.premium {
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%);
          border: 1px solid rgba(212, 175, 55, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .metric-card.skeleton {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.05) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0.05) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          min-height: 100px;
        }

        .metric-card.gold .metric-icon { color: #D4AF37; background: rgba(212, 175, 55, 0.1); }
        .metric-card.blue .metric-icon { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }

        .metric-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.25rem;
        }

        .metric-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .metric-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metric-value {
          font-size: 1.25rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
        }

        .metric-value.large {
          font-size: 1.75rem;
          color: #D4AF37;
        }

        .metric-footer {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 0.25rem;
        }

        .trend-icon {
          color: #10b981;
        }

        .metric-body-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
        }

        .metric-main {
          display: flex;
          flex-direction: column;
        }

        .metric-subtitle {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .metric-stats {
          display: flex;
          gap: 1.25rem;
          padding-left: 1.25rem;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .stat-value {
          font-size: 0.9rem;
          font-weight: 700;
          color: #fff;
        }

        .stat-label {
          font-size: 0.6rem;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @media (max-width: 360px) {
          .metric-value.large {
            font-size: 1.5rem;
          }
          .metric-stats {
            gap: 0.75rem;
            padding-left: 0.75rem;
          }
        }
      `}</style>
    </>
  )
}
