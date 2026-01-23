import React, { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import type { Database } from '../../../../lib/database.types'
import { supabase } from '@/lib/supabase'
import { Plus, Trash, Save, Loader2 } from 'lucide-react'

type Servicio = Database['public']['Tables']['servicios']['Row']
type Cita = Database['public']['Tables']['citas']['Row'] & {
    barberos?: { nombre: string; apellido: string }
    servicios?: { nombre: string; precio: number; duracion_minutos: number }
    items?: any[]
}

interface CitaDetailModalProps {
    isOpen: boolean
    onClose: () => void
    cita: Cita | null
    onUpdate?: () => void
}

const CitaDetailModal: React.FC<CitaDetailModalProps> = ({ isOpen, onClose, cita, onUpdate }) => {
    const [items, setItems] = useState<any[]>([])
    const [servicios, setServicios] = useState<Servicio[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [loadingServicios, setLoadingServicios] = useState(false)

    useEffect(() => {
        if (cita) {
            // Inicializar items desde la cita
            if (cita.items && cita.items.length > 0) {
                setItems(cita.items)
            } else if (cita.servicios) {
                // Backward compatibility: si no hay items pero hay un servicio_id
                setItems([{
                    servicio_id: cita.servicio_id,
                    nombre: cita.servicios.nombre,
                    precio: cita.servicios.precio,
                    cantidad: 1,
                    subtotal: cita.servicios.precio
                }])
            } else {
                setItems([])
            }
            cargarServicios()
        }
    }, [cita])

    const cargarServicios = async () => {
        try {
            setLoadingServicios(true)
            const { data, error } = await supabase
                .from('servicios')
                .select('*')
                .eq('activo', true)
                .order('nombre')

            if (error) throw error
            setServicios(data || [])
        } catch (error) {
            console.error('Error cargando servicios:', error)
        } finally {
            setLoadingServicios(false)
        }
    }

    if (!cita) return null

    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'confirmada': return '#10B981'
            case 'pendiente': return '#F59E0B'
            case 'cancelada': return '#EF4444'
            case 'completada': return '#3B82F6'
            default: return '#666'
        }
    }

    const formatCurrency = (amount: number | null) => {
        if (amount === null) return '$0'
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
    }

    const agregarServicio = (servicio: Servicio) => {
        setItems(prev => {
            const existe = prev.find(i => i.servicio_id === servicio.id)
            if (existe) {
                return prev.map(i => i.servicio_id === servicio.id
                    ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio }
                    : i
                )
            }
            return [...prev, {
                servicio_id: servicio.id,
                nombre: servicio.nombre,
                precio: servicio.precio,
                cantidad: 1,
                subtotal: servicio.precio
            }]
        })
    }

    const removerServicio = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        if (!cita) return

        try {
            setIsSaving(true)
            const total = items.reduce((sum, item) => sum + item.subtotal, 0)

            const { error } = await (supabase
                .from('citas')
                .update({
                    items: items,
                    precio_final: total
                } as any) as any)
                .eq('id', cita.id)

            if (error) throw error

            if (onUpdate) onUpdate()
            onClose()
        } catch (error) {
            console.error('Error guardando cambios:', error)
            alert('Error al guardar los cambios')
        } finally {
            setIsSaving(false)
        }
    }

    const totalFinal = items.reduce((sum, item) => sum + item.subtotal, 0)

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalles de la Reserva" size="md">
            <div className="space-y-6">
                {/* Info Principal */}
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="text-xl font-bold text-white mb-1">{cita.cliente_nombre}</h4>
                        <div className="flex flex-col gap-1">
                            <span className="text-sm text-gray-400">
                                <i className="fas fa-phone mr-2 w-4"></i>{cita.cliente_telefono}
                            </span>
                            {cita.cliente_email && (
                                <span className="text-sm text-gray-400">
                                    <i className="fas fa-envelope mr-2 w-4"></i>{cita.cliente_email}
                                </span>
                            )}
                        </div>
                    </div>
                    <div
                        className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: getEstadoColor(cita.estado) }}
                    >
                        {cita.estado}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border" style={{ backgroundColor: '#181818', borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Barbero</p>
                        <p className="text-white font-medium">
                            {cita.barberos ? `${cita.barberos.nombre} ${cita.barberos.apellido}` : 'No asignado'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Fecha y Hora</p>
                        <p className="text-white font-medium">
                            {new Date(cita.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <p className="text-amber-500 font-bold">{cita.hora.substring(0, 5)}</p>
                    </div>
                </div>

                {/* Servicios / Items */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500 uppercase font-bold">Servicios Contratados</p>
                        <p className="text-amber-500 font-black text-lg">{formatCurrency(totalFinal)}</p>
                    </div>

                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                        {items.length === 0 ? (
                            <p className="text-gray-500 text-sm italic py-2 text-center border border-dashed rounded-lg">No hay servicios seleccionados</p>
                        ) : (
                            items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10 group">
                                    <div className="flex flex-col">
                                        <span className="text-white text-sm font-bold">{item.nombre}</span>
                                        <span className="text-xs text-gray-500">{item.cantidad} x {formatCurrency(item.precio)}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-white font-bold text-sm">{formatCurrency(item.subtotal)}</span>
                                        <button
                                            onClick={() => removerServicio(idx)}
                                            className="text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Selector de Servicios */}
                    <div className="pt-2 border-t border-white/10">
                        <select
                            onChange={(e) => {
                                const s = servicios.find(srv => srv.id === e.target.value)
                                if (s) {
                                    agregarServicio(s)
                                    e.target.value = ""
                                }
                            }}
                            className="w-full bg-[#111] border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500"
                            defaultValue=""
                        >
                            <option value="" disabled>+ Agregar servicio adicional...</option>
                            {servicios.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre} - {formatCurrency(s.precio)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Descripción / Notas */}
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-2">Descripción de la reserva</p>
                    <div
                        className="p-4 rounded-lg border italic text-sm"
                        style={{
                            backgroundColor: 'rgba(212, 175, 55, 0.03)',
                            borderColor: 'rgba(212, 175, 55, 0.1)',
                            color: '#ccc'
                        }}
                    >
                        {cita.notas || 'Sin descripción adicional.'}
                    </div>
                </div>

                {/* Footer Acciones */}
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all text-black hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
                            style={{ backgroundColor: '#D4AF37' }}
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    )
}

export default CitaDetailModal

