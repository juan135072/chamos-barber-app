import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Barbero {
    id: string
    nombre: string
    apellido: string
}

interface Servicio {
    id: string
    nombre: string
    precio: number
}

interface Venta {
    id: string
    numero_factura?: string
    cliente_nombre: string
    total?: number
    precio?: number
    barbero_id?: string
    servicio_id?: string
    barbero?: {
        id?: string
        nombre: string
        apellido: string
    }
    servicio?: {
        id: string
        nombre: string
    }
    items?: any[]
}

interface ModalEditarBarberoVentaProps {
    venta: Venta
    barberos: Barbero[]
    servicios: Servicio[]
    onClose: () => void
    onSuccess: () => void
    esCita?: boolean
}

export default function ModalEditarBarberoVenta({
    venta,
    barberos,
    servicios,
    onClose,
    onSuccess,
    esCita = false
}: ModalEditarBarberoVentaProps) {
    const [nuevoBarberoId, setNuevoBarberoId] = useState(venta.barbero_id || venta.barbero?.id || '')
    const [nuevoServicioId, setNuevoServicioId] = useState('')
    const [procesando, setProcesando] = useState(false)

    // Inicializar servicio actual
    useEffect(() => {
        if (esCita) {
            setNuevoServicioId(venta.servicio_id || venta.servicio?.id || '')
        } else {
            // Para facturas, intentamos encontrar el ID del servicio por nombre si es posible, 
            // o lo dejamos vacío para que el usuario seleccione.
            const nombreServicio = venta.items?.[0]?.servicio
            if (nombreServicio) {
                const s = servicios.find(s => s.nombre === nombreServicio)
                if (s) setNuevoServicioId(s.id)
            }
        }
    }, [venta, servicios, esCita])

    const handleGuardar = async () => {
        if (!nuevoBarberoId) {
            alert('Por favor selecciona un barbero')
            return
        }

        const barberoActualId = venta.barbero_id || venta.barbero?.id
        const servicioActualId = esCita ? (venta.servicio_id || venta.servicio?.id) : nuevoServicioId // Simplificación

        if (nuevoBarberoId === barberoActualId && nuevoServicioId === servicioActualId) {
            onClose()
            return
        }

        try {
            setProcesando(true)

            if (esCita) {
                // Actualizar directamente en la tabla de citas
                const { error } = await (supabase as any)
                    .from('citas')
                    .update({
                        barbero_id: nuevoBarberoId,
                        servicio_id: nuevoServicioId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', venta.id)

                if (error) throw error

                alert('✅ Datos de la cita actualizados')
                onSuccess()
                onClose()
            } else {
                // Usar el endpoint de corrección para facturas (ahora permite servicio)
                const response = await fetch('/api/pos/corregir-venta', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        facturaId: venta.id,
                        nuevoBarberoId: nuevoBarberoId,
                        nuevoServicioId: nuevoServicioId
                    }),
                })

                const result = await response.json()

                if (response.ok && result.success) {
                    alert('✅ Venta actualizada correctamente')
                    onSuccess()
                    onClose()
                } else {
                    throw new Error(result.message || 'Error al actualizar venta')
                }
            }
        } catch (error: any) {
            console.error('Error actualizando venta:', error)
            alert('❌ ' + error.message)
        } finally {
            setProcesando(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div
                className="rounded-lg shadow-xl w-full max-w-md p-6"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--accent-color)' }}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
                        <i className="fas fa-edit mr-2"></i>
                        {esCita ? 'Editar Cita Pendiente' : 'Corregir Venta Realizada'}
                    </h2>
                    <button onClick={onClose} style={{ color: 'var(--text-primary)' }}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                        <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                            {esCita ? 'Cita de:' : 'Venta de:'}
                        </p>
                        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                            {!esCita && venta.numero_factura && `${venta.numero_factura} - `}{venta.cliente_nombre}
                        </p>
                    </div>

                    {/* Selector de Barbero */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                            <i className="fas fa-user mr-2"></i>Barbero encargado:
                        </label>
                        <select
                            value={nuevoBarberoId}
                            onChange={(e) => setNuevoBarberoId(e.target.value)}
                            className="w-full p-3 rounded-lg"
                            style={{
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <option value="">Seleccionar...</option>
                            {barberos.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.nombre} {b.apellido}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Selector de Servicio */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                            <i className="fas fa-cut mr-2"></i>Servicio realizado:
                        </label>
                        <select
                            value={nuevoServicioId}
                            onChange={(e) => setNuevoServicioId(e.target.value)}
                            className="w-full p-3 rounded-lg"
                            style={{
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <option value="">Seleccionar servicio...</option>
                            {servicios.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.nombre} (${s.precio})
                                </option>
                            ))}
                        </select>
                        {!esCita && (
                            <p className="text-xs mt-1" style={{ color: 'var(--accent-color)', opacity: 0.8 }}>
                                ⚠️ Cambiar el servicio actualizará el total de la venta y las comisiones.
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            disabled={procesando}
                            className="flex-1 px-4 py-2 rounded-lg font-medium"
                            style={{
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleGuardar}
                            disabled={procesando}
                            className="flex-1 px-4 py-2 rounded-lg font-bold"
                            style={{
                                backgroundColor: 'var(--accent-color)',
                                color: 'var(--bg-primary)',
                                opacity: procesando ? 0.6 : 1
                            }}
                        >
                            {procesando ? 'Guardando...' : 'Confirmar Cambios'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
