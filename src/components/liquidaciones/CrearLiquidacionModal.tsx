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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Crear Liquidación
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {barbero.nombre} {barbero.apellido}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={creando}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Selección de Período */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">
                Período de Liquidación
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={creando}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
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
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
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
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                disabled={creando}
              >
                Últimos 7 días
              </button>
            </div>
          </div>

          {/* Resumen de Comisiones */}
          {calculando ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Calculando comisiones...</p>
            </div>
          ) : comisiones ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-900">
                  Resumen de Comisiones
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Ventas</p>
                  <p className="text-lg font-bold text-gray-900">
                    {comisiones.total_ventas}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Monto Vendido</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCLP(comisiones.monto_total_vendido)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Porcentaje</p>
                  <p className="text-lg font-bold text-gray-900">
                    {comisiones.porcentaje_comision}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Comisión Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCLP(comisiones.total_comision)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

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
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
