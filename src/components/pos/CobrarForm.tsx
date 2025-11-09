import { useState, useEffect } from 'react'
import { supabase, UsuarioConPermisos, Database } from '@/lib/supabase'

type Barbero = Database['public']['Tables']['barberos']['Row']
type Servicio = Database['public']['Tables']['servicios']['Row']

interface CobrarFormProps {
  usuario: UsuarioConPermisos
  onVentaCreada: () => void
}

interface ItemCarrito {
  servicio_id: string
  nombre: string
  precio: number
  cantidad: number
  subtotal: number
}

export default function CobrarForm({ usuario, onVentaCreada }: CobrarFormProps) {
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Form state
  const [clienteNombre, setClienteNombre] = useState('')
  const [barberoId, setBarberoId] = useState('')
  const [servicioSeleccionado, setServicioSeleccionado] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [comisionInfo, setComisionInfo] = useState({ porcentaje: 50, comisionBarbero: 0, ingresoCasa: 0 })

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (barberoId && carrito.length > 0) {
      calcularComision()
    }
  }, [barberoId, carrito])

  const cargarDatos = async () => {
    try {
      setCargando(true)

      // Cargar barberos activos
      const { data: barberosData, error: barberosError } = await supabase
        .from('barberos')
        .select('*')
        .eq('activo', true)
        .order('nombre')

      if (barberosError) throw barberosError

      // Cargar servicios activos
      const { data: serviciosData, error: serviciosError } = await supabase
        .from('servicios')
        .select('*')
        .eq('activo', true)
        .order('categoria, nombre')

      if (serviciosError) throw serviciosError

      setBarberos(barberosData || [])
      setServicios(serviciosData || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
      alert('Error al cargar barberos y servicios')
    } finally {
      setCargando(false)
    }
  }

  const calcularComision = async () => {
    if (!barberoId) return

    const total = carrito.reduce((sum, item) => sum + item.subtotal, 0)

    try {
      const { data, error } = await (supabase as any)
        .rpc('calcular_comisiones_factura', {
          p_barbero_id: barberoId,
          p_total: total
        })

      if (error) throw error

      if (data && data.length > 0) {
        const comision = data[0]
        setComisionInfo({
          porcentaje: parseFloat(comision.porcentaje),
          comisionBarbero: parseFloat(comision.comision_barbero),
          ingresoCasa: parseFloat(comision.ingreso_casa)
        })
      }
    } catch (error) {
      console.error('Error calculando comisión:', error)
      // Usar valores por defecto
      const comisionBarbero = total * 0.5
      const ingresoCasa = total * 0.5
      setComisionInfo({
        porcentaje: 50,
        comisionBarbero,
        ingresoCasa
      })
    }
  }

  const agregarAlCarrito = () => {
    if (!servicioSeleccionado) {
      alert('Selecciona un servicio')
      return
    }

    const servicio = servicios.find(s => s.id === servicioSeleccionado)
    if (!servicio) return

    // Verificar si ya existe en el carrito
    const existeIndex = carrito.findIndex(item => item.servicio_id === servicio.id)
    
    if (existeIndex >= 0) {
      // Incrementar cantidad
      const nuevoCarrito = [...carrito]
      nuevoCarrito[existeIndex].cantidad += 1
      nuevoCarrito[existeIndex].subtotal = nuevoCarrito[existeIndex].precio * nuevoCarrito[existeIndex].cantidad
      setCarrito(nuevoCarrito)
    } else {
      // Agregar nuevo
      const nuevoItem: ItemCarrito = {
        servicio_id: servicio.id,
        nombre: servicio.nombre,
        precio: parseFloat(servicio.precio.toString()),
        cantidad: 1,
        subtotal: parseFloat(servicio.precio.toString())
      }
      setCarrito([...carrito, nuevoItem])
    }

    setServicioSeleccionado('')
  }

  const removerDelCarrito = (index: number) => {
    setCarrito(carrito.filter((_, i) => i !== index))
  }

  const handleCobrar = async () => {
    // Validaciones
    if (!clienteNombre.trim()) {
      alert('Ingresa el nombre del cliente')
      return
    }

    if (!barberoId) {
      alert('Selecciona un barbero')
      return
    }

    if (carrito.length === 0) {
      alert('Agrega al menos un servicio')
      return
    }

    const total = carrito.reduce((sum, item) => sum + item.subtotal, 0)

    try {
      setGuardando(true)

      // Crear la factura
      const { data: factura, error: facturaError } = await (supabase as any)
        .from('facturas')
        .insert({
          barbero_id: barberoId,
          cliente_nombre: clienteNombre.trim(),
          items: carrito,
          subtotal: total,
          total: total,
          metodo_pago: metodoPago,
          monto_recibido: montoRecibido ? parseFloat(montoRecibido) : total,
          cambio: montoRecibido ? parseFloat(montoRecibido) - total : 0,
          porcentaje_comision: comisionInfo.porcentaje,
          comision_barbero: comisionInfo.comisionBarbero,
          ingreso_casa: comisionInfo.ingresoCasa,
          created_by: usuario.id
        })
        .select()
        .single()

      if (facturaError) throw facturaError

      // Éxito
      alert(`¡Venta registrada exitosamente!\n\nFactura: ${factura.numero_factura}\nTotal: $${total.toFixed(2)}`)

      // Limpiar formulario
      setClienteNombre('')
      setBarberoId('')
      setServicioSeleccionado('')
      setMetodoPago('efectivo')
      setMontoRecibido('')
      setCarrito([])
      setComisionInfo({ porcentaje: 50, comisionBarbero: 0, ingresoCasa: 0 })

      // Notificar al componente padre
      onVentaCreada()

      // Aquí se podría abrir ventana de impresión
      // imprimirTicket(factura)

    } catch (error) {
      console.error('Error al crear venta:', error)
      alert('Error al registrar la venta. Intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const total = carrito.reduce((sum, item) => sum + item.subtotal, 0)
  const cambio = montoRecibido ? Math.max(0, parseFloat(montoRecibido) - total) : 0

  if (cargando) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--accent-color)' }}>
        <i className="fas fa-cash-register mr-2"></i>
        Registrar Venta
      </h2>

      <div className="space-y-4">
        {/* Cliente */}
        <div>
          <label className="block text-sm font-medium mb-2 form-label">
            <i className="fas fa-user mr-2"></i>
            Nombre del Cliente *
          </label>
          <input
            type="text"
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            placeholder="Ej: Juan Pérez"
            className="form-input"
          />
        </div>

        {/* Barbero */}
        <div>
          <label className="block text-sm font-medium mb-2 form-label">
            <i className="fas fa-cut mr-2"></i>
            Barbero *
          </label>
          <select
            value={barberoId}
            onChange={(e) => setBarberoId(e.target.value)}
            className="form-select"
          >
            <option value="">Seleccionar barbero...</option>
            {barberos.map((barbero) => (
              <option key={barbero.id} value={barbero.id}>
                {barbero.nombre} {barbero.apellido} - {barbero.especialidad}
              </option>
            ))}
          </select>
        </div>

        {/* Agregar Servicio */}
        <div>
          <label className="block text-sm font-medium mb-2 form-label">
            <i className="fas fa-shopping-cart mr-2"></i>
            Agregar Servicio
          </label>
          <div className="flex space-x-2">
            <select
              value={servicioSeleccionado}
              onChange={(e) => setServicioSeleccionado(e.target.value)}
              className="flex-1 form-select"
            >
              <option value="">Seleccionar servicio...</option>
              {servicios.map((servicio) => (
                <option key={servicio.id} value={servicio.id}>
                  {servicio.nombre} - ${servicio.precio}
                </option>
              ))}
            </select>
            <button
              onClick={agregarAlCarrito}
              disabled={!servicioSeleccionado}
              className="btn btn-primary"
            >
              <i className="fas fa-plus mr-2"></i>
              Agregar
            </button>
          </div>
        </div>

        {/* Carrito */}
        {carrito.length > 0 && (
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--accent-color)' }}>
              <i className="fas fa-list mr-2"></i>
              Servicios:
            </h3>
            <div className="space-y-2">
              {carrito.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <div className="flex-1">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.nombre}</div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                      {formatCurrency(item.precio)} x {item.cantidad}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(item.subtotal)}
                    </span>
                    <button
                      onClick={() => removerDelCarrito(index)}
                      className="hover:opacity-70 transition-opacity"
                      style={{ color: '#ef4444' }}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="pt-3 flex items-center justify-between text-lg" style={{ borderTop: '2px solid var(--border-color)' }}>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>TOTAL:</span>
                <span className="font-bold text-2xl" style={{ color: 'var(--accent-color)' }}>
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Método de Pago */}
        {carrito.length > 0 && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2 form-label">
                <i className="fas fa-money-bill-wave mr-2"></i>
                Método de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="form-select"
              >
                <option value="efectivo">💵 Efectivo</option>
                <option value="tarjeta">💳 Tarjeta</option>
                <option value="transferencia">📱 Transferencia</option>
                <option value="zelle">💰 Zelle</option>
                <option value="binance">₿ Binance</option>
              </select>
            </div>

            {/* Monto Recibido (solo para efectivo) */}
            {metodoPago === 'efectivo' && (
              <div>
                <label className="block text-sm font-medium mb-2 form-label">
                  <i className="fas fa-dollar-sign mr-2"></i>
                  Monto Recibido
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  placeholder={`Mínimo: $${total.toFixed(2)}`}
                  className="form-input"
                />
                {cambio > 0 && (
                  <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--accent-color)' }}>
                    <i className="fas fa-exchange-alt mr-2"></i>
                    Cambio: {formatCurrency(cambio)}
                  </p>
                )}
              </div>
            )}

            {/* Comisiones */}
            {barberoId && (
              <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', border: '1px solid var(--accent-color)' }}>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--accent-color)' }}>
                  <i className="fas fa-chart-pie mr-2"></i>
                  Comisión ({comisionInfo.porcentaje}%):
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-primary)', opacity: 0.8 }}>• Barbero:</span>
                    <span className="font-semibold" style={{ color: 'var(--accent-color)' }}>
                      {formatCurrency(comisionInfo.comisionBarbero)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-primary)', opacity: 0.8 }}>• Casa:</span>
                    <span className="font-semibold" style={{ color: 'var(--accent-color)' }}>
                      {formatCurrency(comisionInfo.ingresoCasa)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Botón Cobrar */}
            <button
              onClick={handleCobrar}
              disabled={guardando}
              className="w-full px-6 py-4 text-lg font-bold rounded-lg transition-all"
              style={{
                backgroundColor: 'var(--accent-color)',
                color: 'var(--bg-primary)',
                cursor: guardando ? 'not-allowed' : 'pointer',
                opacity: guardando ? 0.6 : 1
              }}
              onMouseEnter={(e) => !guardando && (e.currentTarget.style.backgroundColor = '#B8941F')}
              onMouseLeave={(e) => !guardando && (e.currentTarget.style.backgroundColor = 'var(--accent-color)')}
            >
              {guardando ? (
                <span className="flex items-center justify-center">
                  <div className="spinner mr-3"></div>
                  Procesando...
                </span>
              ) : (
                <>
                  <i className="fas fa-cash-register mr-2"></i>
                  Cobrar e Imprimir
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
