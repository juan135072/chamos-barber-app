/**
 * =====================================================
 * 👨‍💼 PANEL ADMIN - LIQUIDACIONES
 * =====================================================
 * Panel completo para que admins gestionen liquidaciones
 * Incluye: crear liquidaciones, pagarlas, ver historial
 */

'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign,
  Plus,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  RefreshCw,
  Search,
  Download
} from 'lucide-react'
import {
  BarberoResumen,
  Liquidacion,
  getBarberosResumen,
  getAllLiquidaciones,
  getEstadisticasLiquidaciones,
  formatCLP,
  formatFecha,
  getEstadoBadgeColor,
  getEstadoLabel
} from '@/lib/supabase-liquidaciones'
import CrearLiquidacionModal from './CrearLiquidacionModal'
import PagarLiquidacionModal from './PagarLiquidacionModal'

export default function AdminLiquidacionesPanel() {
  // Estado
  const [barberos, setBarberos] = useState<BarberoResumen[]>([])
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [estadisticas, setEstadisticas] = useState({
    total_pendientes: 0,
    total_pagadas: 0,
    monto_pendiente: 0,
    monto_pagado: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [filtroBusqueda, setFiltroBusqueda] = useState('')

  // Modales
  const [modalCrearOpen, setModalCrearOpen] = useState(false)
  const [modalPagarOpen, setModalPagarOpen] = useState(false)
  const [barberoSeleccionado, setBarberoSeleccionado] = useState<BarberoResumen | null>(null)
  const [liquidacionSeleccionada, setLiquidacionSeleccionada] = useState<Liquidacion | null>(null)

  // Cargar datos
  useEffect(() => {
    cargarDatos()
  }, [filtroEstado])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)

      const [barberosData, liquidacionesData, estadisticasData] = await Promise.all([
        getBarberosResumen(),
        getAllLiquidaciones(filtroEstado || undefined),
        getEstadisticasLiquidaciones()
      ])

      setBarberos(barberosData)
      setLiquidaciones(liquidacionesData)
      setEstadisticas(estadisticasData)
    } catch (err) {
      console.error('Error cargando datos:', err)
      setError('Error al cargar datos de liquidaciones')
    } finally {
      setLoading(false)
    }
  }

  // Handlers
  const handleCrearLiquidacion = (barbero: BarberoResumen) => {
    setBarberoSeleccionado(barbero)
    setModalCrearOpen(true)
  }

  const handlePagarLiquidacion = (liquidacion: Liquidacion) => {
    setLiquidacionSeleccionada(liquidacion)
    setModalPagarOpen(true)
  }

  const handleSuccess = () => {
    cargarDatos()
  }

  // Filtrar liquidaciones
  const liquidacionesFiltradas = liquidaciones.filter((liq) => {
    if (filtroBusqueda) {
      const busqueda = filtroBusqueda.toLowerCase()
      const nombreBarbero = `${liq.barbero?.nombre} ${liq.barbero?.apellido}`.toLowerCase()
      const numeroLiquidacion = liq.numero_liquidacion.toLowerCase()
      return nombreBarbero.includes(busqueda) || numeroLiquidacion.includes(busqueda)
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent-color)' }}></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--accent-color)' }}>
            Sistema de Liquidaciones
          </h1>
          <p className="mt-1" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
            Gestiona las comisiones y pagos de los barberos
          </p>
        </div>
        <button
          onClick={cargarDatos}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
          <p style={{ color: '#fca5a5' }}>{error}</p>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                Liquidaciones Pendientes
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--accent-color)' }}>
                {estadisticas.total_pendientes}
              </p>
            </div>
            <Clock className="w-10 h-10" style={{ color: 'var(--accent-color)', opacity: 0.6 }} />
          </div>
          <p className="text-sm mt-3" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
            Monto: {formatCLP(estadisticas.monto_pendiente)}
          </p>
        </div>

        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid rgba(34, 197, 94, 0.3)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: '#86efac' }}>
                Liquidaciones Pagadas
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: '#22c55e' }}>
                {estadisticas.total_pagadas}
              </p>
            </div>
            <CheckCircle className="w-10 h-10" style={{ color: '#22c55e' }} />
          </div>
          <p className="text-sm mt-3" style={{ color: '#86efac' }}>
            Monto: {formatCLP(estadisticas.monto_pagado)}
          </p>
        </div>

        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                Barberos Activos
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--accent-color)' }}>
                {barberos.filter((b) => b.activo).length}
              </p>
            </div>
            <Users className="w-10 h-10" style={{ color: 'var(--accent-color)', opacity: 0.6 }} />
          </div>
          <p className="text-sm mt-3" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
            Total: {barberos.length} barberos
          </p>
        </div>

        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                Comisiones Pendientes
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--accent-color)' }}>
                {formatCLP(barberos.reduce((sum, b) => sum + b.comisiones_pendientes, 0))}
              </p>
            </div>
            <TrendingUp className="w-10 h-10" style={{ color: 'var(--accent-color)', opacity: 0.6 }} />
          </div>
          <p className="text-sm mt-3" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
            Total generado: {formatCLP(barberos.reduce((sum, b) => sum + b.comisiones_generadas, 0))}
          </p>
        </div>
      </div>

      {/* Barberos con Comisiones Pendientes */}
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
            Barberos con Comisiones Pendientes
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
            Crea liquidaciones para barberos con comisiones pendientes
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-primary)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>
                  Barbero
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>
                  Total Ventas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>
                  Monto Vendido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>
                  Comisión %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>
                  Pendiente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>
                  Acción
                </th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: 'var(--bg-secondary)' }}>
              {barberos
                .filter((b) => b.comisiones_pendientes > 0)
                .map((barbero) => (
                  <tr key={barbero.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'var(--transition)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {barbero.nombre} {barbero.apellido}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>{barbero.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)' }}>
                      {barbero.total_ventas}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatCLP(barbero.total_vendido)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)' }}>
                      {barbero.porcentaje_comision}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold" style={{ color: '#22c55e' }}>
                        {formatCLP(barbero.comisiones_pendientes)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleCrearLiquidacion(barbero)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                        style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-primary)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B8941F'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
                      >
                        <Plus className="w-4 h-4" />
                        Crear Liquidación
                      </button>
                    </td>
                  </tr>
                ))}
              {barberos.filter((b) => b.comisiones_pendientes > 0).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                    No hay comisiones pendientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Liquidaciones */}
      <div className="bg-secondary border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary">
                Historial de Liquidaciones
              </h2>
              <p className="text-sm text-secondary mt-1">
                Visualiza y gestiona todas las liquidaciones
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  placeholder="Buscar por barbero o número..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="pagada">Pagadas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Barbero
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Ventas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Comisión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="bg-secondary divide-y divide-gray-200">
              {liquidacionesFiltradas.map((liquidacion) => (
                <tr key={liquidacion.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm font-medium text-primary">
                      {liquidacion.numero_liquidacion}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-primary">
                        {liquidacion.barbero?.nombre} {liquidacion.barbero?.apellido}
                      </p>
                      <p className="text-sm text-muted">
                        {liquidacion.barbero?.email}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    <div>
                      <p>{formatFecha(liquidacion.fecha_inicio)}</p>
                      <p className="text-muted">al {formatFecha(liquidacion.fecha_fin)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {liquidacion.total_ventas}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-green-600">
                      {formatCLP(liquidacion.total_comision)}
                    </span>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    {liquidacion.estado === 'pendiente' ? (
                      <button
                        onClick={() => handlePagarLiquidacion(liquidacion)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <DollarSign className="w-4 h-4" />
                        Pagar
                      </button>
                    ) : liquidacion.estado === 'pagada' ? (
                      <button
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {liquidacionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted">
                    No se encontraron liquidaciones
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modales */}
      {barberoSeleccionado && (
        <CrearLiquidacionModal
          barbero={barberoSeleccionado}
          isOpen={modalCrearOpen}
          onClose={() => {
            setModalCrearOpen(false)
            setBarberoSeleccionado(null)
          }}
          onSuccess={handleSuccess}
        />
      )}

      {liquidacionSeleccionada && (
        <PagarLiquidacionModal
          liquidacion={liquidacionSeleccionada}
          isOpen={modalPagarOpen}
          onClose={() => {
            setModalPagarOpen(false)
            setLiquidacionSeleccionada(null)
          }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
