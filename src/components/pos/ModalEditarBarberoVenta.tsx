import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Barbero {
    id: string
    nombre: string
    apellido: string
}

interface Venta {
    id: string
    numero_factura: string
    cliente_nombre: string
    total: number
    barbero_id?: string
    barbero?: {
        nombre: string
        apellido: string
    }
}

interface ModalEditarBarberoVentaProps {
    venta: Venta
    barberos: Barbero[]
    onClose: () => void
    onSuccess: () => void
}

export default function ModalEditarBarberoVenta({ venta, barberos, onClose, onSuccess }: ModalEditarBarberoVentaProps) {
    const [nuevoBarberoId, setNuevoBarberoId] = useState(venta.barbero_id || '')
    const [procesando, setProcesando] = useState(false)

    const handleGuardar = async () => {
        if (!nuevoBarberoId) {
            alert('Por favor selecciona un barbero')
            return
        }

        if (nuevoBarberoId === venta.barbero_id) {
            onClose()
            return
        }

        try {
            setProcesando(true)

            const response = await fetch('/api/pos/corregir-barbero', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    facturaId: venta.id,
                    nuevoBarberoId: nuevoBarberoId
                }),
            })

            const result = await response.json()

            if (response.ok && result.success) {
                alert('✅ Barbero actualizado correctamente')
                onSuccess()
                onClose()
            } else {
                throw new Error(result.message || 'Error al actualizar barbero')
            }
        } catch (error: any) {
            console.error('Error actualizando barbero:', error)
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
                        <i className="fas fa-user-edit mr-2"></i>
                        Corregir Barbero
                    </h2>
                    <button onClick={onClose} style={{ color: 'var(--text-primary)' }}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                        <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Venta:</p>
                        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{venta.numero_factura} - {venta.cliente_nombre}</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Barbero actual:</p>
                        <p style={{ color: 'var(--text-primary)' }}>
                            {venta.barbero ? `${venta.barbero.nombre} ${venta.barbero.apellido}` : 'No asignado'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                            Seleccionar Nuevo Barbero:
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
                            {procesando ? 'Guardando...' : 'Guardar Cambio'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
