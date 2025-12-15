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
  ComisionesProximoPeriodo,
  getBarberosResumen,
  getAllLiquidaciones,
  getEstadisticasLiquidaciones,
  calcularComisionesProximoPeriodo,
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
  const [comisionesProximas, setComisionesProximas] = useState<ComisionesProximoPeriodo[]>([])
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

      const [barberosData, liquidacionesData, estadisticasData, comisionesProximasData] = await Promise.all([
        getBarberosResumen(),
        getAllLiquidaciones(filtroEstado || undefined),
        getEstadisticasLiquidaciones(),
        calcularComisionesProximoPeriodo()
      ])

      setBarberos(barberosData)
      setLiquidaciones(liquidacionesData)
      setEstadisticas(estadisticasData)
      setComisionesProximas(comisionesProximasData)
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

      {/* Comisiones del Próximo Período */}
      {comisionesProximas.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid rgba(234, 179, 8, 0.3)' }}>
          <div className="p-6" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#eab308' }}>
                  <Clock className="w-6 h-6" />
                  Comisiones del Próximo Período
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                  Ventas realizadas después de la última liquidación
                </p>
              </div>
              <div className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', border: '1px solid rgba(234, 179, 8, 0.4)' }}>
                <p className="text-xs font-medium" style={{ color: '#eab308' }}>
                  ℹ️ INFORMACIÓN
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                  Estas ventas se liquidarán en el próximo período
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {comisionesProximas.map((comision) => (
              <div
                key={comision.barbero_id}
                className="rounded-lg p-6"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '2px solid rgba(234, 179, 8, 0.2)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {comision.barbero_nombre}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                      {comision.barbero_email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                      Última liquidación
                    </p>
                    <p className="text-sm font-medium" style={{ color: '#eab308' }}>
                      {comision.ultima_liquidacion_numero}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                      hasta {formatFecha(comision.ultima_liquidacion_fecha)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                      Ventas Nuevas
                    </p>
                    <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>
                      {comision.cantidad_ventas}
                    </p>
                  </div>

                  <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                      Monto Total
                    </p>
                    <p className="text-2xl font-bold" style={{ color: '#a855f7' }}>
                      {formatCLP(comision.monto_total)}
                    </p>
                  </div>

                  <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                      Comisión %
                    </p>
                    <p className="text-2xl font-bold" style={{ color: '#eab308' }}>
                      {comision.porcentaje_comision}%
                    </p>
                  </div>

                  <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                      Comisión Total
                    </p>
                    <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>
                      {formatCLP(comision.total_comision)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <p className="text-xs flex items-center gap-2" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                    <Clock className="w-4 h-4" />
                    Estas ventas se incluirán en la próxima liquidación que crees para este barbero
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de Liquidaciones */}
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
                Historial de Liquidaciones
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                Visualiza y gestiona todas las liquidaciones
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: 'var(--text-primary)', opacity: 0.4 }} />
                <input
                  type="text"
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  placeholder="Buscar por barbero o número..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 rounded-lg focus:outline-none"
              style={{ 
                backgroundColor: 'var(--bg-primary)', 
                border: '1px solid var(--border-color)', 
                color: 'var(--text-primary)'
              }}
            >
              <option value="" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Todos los estados</option>
              <option value="pendiente" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Pendientes</option>
              <option value="pagada" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Pagadas</option>
              <option value="cancelada" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Canceladas</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-primary)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>
                  Barbero
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>
                  Ventas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>
                  Comisión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--accent-color)' }}>
                  Acción
                </th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: 'var(--bg-secondary)' }}>
              {liquidacionesFiltradas.map((liquidacion) => (
                <tr key={liquidacion.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'var(--transition)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {liquidacion.numero_liquidacion}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {liquidacion.barbero?.nombre} {liquidacion.barbero?.apellido}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                        {liquidacion.barbero?.email}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)' }}>
                    <div>
                      <p>{formatFecha(liquidacion.fecha_inicio)}</p>
                      <p style={{ color: 'var(--text-primary)', opacity: 0.6 }}>al {formatFecha(liquidacion.fecha_fin)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)' }}>
                    {liquidacion.total_ventas}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold" style={{ color: '#22c55e' }}>
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
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                        style={{ backgroundColor: '#22c55e', color: 'white' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
                      >
                        <DollarSign className="w-4 h-4" />
                        Pagar
                      </button>
                    ) : liquidacion.estado === 'pagada' ? (
                      <button
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.4 }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
              {liquidacionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
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
