import { useState, useEffect } from 'react'
import { supabase, UsuarioConPermisos } from '@/lib/supabase'
import { generarEImprimirFactura, obtenerDatosFactura } from './FacturaTermica'

interface Cita {
  id: string
  cliente_nombre: string
  cliente_telefono: string
  fecha: string
  hora: string  // Campo real de la BD
  estado_pago: string
  barbero_id?: string
  barbero: {
    id?: string
    nombre: string
    apellido: string
    porcentaje_comision?: number
  }
  servicio_id?: string
  servicio: {
    id?: string
    nombre: string
    precio: number
    duracion_minutos: number
  }
}

interface ModalCobrarCitaProps {
  cita: Cita
  usuario: UsuarioConPermisos
  onClose: () => void
  onCobrado: () => void
}

export default function ModalCobrarCita({ cita, usuario, onClose, onCobrado }: ModalCobrarCitaProps) {
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [montoCobrar, setMontoCobrar] = useState(Math.floor(cita.servicio.precio).toString())
  const [montoRecibido, setMontoRecibido] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [cobroExitoso, setCobroExitoso] = useState<{
    facturaId: string
    numeroFactura: string
  } | null>(null)
  const [servicioImpresionOnline, setServicioImpresionOnline] = useState<boolean | null>(null)

  // Verificar estado del servicio local al abrir el modal
  useEffect(() => {
    const checkService = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 1500)

        const response = await fetch('http://localhost:3001/status', { signal: controller.signal })
        const data = await response.json()
        setServicioImpresionOnline(data.status === 'online')
        clearTimeout(timeoutId)
      } catch (e) {
        setServicioImpresionOnline(false)
      }
    }
    checkService()
  }, [])

  const montoTotal = parseInt(montoCobrar) || Math.floor(cita.servicio.precio)
  const cambio = 0 // Ya no calculamos cambio en UI

  // Calcular comisión en tiempo real basada en el porcentaje del barbero
  // LÓGICA CORRECTA:
  // - La comisión se calcula sobre el "Monto a Cobrar" (montoTotal)
  // - Este puede ser el precio original O el precio editado (descuento/propina)
  // - El "Monto Recibido" es solo para calcular el cambio
  const porcentajeComision = cita.barbero.porcentaje_comision || 50
  const comisionBarberoRealTime = Math.floor(montoTotal * (porcentajeComision / 100))
  const ingresoCasaRealTime = montoTotal - comisionBarberoRealTime

  // DEBUG: Log para verificar cálculos
  console.log('🔍 DEBUG Comisión:', {
    montoCobrar,
    montoTotal,
    montoRecibido,
    porcentajeComision,
    comisionBarberoRealTime,
    ingresoCasaRealTime,
    precioServicio: cita.servicio.precio
  })

  const handleCobrar = async () => {
    try {
      setProcesando(true)

      // Validar monto a cobrar
      if (!montoCobrar || parseFloat(montoCobrar) <= 0) {
        alert('El monto a cobrar debe ser mayor a $0')
        setProcesando(false)
        return
      }

      // Validación adicional para efectivo (ELIMINADA)
      /*
      if (metodoPago === 'efectivo' && montoRecibido) {
        const recibido = parseFloat(montoRecibido)
        if (recibido < montoTotal) {
          alert(`El monto recibido ($${recibido.toFixed(2)}) es menor al total a cobrar ($${montoTotal.toFixed(2)})`)
          setProcesando(false)
          return
        }
      }
      */

      console.log('🔍 DEBUG: Cobrando cita', {
        cita_id: cita.id,
        monto_total: montoTotal,
        metodo_pago: metodoPago,
        usuario_id: usuario.id
      })

      // Generar número de factura
      const numeroFactura = `FAC-${Date.now()}`

      // Calcular comisiones sobre el MONTO A COBRAR (editado o no)
      const barbero = cita.barbero
      const porcentajeComision = barbero.porcentaje_comision || 50 // Obtener de la BD o default 50%

      // LÓGICA CORRECTA:
      // - La comisión se calcula sobre montoTotal (Monto a Cobrar)
      // - Este puede ser el precio original O el editado (descuento/propina)
      // - El "Monto Recibido" es solo para el cambio
      const comisionBarbero = Math.floor(montoTotal * (porcentajeComision / 100))
      const ingresoCasa = montoTotal - comisionBarbero

      // Preparar items de la factura
      const items = [{
        servicio: cita.servicio.nombre,
        precio: montoTotal,
        cantidad: 1
      }]

      // Insertar factura directamente con el esquema correcto
      // Schema real: numero_factura, cita_id, barbero_id, cliente_nombre, cliente_telefono,
      // subtotal, descuento, total, metodo_pago, monto_recibido, cambio,
      // porcentaje_comision, comision_barbero, ingreso_casa, anulada, created_by, items
      const facturaPayload = {
        numero_factura: numeroFactura,
        cita_id: cita.id,
        barbero_id: cita.barbero_id || cita.barbero?.id || null,  // Fix: null en lugar de ''
        cliente_nombre: cita.cliente_nombre,
        cliente_telefono: cita.cliente_telefono || null,
        items: items,
        subtotal: montoTotal,  // Precio del servicio (editado o no)
        descuento: 0,
        total: montoTotal,     // Base para la comisión
        metodo_pago: metodoPago,
        monto_recibido: montoTotal, // Asumimos pago exacto
        cambio: 0,
        porcentaje_comision: porcentajeComision,
        comision_barbero: comisionBarbero,  // Calculado sobre montoTotal (Monto a Cobrar)
        ingreso_casa: ingresoCasa,           // Calculado sobre montoTotal (Monto a Cobrar)
        anulada: false,
        created_by: usuario.id
      }

      const { data: facturaData, error: facturaError } = await (supabase as any)
        .from('facturas')
        .insert(facturaPayload)
        .select()
        .single()

      if (facturaError) {
        console.error('❌ Error al crear factura:', facturaError)
        throw facturaError
      }

      console.log('✅ Factura creada:', facturaData)

      // Actualizar estado de pago de la cita
      const citaUpdate = {
        estado_pago: 'pagado',
        estado: 'completada',
        updated_at: new Date().toISOString()
      }

      const { error: citaError } = await (supabase as any)
        .from('citas')
        .update(citaUpdate)
        .eq('id', cita.id)

      if (citaError) {
        console.warn('⚠️ Error al actualizar cita:', citaError)
      }

      // Guardar resultado del cobro exitoso
      setCobroExitoso({
        facturaId: facturaData.id,
        numeroFactura: numeroFactura
      })

      setProcesando(false)

      // Imprimir automáticamente después de cobrar
      let impresionExitosa = false
      try {
        const datosFactura = await obtenerDatosFactura(facturaData.id, supabase)
        if (datosFactura) {
          // LÓGICA OPTIMIZADA:
          // Se elimina el fetch manual a /open-drawer aquí, ya que generarEImprimirFactura
          // llama a imprimirDirecto, y el servicio local abre el cajón al imprimir.
          // Esto evita el conflicto de dispositivo ocupado que causaba impresiones erróneas.

          // Intentar impresión directa (que también abre el cajón)
          impresionExitosa = await generarEImprimirFactura(datosFactura, 'imprimir')
        }
      } catch (printError) {
        console.warn('⚠️ Error al imprimir automáticamente:', printError)
      }

      if (!impresionExitosa) {
        // Fallback manual si falla la automática
        alert('📦 Venta registrada en BD, pero NO se pudo conectar con el servicio de impresora local (Puerto 3001). \n\n⚠️ El cajón no abrirá automáticamente. Se usará el método de impresión del navegador.')
      }

    } catch (error: any) {
      console.error('❌ Error al cobrar cita:', error)

      // Mostrar error más detallado
      let errorMessage = 'Error al procesar el cobro. '

      if (error.message) {
        errorMessage += error.message
      } else if (error.error_description) {
        errorMessage += error.error_description
      } else if (error.details) {
        errorMessage += error.details
      } else {
        errorMessage += 'Intenta nuevamente.'
      }

      // Errores comunes específicos
      if (error.message?.includes('permission denied')) {
        errorMessage = 'No tienes permisos para realizar esta operación. Contacta al administrador.'
      } else if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        errorMessage = 'Error de configuración: La función cobrar_cita() no existe en la base de datos. Contacta al administrador.'
      } else if (error.message?.includes('violates foreign key constraint')) {
        errorMessage = 'Error: Datos relacionados no encontrados. Verifica que el barbero y servicio existan.'
      }

      alert(errorMessage)

      // Dejar el modal abierto para que el usuario pueda intentar de nuevo
    } finally {
      setProcesando(false)
    }
  }

  const handleDescargarPDF = async () => {
    if (!cobroExitoso) return

    try {
      const datosFactura = await obtenerDatosFactura(cobroExitoso.facturaId, supabase)
      if (datosFactura) {
        await generarEImprimirFactura(datosFactura, 'descargar')
      }
    } catch (error) {
      console.error('Error descargando PDF:', error)
      alert('Error al descargar el PDF')
    }
  }

  const handleImprimirPDF = async () => {
    if (!cobroExitoso) return

    try {
      const datosFactura = await obtenerDatosFactura(cobroExitoso.facturaId, supabase)
      if (!datosFactura) {
        alert('Error: No se pudieron obtener los datos de la factura')
        return
      }

      // Intentar impresión directa primero (servicio local)
      try {
        console.log('🖨️ Intentando impresión directa...')
        const response = await fetch('http://localhost:3001/print', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ factura: datosFactura }),
          signal: AbortSignal.timeout(5000) // 5 segundos timeout
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            console.log('✅ Impresión directa exitosa')
            alert('✅ Factura impresa correctamente en impresora térmica')
            return
          }
        }

        // Si falla, continuar con método alternativo
        throw new Error('Servicio de impresión no respondió correctamente')

      } catch (printerServiceError) {
        console.warn('⚠️ Servicio de impresión no disponible, usando método del navegador')
        console.warn('Error:', printerServiceError.message)

        // Fallback: Usar ventana de impresión del navegador
        await generarEImprimirFactura(datosFactura, 'imprimir')
      }

    } catch (error) {
      console.error('Error imprimiendo PDF:', error)
      alert('Error al imprimir el PDF: ' + (error as Error).message)
    }
  }

  const handleCerrarYFinalizar = () => {
    onCobrado()
    onClose()
  }

  const formatCurrency = (amount: number) => {
    // Formatear sin decimales usando formato manual
    // El locale 'es-VE' fuerza decimales, así que usamos formato manual
    const valorEntero = Math.floor(amount)
    const valorFormateado = valorEntero.toLocaleString('es-ES')
    return `USD ${valorFormateado}`
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--accent-color)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>
            <i className="fas fa-cash-register mr-2"></i>
            Cobrar Cita
          </h2>
          <button
            onClick={onClose}
            className="hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-primary)' }}
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Estado del Servicio de Impresión */}
        {!cobroExitoso && (
          <div className="mb-4 flex items-center justify-end px-1">
            <div className="flex items-center space-x-2 text-xs">
              <span style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Servicio de Impresora:</span>
              <div className="flex items-center">
                <div
                  className={`w-2 h-2 rounded-full mr-1.5 ${servicioImpresionOnline === true ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                    servicioImpresionOnline === false ? 'bg-red-500' : 'bg-gray-400 animate-pulse'
                    }`}
                />
                <span className="font-bold uppercase tracking-wider" style={{
                  color: servicioImpresionOnline === true ? '#22c55e' :
                    servicioImpresionOnline === false ? '#ef4444' : 'var(--text-primary)',
                  fontSize: '9px'
                }}>
                  {servicioImpresionOnline === true ? 'EN LÍNEA' :
                    servicioImpresionOnline === false ? 'SIN CONEXIÓN' : 'BUSCANDO...'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Pantalla de éxito después del cobro */}
        {cobroExitoso ? (
          <>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-color)' }}>
                ¡Cobro Exitoso!
              </h3>
              <p className="text-lg" style={{ color: 'var(--text-primary)' }}>
                Factura: <span className="font-bold">{cobroExitoso.numeroFactura}</span>
              </p>
              <p className="text-xl font-bold mt-2" style={{ color: 'var(--accent-color)' }}>
                Total: {formatCurrency(montoTotal)}
              </p>
              {metodoPago === 'efectivo' && cambio > 0 && (
                <p className="text-lg mt-2" style={{ color: 'var(--text-primary)' }}>
                  Cambio: {formatCurrency(cambio)}
                </p>
              )}
            </div>

            {/* Botones de acción */}
            <div className="space-y-3">
              <button
                onClick={handleImprimirPDF}
                className="w-full px-4 py-3 font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--accent-color)',
                  color: 'var(--bg-primary)'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#B8941F')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-color)')}
              >
                <i className="fas fa-print"></i>
                Imprimir Factura
              </button>

              <button
                onClick={handleDescargarPDF}
                className="w-full px-4 py-3 font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--accent-color)'
                }}
              >
                <i className="fas fa-download"></i>
                Descargar PDF
              </button>

              <button
                onClick={handleCerrarYFinalizar}
                className="w-full px-4 py-3 font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <i className="fas fa-check"></i>
                Cerrar
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Información de la cita */}
            <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Cliente:</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{cita.cliente_nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Teléfono:</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{cita.cliente_telefono}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Barbero:</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{cita.barbero.nombre} {cita.barbero.apellido}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Fecha/Hora:</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {new Date(cita.fecha).toLocaleDateString('es-ES')} - {cita.hora}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Servicio:</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{cita.servicio.nombre}</span>
                </div>
                <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Precio Original:</span>
                  <span className="font-bold text-lg" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                    {formatCurrency(cita.servicio.precio)}
                  </span>
                </div>
              </div>
            </div>

            {/* Monto a Cobrar - EDITABLE */}
            <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '2px solid var(--accent-color)' }}>
              <label className="block text-sm font-medium mb-2 form-label">
                <i className="fas fa-edit mr-2"></i>
                💰 MONTO A COBRAR (Editable - Importante para descuentos/propinas)
              </label>
              <p className="text-xs mb-2" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                ⚠️ Edita este monto si hay descuento o propina. La comisión se calcula sobre este valor.
              </p>
              <input
                type="number"
                step="1"
                min="0"
                value={montoCobrar}
                onChange={(e) => {
                  const value = e.target.value
                  // Solo permitir enteros, eliminar decimales
                  if (value.includes('.') || value.includes(',')) {
                    setMontoCobrar(Math.floor(parseFloat(value) || 0).toString())
                  } else {
                    setMontoCobrar(value)
                  }
                }}
                onBlur={(e) => {
                  // Forzar entero al perder el foco
                  const value = e.target.value
                  if (value) {
                    setMontoCobrar(Math.floor(parseFloat(value) || 0).toString())
                  }
                }}
                className="form-input text-xl font-bold"
                style={{ color: 'var(--accent-color)' }}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMontoCobrar((parseInt(montoCobrar) - 1).toString())}
                  disabled={parseInt(montoCobrar) <= 1}
                  className="px-3 py-1 text-sm rounded transition-all"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    opacity: parseInt(montoCobrar) <= 1 ? 0.5 : 1,
                    cursor: parseInt(montoCobrar) <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  -$1
                </button>
                <button
                  type="button"
                  onClick={() => setMontoCobrar(Math.floor(cita.servicio.precio).toString())}
                  className="px-3 py-1 text-sm rounded transition-all"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--accent-color)',
                    color: 'var(--accent-color)'
                  }}
                >
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={() => setMontoCobrar((parseInt(montoCobrar) + 1).toString())}
                  className="px-3 py-1 text-sm rounded transition-all"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                >
                  +$1
                </button>
              </div>
              {parseInt(montoCobrar) !== Math.floor(cita.servicio.precio) && (
                <p className="mt-2 text-sm" style={{ color: 'var(--accent-color)' }}>
                  {parseInt(montoCobrar) < Math.floor(cita.servicio.precio) ? (
                    <span><i className="fas fa-arrow-down mr-1"></i>Descuento: ${Math.floor(cita.servicio.precio) - parseInt(montoCobrar)}</span>
                  ) : (
                    <span><i className="fas fa-arrow-up mr-1"></i>Incremento: ${parseInt(montoCobrar) - Math.floor(cita.servicio.precio)}</span>
                  )}
                </p>
              )}

              {/* Mostrar comisión calculada en tiempo real */}
              <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--accent-color)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--accent-color)' }}>
                    <i className="fas fa-hand-holding-usd mr-2"></i>
                    Comisión ({porcentajeComision}%):
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-primary)', opacity: 0.7 }}>• Barbero:</span>
                    <span className="font-bold" style={{ color: 'var(--accent-color)' }}>
                      {formatCurrency(comisionBarberoRealTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-primary)', opacity: 0.7 }}>• Casa:</span>
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(ingresoCasaRealTime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Método de Pago */}
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

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={procesando}
                className="flex-1 px-4 py-3 font-medium rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  cursor: procesando ? 'not-allowed' : 'pointer',
                  opacity: procesando ? 0.5 : 1
                }}
              >
                <i className="fas fa-times mr-2"></i>
                Cancelar
              </button>

              <button
                onClick={async () => {
                  try {
                    const controller = new AbortController()
                    const timeoutId = setTimeout(() => controller.abort(), 2000)

                    const response = await fetch('http://localhost:3001/open-drawer', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      signal: controller.signal
                    })
                    clearTimeout(timeoutId)

                    if (response.ok) {
                      alert('✅ Cajón abierto')
                    } else {
                      throw new Error('Error al abrir cajón')
                    }
                  } catch (e) {
                    alert('⚠️ No se pudo conectar con la impresora local para abrir el cajón.')
                  }
                }}
                type="button"
                disabled={procesando}
                className="px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--accent-color)',
                  color: 'var(--accent-color)',
                  cursor: procesando ? 'not-allowed' : 'pointer'
                }}
                title="Abrir solo caja"
              >
                <i className="fas fa-inbox"></i>
              </button>

              <button
                onClick={handleCobrar}
                disabled={procesando}
                className="flex-[2] px-4 py-3 font-bold rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--accent-color)',
                  color: 'var(--bg-primary)',
                  cursor: procesando ? 'not-allowed' : 'pointer',
                  opacity: procesando ? 0.6 : 1
                }}
                onMouseEnter={(e) => !procesando && (e.currentTarget.style.backgroundColor = '#B8941F')}
                onMouseLeave={(e) => !procesando && (e.currentTarget.style.backgroundColor = 'var(--accent-color)')}
              >
                {procesando ? (
                  <span className="flex items-center justify-center">
                    <div className="spinner mr-2"></div>
                    Procesando...
                  </span>
                ) : (
                  <>
                    <i className="fas fa-check mr-2"></i>
                    Cobrar e Imprimir
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
