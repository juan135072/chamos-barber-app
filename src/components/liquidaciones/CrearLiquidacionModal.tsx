/**
 * =====================================================
 * 💰 MODAL - CREAR LIQUIDACIÓN
 * =====================================================
 * Modal para crear una nueva liquidación de un barbero
 * Permite seleccionar período y calcula comisiones automáticamente
 */

'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, DollarSign, AlertCircle } from 'lucide-react'
import {
  BarberoResumen,
  calcularComisionesPendientes,
  crearLiquidacion,
  formatCLP
} from '@/lib/supabase-liquidaciones'

interface Props {
  barbero: BarberoResumen
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CrearLiquidacionModal({
  barbero,
  isOpen,
  onClose,
  onSuccess
}: Props) {
  // Estado del formulario
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [calculando, setCalculando] = useState(false)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estado de comisiones calculadas
  const [comisiones, setComisiones] = useState<{
    total_ventas: number
    monto_total_vendido: number
    porcentaje_comision: number
    total_comision: number
  } | null>(null)

  // Establecer fechas por defecto (mes actual)
  useEffect(() => {
    if (isOpen && !fechaInicio && !fechaFin) {
      const hoy = new Date()
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)

      setFechaInicio(primerDia.toISOString().split('T')[0])
      setFechaFin(ultimoDia.toISOString().split('T')[0])
    }
  }, [isOpen, fechaInicio, fechaFin])

  // Calcular comisiones cuando cambien las fechas
  useEffect(() => {
    if (fechaInicio && fechaFin && isOpen) {
      handleCalcular()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin, isOpen])

  const handleCalcular = async () => {
    if (!fechaInicio || !fechaFin) {
      setError('Debes seleccionar ambas fechas')
      return
    }

    if (new Date(fechaFin) < new Date(fechaInicio)) {
      setError('La fecha fin debe ser posterior a la fecha inicio')
      return
    }

    try {
      setCalculando(true)
      setError(null)

      const resultado = await calcularComisionesPendientes(
        barbero.id,
        fechaInicio,
        fechaFin
      )

      setComisiones(resultado)

      if (resultado.total_ventas === 0) {
        setError('No hay ventas en este período para liquidar')
      }
    } catch (err) {
      console.error('Error calculando comisiones:', err)
      setError('Error al calcular comisiones')
    } finally {
      setCalculando(false)
    }
  }

  const handleCrear = async () => {
    if (!comisiones || comisiones.total_ventas === 0) {
      setError('No hay comisiones para liquidar')
      return
    }

    try {
      setCreando(true)
      setError(null)

      await crearLiquidacion({
        barbero_id: barbero.id,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      })

      // Éxito
      onSuccess()
      handleClose()
    } catch (err: any) {
      console.error('Error creando liquidación:', err)
      setError(err.message || 'Error al crear liquidación')
    } finally {
      setCreando(false)
    }
  }

  const handleClose = () => {
    setFechaInicio('')
    setFechaFin('')
    setComisiones(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      <div className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>
              Crear Liquidación
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
              {barbero.nombre} {barbero.apellido}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="transition-colors"
            style={{ color: 'var(--text-primary)', opacity: 0.6 }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--accent-color)' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'var(--text-primary)' }}
            disabled={creando}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Selección de Período */}
          <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
              <h3 className="font-semibold" style={{ color: 'var(--accent-color)' }}>
                Período de Liquidación
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--accent-color)' }}>
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 rounded-md focus:outline-none"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-primary)' 
                  }}
                  disabled={creando}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--accent-color)' }}>
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 rounded-md focus:outline-none"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-primary)' 
                  }}
                  disabled={creando}
                />
              </div>
            </div>

            {/* Botones de período rápido */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => {
                  const hoy = new Date()
                  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
                  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
                  setFechaInicio(primerDia.toISOString().split('T')[0])
                  setFechaFin(ultimoDia.toISOString().split('T')[0])
                }}
                className="text-xs px-3 py-1 rounded-full transition-colors"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
                disabled={creando}
              >
                Mes Actual
              </button>
              <button
                onClick={() => {
                  const hoy = new Date()
                  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
                  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
                  setFechaInicio(primerDia.toISOString().split('T')[0])
                  setFechaFin(ultimoDia.toISOString().split('T')[0])
                }}
                className="text-xs px-3 py-1 rounded-full transition-colors"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
                disabled={creando}
              >
                Mes Anterior
              </button>
              <button
                onClick={() => {
                  const hoy = new Date()
                  const hace7dias = new Date(hoy)
                  hace7dias.setDate(hace7dias.getDate() - 7)
                  setFechaInicio(hace7dias.toISOString().split('T')[0])
                  setFechaFin(hoy.toISOString().split('T')[0])
                }}
                className="text-xs px-3 py-1 rounded-full transition-colors"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
                disabled={creando}
              >
                Últimos 7 días
              </button>
            </div>
          </div>

          {/* Resumen de Comisiones */}
          {calculando ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--accent-color)' }}></div>
              <p className="mt-4" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>Calculando comisiones...</p>
            </div>
          ) : comisiones ? (
            <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5" style={{ color: '#22c55e' }} />
                <h3 className="font-semibold" style={{ color: '#86efac' }}>
                  Resumen de Comisiones
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Total Ventas</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {comisiones.total_ventas}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Monto Vendido</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {formatCLP(comisiones.monto_total_vendido)}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Porcentaje</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {comisiones.porcentaje_comision}%
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Comisión Total</p>
                  <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>
                    {formatCLP(comisiones.total_comision)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Error */}
          {error && (
            <div className="rounded-lg p-4 flex items-start gap-3" style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#fca5a5' }} />
              <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            disabled={creando}
          >
            Cancelar
          </button>
          <button
            onClick={handleCrear}
            disabled={
              creando ||
              calculando ||
              !comisiones ||
              comisiones.total_ventas === 0
            }
            className="px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-primary)' }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#B8941F')}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--accent-color)')}
          >
            {creando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creando...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4" />
                Crear Liquidación
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
