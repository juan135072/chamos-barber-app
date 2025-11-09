import { useEffect, useState } from 'react'
import { supabase, UsuarioConPermisos } from '@/lib/supabase'

interface ListaVentasProps {
  usuario: UsuarioConPermisos
  recargar: number
}

interface Venta {
  id: string
  numero_factura: string
  cliente_nombre: string
  total: number
  metodo_pago: string
  created_at: string
  barberos?: {
    nombre: string
    apellido: string
  }
}

export default function ListaVentas({ usuario, recargar }: ListaVentasProps) {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarVentas()
  }, [recargar])

  const cargarVentas = async () => {
    try {
      setCargando(true)
      const hoy = new Date().toISOString().split('T')[0]

      const { data, error } = await (supabase as any)
        .from('facturas')
        .select(`
          id,
          numero_factura,
          cliente_nombre,
          total,
          metodo_pago,
          created_at,
          barberos (
            nombre,
            apellido
          )
        `)
        .gte('created_at', `${hoy}T00:00:00`)
        .lte('created_at', `${hoy}T23:59:59`)
        .eq('anulada', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setVentas(data || [])
    } catch (error) {
      console.error('Error cargando ventas:', error)
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getMetodoPagoIcon = (metodo: string) => {
    switch (metodo) {
      case 'efectivo': return '💵'
      case 'tarjeta': return '💳'
      case 'transferencia': return '📱'
      case 'zelle': return '💰'
      case 'binance': return '₿'
      default: return '💵'
    }
  }

  if (cargando) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          📋 Últimas Ventas
        </h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
          <i className="fas fa-receipt mr-2"></i>
          Últimas Ventas
        </h2>
        <button
          onClick={cargarVentas}
          className="text-sm font-medium transition-colors"
          style={{ color: 'var(--accent-color)' }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <i className="fas fa-sync-alt mr-2"></i>
          Actualizar
        </button>
      </div>

      {ventas.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📭</div>
          <p style={{ color: 'var(--text-primary)', opacity: 0.6 }}>No hay ventas registradas hoy</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {ventas.map((venta) => (
            <div
              key={venta.id}
              className="rounded-lg p-4 transition-all"
              style={{ 
                backgroundColor: 'var(--bg-primary)', 
                border: '1px solid var(--border-color)' 
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg font-bold" style={{ color: 'var(--accent-color)' }}>
                      {venta.numero_factura}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                      {formatTime(venta.created_at)}
                    </span>
                  </div>
                  
                  <div className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                    <i className="fas fa-user mr-2"></i>
                    {venta.cliente_nombre}
                  </div>
                  
                  {venta.barberos && (
                    <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                      <i className="fas fa-cut mr-2"></i>
                      {venta.barberos.nombre} {venta.barberos.apellido}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold mb-1" style={{ color: 'var(--accent-color)' }}>
                    {formatCurrency(venta.total)}
                  </div>
                  <div className="text-sm flex items-center space-x-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                    <span>{getMetodoPagoIcon(venta.metodo_pago)}</span>
                    <span className="capitalize">{venta.metodo_pago}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
