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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          📋 Últimas Ventas
        </h2>
        <button
          onClick={cargarVentas}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          🔄 Actualizar
        </button>
      </div>

      {ventas.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-500">No hay ventas registradas hoy</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {ventas.map((venta) => (
            <div
              key={venta.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg font-bold text-gray-900">
                      {venta.numero_factura}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatTime(venta.created_at)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-700 mb-1">
                    👤 {venta.cliente_nombre}
                  </div>
                  
                  {venta.barberos && (
                    <div className="text-sm text-gray-600">
                      ✂️ {venta.barberos.nombre} {venta.barberos.apellido}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-green-600 mb-1">
                    {formatCurrency(venta.total)}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center space-x-1">
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
