import { useState, useEffect } from 'react'
import { supabase, UsuarioConPermisos, Database } from '@/lib/supabase'
import { generarEImprimirFactura, obtenerDatosFactura } from './FacturaTermica'
import { chamosSupabase } from '@/lib/supabase-helpers'
import { Clock, User, Scissors } from 'lucide-react'

type Barbero = Database['public']['Tables']['barberos']['Row']
type Servicio = Database['public']['Tables']['servicios']['Row']

interface CobrarFormProps {
  usuario: UsuarioConPermisos
  onVentaCreada: () => void
  sesionCaja?: any // Añadido para control de caja
  registrarVentaCaja?: (monto: number, referenciaId: string, metodoPago: string) => Promise<void>
}

type ProductoPOS = {
  id: string
  nombre: string
  precio_venta: number
  stock_actual: number
  categoria: string
  imagen_url: string | null
}

interface ItemCarrito {
  servicio_id?: string
  producto_id?: string
  tipo: 'servicio' | 'producto'
  nombre: string
  precio: number
  cantidad: number
  subtotal: number
}

export default function CobrarForm({ usuario, onVentaCreada, sesionCaja, registrarVentaCaja }: CobrarFormProps) {
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [productos, setProductos] = useState<ProductoPOS[]>([])
  const [citasHoy, setCitasHoy] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [subPaso2, setSubPaso2] = useState<'servicios' | 'productos'>('servicios')
  const [guardando, setGuardando] = useState(false)

  // Wizard state
  const [paso, setPaso] = useState(1)
  const [mostrarDetalleCarrito, setMostrarDetalleCarrito] = useState(false)

  // Form state
  const [clienteNombre, setClienteNombre] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState<'boleta' | 'factura'>('boleta')
  const [rut, setRut] = useState('')
  const [barberoId, setBarberoId] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [citaId, setCitaId] = useState<string | null>(null)
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

      // Cargar productos activos con stock
      try {
        const resProd = await fetch('/api/inventario/productos?activo=true')
        if (resProd.ok) {
          const prodData = await resProd.json()
          setProductos(prodData.filter((p: any) => p.stock_actual > 0))
        }
      } catch (e) {
        console.warn('No se pudieron cargar productos:', e)
      }

      // Cargar citas de hoy pendientes
      const citasData = await chamosSupabase.getCitasHoyPendientes()
      setCitasHoy(citasData || [])
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
      // Usar valores por defecto si falla el RPC
      const comisionBarbero = total * 0.5
      const ingresoCasa = total * 0.5
      setComisionInfo({
        porcentaje: 50,
        comisionBarbero,
        ingresoCasa
      })
    }
  }

  const agregarAlCarrito = (servicioId: string) => {
    const servicio = servicios.find(s => s.id === servicioId)
    if (!servicio) return

    setCarrito(prev => {
      const existeIndex = prev.findIndex(item => item.servicio_id === servicioId && item.tipo === 'servicio')
      if (existeIndex >= 0) {
        const nuevoCarrito = [...prev]
        nuevoCarrito[existeIndex].cantidad += 1
        nuevoCarrito[existeIndex].subtotal = nuevoCarrito[existeIndex].precio * nuevoCarrito[existeIndex].cantidad
        return nuevoCarrito
      }
      return [...prev, {
        servicio_id: servicio.id,
        tipo: 'servicio' as const,
        nombre: servicio.nombre,
        precio: parseFloat(servicio.precio.toString()),
        cantidad: 1,
        subtotal: parseFloat(servicio.precio.toString())
      }]
    })
  }

  const agregarProductoAlCarrito = (productoId: string) => {
    const producto = productos.find(p => p.id === productoId)
    if (!producto) return

    setCarrito(prev => {
      const existeIndex = prev.findIndex(item => item.producto_id === productoId && item.tipo === 'producto')
      if (existeIndex >= 0) {
        const nuevoCarrito = [...prev]
        // No permitir más que el stock disponible
        if (nuevoCarrito[existeIndex].cantidad >= producto.stock_actual) return prev
        nuevoCarrito[existeIndex].cantidad += 1
        nuevoCarrito[existeIndex].subtotal = nuevoCarrito[existeIndex].precio * nuevoCarrito[existeIndex].cantidad
        return nuevoCarrito
      }
      return [...prev, {
        producto_id: producto.id,
        tipo: 'producto' as const,
        nombre: producto.nombre,
        precio: producto.precio_venta,
        cantidad: 1,
        subtotal: producto.precio_venta
      }]
    })
  }

  const actualizarCantidad = (index: number, delta: number) => {
    setCarrito(prev => {
      const nuevoCarrito = [...prev]
      const nuevaCantidad = Math.max(1, nuevoCarrito[index].cantidad + delta)
      nuevoCarrito[index].cantidad = nuevaCantidad
      nuevoCarrito[index].subtotal = nuevoCarrito[index].precio * nuevaCantidad
      return nuevoCarrito
    })
  }

  const removerDelCarrito = (index: number) => {
    setCarrito(carrito.filter((_, i) => i !== index))
  }

  const handleSeleccionarCita = (cita: any) => {
    setBarberoId(cita.barbero_id)
    setClienteNombre(cita.cliente_nombre || '')
    setCitaId(cita.id)

    // Si la cita tiene items (múltiples servicios), usarlos
    if (cita.items && cita.items.length > 0) {
      setCarrito(cita.items.map((item: any) => ({
        ...item,
        tipo: item.tipo || 'servicio' as const,
        precio: parseFloat(item.precio.toString()),
        subtotal: parseFloat(item.subtotal.toString())
      })))
    } else if (cita.servicio_id) {
      // Fallback: si solo tiene el servicio_id original
      const servicio = servicios.find(s => s.id === cita.servicio_id)
      if (servicio) {
        setCarrito([{
          servicio_id: servicio.id,
          tipo: 'servicio' as const,
          nombre: servicio.nombre,
          precio: parseFloat(servicio.precio.toString()),
          cantidad: 1,
          subtotal: parseFloat(servicio.precio.toString())
        }])
      }
    }

    // Avanzar a servicios pero con la cita linkeada
    setPaso(2)
  }


  const handleCobrar = async () => {
    // Validaciones
    if (!barberoId) {
      alert('Selecciona un barbero')
      return
    }

    if (carrito.length === 0) {
      alert('Agrega al menos un servicio o producto')
      return
    }

    if (tipoDocumento === 'factura' && !rut.trim()) {
      alert('Para emitir factura, ingresa el RUT del cliente')
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
          cliente_nombre: clienteNombre.trim() || 'Consumidor Final',
          cliente_rut: tipoDocumento === 'factura' ? rut.trim() : null,
          tipo_documento: tipoDocumento,
          items: carrito,
          subtotal: total,
          total: total,
          metodo_pago: metodoPago,
          monto_recibido: montoRecibido ? parseFloat(montoRecibido) : total,
          cambio: montoRecibido ? Math.max(0, parseFloat(montoRecibido) - total) : 0,
          porcentaje_comision: comisionInfo.porcentaje,
          comision_barbero: comisionInfo.comisionBarbero,
          ingreso_casa: comisionInfo.ingresoCasa,
          cita_id: citaId,
          created_by: usuario.id
        })
        .select()
        .single()

      if (facturaError) throw facturaError

      // REGISTRAR VENTA EN LA SESIÓN DE CAJA
      if (sesionCaja && registrarVentaCaja) {
        await registrarVentaCaja(total, factura.id, metodoPago)
      }

      // Éxito
      const tipoDoc = tipoDocumento === 'boleta' ? 'Boleta' : 'Factura'

      let impresionExitosa = false
      try {
        const datosFactura = await obtenerDatosFactura(factura.id, supabase)
        if (datosFactura) {
          impresionExitosa = await generarEImprimirFactura(datosFactura, 'imprimir')
        }
      } catch (err) {
        console.warn('Error en impresión automática:', err)
      }

      if (impresionExitosa) {
        alert(`¡Venta registrada y ticket impreso!\n\n${tipoDoc}: ${factura.numero_factura}\nTotal: $${total.toFixed(2)}`)
      } else {
        const confirmar = window.confirm(`¡Venta registrada exitosamente!\n\n${tipoDoc}: ${factura.numero_factura}\nTotal: $${total.toFixed(2)}\n\n¿Deseas imprimir la factura?`)
        if (confirmar) {
          const datosFactura = await obtenerDatosFactura(factura.id, supabase)
          if (datosFactura) {
            await generarEImprimirFactura(datosFactura, 'imprimir')
          }
        }
      }

      // Descontar stock de productos vendidos
      const productosEnCarrito = carrito.filter(item => item.tipo === 'producto' && item.producto_id)
      for (const item of productosEnCarrito) {
        try {
          await fetch('/api/inventario/movimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              producto_id: item.producto_id,
              tipo: 'salida',
              cantidad: item.cantidad,
              motivo: `Venta POS - Factura ${factura.numero_factura}`,
            }),
          })
        } catch (e) {
          console.warn('Error descontando stock:', e)
        }
      }

      // Limpiar y resetear
      setClienteNombre('')
      setTipoDocumento('boleta')
      setRut('')
      setBarberoId('')
      setCarrito([])
      setMetodoPago('efectivo')
      setMontoRecibido('')
      setCitaId(null)
      setPaso(1)
      setSubPaso2('servicios')
      onVentaCreada()

      // Recargar citas hoy (por si hay más)
      const nuevasCitas = await chamosSupabase.getCitasHoyPendientes()
      setCitasHoy(nuevasCitas || [])

      // Recargar productos (stock actualizado)
      try {
        const resProd = await fetch('/api/inventario/productos?activo=true')
        if (resProd.ok) {
          const prodData = await resProd.json()
          setProductos(prodData.filter((p: any) => p.stock_actual > 0))
        }
      } catch (e) { }

    } catch (error) {
      console.error('Error al crear venta:', error)
      alert('Error al registrar la venta.')
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

  if (cargando) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
      {/* Stepper Header */}
      <div className="flex items-center justify-between mb-8 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${paso >= 1 ? 'scale-110 shadow-lg' : ''}`}
            style={{ backgroundColor: paso >= 1 ? 'var(--accent-color)' : '#374151', color: paso >= 1 ? '#1a1a1a' : '#9ca3af' }}>1</div>
          <span className={`font-medium ${paso === 1 ? 'text-accent' : 'text-gray-400'}`} style={{ color: paso === 1 ? 'var(--accent-color)' : '#9ca3af' }}>General</span>
        </div>
        <div className="h-px flex-1 mx-4 bg-gray-700"></div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${paso >= 2 ? 'scale-110 shadow-lg' : ''}`}
            style={{ backgroundColor: paso >= 2 ? 'var(--accent-color)' : '#374151', color: paso >= 2 ? '#1a1a1a' : '#9ca3af' }}>2</div>
          <span className={`font-medium ${paso === 2 ? 'text-accent' : 'text-gray-400'}`} style={{ color: paso === 2 ? 'var(--accent-color)' : '#9ca3af' }}>Servicios</span>
        </div>
        <div className="h-px flex-1 mx-4 bg-gray-700"></div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${paso >= 3 ? 'scale-110 shadow-lg' : ''}`}
            style={{ backgroundColor: paso >= 3 ? 'var(--accent-color)' : '#374151', color: paso >= 3 ? '#1a1a1a' : '#9ca3af' }}>3</div>
          <span className={`font-medium ${paso === 3 ? 'text-accent' : 'text-gray-400'}`} style={{ color: paso === 3 ? 'var(--accent-color)' : '#9ca3af' }}>Pago</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* PASO 1: DATOS GENERALES */}
        {paso === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-semibold mb-6 flex items-center" style={{ color: 'var(--text-primary)' }}>
              <i className="fas fa-info-circle mr-3 text-accent" style={{ color: 'var(--accent-color)' }}></i>
              Información de la Venta
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium form-label">Barbero *</label>
                <select
                  value={barberoId}
                  onChange={(e) => {
                    setBarberoId(e.target.value)
                    if (e.target.value) {
                      // Auto-advance with a slight delay for better UX
                      setTimeout(() => setPaso(2), 400)
                    }
                  }}
                  className="form-select h-14 text-lg"
                >
                  <option value="">Seleccionar barbero...</option>
                  {barberos.map((barbero) => (
                    <option key={barbero.id} value={barbero.id}>
                      {barbero.nombre} {barbero.apellido}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium form-label">Nombre del Cliente</label>
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="form-input h-14 text-lg"
                />
              </div>
            </div>

            {/* SECCIÓN DE CITAS PENDIENTES */}
            {citasHoy.length > 0 && (
              <div className="mb-8">
                <h4 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-accent" style={{ color: 'var(--accent-color)' }} />
                  Citas de Hoy (Pendientes de Cobro)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {citasHoy.map((cita) => (
                    <div
                      key={cita.id}
                      onClick={() => handleSeleccionarCita(cita)}
                      className="p-4 rounded-2xl cursor-pointer transition-all border-2 border-gray-700 hover:border-accent bg-gray-800/50 group"
                      style={{ borderStyle: 'dashed' }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)' }}>
                            <User className="w-5 h-5 text-accent" style={{ color: 'var(--accent-color)' }} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-200">{cita.cliente_nombre || 'Cliente'}</p>
                            <p className="text-xs text-gray-500 uppercase font-black">{cita.hora.substring(0, 5)} - {cita.barberos?.nombre}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-accent" style={{ color: 'var(--accent-color)' }}>
                            {cita.servicios?.nombre || 'Servicio'}
                          </p>
                          <p className="text-xs text-gray-500">${parseFloat(cita.servicios?.precio || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <label className="block text-sm font-medium form-label">Tipo de Documento</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTipoDocumento('boleta')}
                  className="p-5 rounded-2xl font-bold transition-all border-2 text-xl flex items-center justify-center gap-3"
                  style={{
                    backgroundColor: tipoDocumento === 'boleta' ? 'var(--accent-color)' : 'var(--bg-primary)',
                    borderColor: tipoDocumento === 'boleta' ? 'var(--accent-color)' : 'var(--border-color)',
                    color: tipoDocumento === 'boleta' ? '#1a1a1a' : 'var(--text-primary)'
                  }}
                >
                  <i className="fas fa-receipt"></i> Boleta
                </button>
                <button
                  type="button"
                  onClick={() => setTipoDocumento('factura')}
                  className="p-5 rounded-2xl font-bold transition-all border-2 text-xl flex items-center justify-center gap-3"
                  style={{
                    backgroundColor: tipoDocumento === 'factura' ? 'var(--accent-color)' : 'var(--bg-primary)',
                    borderColor: tipoDocumento === 'factura' ? 'var(--accent-color)' : 'var(--border-color)',
                    color: tipoDocumento === 'factura' ? '#1a1a1a' : 'var(--text-primary)'
                  }}
                >
                  <i className="fas fa-file-invoice-dollar"></i> Factura
                </button>
              </div>
            </div>

            {tipoDocumento === 'factura' && (
              <div className="animate-in slide-in-from-top-2 mb-6">
                <label className="block text-sm font-medium mb-2 form-label">RUT del Cliente *</label>
                <input
                  type="text"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  placeholder="Ej: 12.345.678-9"
                  className="form-input h-14 text-lg"
                />
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={() => setPaso(2)}
                disabled={!barberoId}
                className="w-full btn btn-primary py-5 text-xl font-black rounded-2xl shadow-lg transition-transform active:scale-95"
                style={{ opacity: !barberoId ? 0.5 : 1 }}
              >
                CONTINUAR A SERVICIOS <i className="fas fa-arrow-right ml-2"></i>
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: SERVICIOS Y PRODUCTOS */}
        {paso === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                <i className="fas fa-cut mr-3 text-accent" style={{ color: 'var(--accent-color)' }}></i>
                Agregar Items
              </h3>
              <button
                onClick={() => setPaso(1)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors border border-gray-700"
              >
                <i className="fas fa-arrow-left mr-2"></i>Atrás
              </button>
            </div>

            {/* Toggle Servicios / Productos */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setSubPaso2('servicios')}
                className="flex-1 py-3 rounded-xl font-bold text-base transition-all"
                style={{
                  backgroundColor: subPaso2 === 'servicios' ? 'var(--accent-color)' : 'var(--bg-primary)',
                  color: subPaso2 === 'servicios' ? '#1a1a1a' : 'var(--text-secondary)',
                  border: `2px solid ${subPaso2 === 'servicios' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                }}
              >
                <i className="fas fa-scissors mr-2"></i>
                Servicios ({servicios.length})
              </button>
              <button
                onClick={() => setSubPaso2('productos')}
                className="flex-1 py-3 rounded-xl font-bold text-base transition-all"
                style={{
                  backgroundColor: subPaso2 === 'productos' ? 'var(--accent-color)' : 'var(--bg-primary)',
                  color: subPaso2 === 'productos' ? '#1a1a1a' : 'var(--text-secondary)',
                  border: `2px solid ${subPaso2 === 'productos' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                }}
              >
                <i className="fas fa-box mr-2"></i>
                Productos ({productos.length})
              </button>
            </div>

            {/* Grid de Servicios */}
            {subPaso2 === 'servicios' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8" style={{ maxHeight: '480px', overflowY: 'auto', paddingRight: '10px' }}>
                {servicios.map((servicio) => (
                  <div
                    key={servicio.id}
                    onClick={() => agregarAlCarrito(servicio.id)}
                    className="p-4 rounded-2xl cursor-pointer transition-all border-2 hover:border-accent group relative overflow-hidden"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                    <div className="flex gap-4">
                      {servicio.imagen_url && (
                        <img
                          src={servicio.imagen_url}
                          className="w-20 h-20 rounded-xl object-cover border-2 border-gray-800 group-hover:border-accent transition-colors"
                          alt={servicio.nombre}
                        />
                      )}
                      <div className="flex-1 flex flex-col justify-between">
                        <h4 className="font-bold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>{servicio.nombre}</h4>
                        <div className="flex justify-between items-center mt-2">
                          <span className="font-black text-xl text-accent" style={{ color: 'var(--accent-color)' }}>
                            ${servicio.precio.toLocaleString()}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider bg-gray-900 border border-gray-800 px-2 py-1 rounded text-gray-500">
                            {servicio.duracion_minutos} MIN
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-accent text-dark rounded-full w-8 h-8 flex items-center justify-center" style={{ backgroundColor: 'var(--accent-color)', color: '#1a1a1a' }}>
                        <i className="fas fa-plus"></i>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Grid de Productos */}
            {subPaso2 === 'productos' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8" style={{ maxHeight: '480px', overflowY: 'auto', paddingRight: '10px' }}>
                {productos.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <i className="fas fa-box-open text-3xl mb-3" style={{ color: '#555' }}></i>
                    <p style={{ color: '#666' }}>No hay productos disponibles</p>
                  </div>
                ) : (
                  productos.map((producto) => (
                    <div
                      key={producto.id}
                      onClick={() => agregarProductoAlCarrito(producto.id)}
                      className="p-4 rounded-2xl cursor-pointer transition-all border-2 hover:border-accent group relative overflow-hidden"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)'
                      }}
                    >
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-xl border-2 border-gray-800 group-hover:border-accent transition-colors flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
                          {producto.imagen_url ? (
                            <img src={producto.imagen_url} className="w-full h-full object-cover" alt={producto.nombre} />
                          ) : (
                            <i className="fas fa-box text-2xl" style={{ color: '#444' }}></i>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <h4 className="font-bold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>{producto.nombre}</h4>
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-black text-xl text-accent" style={{ color: 'var(--accent-color)' }}>
                              ${producto.precio_venta.toLocaleString()}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider bg-gray-900 border border-gray-800 px-2 py-1 rounded" style={{ color: producto.stock_actual <= 3 ? '#EF4444' : '#666' }}>
                              Stock: {producto.stock_actual}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-accent text-dark rounded-full w-8 h-8 flex items-center justify-center" style={{ backgroundColor: 'var(--accent-color)', color: '#1a1a1a' }}>
                          <i className="fas fa-plus"></i>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {carrito.length > 0 && (
              <div className="animate-in slide-in-from-bottom-6 mt-6 relative">
                {/* Cart Detail Overlay */}
                {mostrarDetalleCarrito && (
                  <div className="absolute bottom-full left-0 right-0 mb-4 bg-gray-900 rounded-3xl p-6 shadow-2xl border-2 border-accent/20 animate-in slide-in-from-bottom-4" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'rgba(212, 175, 55, 0.3)' }}>
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-800">
                      <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Detalle del Carrito</h4>
                      <button onClick={() => setMostrarDetalleCarrito(false)} className="text-gray-500 hover:text-white">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
                      {carrito.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-dark/30 p-3 rounded-xl border border-gray-800/50">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm leading-tight">{item.nombre}</span>
                            <span className="text-[10px] text-gray-500 mt-1">{formatCurrency(item.precio)} c/u</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center bg-gray-800 rounded-lg p-1">
                              <button onClick={(e) => { e.stopPropagation(); actualizarCantidad(idx, -1) }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/20 text-gray-400 hover:text-red-500">
                                <i className="fas fa-minus text-[10px]"></i>
                              </button>
                              <span className="font-black text-xs w-6 text-center">{item.cantidad}</span>
                              <button onClick={(e) => { e.stopPropagation(); actualizarCantidad(idx, 1) }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-accent/20 text-gray-400 hover:text-accent">
                                <i className="fas fa-plus text-[10px]"></i>
                              </button>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removerDelCarrito(idx) }} className="text-gray-600 hover:text-red-500 transition-colors">
                              <i className="fas fa-trash-alt text-xs"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gray-900 rounded-3xl p-6 shadow-2xl border-2 border-accent/20" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'rgba(212, 175, 55, 0.2)' }}>
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div
                      className="flex items-center gap-4 cursor-pointer group"
                      onClick={() => setMostrarDetalleCarrito(!mostrarDetalleCarrito)}
                    >
                      <span className="text-gray-400 font-bold uppercase tracking-widest text-sm group-hover:text-accent transition-colors">Resumen:</span>
                      <div className="flex items-center bg-dark/50 px-4 py-2 rounded-full border border-gray-800 group-hover:border-accent transition-colors">
                        <span className="text-accent font-black mr-2" style={{ color: 'var(--accent-color)' }}>{carrito.reduce((a, b) => a + b.cantidad, 0)}</span>
                        <span className="text-xs text-gray-400 font-bold">Items</span>
                        <i className={`fas fa-chevron-${mostrarDetalleCarrito ? 'down' : 'up'} ml-2 text-[10px] text-gray-600 group-hover:text-accent`}></i>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">Total Actual</p>
                        <p className="text-3xl font-black text-accent leading-none" style={{ color: 'var(--accent-color)' }}>{formatCurrency(total)}</p>
                      </div>
                      <button
                        onClick={() => setPaso(3)}
                        className="btn btn-primary px-10 py-5 text-xl font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
                      >
                        PAGAR AHORA <i className="fas fa-credit-card ml-2"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASO 3: PAGO */}
        {paso === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                <i className="fas fa-wallet mr-3 text-accent" style={{ color: 'var(--accent-color)' }}></i>
                Finalizar Venta
              </h3>
              <button
                onClick={() => setPaso(2)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
              >
                <i className="fas fa-edit mr-2"></i>Editar Servicios
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Resumen Detallado */}
              <div className="bg-gray-900 rounded-3xl p-8 border-2" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                <h4 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-6">Resumen de Cuenta</h4>

                <div className="space-y-6 mb-8 max-h-[300px] overflow-y-auto pr-4">
                  {carrito.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start group">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-1 mt-1">
                          <button onClick={() => actualizarCantidad(idx, 1)} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-accent hover:text-dark transition-colors flex items-center justify-center shadow-sm">
                            <i className="fas fa-plus text-[10px]"></i>
                          </button>
                          <span className="font-black text-lg w-8 text-center">{item.cantidad}</span>
                          <button onClick={() => actualizarCantidad(idx, -1)} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-red-500 transition-colors flex items-center justify-center shadow-sm">
                            <i className="fas fa-minus text-[10px]"></i>
                          </button>
                        </div>
                        <div>
                          <p className="font-bold text-lg leading-tight">{item.nombre}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatCurrency(item.precio)} c/u</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-black text-xl">{formatCurrency(item.subtotal)}</span>
                        <button onClick={() => removerDelCarrito(idx)} className="text-[10px] font-black text-red-500 mt-2 hover:underline opacity-0 group-hover:opacity-100 transition-opacity uppercase">BORRAR</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t-4 border-dashed border-gray-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-500 font-bold italic">Barbero:</span>
                    <span className="font-bold text-accent" style={{ color: 'var(--accent-color)' }}>
                      {barberos.find(b => b.id === barberoId)?.nombre} {barberos.find(b => b.id === barberoId)?.apellido}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-gray-500 font-bold italic">Cliente:</span>
                    <span className="font-bold">{clienteNombre || 'Consumidor Final'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-accent/5 p-6 rounded-2xl border border-accent/20">
                    <span className="text-2xl font-black">TOTAL</span>
                    <span className="text-5xl font-black text-accent" style={{ color: 'var(--accent-color)' }}>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {/* Controles de Pago */}
              <div className="space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <label className="text-sm font-black text-gray-500 uppercase tracking-widest block">Método de Pago</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['efectivo', 'tarjeta', 'transferencia', 'zelle', 'binance'].map(metodo => (
                      <button
                        key={metodo}
                        onClick={() => setMetodoPago(metodo)}
                        className={`p-4 rounded-2xl border-2 transition-all font-black capitalize flex items-center gap-3 text-lg ${metodoPago === metodo ? 'scale-[1.02] shadow-xl ring-2 ring-accent/50' : 'opacity-60 grayscale hover:grayscale-0'}`}
                        style={{
                          borderColor: metodoPago === metodo ? 'var(--accent-color)' : 'var(--border-color)',
                          color: metodoPago === metodo ? 'var(--accent-color)' : 'var(--text-primary)',
                          backgroundColor: metodoPago === metodo ? 'rgba(212, 175, 55, 0.1)' : 'var(--bg-primary)'
                        }}
                      >
                        <span className="text-2xl">
                          {metodo === 'efectivo' && '💵'}
                          {metodo === 'tarjeta' && '💳'}
                          {metodo === 'transferencia' && '📱'}
                          {metodo === 'zelle' && '💰'}
                          {metodo === 'binance' && '₿'}
                        </span>
                        {metodo}
                      </button>
                    ))}
                  </div>

                  {metodoPago === 'efectivo' && (
                    <div className="space-y-3 animate-in fade-in zoom-in-95 mt-6">
                      <label className="text-sm font-black text-gray-500 uppercase tracking-widest block">Monto Recibido ($)</label>
                      <input
                        type="number"
                        value={montoRecibido}
                        onChange={(e) => setMontoRecibido(e.target.value)}
                        className="form-input h-20 text-4xl font-black text-center rounded-3xl border-2 border-accent/30 focus:border-accent transition-colors"
                        placeholder="0.00"
                        autoFocus
                      />
                      {parseFloat(montoRecibido) > total && (
                        <div className="p-6 rounded-3xl bg-green-950/20 border-2 border-green-500/30 flex flex-col items-center">
                          <span className="text-gray-400 font-bold text-[10px] uppercase mb-1 tracking-widest">Cambio a devolver:</span>
                          <span className="text-5xl font-black text-green-400 leading-none">
                            {formatCurrency(parseFloat(montoRecibido) - total)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-8 h-full flex flex-col justify-end">
                  <button
                    onClick={handleCobrar}
                    disabled={guardando}
                    className="w-full py-8 rounded-3xl text-3xl font-black shadow-2xl transition-all active:scale-95 group relative overflow-hidden"
                    style={{
                      backgroundColor: 'var(--accent-color)',
                      color: '#1a1a1a',
                      opacity: guardando ? 0.6 : 1,
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-4">
                      {guardando ? (
                        <>
                          <div className="w-8 h-8 border-4 border-dark/30 border-t-dark rounded-full animate-spin"></div>
                          PROCESANDO...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check-circle"></i>
                          CONFIRMAR COBRO
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  </button>
                  <p className="text-center text-[10px] text-gray-500 mt-6 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                    <i className="fas fa-print text-accent" style={{ color: 'var(--accent-color)' }}></i>
                    Ticket térmico automático
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
