// ================================================================
// 📱 COMPONENTE: EmptyState
// Estado vacío con icono y mensaje
// ================================================================

import React from 'react'
import { Calendar, Inbox, AlertCircle, Search } from 'lucide-react'

interface EmptyStateProps {
  icon?: 'calendar' | 'inbox' | 'alert' | 'search'
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ icon = 'inbox', title, message, action }: EmptyStateProps) {
  const iconMap = {
    calendar: Calendar,
    inbox: Inbox,
    alert: AlertCircle,
    search: Search
  }

  const Icon = iconMap[icon]

  return (
    <>
      <div className="empty-state-container">
        <div className="empty-icon">
          <Icon size={64} />
        </div>
        <h3 className="empty-title">{title}</h3>
        <p className="empty-message">{message}</p>
        {action && (
          <button className="empty-action" onClick={action.onClick}>
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
          text-align: center;
          min-height: 300px;
        }

        .empty-icon {
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(212, 175, 55, 0.1);
          border: 2px solid rgba(212, 175, 55, 0.2);
          border-radius: 50%;
          color: #D4AF37;
          margin-bottom: 1.5rem;
          animation: pulse 2s ease-in-out infinite;
        }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.75rem 0;
        }

        .empty-message {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.6);
          max-width: 400px;
          line-height: 1.6;
          margin: 0 0 2rem 0;
        }

        .empty-action {
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

        .empty-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4);
        }

        .empty-action:active {
          transform: translateY(0);
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        @media (max-width: 360px) {
          .empty-state-container {
            padding: 2rem 1rem;
          }

          .empty-icon {
            width: 100px;
            height: 100px;
          }

          .empty-icon :global(svg) {
            width: 48px;
            height: 48px;
          }

          .empty-title {
            font-size: 1.25rem;
          }

          .empty-message {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </>
  )
}
