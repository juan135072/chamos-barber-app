/**
 * =====================================================
 * ✂️ PANEL BARBERO - MIS LIQUIDACIONES
 * =====================================================
 * Panel para que los barberos vean sus propias liquidaciones
 * Solo lectura: no pueden crear ni pagar
 */

'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Download,
  RefreshCw,
  Calendar
} from 'lucide-react'
import {
  BarberoResumen,
  Liquidacion,
  getBarberoResumen,
  getLiquidacionesByBarbero,
  formatCLP,
  formatFecha,
  getEstadoBadgeColor,
  getEstadoLabel
} from '@/lib/supabase-liquidaciones'

interface Props {
  barberoId: string
}

export default function BarberoLiquidacionesPanel({ barberoId }: Props) {
  // Estado
  const [barbero, setBarbero] = useState<BarberoResumen | null>(null)
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar datos
  useEffect(() => {
    cargarDatos()
  }, [barberoId])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)

      const [barberoData, liquidacionesData] = await Promise.all([
        getBarberoResumen(barberoId),
        getLiquidacionesByBarbero(barberoId)
      ])

      setBarbero(barberoData)
      setLiquidaciones(liquidacionesData)
    } catch (err) {
      console.error('Error cargando datos:', err)
      setError('Error al cargar tus liquidaciones')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent-color)' }}></div>
      </div>
    )
  }

  if (error || !barbero) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error || 'No se pudo cargar la información'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--accent-color)' }}>
            Mis Liquidaciones
          </h1>
          <p className="mt-1" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
            {barbero.nombre} {barbero.apellido}
          </p>
        </div>
        <button
          onClick={cargarDatos}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Resumen de Comisiones */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                Total Ventas
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--accent-color)' }}>
                {barbero.total_ventas}
              </p>
            </div>
            <TrendingUp className="w-10 h-10" style={{ color: 'var(--accent-color)', opacity: 0.6 }} />
          </div>
          <p className="text-sm mt-3" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
            Monto: {formatCLP(barbero.total_vendido)}
          </p>
        </div>

        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                Comisiones Pendientes
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--accent-color)' }}>
                {formatCLP(barbero.comisiones_pendientes)}
              </p>
            </div>
            <Clock className="w-10 h-10" style={{ color: 'var(--accent-color)', opacity: 0.6 }} />
          </div>
          <p className="text-sm mt-3" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
            Por liquidar
          </p>
        </div>

        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid rgba(34, 197, 94, 0.3)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: '#86efac' }}>
                Comisiones Pagadas
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: '#22c55e' }}>
                {formatCLP(barbero.comisiones_pagadas)}
              </p>
            </div>
            <CheckCircle className="w-10 h-10" style={{ color: '#22c55e' }} />
          </div>
          <p className="text-sm mt-3" style={{ color: '#86efac' }}>
            Total recibido
          </p>
        </div>

        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                Mi Comisión
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--accent-color)' }}>
                {barbero.porcentaje_comision}%
              </p>
            </div>
            <DollarSign className="w-10 h-10" style={{ color: 'var(--accent-color)', opacity: 0.6 }} />
          </div>
          <p className="text-sm mt-3" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
            Por cada venta
          </p>
        </div>
      </div>

      {/* Información Bancaria */}
      {barbero && (barbero as any).banco && (
        <div className="bg-secondary border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-primary mb-4">
            Mi Información Bancaria
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-secondary">Banco</p>
              <p className="font-medium text-primary">{(barbero as any).banco}</p>
            </div>
            <div>
              <p className="text-sm text-secondary">Tipo de Cuenta</p>
              <p className="font-medium text-primary">{(barbero as any).tipo_cuenta?.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-sm text-secondary">Número de Cuenta</p>
              <p className="font-medium text-primary">{(barbero as any).numero_cuenta}</p>
            </div>
            <div>
              <p className="text-sm text-secondary">Titular</p>
              <p className="font-medium text-primary">{(barbero as any).titular_cuenta}</p>
            </div>
          </div>
          <p className="text-sm text-muted mt-4">
            💡 Si necesitas actualizar tu información bancaria, contacta al administrador
          </p>
        </div>
      )}

      {/* Historial de Liquidaciones */}
      <div className="bg-secondary border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-primary">
            Historial de Liquidaciones
          </h2>
          <p className="text-sm text-secondary mt-1">
            Visualiza todas tus liquidaciones y pagos
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Ventas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Monto Vendido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Comisión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Fecha Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="bg-secondary divide-y divide-gray-200">
              {liquidaciones.map((liquidacion) => (
                <tr key={liquidacion.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm font-medium text-primary">
                      {liquidacion.numero_liquidacion}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p>{formatFecha(liquidacion.fecha_inicio)}</p>
                        <p className="text-muted">al {formatFecha(liquidacion.fecha_fin)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {liquidacion.cantidad_servicios}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {formatCLP(liquidacion.total_ventas)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-bold text-green-600">
                        {formatCLP(liquidacion.total_comision)}
                      </p>
                      <p className="text-xs text-muted">
                        ({liquidacion.porcentaje_comision}%)
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadgeColor(
                        liquidacion.estado
                      )}`}
                    >
                      {getEstadoLabel(liquidacion.estado)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {liquidacion.fecha_pago ? (
                      <div>
                        <p>{formatFecha(liquidacion.fecha_pago)}</p>
                        {liquidacion.metodo_pago && (
                          <p className="text-xs text-muted capitalize">
                            {liquidacion.metodo_pago}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {liquidacion.estado === 'pagada' && liquidacion.comprobante_url ? (
                      <button
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                    ) : liquidacion.estado === 'pendiente' ? (
                      <span className="text-sm text-yellow-600">En proceso</span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {liquidaciones.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted">
                    Aún no tienes liquidaciones registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">
          ℹ️ Información Importante
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Las liquidaciones son creadas por el administrador según el período acordado</li>
          <li>• Una vez creada una liquidación, aparecerá como "Pendiente" hasta que sea pagada</li>
          <li>• Cuando se realice el pago, recibirás un comprobante que podrás descargar</li>
          <li>• Las comisiones pendientes son las que aún no han sido liquidadas</li>
        </ul>
      </div>
    </div>
  )
}
