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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        💳 Registrar Venta
      </h2>

      <div className="space-y-4">
        {/* Cliente */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            👤 Nombre del Cliente *
          </label>
          <input
            type="text"
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            placeholder="Ej: Juan Pérez"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Barbero */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ✂️ Barbero *
          </label>
          <select
            value={barberoId}
            onChange={(e) => setBarberoId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🛒 Agregar Servicio
          </label>
          <div className="flex space-x-2">
            <select
              value={servicioSeleccionado}
              onChange={(e) => setServicioSeleccionado(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              + Agregar
            </button>
          </div>
        </div>

        {/* Carrito */}
        {carrito.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-3">Servicios:</h3>
            <div className="space-y-2">
              {carrito.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.nombre}</div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(item.precio)} x {item.cantidad}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-gray-900">
                      {formatCurrency(item.subtotal)}
                    </span>
                    <button
                      onClick={() => removerDelCarrito(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="border-t-2 pt-3 flex items-center justify-between text-lg">
                <span className="font-bold text-gray-900">TOTAL:</span>
                <span className="font-bold text-green-600 text-2xl">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💰 Método de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💵 Monto Recibido
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  placeholder={`Mínimo: $${total.toFixed(2)}`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {cambio > 0 && (
                  <p className="mt-2 text-sm text-green-600 font-semibold">
                    💵 Cambio: {formatCurrency(cambio)}
                  </p>
                )}
              </div>
            )}

            {/* Comisiones */}
            {barberoId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  📊 Comisión ({comisionInfo.porcentaje}%):
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">• Barbero:</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(comisionInfo.comisionBarbero)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">• Casa:</span>
                    <span className="font-semibold text-green-600">
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
              className="w-full px-6 py-4 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {guardando ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </span>
              ) : (
                '🖨️ Cobrar e Imprimir'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
