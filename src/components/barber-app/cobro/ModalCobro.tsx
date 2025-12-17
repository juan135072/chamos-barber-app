// ================================================================
// 💰 COMPONENTE: ModalCobro
// Modal para procesar cobro con monto editable
// ================================================================

import React, { useState, useEffect } from 'react'
import { DollarSign, CreditCard, Banknote, X, Check } from 'lucide-react'

interface ModalCobroProps {
  cita: {
    id: string
    cliente_nombre: string
    servicio_nombre: string
    servicio_precio: number
  }
  isOpen: boolean
  onClose: () => void
  onConfirmar: (citaId: string, montoCobrado: number, metodoPago: string) => Promise<void>
}

export default function ModalCobro({ cita, isOpen, onClose, onConfirmar }: ModalCobroProps) {
  const [montoCobrado, setMontoCobrado] = useState(cita.servicio_precio)
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta'>('efectivo')
  const [processing, setProcessing] = useState(false)

  // Resetear valores cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setMontoCobrado(cita.servicio_precio)
      setMetodoPago('efectivo')
      setProcessing(false)
    }
  }, [isOpen, cita.servicio_precio])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setMontoCobrado(value ? parseInt(value) : 0)
  }

  const handleSubmit = async () => {
    if (montoCobrado <= 0) {
      alert('El monto debe ser mayor a $0')
      return
    }

    setProcessing(true)
    try {
      await onConfirmar(cita.id, montoCobrado, metodoPago)
      onClose()
    } catch (error) {
      console.error('Error al procesar cobro:', error)
      alert('Error al procesar el cobro. Intenta nuevamente.')
    } finally {
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header">
            <h2 className="modal-title">
              <DollarSign size={24} />
              Procesar Cobro
            </h2>
            <button className="close-btn" onClick={onClose} disabled={processing}>
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            {/* Info del Cliente y Servicio */}
            <div className="info-section">
              <div className="info-row">
                <span className="label">Cliente:</span>
                <span className="value">{cita.cliente_nombre}</span>
              </div>
              <div className="info-row">
                <span className="label">Servicio:</span>
                <span className="value">{cita.servicio_nombre}</span>
              </div>
              <div className="info-row">
                <span className="label">Precio Original:</span>
                <span className="value original-price">{formatCurrency(cita.servicio_precio)}</span>
              </div>
            </div>

            {/* Monto a Cobrar - EDITABLE */}
            <div className="monto-section">
              <label className="input-label">Monto a Cobrar</label>
              <div className="monto-input-wrapper">
                <span className="currency-symbol">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="monto-input"
                  value={montoCobrado.toLocaleString('es-CL')}
                  onChange={handleMontoChange}
                  disabled={processing}
                  autoFocus
                />
              </div>
              <div className="monto-preview">
                {formatCurrency(montoCobrado)}
              </div>
            </div>

            {/* Botones Rápidos para Ajustar Monto */}
            <div className="quick-adjust-section">
              <span className="quick-label">Ajuste Rápido:</span>
              <div className="quick-buttons">
                <button
                  className="quick-btn"
                  onClick={() => setMontoCobrado(Math.max(0, montoCobrado - 1000))}
                  disabled={processing || montoCobrado <= 0}
                >
                  -$1.000
                </button>
                <button
                  className="quick-btn"
                  onClick={() => setMontoCobrado(cita.servicio_precio)}
                  disabled={processing}
                >
                  Restaurar
                </button>
                <button
                  className="quick-btn"
                  onClick={() => setMontoCobrado(montoCobrado + 1000)}
                  disabled={processing}
                >
                  +$1.000
                </button>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="metodo-pago-section">
              <label className="input-label">Método de Pago</label>
              <div className="metodo-buttons">
                <button
                  className={`metodo-btn ${metodoPago === 'efectivo' ? 'active' : ''}`}
                  onClick={() => setMetodoPago('efectivo')}
                  disabled={processing}
                >
                  <Banknote size={20} />
                  <span>Efectivo</span>
                </button>
                <button
                  className={`metodo-btn ${metodoPago === 'tarjeta' ? 'active' : ''}`}
                  onClick={() => setMetodoPago('tarjeta')}
                  disabled={processing}
                >
                  <CreditCard size={20} />
                  <span>Tarjeta</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              className="btn-secondary"
              onClick={onClose}
              disabled={processing}
            >
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={processing || montoCobrado <= 0}
            >
              {processing ? (
                <>
                  <div className="spinner"></div>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Check size={20} />
                  <span>Confirmar Cobro</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-content {
          background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 20px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
        }

        .modal-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: #D4AF37;
          margin: 0;
        }

        .close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .close-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .info-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
        }

        .info-row:not(:last-child) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .label {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .value {
          font-size: 0.938rem;
          font-weight: 600;
          color: #ffffff;
        }

        .original-price {
          color: #D4AF37;
        }

        .monto-section {
          margin-bottom: 1.5rem;
        }

        .input-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 0.75rem;
        }

        .monto-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .currency-symbol {
          position: absolute;
          left: 1.25rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: #D4AF37;
          pointer-events: none;
        }

        .monto-input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(212, 175, 55, 0.3);
          border-radius: 12px;
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          text-align: right;
          transition: all 0.3s ease;
        }

        .monto-input:focus {
          outline: none;
          border-color: #D4AF37;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.1);
        }

        .monto-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .monto-preview {
          margin-top: 0.5rem;
          font-size: 1.125rem;
          font-weight: 700;
          color: #10b981;
          text-align: right;
        }

        .quick-adjust-section {
          margin-bottom: 1.5rem;
        }

        .quick-label {
          display: block;
          font-size: 0.813rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 0.5rem;
        }

        .quick-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .quick-btn {
          padding: 0.625rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 8px;
          font-size: 0.813rem;
          font-weight: 600;
          color: #D4AF37;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .quick-btn:hover {
          background: rgba(212, 175, 55, 0.1);
          border-color: #D4AF37;
        }

        .quick-btn:active {
          transform: scale(0.95);
        }

        .quick-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .metodo-pago-section {
          margin-bottom: 1.5rem;
        }

        .metodo-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .metodo-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .metodo-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(212, 175, 55, 0.3);
        }

        .metodo-btn.active {
          background: rgba(212, 175, 55, 0.15);
          border-color: #D4AF37;
          color: #D4AF37;
          box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.1);
        }

        .metodo-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-footer {
          display: flex;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid rgba(212, 175, 55, 0.2);
        }

        .btn-secondary,
        .btn-primary {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          border: none;
          border-radius: 12px;
          font-size: 0.938rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .btn-primary {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        .btn-secondary:disabled,
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 480px) {
          .modal-content {
            border-radius: 20px 20px 0 0;
            max-height: 95vh;
          }

          .monto-input {
            font-size: 1.25rem;
          }

          .quick-buttons {
            grid-template-columns: repeat(3, 1fr);
          }

          .quick-btn {
            font-size: 0.75rem;
            padding: 0.5rem 0.25rem;
          }
        }
      `}</style>
    </>
  )
}
