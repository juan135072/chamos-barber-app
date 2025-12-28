import { useEffect, useState } from 'react'
import { supabase, UsuarioConPermisos } from '@/lib/supabase'
import { chamosSupabase } from '../../../lib/supabase-helpers'

interface ResumenDiaProps {
  usuario: UsuarioConPermisos
  recargar: number
}

interface ResumenData {
  totalVentas: number
  totalCobrado: number
  totalComisiones: number
  ingresoNetoCasa: number
  efectivo: number
  tarjeta: number
  transferencia: number
  otros: number
}

export default function ResumenDia({ usuario, recargar }: ResumenDiaProps) {
  const [resumen, setResumen] = useState<ResumenData>({
    totalVentas: 0,
    totalCobrado: 0,
    totalComisiones: 0,
    ingresoNetoCasa: 0,
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    otros: 0
  })
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [montoRealEfectivo, setMontoRealEfectivo] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [cierreExistente, setCierreExistente] = useState<any>(null)

  // Estados para el rango de fechas
  const [tipoRango, setTipoRango] = useState<'diario' | 'semanal' | 'personalizado'>('diario')
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    cargarResumen()
  }, [recargar, fechaInicio, fechaFin, tipoRango])

  const cargarResumen = async () => {
    try {
      setCargando(true)

      // Verificar si ya existe un cierre en este exacto rango
      const cierre = await chamosSupabase.getCierreCajaPorRango(fechaInicio, fechaFin)
      setCierreExistente(cierre)

      // Obtener facturas del rango seleccionado
      const { data: facturas, error } = await (supabase as any)
        .from('facturas')
        .select('total, metodo_pago, comision_barbero, ingreso_casa')
        .gte('created_at', `${fechaInicio}T00:00:00`)
        .lte('created_at', `${fechaFin}T23:59:59`)
        .eq('anulada', false)

      if (error) throw error

      // Calcular totales
      const totalVentas = facturas?.length || 0
      const totalCobrado = facturas?.reduce((sum, f) => sum + parseFloat(f.total.toString()), 0) || 0
      const totalComisiones = facturas?.reduce((sum, f) => sum + parseFloat((f.comision_barbero || 0).toString()), 0) || 0
      const ingresoNetoCasa = facturas?.reduce((sum, f) => sum + parseFloat((f.ingreso_casa || 0).toString()), 0) || 0

      // Calcular por método de pago
      const efectivo = facturas?.filter(f => f.metodo_pago === 'efectivo').reduce((sum, f) => sum + parseFloat(f.total.toString()), 0) || 0
      const tarjeta = facturas?.filter(f => f.metodo_pago === 'tarjeta').reduce((sum, f) => sum + parseFloat(f.total.toString()), 0) || 0
      const transferencia = facturas?.filter(f => f.metodo_pago === 'transferencia').reduce((sum, f) => sum + parseFloat(f.total.toString()), 0) || 0
      const otros = facturas?.filter(f => !['efectivo', 'tarjeta', 'transferencia'].includes(f.metodo_pago)).reduce((sum, f) => sum + parseFloat(f.total.toString()), 0) || 0

      setResumen({
        totalVentas,
        totalCobrado,
        totalComisiones,
        ingresoNetoCasa,
        efectivo,
        tarjeta,
        transferencia,
        otros
      })
    } catch (error) {
      console.error('Error cargando resumen:', error)
    } finally {
      setCargando(false)
    }
  }

  const handleCerrarCaja = async () => {
    try {
      setGuardando(true)
      const montoReal = parseFloat(montoRealEfectivo) || 0

      const cierreData = {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        cajero_id: usuario.id,
        monto_esperado_efectivo: resumen.efectivo,
        monto_real_efectivo: montoReal,
        total_ventas: resumen.totalCobrado,
        total_comisiones: resumen.totalComisiones,
        total_casa: resumen.ingresoNetoCasa,
        metodos_pago: {
          efectivo: resumen.efectivo,
          tarjeta: resumen.tarjeta,
          transferencia: resumen.transferencia,
          otros: resumen.otros
        },
        notas,
        estado: 'cerrada'
      }

      await chamosSupabase.crearCierreCaja(cierreData)
      alert('Caja cerrada exitosamente')
      setModalAbierto(false)
      cargarResumen()
    } catch (error: any) {
      console.error('Error al cerrar caja:', error)
      alert('Error al cerrar caja: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  const setRangoSemanal = () => {
    const hoy = new Date()
    const diaSemana = hoy.getDay() // 0 (Dom) - 6 (Sab)
    const diff = hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1) // Lunes
    const lunes = new Date(hoy.setDate(diff))

    setFechaInicio(lunes.toISOString().split('T')[0])
    setFechaFin(new Date().toISOString().split('T')[0])
    setTipoRango('semanal')
  }

  const setRangoDiario = () => {
    const hoy = new Date().toISOString().split('T')[0]
    setFechaInicio(hoy)
    setFechaFin(hoy)
    setTipoRango('diario')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (cargando) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg p-6 sticky top-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
          <i className="fas fa-chart-line mr-2"></i>
          Resumen de Caja
        </h2>

        {/* Selector de periodo rápido */}
        <div className="flex space-x-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
          <button
            onClick={setRangoDiario}
            className={`px-3 py-1 text-xs rounded-md transition-all ${tipoRango === 'diario' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
            style={{ backgroundColor: tipoRango === 'diario' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)' }}
          >
            Hoy
          </button>
          <button
            onClick={setRangoSemanal}
            className={`px-3 py-1 text-xs rounded-md transition-all ${tipoRango === 'semanal' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
            style={{ backgroundColor: tipoRango === 'semanal' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)' }}
          >
            Semana
          </button>
          <button
            onClick={() => setTipoRango('personalizado')}
            className={`px-3 py-1 text-xs rounded-md transition-all ${tipoRango === 'personalizado' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
            style={{ backgroundColor: tipoRango === 'personalizado' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)' }}
          >
            ...
          </button>
        </div>
      </div>

      {/* Selector de fecha personalizado (si aplica) */}
      {tipoRango === 'personalizado' && (
        <div className="grid grid-cols-2 gap-2 mb-6">
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="text-xs p-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="text-xs p-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
        </div>
      )}

      {/* Totales principales */}
      <div className="space-y-4 mb-6">
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
          <div className="text-sm mb-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
            <i className="fas fa-shopping-bag mr-2"></i>
            Total Ventas
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--accent-color)' }}>
            {resumen.totalVentas}
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
          <div className="text-sm mb-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
            <i className="fas fa-dollar-sign mr-2"></i>
            Total Cobrado
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--accent-color)' }}>
            {formatCurrency(resumen.totalCobrado)}
          </div>
        </div>
      </div>

      {/* Desglose por método de pago */}
      <div className="pt-4 space-y-3" style={{ borderTop: '1px solid var(--border-color)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--accent-color)' }}>
          <i className="fas fa-wallet mr-2"></i>
          Por Método de Pago
        </h3>

        {resumen.efectivo > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">💵</span>
              <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>Efectivo</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(resumen.efectivo)}
            </span>
          </div>
        )}

        {resumen.tarjeta > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">💳</span>
              <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>Tarjeta</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(resumen.tarjeta)}
            </span>
          </div>
        )}

        {resumen.transferencia > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">📱</span>
              <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>Transferencia</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(resumen.transferencia)}
            </span>
          </div>
        )}

        {resumen.otros > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">💰</span>
              <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>Otros</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(resumen.otros)}
            </span>
          </div>
        )}

        {resumen.totalCobrado === 0 && (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
            <i className="fas fa-inbox mr-2"></i>
            No hay ventas registradas hoy
          </p>
        )}
      </div>

      {/* Botón cerrar caja */}
      {(usuario.rol === 'admin' || usuario.rol === 'cajero') && (
        <div className="pt-4 mt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
          {cierreExistente ? (
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(52, 211, 153, 0.1)', border: '1px solid #34d399' }}>
              <i className="fas fa-check-circle text-green-500 mr-2"></i>
              <span className="font-semibold text-green-500">Caja Cerrada</span>
              <p className="text-xs mt-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Diferencia: {formatCurrency(cierreExistente.diferencia)}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setModalAbierto(true)}
              className="w-full px-4 py-3 rounded-lg font-semibold transition-all"
              style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B8941F'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
            >
              <i className="fas fa-lock mr-2"></i>
              Cerrar Caja
            </button>
          )}
        </div>
      )}

      {/* Modal Cierre de Caja */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
          <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
                <i className="fas fa-cash-register mr-2"></i>
                Cerrar Caja: {tipoRango === 'diario' ? 'Hoy' : tipoRango === 'semanal' ? 'Semana' : 'Periodo'}
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="text-xs text-center p-2 rounded-lg mb-4" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', opacity: 0.8 }}>
              De: {new Date(fechaInicio).toLocaleDateString()} Hasta: {new Date(fechaFin).toLocaleDateString()}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                <div className="text-xs opacity-70" style={{ color: 'var(--text-primary)' }}>Total Cobrado</div>
                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(resumen.totalCobrado)}</div>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                <div className="text-xs opacity-70" style={{ color: 'var(--text-primary)' }}>Efectivo Esperado</div>
                <div className="text-lg font-bold" style={{ color: 'var(--accent-color)' }}>{formatCurrency(resumen.efectivo)}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Efectivo Real en Caja
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={montoRealEfectivo}
                  onChange={(e) => setMontoRealEfectivo(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Notas / Observaciones
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                rows={3}
                placeholder="Opcional..."
              />
            </div>

            <div className="pt-4 flex space-x-3">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-all"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarCaja}
                disabled={guardando || !montoRealEfectivo}
                className="flex-1 px-4 py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-primary)' }}
              >
                {guardando ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Guardando...</>
                ) : (
                  'Confirmar Cierre'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
