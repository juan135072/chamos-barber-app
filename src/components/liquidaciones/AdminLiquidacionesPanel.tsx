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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Sistema de Liquidaciones
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona las comisiones y pagos de los barberos
          </p>
        </div>
        <button
          onClick={cargarDatos}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">
                Liquidaciones Pendientes
              </p>
              <p className="text-3xl font-bold text-yellow-900 mt-2">
                {estadisticas.total_pendientes}
              </p>
            </div>
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
          <p className="text-sm text-yellow-700 mt-3">
            Monto: {formatCLP(estadisticas.monto_pendiente)}
          </p>
        </div>

        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">
                Liquidaciones Pagadas
              </p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {estadisticas.total_pagadas}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <p className="text-sm text-green-700 mt-3">
            Monto: {formatCLP(estadisticas.monto_pagado)}
          </p>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">
                Barberos Activos
              </p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {barberos.filter((b) => b.activo).length}
              </p>
            </div>
            <Users className="w-10 h-10 text-blue-600" />
          </div>
          <p className="text-sm text-blue-700 mt-3">
            Total: {barberos.length} barberos
          </p>
        </div>

        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">
                Comisiones Pendientes
              </p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {formatCLP(barberos.reduce((sum, b) => sum + b.comisiones_pendientes, 0))}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-600" />
          </div>
          <p className="text-sm text-purple-700 mt-3">
            Total generado: {formatCLP(barberos.reduce((sum, b) => sum + b.comisiones_generadas, 0))}
          </p>
        </div>
      </div>

      {/* Barberos con Comisiones Pendientes */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Barberos con Comisiones Pendientes
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Crea liquidaciones para barberos con comisiones pendientes
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barbero
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Ventas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto Vendido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comisión %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pendiente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {barberos
                .filter((b) => b.comisiones_pendientes > 0)
                .map((barbero) => (
                  <tr key={barbero.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-gray-900">
                          {barbero.nombre} {barbero.apellido}
                        </p>
                        <p className="text-sm text-gray-500">{barbero.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {barbero.total_ventas}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCLP(barbero.total_vendido)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {barbero.porcentaje_comision}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-green-600">
                        {formatCLP(barbero.comisiones_pendientes)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleCrearLiquidacion(barbero)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Crear Liquidación
                      </button>
                    </td>
                  </tr>
                ))}
              {barberos.filter((b) => b.comisiones_pendientes > 0).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No hay comisiones pendientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Liquidaciones */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Historial de Liquidaciones
              </h2>
              <p className="text-sm text-gray-600 mt-1">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barbero
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ventas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comisión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {liquidacionesFiltradas.map((liquidacion) => (
                <tr key={liquidacion.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {liquidacion.numero_liquidacion}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-gray-900">
                        {liquidacion.barbero?.nombre} {liquidacion.barbero?.apellido}
                      </p>
                      <p className="text-sm text-gray-500">
                        {liquidacion.barbero?.email}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <p>{formatFecha(liquidacion.fecha_inicio)}</p>
                      <p className="text-gray-500">al {formatFecha(liquidacion.fecha_fin)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
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
