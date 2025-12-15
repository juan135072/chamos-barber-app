// ================================================================
// 📱 COMPONENTE: EmptyState
// Estado vacío con iconos y acciones
// ================================================================

import React from 'react'
import { Calendar, AlertCircle, Search, Coffee } from 'lucide-react'

interface EmptyStateProps {
  icon?: 'calendar' | 'alert' | 'search' | 'coffee'
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ icon = 'calendar', title, message, action }: EmptyStateProps) {
  const iconMap = {
    calendar: Calendar,
    alert: AlertCircle,
    search: Search,
    coffee: Coffee
  }

  const IconComponent = iconMap[icon]

  return (
    <div className="empty-state-container">
      <div className="empty-state-content">
        <div className="icon-wrapper">
          <IconComponent size={64} className="empty-icon" />
        </div>
        
        <h3 className="empty-title">{title}</h3>
        <p className="empty-message">{message}</p>

        {action && (
          <button className="empty-action-btn" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>

      <style jsx>{`
        .empty-state-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          min-height: 300px;
        }

        .empty-state-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 400px;
        }

        .icon-wrapper {
          margin-bottom: 1.5rem;
          background: rgba(212, 175, 55, 0.1);
          border-radius: 50%;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-state-container :global(.empty-icon) {
          color: #D4AF37;
          opacity: 0.8;
        }

        .empty-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.75rem 0;
        }

        .empty-message {
          font-size: 0.938rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin: 0 0 1.5rem 0;
        }

        .empty-action-btn {
          padding: 0.875rem 2rem;
          background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
          border: none;
          border-radius: 12px;
          color: #121212;
          font-size: 0.938rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
        }

        .empty-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(212, 175, 55, 0.4);
        }

        .empty-action-btn:active {
          transform: scale(0.98);
        }

        @media (max-width: 360px) {
          .empty-state-container {
            padding: 2rem 1rem;
            min-height: 250px;
          }

          .empty-title {
            font-size: 1.125rem;
          }

          .empty-message {
            font-size: 0.875rem;
          }

          .icon-wrapper {
            padding: 1.25rem;
          }

          .empty-state-container :global(.empty-icon) {
            width: 48px;
            height: 48px;
          }
        }
      `}</style>
    </div>
  )
}
