/**
 * =====================================================
 * 💳 MODAL - PAGAR LIQUIDACIÓN
 * =====================================================
 * Modal para pagar una liquidación pendiente
 * Soporta: efectivo, transferencia o mixto
 */

'use client'

import { useState } from 'react'
import { X, DollarSign, CreditCard, AlertCircle, CheckCircle } from 'lucide-react'
import {
  Liquidacion,
  pagarLiquidacion,
  formatCLP
} from '@/lib/supabase-liquidaciones'

interface Props {
  liquidacion: Liquidacion
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function PagarLiquidacionModal({
  liquidacion,
  isOpen,
  onClose,
  onSuccess
}: Props) {
  // Estado del formulario
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'mixto'>('transferencia')
  const [montoEfectivo, setMontoEfectivo] = useState(0)
  const [montoTransferencia, setMontoTransferencia] = useState(liquidacion.total_comision)
  const [numeroTransferencia, setNumeroTransferencia] = useState('')
  const [notas, setNotas] = useState('')
  const [pagando, setPagando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calcular total
  const totalPago = metodoPago === 'mixto'
    ? montoEfectivo + montoTransferencia
    : metodoPago === 'efectivo'
    ? montoEfectivo
    : montoTransferencia

  const diferencia = totalPago - liquidacion.total_comision
  const pagoValido = Math.abs(diferencia) < 0.01 // Tolerancia de 1 centavo

  const handleMetodoPagoChange = (metodo: 'efectivo' | 'transferencia' | 'mixto') => {
    setMetodoPago(metodo)
    setError(null)

    if (metodo === 'efectivo') {
      setMontoEfectivo(liquidacion.total_comision)
      setMontoTransferencia(0)
      setNumeroTransferencia('')
    } else if (metodo === 'transferencia') {
      setMontoEfectivo(0)
      setMontoTransferencia(liquidacion.total_comision)
    } else {
      // Mixto: dividir en mitades por defecto
      const mitad = liquidacion.total_comision / 2
      setMontoEfectivo(mitad)
      setMontoTransferencia(mitad)
    }
  }

  const handlePagar = async () => {
    if (!pagoValido) {
      setError('El monto total debe coincidir con la comisión a pagar')
      return
    }

    if ((metodoPago === 'transferencia' || metodoPago === 'mixto') && !numeroTransferencia.trim()) {
      setError('Debes ingresar el número de transferencia')
      return
    }

    try {
      setPagando(true)
      setError(null)

      await pagarLiquidacion({
        liquidacion_id: liquidacion.id,
        metodo_pago: metodoPago,
        monto_efectivo: montoEfectivo,
        monto_transferencia: montoTransferencia,
        numero_transferencia: numeroTransferencia.trim() || undefined,
        notas: notas.trim() || undefined
      })

      // Éxito
      onSuccess()
      handleClose()
    } catch (err: any) {
      console.error('Error pagando liquidación:', err)
      setError(err.message || 'Error al procesar el pago')
    } finally {
      setPagando(false)
    }
  }

  const handleClose = () => {
    setMetodoPago('transferencia')
    setMontoEfectivo(0)
    setMontoTransferencia(liquidacion.total_comision)
    setNumeroTransferencia('')
    setNotas('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-secondary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-primary">
              Pagar Liquidación
            </h2>
            <p className="text-sm text-secondary mt-1">
              {liquidacion.numero_liquidacion} - {liquidacion.barbero?.nombre} {liquidacion.barbero?.apellido}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-secondary transition-colors"
            disabled={pagando}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Información de la Liquidación */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3">
              Detalles de la Liquidación
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-secondary">Período</p>
                <p className="font-medium text-primary">
                  {new Date(liquidacion.fecha_inicio).toLocaleDateString('es-CL')} -{' '}
                  {new Date(liquidacion.fecha_fin).toLocaleDateString('es-CL')}
                </p>
              </div>
              <div>
                <p className="text-secondary">Total Ventas</p>
                <p className="font-medium text-primary">{liquidacion.total_ventas}</p>
              </div>
              <div>
                <p className="text-secondary">Monto Vendido</p>
                <p className="font-medium text-primary">
                  {formatCLP(liquidacion.monto_total_vendido)}
                </p>
              </div>
              <div>
                <p className="text-secondary">Comisión Total</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCLP(liquidacion.total_comision)}
                </p>
              </div>
            </div>
          </div>

          {/* Información Bancaria del Barbero */}
          {liquidacion.barbero?.banco && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-primary mb-3">
                Información Bancaria
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-secondary">Banco</p>
                  <p className="font-medium text-primary">
                    {liquidacion.barbero.banco}
                  </p>
                </div>
                <div>
                  <p className="text-secondary">Tipo de Cuenta</p>
                  <p className="font-medium text-primary">
                    {liquidacion.barbero.tipo_cuenta?.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-secondary">Número de Cuenta</p>
                  <p className="font-medium text-primary">
                    {liquidacion.barbero.numero_cuenta}
                  </p>
                </div>
                <div>
                  <p className="text-secondary">Titular</p>
                  <p className="font-medium text-primary">
                    {liquidacion.barbero.titular_cuenta}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Método de Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Pago
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleMetodoPagoChange('efectivo')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  metodoPago === 'efectivo'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                disabled={pagando}
              >
                <DollarSign className="w-6 h-6 mx-auto mb-1" />
                <p className="text-sm font-medium">Efectivo</p>
              </button>
              <button
                onClick={() => handleMetodoPagoChange('transferencia')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  metodoPago === 'transferencia'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                disabled={pagando}
              >
                <CreditCard className="w-6 h-6 mx-auto mb-1" />
                <p className="text-sm font-medium">Transferencia</p>
              </button>
              <button
                onClick={() => handleMetodoPagoChange('mixto')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  metodoPago === 'mixto'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                disabled={pagando}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <DollarSign className="w-5 h-5" />
                  <CreditCard className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium">Mixto</p>
              </button>
            </div>
          </div>

          {/* Montos */}
          <div className="space-y-4">
            {(metodoPago === 'efectivo' || metodoPago === 'mixto') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto en Efectivo
                </label>
                <input
                  type="number"
                  value={montoEfectivo}
                  onChange={(e) => setMontoEfectivo(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                  step="100"
                  disabled={pagando}
                />
              </div>
            )}

            {(metodoPago === 'transferencia' || metodoPago === 'mixto') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto en Transferencia
                  </label>
                  <input
                    type="number"
                    value={montoTransferencia}
                    onChange={(e) => setMontoTransferencia(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                    step="100"
                    disabled={pagando}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Transferencia *
                  </label>
                  <input
                    type="text"
                    value={numeroTransferencia}
                    onChange={(e) => setNumeroTransferencia(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: TRF-123456"
                    disabled={pagando}
                  />
                </div>
              </>
            )}
          </div>

          {/* Validación de Monto */}
          <div className={`p-4 rounded-lg border ${
            pagoValido
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start gap-3">
              {pagoValido ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  pagoValido ? 'text-green-900' : 'text-yellow-900'
                }`}>
                  Total a Pagar: {formatCLP(totalPago)}
                </p>
                {diferencia !== 0 && (
                  <p className={`text-sm mt-1 ${
                    pagoValido ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {diferencia > 0
                      ? `Exceso: ${formatCLP(diferencia)}`
                      : `Falta: ${formatCLP(Math.abs(diferencia))}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Agrega notas adicionales sobre el pago..."
              disabled={pagando}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-secondary border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={pagando}
          >
            Cancelar
          </button>
          <button
            onClick={handlePagar}
            disabled={pagando || !pagoValido}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {pagando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirmar Pago
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
