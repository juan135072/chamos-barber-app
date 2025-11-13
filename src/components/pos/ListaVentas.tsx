import { useEffect, useState } from 'react'
import { supabase, UsuarioConPermisos } from '@/lib/supabase'
import ModalCobrarCita from './ModalCobrarCita'

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
  barbero?: {
    nombre: string
    apellido: string
  }
}

interface Cita {
  id: string
  cliente_nombre: string
  cliente_telefono: string
  fecha: string
  hora_inicio: string  // Campo real de la BD
  hora?: string        // Alias opcional
  estado_pago: string
  barbero: {
    nombre: string
    apellido: string
  }
  servicio: {
    nombre: string
    precio: number
    duracion_minutos: number
  }
}

export default function ListaVentas({ usuario, recargar }: ListaVentasProps) {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [citasPendientes, setCitasPendientes] = useState<Cita[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarCitas, setMostrarCitas] = useState(true)
  const [citaACobrar, setCitaACobrar] = useState<Cita | null>(null)

  useEffect(() => {
    cargarDatos()
  }, [recargar])

  const cargarDatos = async () => {
    try {
      setCargando(true)
      const hoy = new Date().toISOString().split('T')[0]

      // Cargar ventas del día
      const { data: ventasData, error: ventasError } = await (supabase as any)
        .from('facturas')
        .select(`
          id,
          numero_factura,
          cliente_nombre,
          total,
          metodo_pago,
          created_at,
          barbero:barberos!facturas_barbero_id_fkey (
            nombre,
            apellido
          )
        `)
        .gte('created_at', `${hoy}T00:00:00`)
        .lte('created_at', `${hoy}T23:59:59`)
        .eq('anulada', false)
        .order('created_at', { ascending: false })
        .limit(20)

      console.log('📊 Ventas cargadas:', ventasData)
      console.log('❌ Error ventas:', ventasError)

      if (ventasError) {
        console.error('Error cargando ventas:', ventasError)
        // No lanzar error, solo loguearlo para que las citas sigan cargando
      }

      // Cargar citas pendientes de pago (hoy y días siguientes)
      const { data: citasData, error: citasError } = await (supabase as any)
        .from('citas')
        .select(`
          id,
          cliente_nombre,
          cliente_telefono,
          fecha,
          hora_inicio,
          estado_pago,
          barbero:barberos!citas_barbero_id_fkey (
            nombre,
            apellido
          ),
          servicio:servicios!citas_servicio_id_fkey (
            nombre,
            precio,
            duracion_minutos
          )
        `)
        .gte('fecha', hoy)
        .eq('estado_pago', 'pendiente')
        .in('estado', ['pendiente', 'confirmada', 'completada'])
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true })
        .limit(10)
      
      console.log('🔍 Citas cargadas:', citasData)

      if (citasError) throw citasError

      // Mapear citas para agregar alias 'hora' desde 'hora_inicio'
      const citasConHora = (citasData || []).map((cita: any) => ({
        ...cita,
        hora: cita.hora_inicio
      }))

      const ventasFinales = ventasData || []
      console.log('💾 Estado ANTES de actualizar - ventas:', ventas.length, 'citas:', citasPendientes.length)
      console.log('💾 ACTUALIZANDO estado con:', ventasFinales.length, 'ventas y', citasConHora.length, 'citas')
      
      setVentas(ventasFinales)
      setCitasPendientes(citasConHora)
      
      console.log('✅ setVentas() y setCitasPendientes() llamados')
    } catch (error) {
      console.error('Error cargando datos:', error)
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

  // Log del estado actual antes de renderizar
  console.log('🎨 RENDERIZANDO con estado:', {
    ventas: ventas.length,
    citasPendientes: citasPendientes.length,
    mostrarCitas,
    cargando
  })

  return (
    <>
      {/* Modal para cobrar cita */}
      {citaACobrar && (
        <ModalCobrarCita
          cita={citaACobrar}
          usuario={usuario}
          onClose={() => setCitaACobrar(null)}
          onCobrado={() => {
            setCitaACobrar(null)
            cargarDatos()
          }}
        />
      )}

      <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
        {/* Tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setMostrarCitas(true)}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: mostrarCitas ? 'var(--accent-color)' : 'var(--bg-primary)',
                color: mostrarCitas ? 'var(--bg-primary)' : 'var(--text-primary)',
                border: `2px solid ${mostrarCitas ? 'var(--accent-color)' : 'var(--border-color)'}`
              }}
            >
              <i className="fas fa-clock mr-2"></i>
              Pendientes {citasPendientes.length > 0 && `(${citasPendientes.length})`}
            </button>
            <button
              onClick={() => setMostrarCitas(false)}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: !mostrarCitas ? 'var(--accent-color)' : 'var(--bg-primary)',
                color: !mostrarCitas ? 'var(--bg-primary)' : 'var(--text-primary)',
                border: `2px solid ${!mostrarCitas ? 'var(--accent-color)' : 'var(--border-color)'}`
              }}
            >
              <i className="fas fa-receipt mr-2"></i>
              Ventas Hoy
            </button>
          </div>
          <button
            onClick={cargarDatos}
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--accent-color)' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <i className="fas fa-sync-alt mr-2"></i>
            Actualizar
          </button>
        </div>

      {/* Contenido según tab seleccionado */}
      {mostrarCitas ? (
        /* Citas Pendientes de Pago */
        citasPendientes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <p style={{ color: 'var(--text-primary)', opacity: 0.6 }}>No hay citas pendientes de pago</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {citasPendientes.map((cita) => (
              <div
                key={cita.id}
                className="rounded-lg p-4 transition-all"
                style={{ 
                  backgroundColor: 'var(--bg-primary)', 
                  border: '2px solid var(--accent-color)',
                  boxShadow: '0 0 10px rgba(212, 175, 55, 0.2)'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-primary)' }}>
                        PENDIENTE
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                        {new Date(cita.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} - {cita.hora}
                      </span>
                    </div>
                    
                    <div className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                      <i className="fas fa-user mr-2"></i>
                      <span className="font-medium">{cita.cliente_nombre}</span>
                    </div>
                    
                    <div className="text-sm mb-1" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                      <i className="fas fa-cut mr-2"></i>
                      {cita.barbero.nombre} {cita.barbero.apellido}
                    </div>

                    <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                      <i className="fas fa-scissors mr-2"></i>
                      {cita.servicio.nombre}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold mb-2" style={{ color: 'var(--accent-color)' }}>
                      {formatCurrency(cita.servicio.precio)}
                    </div>
                    <button
                      onClick={() => setCitaACobrar(cita)}
                      className="px-4 py-2 rounded-lg font-medium transition-all"
                      style={{
                        backgroundColor: 'var(--accent-color)',
                        color: 'var(--bg-primary)',
                        fontSize: '0.875rem'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B8941F'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
                    >
                      <i className="fas fa-cash-register mr-2"></i>
                      Cobrar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Ventas del Día */
        ventas.length === 0 ? (
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
                    
                    {venta.barbero && (
                      <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                        <i className="fas fa-cut mr-2"></i>
                        {venta.barbero.nombre} {venta.barbero.apellido}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold mb-1" style={{ color: 'var(--accent-color)' }}>
                      {formatCurrency(venta.total)}
                    </div>
                    <div className="text-sm flex items-center justify-end space-x-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                      <span>{getMetodoPagoIcon(venta.metodo_pago)}</span>
                      <span className="capitalize">{venta.metodo_pago}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
    </>
  )
}
