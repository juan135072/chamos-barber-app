// ================================================================
// 📱 COMPONENTE: CitasList
// Lista de citas con pull-to-refresh
// ================================================================

import React from 'react'
import { RefreshCw } from 'lucide-react'
import { CitasListProps } from '../../../types/barber-app'
import CitaCard from './CitaCard'
import EmptyState from '../shared/EmptyState'
import LoadingSpinner from '../shared/LoadingSpinner'

export default function CitasList({
  citas,
  loading,
  onRefresh,
  onCheckIn,
  onCompletar,
  onCancelar
}: CitasListProps) {
  const citasPendientes = citas.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada')
  const citasCompletadas = citas.filter(c => c.estado === 'completada')
  const citasCanceladas = citas.filter(c => c.estado === 'cancelada')

  if (loading && citas.length === 0) {
    return <LoadingSpinner text="Cargando citas..." />
  }

  if (!loading && citas.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="Sin citas para hoy"
        message="No tienes citas agendadas para el día de hoy"
        action={{
          label: 'Refrescar',
          onClick: onRefresh
        }}
      />
    )
  }

  return (
    <>
      <div className="citas-list-container">
        {/* Botón de refresh */}
        <div className="refresh-section">
          <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            <span>{loading ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>

        {/* Citas Pendientes/Confirmadas */}
        {citasPendientes.length > 0 && (
          <div className="citas-section">
            <h2 className="section-title">
              Próximas Citas
              <span className="count-badge">{citasPendientes.length}</span>
            </h2>
            <div className="citas-grid">
              {citasPendientes.map((cita) => (
                <CitaCard
                  key={cita.id}
                  cita={cita}
                  onCheckIn={onCheckIn}
                  onCompletar={onCompletar}
                  onCancelar={onCancelar}
                  loading={loading}
                />
              ))}
            </div>
          </div>
        )}

        {/* Citas Completadas */}
        {citasCompletadas.length > 0 && (
          <div className="citas-section">
            <h2 className="section-title completed">
              Completadas
              <span className="count-badge completed">{citasCompletadas.length}</span>
            </h2>
            <div className="citas-grid">
              {citasCompletadas.map((cita) => (
                <CitaCard
                  key={cita.id}
                  cita={cita}
                  onCheckIn={onCheckIn}
                  onCompletar={onCompletar}
                  onCancelar={onCancelar}
                  loading={loading}
                />
              ))}
            </div>
          </div>
        )}

        {/* Citas Canceladas */}
        {citasCanceladas.length > 0 && (
          <div className="citas-section">
            <h2 className="section-title cancelled">
              Canceladas
              <span className="count-badge cancelled">{citasCanceladas.length}</span>
            </h2>
            <div className="citas-grid">
              {citasCanceladas.map((cita) => (
                <CitaCard
                  key={cita.id}
                  cita={cita}
                  onCheckIn={onCheckIn}
                  onCompletar={onCompletar}
                  onCancelar={onCancelar}
                  loading={loading}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .citas-list-container {
          width: 100%;
        }

        .refresh-section {
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: center;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 12px;
          color: #D4AF37;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .refresh-btn:hover {
          background: rgba(212, 175, 55, 0.1);
          border-color: #D4AF37;
        }

        .refresh-btn:active {
          transform: scale(0.95);
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .refresh-btn :global(.spinning) {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .citas-section {
          margin-bottom: 2rem;
        }

        .citas-section:last-child {
          margin-bottom: 0;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.125rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid rgba(212, 175, 55, 0.2);
        }

        .section-title.completed {
          color: #10b981;
          border-bottom-color: rgba(16, 185, 129, 0.2);
        }

        .section-title.cancelled {
          color: #ef4444;
          border-bottom-color: rgba(239, 68, 68, 0.2);
        }

        .count-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          padding: 0 0.5rem;
          background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
          color: #121212;
          border-radius: 14px;
          font-size: 0.813rem;
          font-weight: 700;
        }

        .count-badge.completed {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
        }

        .count-badge.cancelled {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #ffffff;
        }

        .citas-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (max-width: 360px) {
          .section-title {
            font-size: 1rem;
          }

          .citas-grid {
            gap: 0.75rem;
          }

          .refresh-section {
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </>
  )
}
