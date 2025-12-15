// ================================================================
// 📱 COMPONENTE: MetricasRapidas
// Muestra ganancia de hoy y citas restantes
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
      <div className="metricas-container loading">
        <div className="metric-card skeleton" />
        <div className="metric-card skeleton" />
      </div>
    )
  }

  return (
    <>
      <div className="metricas-container">
        {/* Ganancia de Hoy */}
        <div className="metric-card ganancia">
          <div className="metric-icon">
            <DollarSign size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Ganancia de Hoy</span>
            <span className="metric-value">{formatCurrency(metricas.ganancia_total)}</span>
            <span className="metric-detail">
              {metricas.citas_completadas} citas completadas
            </span>
          </div>
        </div>

        {/* Citas Restantes */}
        <div className="metric-card citas">
          <div className="metric-icon">
            <Clock size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Citas Restantes</span>
            <span className="metric-value">{metricas.citas_pendientes}</span>
            <span className="metric-detail">
              {metricas.total_citas} total del día
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .metricas-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .metricas-container.loading {
          animation: pulse 1.5s ease-in-out infinite;
        }

        .metric-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .metric-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(
            circle at center,
            rgba(212, 175, 55, 0.1) 0%,
            transparent 70%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .metric-card:active {
          transform: scale(0.98);
        }

        .metric-card:active::before {
          opacity: 1;
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
          min-height: 120px;
        }

        .metric-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(244, 208, 63, 0.1) 100%);
          color: #D4AF37;
          flex-shrink: 0;
        }

        .metric-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .metric-label {
          font-size: 0.813rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.7);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .metric-detail {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        /* Estilos específicos por tipo */
        .metric-card.ganancia .metric-icon {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%);
          color: #10b981;
        }

        .metric-card.ganancia .metric-value {
          color: #10b981;
        }

        .metric-card.citas .metric-icon {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%);
          color: #3b82f6;
        }

        .metric-card.citas .metric-value {
          color: #3b82f6;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @media (max-width: 360px) {
          .metricas-container {
            gap: 0.75rem;
          }

          .metric-card {
            padding: 1rem;
            gap: 0.5rem;
          }

          .metric-icon {
            width: 40px;
            height: 40px;
          }

          .metric-icon :global(svg) {
            width: 20px;
            height: 20px;
          }

          .metric-label {
            font-size: 0.75rem;
          }

          .metric-value {
            font-size: 1.25rem;
          }

          .metric-detail {
            font-size: 0.688rem;
          }
        }
      `}</style>
    </>
  )
}
