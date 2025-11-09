import { useState } from 'react'
import { supabase, UsuarioConPermisos } from '@/lib/supabase'
import { generarEImprimirFactura, obtenerDatosFactura } from './FacturaTermica'

interface Cita {
  id: string
  cliente_nombre: string
  cliente_telefono: string
  fecha: string
  hora: string  // Campo real de la BD
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

interface ModalCobrarCitaProps {
  cita: Cita
  usuario: UsuarioConPermisos
  onClose: () => void
  onCobrado: () => void
}

export default function ModalCobrarCita({ cita, usuario, onClose, onCobrado }: ModalCobrarCitaProps) {
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [cobroExitoso, setCobroExitoso] = useState<{
    facturaId: string
    numeroFactura: string
  } | null>(null)

  const total = cita.servicio.precio
  const cambio = montoRecibido ? Math.max(0, parseFloat(montoRecibido) - total) : 0

  const handleCobrar = async () => {
    try {
      setProcesando(true)

      // Validación adicional
      if (metodoPago === 'efectivo' && montoRecibido) {
        const recibido = parseFloat(montoRecibido)
        if (recibido < total) {
          alert(`El monto recibido ($${recibido.toFixed(2)}) es menor al total ($${total.toFixed(2)})`)
          return
        }
      }

      console.log('🔍 DEBUG: Cobrando cita', {
        cita_id: cita.id,
        metodo_pago: metodoPago,
        monto_recibido: metodoPago === 'efectivo' && montoRecibido ? parseFloat(montoRecibido) : total,
        usuario_id: usuario.id,
        total: total
      })

      // Llamar a la función RPC para cobrar la cita
      const { data, error } = await (supabase as any)
        .rpc('cobrar_cita', {
          p_cita_id: cita.id,
          p_metodo_pago: metodoPago,
          p_monto_recibido: metodoPago === 'efectivo' && montoRecibido ? parseFloat(montoRecibido) : total,
          p_usuario_id: usuario.id
        })

      console.log('📊 Respuesta RPC:', { data, error })

      if (error) {
        console.error('❌ Error en RPC:', error)
        throw error
      }

      if (!data || data.length === 0) {
        throw new Error('No se recibió respuesta de la función cobrar_cita()')
      }

      const resultado = data[0]
      
      console.log('✅ Resultado:', resultado)
      
      if (!resultado.success) {
        alert(resultado.mensaje || 'Error desconocido al procesar el cobro')
        return
      }

      // Guardar resultado del cobro exitoso
      setCobroExitoso({
        facturaId: resultado.factura_id,
        numeroFactura: resultado.numero_factura
      })
      
      setProcesando(false)

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
      if (datosFactura) {
        await generarEImprimirFactura(datosFactura, 'imprimir')
      }
    } catch (error) {
      console.error('Error imprimiendo PDF:', error)
      alert('Error al imprimir el PDF')
    }
  }

  const handleCerrarYFinalizar = () => {
    onCobrado()
    onClose()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="rounded-lg shadow-xl max-w-md w-full p-6"
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
                Total: {formatCurrency(total)}
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
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Total:</span>
              <span className="font-bold text-xl" style={{ color: 'var(--accent-color)' }}>
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Método de Pago */}
        <div className="mb-4">
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
          <div className="mb-4">
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
            onClick={handleCobrar}
            disabled={procesando}
            className="flex-1 px-4 py-3 font-bold rounded-lg transition-all"
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
