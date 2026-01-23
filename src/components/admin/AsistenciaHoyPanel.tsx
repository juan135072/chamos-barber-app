/**
 * =====================================================
 * ASISTENCIA HOY - ADMIN
 * =====================================================
 * Panel para ver quién llegó hoy
 */

'use client'

import { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

interface Barbero {
    id: string
    nombre: string
}

interface AsistenciaHoy {
    barbero_id: string
    hora: string
    estado: string
    barberos: { nombre: string }
}

export default function AsistenciaHoyPanel() {
    const supabase = useSupabaseClient()

    const [loading, setLoading] = useState(true)
    const [barberos, setBarberos] = useState<Barbero[]>([])
    const [asistencias, setAsistencias] = useState<AsistenciaHoy[]>([])

    useEffect(() => {
        cargarDatos()

        // Actualizar cada minuto
        const interval = setInterval(cargarDatos, 60000)
        return () => clearInterval(interval)
    }, [])

    const cargarDatos = async () => {
        setLoading(true)
        try {
            // Cargar todos los barberos
            const { data: barberosData } = await supabase
                .from('barberos')
                .select('id, nombre')
                .order('nombre')

            // Cargar asistencias de hoy
            const fechaHoy = new Date().toISOString().split('T')[0]
            const { data: asistenciasData } = await supabase
                .from('asistencias')
                .select(`
          barbero_id,
          hora,
          estado,
          barberos!inner(nombre)
        `)
                .eq('fecha', fechaHoy)

            setBarberos(barberosData || [])
            setAsistencias(asistenciasData || [])
        } catch (error) {
            console.error('Error al cargar datos:', error)
        } finally {
            setLoading(false)
        }
    }

    const getBarberoAsistencia = (barberoId: string) => {
        return asistencias.find(a => a.barbero_id === barberoId)
    }

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Cargando asistencias...
            </div>
        )
    }

    const totalBarberos = barberos.length
    const llegaron = asistencias.length
    const pendientes = totalBarberos - llegaron
    const tardes = asistencias.filter(a => a.estado === 'tarde').length

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Resumen */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem'
            }}>
                <div style={{
                    padding: '1.5rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '2px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>
                        {llegaron}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Llegaron
                    </div>
                </div>

                <div style={{
                    padding: '1.5rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '2px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                        {pendientes}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Pendientes
                    </div>
                </div>

                <div style={{
                    padding: '1.5rem',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '2px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                        {tardes}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Tardes
                    </div>
                </div>
            </div>

            {/* Lista de barberos */}
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
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>Barberos</span>
                    <button
                        onClick={cargarDatos}
                        style={{
                            background: 'rgba(0, 0, 0, 0.2)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.5rem 1rem',
                            color: '#121212',
                            fontSize: '0.875rem',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        🔄 Actualizar
                    </button>
                </div>

                <div>
                    {barberos.map((barbero) => {
                        const asistencia = getBarberoAsistencia(barbero.id)
                        const llegó = !!asistencia
                        const tarde = asistencia?.estado === 'tarde'

                        return (
                            <div
                                key={barbero.id}
                                style={{
                                    padding: '1rem 1.5rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: tarde ? 'rgba(245, 158, 11, 0.05)' : 'transparent'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                        {barbero.nombre}
                                    </div>
                                    {llegó && (
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            {asistencia.hora}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    {llegó ? (
                                        <div style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '20px',
                                            fontSize: '0.875rem',
                                            fontWeight: 'bold',
                                            background: tarde ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                            color: tarde ? '#f59e0b' : '#10b981'
                                        }}>
                                            {tarde ? '⏰ Tarde' : '✓ Llegó'}
                                        </div>
                                    ) : (
                                        <div style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '20px',
                                            fontSize: '0.875rem',
                                            fontWeight: 'bold',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#ef4444'
                                        }}>
                                            ⏳ Pendiente
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
