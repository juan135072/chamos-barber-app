// ================================================================
// 📱 COMPONENTE: LoadingSpinner
// Spinner de carga con mensaje
// ================================================================

import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({ text = 'Cargando...', size = 'md' }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 24,
    md: 40,
    lg: 56
  }

  const iconSize = sizeMap[size]

  return (
    <>
      <div className="loading-spinner-container">
        <Loader2 size={iconSize} className="spinner-icon" />
        {text && <p className="spinner-text">{text}</p>}
      </div>

      <style jsx>{`
        .loading-spinner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          min-height: 200px;
        }

        .loading-spinner-container :global(.spinner-icon) {
          color: #D4AF37;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        .spinner-text {
          font-size: 0.938rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
          margin: 0;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  )
}
