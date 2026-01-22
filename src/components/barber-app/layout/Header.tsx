// ================================================================
// 📱 COMPONENTE: Header
// Header fijo con información del barbero y toggle de disponibilidad
// ================================================================

import React from 'react'
import { User, Power, PowerOff } from 'lucide-react'
import { Barbero } from '../../../types/barber-app'
import { useDisponibilidad } from '../../../hooks/useDisponibilidad'
import { useOneSignal } from '../../providers/OneSignalProvider'
import { Bell, BellOff } from 'lucide-react'

interface HeaderProps {
  barbero: Barbero
}

export default function Header({ barbero }: HeaderProps) {
  const { disponibilidad, loading, toggleDisponibilidad } = useDisponibilidad(
    barbero.id,
    barbero.disponibilidad
  )

  const { permissionStatus, triggerPrompt, repairSubscription } = useOneSignal()

  const handleToggle = async () => {
    await toggleDisponibilidad(!disponibilidad)
  }

  return (
    <>
      <header className="barber-app-header">
        <div className="header-content">
          {/* Avatar y nombre */}
          <div className="barber-info">
            <div className="avatar">
              {barbero.imagen_url ? (
                <img src={barbero.imagen_url} alt={barbero.nombre} />
              ) : (
                <User size={24} />
              )}
            </div>
            <div className="barber-details">
              <h1 className="barber-name">
                {barbero.nombre} {barbero.apellido}
              </h1>
              <p className="barber-status">
                {disponibilidad ? (
                  <span className="status-dot disponible"></span>
                ) : (
                  <span className="status-dot ocupado"></span>
                )}
                {disponibilidad ? 'Disponible' : 'Ocupado'}
              </p>
            </div>
          </div>

          {/* Toggle de disponibilidad */}
          <div className="header-actions">
            {/* Indicador de Notificaciones */}
            <button
              className={`action-btn notification-status ${permissionStatus}`}
              onClick={triggerPrompt}
              onDoubleClick={repairSubscription}
              title={
                permissionStatus === 'granted' ? 'Notificaciones activas (Doble clic para reiniciar si fallan)' :
                  permissionStatus === 'denied' ? 'Notificaciones bloqueadas' :
                    'Activar notificaciones'
              }
              aria-label="Estado de notificaciones"
            >
              {permissionStatus === 'granted' ? (
                <Bell size={20} />
              ) : (
                <BellOff size={20} />
              )}
            </button>

            <button
              className={`toggle-btn ${disponibilidad ? 'disponible' : 'ocupado'}`}
              onClick={handleToggle}
              disabled={loading}
              aria-label={disponibilidad ? 'Marcar como ocupado' : 'Marcar como disponible'}
            >
              {loading ? (
                <div className="spinner" />
              ) : disponibilidad ? (
                <Power size={20} />
              ) : (
                <PowerOff size={20} />
              )}
            </button>
          </div>
        </div>
      </header>

      <style jsx>{`
        .barber-app-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 70px;
          background: rgba(18, 18, 18, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
          z-index: 100;
          padding: 0 1rem;
          padding-top: env(safe-area-inset-top);
        }

        .header-content {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 600px;
          margin: 0 auto;
        }

        .barber-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          min-width: 0;
        }

        .avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
          border: 2px solid rgba(212, 175, 55, 0.3);
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar :global(svg) {
          color: #121212;
        }

        .barber-details {
          flex: 1;
          min-width: 0;
        }

        .barber-name {
          font-size: 1rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: -0.02em;
        }

        .barber-status {
          font-size: 0.813rem;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .status-dot.disponible {
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        }

        .status-dot.ocupado {
          background: #ef4444;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
        }

        .toggle-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }

        .toggle-btn.disponible {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .toggle-btn.ocupado {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .toggle-btn:active {
          transform: scale(0.95);
        }

        .toggle-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .action-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:active {
          transform: scale(0.95);
        }

        .notification-status.granted {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.2);
        }

        .notification-status.denied {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.2);
        }

        .notification-status.default {
          animation: pulse-border 2s infinite;
        }

        @keyframes pulse-border {
          0% { border-color: rgba(212, 175, 55, 0.2); }
          50% { border-color: rgba(212, 175, 55, 0.6); }
          100% { border-color: rgba(212, 175, 55, 0.2); }
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Efecto de ripple al tocar */
        .toggle-btn::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .toggle-btn:active::after {
          width: 100px;
          height: 100px;
        }

        @media (max-width: 360px) {
          .barber-name {
            font-size: 0.938rem;
          }

          .barber-status {
            font-size: 0.75rem;
          }

          .toggle-btn {
            width: 44px;
            height: 44px;
          }

          .avatar {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </>
  )
}
