import { useState, useEffect } from 'react'
import { supabase, UsuarioConPermisos, Database } from '@/lib/supabase'
import { generarEImprimirFactura, obtenerDatosFactura } from './FacturaTermica'

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
  const [tipoDocumento, setTipoDocumento] = useState<'boleta' | 'factura'>('boleta')
  const [rut, setRut] = useState('')
  const [barberoId, setBarberoId] = useState('')
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([])
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

  const toggleServicio = (servicioId: string) => {
    setServiciosSeleccionados(prev => {
      if (prev.includes(servicioId)) {
        return prev.filter(id => id !== servicioId)
      } else {
        return [...prev, servicioId]
      }
    })
  }

  const agregarAlCarrito = () => {
    if (serviciosSeleccionados.length === 0) {
      alert('Selecciona al menos un servicio')
      return
    }

    // Agregar cada servicio seleccionado al carrito
    const nuevosItems: ItemCarrito[] = []
    
    serviciosSeleccionados.forEach(servicioId => {
      const servicio = servicios.find(s => s.id === servicioId)
      if (!servicio) return

      // Verificar si ya existe en el carrito
      const existeIndex = carrito.findIndex(item => item.servicio_id === servicio.id)
      
      if (existeIndex >= 0) {
        // Si ya existe, se incrementará después
        return
      } else {
        // Agregar nuevo
        nuevosItems.push({
          servicio_id: servicio.id,
          nombre: servicio.nombre,
          precio: parseFloat(servicio.precio.toString()),
          cantidad: 1,
          subtotal: parseFloat(servicio.precio.toString())
        })
      }
    })

    if (nuevosItems.length > 0) {
      setCarrito([...carrito, ...nuevosItems])
    }

    // Limpiar selección
    setServiciosSeleccionados([])
  }

  const limpiarSeleccion = () => {
    setServiciosSeleccionados([])
  }

  const removerDelCarrito = (index: number) => {
    setCarrito(carrito.filter((_, i) => i !== index))
  }

  const actualizarPrecioItem = (index: number, nuevoPrecio: string) => {
    // Permitir vacío mientras se escribe
    if (nuevoPrecio === '') {
      const nuevosItems = [...carrito]
      // Guardamos temporalmente como 0 o manejamos la UI para permitir string vacío
      // Para simplificar, si es vacío es 0 en el estado, pero el input lo controlará
      nuevosItems[index].precio = 0
      nuevosItems[index].subtotal = 0
      setCarrito(nuevosItems)
      return
    }

    const precio = parseFloat(nuevoPrecio)
    if (isNaN(precio) || precio < 0) return

    const nuevosItems = [...carrito]
    nuevosItems[index].precio = precio
    nuevosItems[index].subtotal = precio * nuevosItems[index].cantidad
    setCarrito(nuevosItems)
  }

  const handleCobrar = async () => {
    // Validaciones
    if (!clienteNombre.trim()) {
      alert('Ingresa el nombre del cliente')
      return
    }

    if (tipoDocumento === 'factura' && !rut.trim()) {
      alert('Para emitir factura, ingresa el RUT del cliente')
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
          cliente_rut: tipoDocumento === 'factura' ? rut.trim() : null,
          tipo_documento: tipoDocumento,
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

      // Éxito - NO mostrar comisiones al usuario/cliente
      const tipoDoc = tipoDocumento === 'boleta' ? 'Boleta' : 'Factura'
      const confirmar = window.confirm(`¡Venta registrada exitosamente!\n\n${tipoDoc}: ${factura.numero_factura}\nCliente: ${clienteNombre}${tipoDocumento === 'factura' ? `\nRUT: ${rut}` : ''}\nTotal: $${total.toFixed(2)}\nMétodo de pago: ${metodoPago}\n\n¿Deseas imprimir la factura?`)

      if (confirmar) {
        // Obtener datos completos de la factura e imprimir
        const datosFactura = await obtenerDatosFactura(factura.id, supabase)
        if (datosFactura) {
          // IMPORTANTE: La factura impresa NO debe mostrar las comisiones
          await generarEImprimirFactura(datosFactura, 'imprimir')
        }
      }

      // Limpiar formulario
      setClienteNombre('')
      setTipoDocumento('boleta')
      setRut('')
      setBarberoId('')
      setServiciosSeleccionados([])
      setMetodoPago('efectivo')
      setMontoRecibido('')
      setCarrito([])
      setComisionInfo({ porcentaje: 50, comisionBarbero: 0, ingresoCasa: 0 })

      // Notificar al componente padre
      onVentaCreada()

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
  const cambio = 0 // Eliminado cálculo de cambio en UI

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

        {/* Tipo de Documento */}
        <div>
          <label className="block text-sm font-medium mb-2 form-label">
            <i className="fas fa-file-invoice mr-2"></i>
            Tipo de Documento *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipoDocumento('boleta')}
              className="p-3 rounded-lg font-medium transition-all border-2"
              style={{
                backgroundColor: tipoDocumento === 'boleta' ? 'var(--accent-color)' : 'var(--bg-primary)',
                borderColor: tipoDocumento === 'boleta' ? 'var(--accent-color)' : 'var(--border-color)',
                color: tipoDocumento === 'boleta' ? '#1a1a1a' : 'var(--text-primary)'
              }}
            >
              <i className="fas fa-receipt mr-2"></i>
              Boleta
            </button>
            <button
              type="button"
              onClick={() => setTipoDocumento('factura')}
              className="p-3 rounded-lg font-medium transition-all border-2"
              style={{
                backgroundColor: tipoDocumento === 'factura' ? 'var(--accent-color)' : 'var(--bg-primary)',
                borderColor: tipoDocumento === 'factura' ? 'var(--accent-color)' : 'var(--border-color)',
                color: tipoDocumento === 'factura' ? '#1a1a1a' : 'var(--text-primary)'
              }}
            >
              <i className="fas fa-file-invoice-dollar mr-2"></i>
              Factura
            </button>
          </div>
        </div>

        {/* RUT (solo si es factura) */}
        {tipoDocumento === 'factura' && (
          <div>
            <label className="block text-sm font-medium mb-2 form-label">
              <i className="fas fa-id-card mr-2"></i>
              RUT del Cliente *
            </label>
            <input
              type="text"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="Ej: 12.345.678-9"
              className="form-input"
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
              <i className="fas fa-info-circle mr-1"></i>
              Requerido para emitir factura tributaria
            </p>
          </div>
        )}

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
                {barbero.nombre} {barbero.apellido}
              </option>
            ))}
          </select>
        </div>

        {/* Seleccionar Servicios */}
        <div>
          <label className="block text-sm font-medium mb-3 form-label">
            <i className="fas fa-shopping-cart mr-2"></i>
            Seleccionar Servicios {serviciosSeleccionados.length > 0 && `(${serviciosSeleccionados.length})`}
          </label>
          
          {/* Grid de servicios */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {servicios.map((servicio) => {
              const isSelected = serviciosSeleccionados.includes(servicio.id)
              return (
                <div
                  key={servicio.id}
                  onClick={() => toggleServicio(servicio.id)}
                  className="relative p-4 rounded-lg cursor-pointer transition-all border-2"
                  style={{
                    backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.1)' : 'var(--bg-primary)',
                    borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                    boxShadow: isSelected ? '0 0 10px rgba(212, 175, 55, 0.3)' : 'none'
                  }}
                >
                  {/* Checkbox visual */}
                  <div 
                    className="absolute top-2 right-2"
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
                      border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {isSelected && (
                      <i className="fas fa-check" style={{ color: '#1a1a1a', fontSize: '0.75rem' }}></i>
                    )}
                  </div>

                  <div className="flex gap-3 pr-8">
                    {/* Imagen del servicio */}
                    {servicio.imagen_url && (
                      <div style={{
                        flexShrink: 0,
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '2px solid var(--border-color)'
                      }}>
                        <img 
                          src={servicio.imagen_url}
                          alt={servicio.nombre}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            // Fallback si la imagen no carga
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}

                    {/* Contenido */}
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                        {servicio.nombre}
                      </h4>
                      {servicio.categoria && (
                        <p className="text-xs mb-2" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                          {servicio.categoria}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-bold" style={{ color: 'var(--accent-color)' }}>
                          ${servicio.precio.toLocaleString()}
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                          {servicio.duracion_minutos} min
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            <button
              onClick={agregarAlCarrito}
              disabled={serviciosSeleccionados.length === 0}
              className="flex-1 btn btn-primary"
              style={{
                opacity: serviciosSeleccionados.length === 0 ? 0.5 : 1,
                cursor: serviciosSeleccionados.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <i className="fas fa-plus mr-2"></i>
              Agregar al Carrito {serviciosSeleccionados.length > 0 && `(${serviciosSeleccionados.length})`}
            </button>
            {serviciosSeleccionados.length > 0 && (
              <button
                onClick={limpiarSeleccion}
                className="btn btn-secondary"
              >
                <i className="fas fa-times mr-2"></i>
                Limpiar
              </button>
            )}
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
                <div key={index} className="flex flex-col sm:flex-row items-center justify-between p-3 rounded gap-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.nombre}</div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                       Cantidad: {item.cantidad}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex flex-col items-end">
                      <label className="text-xs mb-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                        Precio Editable:
                      </label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={item.precio || ''}
                          onChange={(e) => actualizarPrecioItem(index, e.target.value)}
                          className="w-32 px-2 pl-6 py-1 rounded border focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-bold text-right"
                          style={{ 
                            backgroundColor: 'var(--bg-primary)', 
                            color: 'var(--text-primary)',
                            borderColor: 'var(--border-color)' 
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-2">
                        <span className="font-bold hidden sm:block" style={{ color: 'var(--text-primary)' }}>
                        = {formatCurrency(item.subtotal)}
                        </span>
                        <button
                        onClick={() => removerDelCarrito(index)}
                        className="hover:opacity-70 transition-opacity p-2 rounded-full hover:bg-red-50"
                        style={{ color: '#ef4444' }}
                        title="Eliminar servicio"
                        >
                        <i className="fas fa-trash"></i>
                        </button>
                    </div>
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
