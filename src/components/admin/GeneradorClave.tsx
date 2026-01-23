/**
 * =====================================================
 * GENERADOR DE CLAVE DIARIA - ADMIN
 * =====================================================
 * Componente para que el admin genere la clave del día
 */

'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface ClaveActual {
    clave: string
    fecha: string
    existe: boolean
}

export default function GeneradorClave() {
    const [loading, setLoading] = useState(false)
    const [claveActual, setClaveActual] = useState<ClaveActual | null>(null)
    const [verificando, setVerificando] = useState(true)

    useEffect(() => {
        obtenerClaveActual()
    }, [])

    const obtenerClaveActual = async () => {
        setVerificando(true)
        try {
            const response = await fetch('/api/asistencia/clave-actual')
            const data = await response.json()

            if (data.existe) {
                setClaveActual({
                    clave: data.clave,
                    fecha: data.fecha,
                    existe: true
                })
            } else {
                setClaveActual(null)
            }
        } catch (error) {
            console.error('Error al obtener clave:', error)
        } finally {
            setVerificando(false)
        }
    }

    const generarNuevaClave = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/asistencia/generar-clave', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.error || 'Error al generar clave')
                return
            }

            setClaveActual({
                clave: data.clave,
                fecha: data.fecha,
                existe: true
            })

            if (data.yaExistia) {
                toast.success('Clave del día recuperada')
            } else {
                toast.success('Nueva clave generada')
            }
        } catch (error) {
            console.error('Error al generar clave:', error)
            toast.error('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    if (verificando) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Verificando clave del día...
            </div>
        )
    }

    return (
        <div style={{
            background: 'var(--card-background)',
            borderRadius: '12px',
            overflow: 'hidden'
        }}>
            <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
                color: '#121212'
            }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 'bold' }}>
                    🔑 Clave del Día
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.8 }}>
                    {new Date().toLocaleDateString('es-CL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </p>
            </div>

            <div style={{ padding: '2rem' }}>
                {claveActual ? (
                    <>
                        {/* Clave actual */}
                        <div style={{
                            padding: '2rem',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '3px dashed rgba(16, 185, 129, 0.5)',
                            borderRadius: '12px',
                            textAlign: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{
                                fontSize: '3rem',
                                fontWeight: 'bold',
                                fontFamily: 'monospace',
                                letterSpacing: '0.2em',
                                color: 'var(--text-primary)',
                                marginBottom: '0.5rem'
                            }}>
                                {claveActual.clave}
                            </div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: '#10b981',
                                fontWeight: 'bold'
                            }}>
                                ✓ ACTIVA
                            </div>
                        </div>

                        {/* Información */}
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)'
                        }}>
                            <div style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                                💡 Instrucciones:
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                                <li>Comparte esta clave con los barberos</li>
                                <li>Los barberos la usarán para marcar asistencia</li>
                                <li>La clave cambia automáticamente cada día</li>
                            </ul>
                        </div>
                    </>
                ) : (
                    <>
                        {/* No hay clave */}
                        <div style={{
                            padding: '3rem 2rem',
                            textAlign: 'center',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '2px dashed rgba(245, 158, 11, 0.3)',
                            borderRadius: '12px',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                                No hay clave generada
                            </h4>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                Genera la clave del día para que los barberos puedan marcar asistencia
                            </p>
                        </div>

                        <button
                            onClick={generarNuevaClave}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                background: loading ? 'var(--border-color)' : 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
                                color: loading ? 'var(--text-secondary)' : '#121212',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {loading ? '⏳ Generando...' : '🔑 Generar Clave del Día'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
