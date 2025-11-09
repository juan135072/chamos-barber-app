import { useEffect, useState } from 'react'
import { supabase, UsuarioConPermisos } from '@/lib/supabase'

interface ResumenDiaProps {
  usuario: UsuarioConPermisos
  recargar: number
}

interface ResumenData {
  totalVentas: number
  totalCobrado: number
  efectivo: number
  tarjeta: number
  transferencia: number
  otros: number
}

export default function ResumenDia({ usuario, recargar }: ResumenDiaProps) {
  const [resumen, setResumen] = useState<ResumenData>({
    totalVentas: 0,
    totalCobrado: 0,
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    otros: 0
  })
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarResumen()
  }, [recargar])

  const cargarResumen = async () => {
    try {
      setCargando(true)
      const hoy = new Date().toISOString().split('T')[0]

      // Obtener facturas del día
      const { data: facturas, error } = await (supabase as any)
        .from('facturas')
        .select('total, metodo_pago')
        .gte('created_at', `${hoy}T00:00:00`)
        .lte('created_at', `${hoy}T23:59:59`)
        .eq('anulada', false)

      if (error) throw error

      // Calcular totales
      const totalVentas = facturas?.length || 0
      const totalCobrado = facturas?.reduce((sum, f) => sum + parseFloat(f.total.toString()), 0) || 0

      // Calcular por método de pago
      const efectivo = facturas?.filter(f => f.metodo_pago === 'efectivo').reduce((sum, f) => sum + parseFloat(f.total.toString()), 0) || 0
      const tarjeta = facturas?.filter(f => f.metodo_pago === 'tarjeta').reduce((sum, f) => sum + parseFloat(f.total.toString()), 0) || 0
      const transferencia = facturas?.filter(f => f.metodo_pago === 'transferencia').reduce((sum, f) => sum + parseFloat(f.total.toString()), 0) || 0
      const otros = facturas?.filter(f => !['efectivo', 'tarjeta', 'transferencia'].includes(f.metodo_pago)).reduce((sum, f) => sum + parseFloat(f.total.toString()), 0) || 0

      setResumen({
        totalVentas,
        totalCobrado,
        efectivo,
        tarjeta,
        transferencia,
        otros
      })
    } catch (error) {
      console.error('Error cargando resumen del día:', error)
    } finally {
      setCargando(false)
    }
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
      <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--accent-color)' }}>
        <i className="fas fa-chart-line mr-2"></i>
        Resumen del Día
      </h2>

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

      {/* Botón cerrar caja (futuro) */}
      {(usuario.rol === 'admin' || usuario.rol === 'cajero') && (
        <div className="pt-4 mt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button
            disabled
            className="w-full px-4 py-3 rounded-lg font-semibold cursor-not-allowed"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', opacity: 0.5, border: '1px solid var(--border-color)' }}
          >
            <i className="fas fa-lock mr-2"></i>
            Cerrar Caja (Próximamente)
          </button>
        </div>
      )}
    </div>
  )
}
