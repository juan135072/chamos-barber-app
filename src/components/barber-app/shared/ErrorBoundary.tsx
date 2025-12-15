// ================================================================
// 📱 COMPONENTE: ErrorBoundary
// Manejador de errores con UI fallback
// ================================================================

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ErrorBoundary caught error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/barber-app'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon-wrapper">
              <AlertCircle size={64} />
            </div>
            
            <h2 className="error-title">¡Oops! Algo salió mal</h2>
            <p className="error-message">
              Ha ocurrido un error inesperado. Por favor, recarga la página o vuelve al inicio.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Detalles del error</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button className="error-btn primary" onClick={this.handleReload}>
                Recargar Página
              </button>
              <button className="error-btn secondary" onClick={this.handleGoHome}>
                Volver al Inicio
              </button>
            </div>
          </div>

          <style jsx>{`
            .error-boundary {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
              padding: 2rem;
            }

            .error-content {
              max-width: 500px;
              text-align: center;
            }

            .error-icon-wrapper {
              margin-bottom: 1.5rem;
              display: flex;
              justify-content: center;
            }

            .error-icon-wrapper :global(svg) {
              color: #ef4444;
            }

            .error-title {
              font-size: 1.5rem;
              font-weight: 700;
              color: #ffffff;
              margin: 0 0 1rem 0;
            }

            .error-message {
              font-size: 1rem;
              color: rgba(255, 255, 255, 0.8);
              line-height: 1.6;
              margin: 0 0 2rem 0;
            }

            .error-details {
              margin: 1.5rem 0;
              text-align: left;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(239, 68, 68, 0.3);
              border-radius: 8px;
              padding: 1rem;
            }

            .error-details summary {
              color: #ef4444;
              cursor: pointer;
              font-weight: 600;
              margin-bottom: 0.5rem;
            }

            .error-stack {
              font-size: 0.75rem;
              color: rgba(255, 255, 255, 0.7);
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-word;
              margin: 0.5rem 0 0 0;
            }

            .error-actions {
              display: flex;
              flex-direction: column;
              gap: 1rem;
              margin-top: 2rem;
            }

            .error-btn {
              padding: 1rem 2rem;
              border: none;
              border-radius: 12px;
              font-size: 1rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.3s ease;
            }

            .error-btn.primary {
              background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
              color: #121212;
              box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
            }

            .error-btn.primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 16px rgba(212, 175, 55, 0.4);
            }

            .error-btn.secondary {
              background: rgba(255, 255, 255, 0.1);
              color: #ffffff;
              border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .error-btn.secondary:hover {
              background: rgba(255, 255, 255, 0.15);
              border-color: rgba(255, 255, 255, 0.3);
            }

            .error-btn:active {
              transform: scale(0.98);
            }

            @media (max-width: 480px) {
              .error-boundary {
                padding: 1.5rem;
              }

              .error-title {
                font-size: 1.25rem;
              }

              .error-message {
                font-size: 0.938rem;
              }

              .error-icon-wrapper :global(svg) {
                width: 48px;
                height: 48px;
              }
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}
