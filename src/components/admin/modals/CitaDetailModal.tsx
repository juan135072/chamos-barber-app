import React from 'react'
import Modal from '../shared/Modal'
import type { Database } from '../../../../lib/database.types'

type Cita = Database['public']['Tables']['citas']['Row'] & {
    barberos?: { nombre: string; apellido: string }
    servicios?: { nombre: string; precio: number; duracion_minutos: number }
}

interface CitaDetailModalProps {
    isOpen: boolean
    onClose: () => void
    cita: Cita | null
}

const CitaDetailModal: React.FC<CitaDetailModalProps> = ({ isOpen, onClose, cita }) => {
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

                <div className="grid grid-cols-2 gap-6 p-4 rounded-xl border" style={{ backgroundColor: '#181818', borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Barbero</p>
                        <p className="text-white font-medium">
                            {cita.barberos ? `${cita.barberos.nombre} ${cita.barberos.apellido}` : 'No asignado'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Servicio</p>
                        <p className="text-white font-medium">
                            {cita.servicios?.nombre || 'No especificado'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Fecha y Hora</p>
                        <p className="text-white font-medium">
                            {new Date(cita.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <p className="text-amber-500 font-bold">{cita.hora.substring(0, 5)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Precio</p>
                        <p className="text-white font-medium">{formatCurrency(cita.precio_final || (cita.servicios?.precio ?? 0))}</p>
                        <p className="text-xs text-gray-500">Metodo: {cita.metodo_pago}</p>
                    </div>
                </div>

                {/* Descripción / Notas */}
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-2">Descripción de la reserva</p>
                    <div
                        className="p-4 rounded-lg border italic"
                        style={{
                            backgroundColor: 'rgba(212, 175, 55, 0.03)',
                            borderColor: 'rgba(212, 175, 55, 0.1)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        {cita.notas || 'Sin descripción adicional.'}
                    </div>
                </div>

                {/* Footer Acciones */}
                <div className="flex justify-end pt-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg font-bold transition-all text-black"
                        style={{ backgroundColor: '#D4AF37' }}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default CitaDetailModal
