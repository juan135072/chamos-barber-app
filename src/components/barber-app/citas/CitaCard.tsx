// ================================================================
// 📱 COMPONENTE: CitaCard
// Tarjeta individual de cita con acciones deslizables
// ================================================================

import React, { useState } from 'react'
import { Clock, User, Phone, Mail, DollarSign, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { CitaCardProps } from '../../../types/barber-app'

export default function CitaCard({ cita, onCheckIn, onCompletar, onCancelar, loading }: CitaCardProps) {
  const [showActions, setShowActions] = useState(false)

  const formatHora = (fechaHora?: string) => {
    // Si no hay fecha_hora, usar la hora de la cita como fallback
    if (!fechaHora) return cita.hora || '--:--'

    try {
      const date = new Date(fechaHora)
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) return cita.hora || '--:--'

      return date.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return cita.hora || '--:--'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return '#f59e0b' // Amarillo
      case 'confirmada':
        return '#3b82f6' // Azul
      case 'completada':
        return '#10b981' // Verde
      case 'cancelada':
        return '#ef4444' // Rojo
      default:
        return '#6b7280' // Gris
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente'
      case 'confirmada':
        return 'Confirmada'
      case 'completada':
        return 'Completada'
      case 'cancelada':
        return 'Cancelada'
      default:
        return estado
    }
  }

  const handleCardClick = () => {
    if (cita.estado !== 'completada' && cita.estado !== 'cancelada') {
      setShowActions(!showActions)
    }
  }

  return (
    <>
      <div className={`cita-card ${cita.estado} ${showActions ? 'expanded' : ''}`}>
        {/* Contenido principal */}
        <div className="cita-content" onClick={handleCardClick}>
          {/* Header: Hora y Estado */}
          <div className="cita-header">
            <div className="hora-badge">
              <Clock size={16} />
              <span>{formatHora(cita.fecha_hora)}</span>
            </div>
            <div className="estado-badge" style={{ background: getEstadoColor(cita.estado) }}>
              {getEstadoLabel(cita.estado)}
            </div>
          </div>

          {/* Cliente */}
          <div className="cliente-info">
            <h3 className="cliente-nombre">
              <User size={18} />
              {cita.cliente_nombre}
            </h3>
            <div className="cliente-detalles">
              <span className="detalle">
                <Phone size={14} />
                {cita.cliente_telefono}
              </span>
              {cita.cliente_email && (
                <span className="detalle">
                  <Mail size={14} />
                  {cita.cliente_email}
                </span>
              )}
            </div>
          </div>

          {/* Servicio y Precio */}
          <div className="servicio-info">
            <div className="servicio-nombre">{cita.servicio_nombre || 'Servicio'}</div>
            <div className="servicio-detalles">
              <span className="duracion">
                <Clock size={14} />
                {cita.duracion} min
              </span>
              {cita.servicio_precio && (
                <span className="precio">
                  <DollarSign size={14} />
                  {formatCurrency(cita.servicio_precio)}
                </span>
              )}
            </div>
          </div>

          {/* Notas (si existen) */}
          {cita.notas && (
            <div className="notas">
              <AlertCircle size={14} />
              <span>{cita.notas}</span>
            </div>
          )}
        </div>

        {/* Acciones (solo si la cita no está completada o cancelada) */}
        {showActions && cita.estado !== 'completada' && cita.estado !== 'cancelada' && (
          <div className="cita-actions">
            {cita.estado === 'pendiente' && (
              <button
                className="action-btn check-in"
                onClick={(e) => {
                  e.stopPropagation()
                  onCheckIn(cita.id)
                  setShowActions(false)
                }}
                disabled={loading}
              >
                <CheckCircle size={20} />
                <span>Check-in</span>
              </button>
            )}

            {(cita.estado === 'pendiente' || cita.estado === 'confirmada') && (
              <>
                <button
                  className="action-btn completar"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCompletar(cita.id)
                    setShowActions(false)
                  }}
                  disabled={loading}
                >
                  <CheckCircle size={20} />
                  <span>Completar</span>
                </button>

                <button
                  className="action-btn cancelar"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCancelar(cita.id)
                    setShowActions(false)
                  }}
                  disabled={loading}
                >
                  <XCircle size={20} />
                  <span>Cancelar</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Indicador de toque para expandir */}
        {cita.estado !== 'completada' && cita.estado !== 'cancelada' && (
          <div className="expand-indicator">
            {showActions ? '▲' : '▼'}
          </div>
        )}
      </div>

      <style jsx>{`
        .cita-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s ease;
          position: relative;
        }

        .cita-card.expanded {
          border-color: #D4AF37;
          box-shadow: 0 8px 24px rgba(212, 175, 55, 0.2);
        }

        .cita-card.completada {
          opacity: 0.7;
        }

        .cita-card.cancelada {
          opacity: 0.5;
        }

        .cita-content {
          padding: 1.25rem;
          cursor: pointer;
        }

        .cita-content:active {
          background: rgba(255, 255, 255, 0.02);
        }

        .cita-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .hora-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(212, 175, 55, 0.1);
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #D4AF37;
        }

        .estado-badge {
          padding: 0.375rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .cliente-info {
          margin-bottom: 1rem;
        }

        .cliente-nombre {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.125rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
        }

        .cliente-detalles {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .detalle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.813rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .servicio-info {
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          margin-bottom: 0.75rem;
        }

        .servicio-nombre {
          font-size: 0.938rem;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 0.5rem;
        }

        .servicio-detalles {
          display: flex;
          gap: 1rem;
        }

        .duracion,
        .precio {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.813rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .precio {
          color: #10b981;
          font-weight: 600;
        }

        .notas {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 8px;
          font-size: 0.813rem;
          color: rgba(255, 255, 255, 0.8);
          margin-top: 0.75rem;
        }

        .notas :global(svg) {
          flex-shrink: 0;
          color: #f59e0b;
          margin-top: 0.125rem;
        }

        .cita-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 0.75rem;
          padding: 0 1.25rem 1.25rem;
          animation: slideDown 0.3s ease;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1rem;
          border: none;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:active {
          transform: scale(0.95);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-btn.check-in {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .action-btn.completar {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .action-btn.cancelar {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .expand-indicator {
          position: absolute;
          bottom: 0.5rem;
          right: 1rem;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
          pointer-events: none;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 360px) {
          .cita-content {
            padding: 1rem;
          }

          .cliente-nombre {
            font-size: 1rem;
          }

          .action-btn {
            padding: 0.75rem 0.75rem;
            font-size: 0.813rem;
          }
        }
      `}</style>
    </>
  )
}
