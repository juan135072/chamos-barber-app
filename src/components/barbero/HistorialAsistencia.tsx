/**
 * =====================================================
 * HISTORIAL DE ASISTENCIAS - BARBERO
 * =====================================================
 * Muestra el historial mensual de asistencias del barbero
 */

'use client'

import { useState, useEffect } from 'react'

interface Asistencia {
    id: string
    fecha: string
    hora: string
    estado: string
}

interface Estadisticas {
    total: number
    puntuales: number
    tardes: number
    porcentajePuntualidad: number
}

interface Props {
    barberoId: string
}

export default function HistorialAsistencia({ barberoId }: Props) {

    const [loading, setLoading] = useState(true)
    const [asistencias, setAsistencias] = useState<Asistencia[]>([])
    const [estadisticas, setEstadisticas] = useState<Estadisticas>({
        total: 0,
        puntuales: 0,
        tardes: 0,
        porcentajePuntualidad: 0
    })

    useEffect(() => {
        if (barberoId) {
            cargarHistorial()
        }
    }, [barberoId])

    const cargarHistorial = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/asistencia/historial')
            const data = await response.json()

            if (data.success) {
                setAsistencias(data.asistencias)
                setEstadisticas(data.estadisticas)
            }
        } catch (error) {
            console.error('Error al cargar historial:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="bg-white/[0.02] border border-white/10 p-8 rounded-3xl backdrop-blur-xl text-center">
                <i className="fas fa-circle-notch fa-spin text-gold text-3xl mb-4"></i>
                <p className="text-white/60 font-medium tracking-wider uppercase text-sm">Cargando historial...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Estadísticas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-green-500/5 border border-green-500/20 p-6 rounded-3xl backdrop-blur-xl text-center transition-all hover:bg-green-500/10">
                    <div className="text-3xl font-black text-green-400 mb-1 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]">
                        {estadisticas.total}
                    </div>
                    <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                        Días trabajados
                    </div>
                </div>

                <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-3xl backdrop-blur-xl text-center transition-all hover:bg-blue-500/10">
                    <div className="text-3xl font-black text-blue-400 mb-1 drop-shadow-[0_0_10px_rgba(96,165,250,0.3)]">
                        {estadisticas.puntuales}
                    </div>
                    <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                        Puntuales
                    </div>
                </div>

                <div className="bg-yellow-500/5 border border-yellow-500/20 p-6 rounded-3xl backdrop-blur-xl text-center transition-all hover:bg-yellow-500/10">
                    <div className="text-3xl font-black text-yellow-400 mb-1 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]">
                        {estadisticas.tardes}
                    </div>
                    <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                        Tardes
                    </div>
                </div>

                <div className="bg-gold/5 border border-gold/20 p-6 rounded-3xl backdrop-blur-xl text-center transition-all hover:bg-gold/10">
                    <div className="text-3xl font-black text-gold mb-1 drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                        {estadisticas.porcentajePuntualidad}%
                    </div>
                    <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                        Puntualidad
                    </div>
                </div>
            </div>

            {/* Historial */}
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-xl overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gold/10 to-transparent border-b border-white/10 flex items-center gap-3">
                    <i className="fas fa-calendar-alt text-gold"></i>
                    <span className="text-xs font-black text-white uppercase tracking-wider">Últimos 30 días</span>
                </div>

                {asistencias.length === 0 ? (
                    <div className="p-12 text-center text-white/50">
                        <div className="text-5xl mb-4 opacity-50">📅</div>
                        <p className="font-medium tracking-wide">No hay registros de asistencia aún</p>
                    </div>
                ) : (
                    <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {asistencias.map((asistencia) => (
                            <div
                                key={asistencia.id}
                                className="px-6 py-4 border-b border-white/5 flex justify-between items-center hover:bg-white/[0.01] transition-colors"
                            >
                                <div>
                                    <div className="font-bold text-white tracking-wide">
                                        {new Date(asistencia.fecha).toLocaleDateString('es-CL', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'short'
                                        }).replace(/^\w/, (c) => c.toUpperCase())}
                                    </div>
                                    <div className="text-xs text-white/50 font-mono mt-1 flex items-center gap-2">
                                        <i className="far fa-clock text-gold"></i> {asistencia.hora}
                                    </div>
                                </div>

                                <div className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase border ${
                                    asistencia.estado === 'normal' 
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                }`}>
                                    {asistencia.estado === 'normal' ? '✓ Puntual' : '⏰ Tarde'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
