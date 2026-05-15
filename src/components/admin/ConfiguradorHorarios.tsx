/**
 * =====================================================
 * CONFIGURADOR DE HORARIOS - ADMIN
 * =====================================================
 * Permite al admin establecer horarios de entrada y salida
 */

'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface ConfiguracionHorarios {
    id?: string
    nombre: string
    hora_entrada_puntual: string
    hora_salida_minima: string | null
}

export default function ConfiguradorHorarios() {
    const [loading, setLoading] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [horaEntrada, setHoraEntrada] = useState('09:30')
    const [horaSalida, setHoraSalida] = useState('18:00')

    useEffect(() => {
        cargarConfiguracion()
    }, [])

    const cargarConfiguracion = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/asistencia/configuracion-horarios')
            const data = await response.json()

            if (response.ok && data.configuracion) {
                const config = data.configuracion

                // Convertir de HH:MM:SS a HH:MM
                if (config.hora_entrada_puntual) {
                    setHoraEntrada(config.hora_entrada_puntual.substring(0, 5))
                }
                if (config.hora_salida_minima) {
                    setHoraSalida(config.hora_salida_minima.substring(0, 5))
                }
            }
        } catch (error) {
            console.error('Error al cargar configuración:', error)
            toast.error('Error al cargar configuración')
        } finally {
            setLoading(false)
        }
    }

    const handleGuardar = async () => {
        if (!horaEntrada) {
            toast.error('Debes especificar la hora de entrada')
            return
        }

        setGuardando(true)

        try {
            const response = await fetch('/api/asistencia/guardar-horarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hora_entrada_puntual: horaEntrada,
                    hora_salida_minima: horaSalida || null
                })
            })

            const data = await response.json()

            if (response.ok) {
                toast.success(data.mensaje || 'Horarios actualizados')
            } else {
                toast.error(data.error || 'Error al guardar')
            }
        } catch (error) {
            console.error('Error al guardar:', error)
            toast.error('Error de conexión')
        } finally {
            setGuardando(false)
        }
    }

    if (loading) {
        return (
            <div style={{
                padding: '2rem',
                textAlign: 'center',
                background: 'var(--card-background)',
                borderRadius: '12px'
            }}>
                <p style={{ color: 'var(--text-secondary)' }}>Cargando configuración...</p>
            </div>
        )
    }

    const formatearHora = (hora: string) => {
        const [h, m] = hora.split(':')
        const hNum = parseInt(h)
        const ampm = hNum >= 12 ? 'PM' : 'AM'
        const h12 = hNum > 12 ? hNum - 12 : (hNum === 0 ? 12 : hNum)
        return `${h12}:${m} ${ampm}`
    }

    return (
        <div style={{
            padding: '2rem',
            background: 'var(--card-background)',
            borderRadius: '12px',
            border: '2px solid var(--border-color)'
        }}>
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                    margin: '0 0 0.5rem 0',
                    color: 'var(--text-primary)',
                    fontSize: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    ⏰ Configuración de Horarios
                </h3>
                <p style={{
                    margin: 0,
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem'
                }}>
                    Establece los horarios de entrada y salida para el sistema de asistencia
                </p>
            </div>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
            }}>
                {/* Hora de Entrada */}
                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '0.75rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        fontWeight: 600
                    }}>
                        🕐 Hora Límite de Entrada Puntual
                    </label>
                    <p style={{
                        margin: '0 0 0.75rem 0',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem'
                    }}>
                        Llegadas después de esta hora se marcarán como "Tarde"
                    </p>

                    <input
                        type="time"
                        value={horaEntrada}
                        onChange={(e) => setHoraEntrada(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.875rem 1rem',
                            background: 'var(--input-background)',
                            border: '2px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '1.125rem',
                            fontWeight: 'bold',
                            fontFamily: 'monospace'
                        }}
                    />

                    <div style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        color: 'var(--text-primary)'
                    }}>
                        📊 Vista previa: Los barberos que lleguen <strong>hasta las {formatearHora(horaEntrada)}</strong> serán marcados como "Puntual"
                    </div>
                </div>

                {/* Hora de Salida */}
                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '0.75rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        fontWeight: 600
                    }}>
                        🕐 Hora Mínima de Salida (Opcional)
                    </label>
                    <p style={{
                        margin: '0 0 0.75rem 0',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem'
                    }}>
                        Hora mínima permitida para marcar salida del día
                    </p>

                    <input
                        type="time"
                        value={horaSalida}
                        onChange={(e) => setHoraSalida(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.875rem 1rem',
                            background: 'var(--input-background)',
                            border: '2px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '1.125rem',
                            fontWeight: 'bold',
                            fontFamily: 'monospace'
                        }}
                    />

                    {horaSalida && (
                        <div style={{
                            marginTop: '0.5rem',
                            padding: '0.75rem',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            color: 'var(--text-primary)'
                        }}>
                            📊 Vista previa: Los barberos podrán marcar salida desde las <strong>{formatearHora(horaSalida)}</strong>
                        </div>
                    )}
                </div>

                {/* Botón Guardar */}
                <button
                    onClick={handleGuardar}
                    disabled={guardando || !horaEntrada}
                    style={{
                        padding: '1rem 2rem',
                        background: guardando || !horaEntrada
                            ? 'var(--border-color)'
                            : 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
                        color: guardando || !horaEntrada ? 'var(--text-secondary)' : '#121212',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: guardando || !horaEntrada ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        marginTop: '0.5rem'
                    }}
                >
                    {guardando ? '💾 Guardando...' : '✓ Guardar Configuración'}
                </button>
            </div>

            {/* Información Adicional */}
            <div style={{
                marginTop: '2rem',
                padding: '1rem',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.6'
            }}>
                <strong style={{ color: 'var(--text-primary)' }}>💡 Notas Importantes:</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                    <li>Los cambios aplican inmediatamente para nuevas asistencias</li>
                    <li>Las asistencias ya registradas no se modifican</li>
                    <li>La hora de salida es opcional (para futura implementación)</li>
                </ul>
            </div>
        </div>
    )
}
