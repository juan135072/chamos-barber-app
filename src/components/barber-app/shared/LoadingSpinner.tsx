// ================================================================
// 📱 COMPONENTE: LoadingSpinner
// Spinner de carga mobile-first
// ================================================================

import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
}

export default function LoadingSpinner({ 
  text = 'Cargando...', 
  size = 'md',
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 24,
    md: 40,
    lg: 56
  }

  const content = (
    <div className={`spinner-container ${fullScreen ? 'full-screen' : ''}`}>
      <div className="spinner-content">
        <Loader2 size={sizeClasses[size]} className="spinner-icon" />
        {text && <p className="spinner-text">{text}</p>}
      </div>

      <style jsx>{`
        .spinner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .spinner-container.full-screen {
          min-height: 100vh;
          width: 100%;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
        }

        .spinner-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .spinner-container :global(.spinner-icon) {
          color: #D4AF37;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .spinner-text {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.938rem;
          font-weight: 600;
          margin: 0;
          text-align: center;
        }

        @media (max-width: 360px) {
          .spinner-container {
            padding: 1.5rem;
          }

          .spinner-text {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  )

  return content
}
