// ================================================================
// 💰 COMPONENTE: ModalCobro
// Modal para procesar cobro (Simplificado)
// ================================================================

import React, { useState, useEffect } from 'react'
import { DollarSign, CreditCard, Banknote, X } from 'lucide-react'

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
            </div>

            {/* Monto a Cobrar */}
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
            <button className="btn-secondary" onClick={onClose} disabled={processing}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleSubmit} disabled={processing || montoCobrado <= 0}>
              {processing ? 'Procesando...' : 'Confirmar Cobro'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
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
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .info-section {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .label { color: rgba(255, 255, 255, 0.5); font-size: 0.875rem; }
        .value { color: #fff; font-weight: 600; }

        .monto-section { margin-bottom: 1.5rem; }
        .input-label { display: block; color: rgba(255, 255, 255, 0.8); margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 600; }
        
        .monto-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .currency-symbol { position: absolute; left: 1rem; color: #D4AF37; font-weight: 700; }
        .monto-input {
          width: 100%;
          padding: 1rem 1rem 1rem 2rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 12px;
          color: #fff;
          font-size: 1.5rem;
          font-weight: 700;
          text-align: right;
        }

        .metodo-pago-section { margin-bottom: 1.5rem; }
        .metodo-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .metodo-btn {
          display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
          padding: 1rem; background: rgba(255, 255, 255, 0.05);
          border: 2px solid transparent; border-radius: 12px;
          color: rgba(255, 255, 255, 0.7); cursor: pointer;
        }
        .metodo-btn.active { border-color: #D4AF37; background: rgba(212, 175, 55, 0.1); color: #D4AF37; }

        .modal-footer { display: flex; gap: 0.75rem; padding: 1.5rem; border-top: 1px solid rgba(212, 175, 55, 0.2); }
        .btn-secondary { flex: 1; padding: 1rem; background: rgba(255, 255, 255, 0.05); border: none; border-radius: 12px; color: #fff; cursor: pointer; }
        .btn-primary { flex: 2; padding: 1rem; background: #D4AF37; border: none; border-radius: 12px; color: #121212; font-weight: 700; cursor: pointer; }
      `}</style>
    </>
  )
}

