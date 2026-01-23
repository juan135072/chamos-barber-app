/**
 * =====================================================
 * HISTORIAL DE ASISTENCIAS - BARBERO
 * =====================================================
 * Muestra el historial mensual de asistencias del barbero
 */

'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@supabase/auth-helpers-react'

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

export default function HistorialAsistencia() {
    const user = useUser()

    const [loading, setLoading] = useState(true)
    const [asistencias, setAsistencias] = useState<Asistencia[]>([])
    const [estadisticas, setEstadisticas] = useState<Estadisticas>({
        total: 0,
        puntuales: 0,
        tardes: 0,
        porcentajePuntualidad: 0
    })

    useEffect(() => {
        if (user) {
            cargarHistorial()
        }
    }, [user])

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
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Cargando historial...
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Estadísticas */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '1rem'
            }}>
                <div style={{
                    padding: '1rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '2px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                        {estadisticas.total}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Días trabajados
                    </div>
                </div>

                <div style={{
                    padding: '1rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '2px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                        {estadisticas.puntuales}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Puntuales
                    </div>
                </div>

                <div style={{
                    padding: '1rem',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '2px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                        {estadisticas.tardes}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Tardes
                    </div>
                </div>

                <div style={{
                    padding: '1rem',
                    background: 'rgba(212, 175, 55, 0.1)',
                    border: '2px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d4af37' }}>
                        {estadisticas.porcentajePuntualidad}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Puntualidad
                    </div>
                </div>
            </div>

            {/* Historial */}
            <div style={{
                background: 'var(--card-background)',
                borderRadius: '12px',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '1rem 1.5rem',
                    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
                    color: '#121212',
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    Últimos 30 días
                </div>

                {asistencias.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                        <p>No hay registros de asistencia aún</p>
                    </div>
                ) : (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {asistencias.map((asistencia) => (
                            <div
                                key={asistencia.id}
                                style={{
                                    padding: '1rem 1.5rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                        {new Date(asistencia.fecha).toLocaleDateString('es-CL', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'short'
                                        })}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        {asistencia.hora}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    background: asistencia.estado === 'normal' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: asistencia.estado === 'normal' ? '#10b981' : '#f59e0b'
                                }}>
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
