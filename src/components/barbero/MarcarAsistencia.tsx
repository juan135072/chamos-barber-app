/**
 * =====================================================
 * MARCAR ASISTENCIA - BARBERO
 * =====================================================
 * Componente para que el barbero marque su asistencia diaria
 */

'use client'

import { useState, useEffect } from 'react'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import toast from 'react-hot-toast'

interface AsistenciaHoy {
    fecha: string
    hora: string
    estado: string
}

export default function MarcarAsistencia() {
    const user = useUser()
    const supabase = useSupabaseClient()

    const [clave, setClave] = useState('')
    const [loading, setLoading] = useState(false)
    const [verificandoAsistencia, setVerificandoAsistencia] = useState(true)
    const [asistenciaHoy, setAsistenciaHoy] = useState<AsistenciaHoy | null>(null)

    // Verificar si ya marcó hoy
    useEffect(() => {
        verificarAsistenciaHoy()
    }, [user])

    const verificarAsistenciaHoy = async () => {
        if (!user) return

        setVerificandoAsistencia(true)
        try {
            const fechaHoy = new Date().toISOString().split('T')[0]

            const { data, error } = await supabase
                .from('asistencias')
                .select('fecha, hora, estado')
                .eq('barbero_id', user.id)
                .eq('fecha', fechaHoy)
                .single()

            if (data) {
                setAsistenciaHoy(data)
            } else {
                setAsistenciaHoy(null)
            }
        } catch (error) {
            console.error('Error al verificar asistencia:', error)
        } finally {
            setVerificandoAsistencia(false)
        }
    }

    const handleMarcar = async () => {
        if (!clave.trim()) {
            toast.error('Por favor ingresa la clave')
            return
        }

        setLoading(true)

        try {
            // 🌍 PASO 1: Obtener ubicación GPS
            if (!navigator.geolocation) {
                toast.error('Tu dispositivo no soporta geolocalización')
                setLoading(false)
                return
            }

            const ubicacionPromise = new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                })
            })

            toast.loading('📍 Obteniendo tu ubicación...', { id: 'gps' })

            const position = await ubicacionPromise
            const latitud = position.coords.latitude
            const longitud = position.coords.longitude

            toast.success('✓ Ubicación obtenida', { id: 'gps' })

            // 🔐 PASO 2: Enviar asistencia con ubicación
            const response = await fetch('/api/asistencia/marcar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clave: clave.trim().toUpperCase(),
                    latitud,
                    longitud,
                    ubicacion_id: '00000000-0000-0000-0000-000000000001' // TODO: Obtener dinámicamente
                })
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.error || 'Error al marcar asistencia')
                return
            }

            // Éxito
            toast.success(data.mensaje)
            setClave('')

            // Actualizar estado
            setAsistenciaHoy({
                fecha: data.asistencia.fecha,
                hora: data.asistencia.hora,
                estado: data.asistencia.estado
            })

        } catch (error: any) {
            console.error('Error al marcar asistencia:', error)

            // Errores de geolocalización
            if (error.code) {
                if (error.code === error.PERMISSION_DENIED) {
                    toast.error('❌ Debes permitir acceso a tu ubicación para marcar asistencia')
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    toast.error('❌ No se pudo obtener tu ubicación. ¿Estás en interiores?')
                } else if (error.code === error.TIMEOUT) {
                    toast.error('❌ Tiempo de espera agotado. Intenta de nuevo.')
                } else {
                    toast.error('❌ Error al obtener ubicación')
                }
            } else {
                toast.error('Error de conexión')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleMarcar()
        }
    }

    if (verificandoAsistencia) {
        return (
            <div style={{
                padding: '2rem',
                background: 'var(--card-background)',
                borderRadius: '12px',
                textAlign: 'center'
            }}>
                <p style={{ color: 'var(--text-secondary)' }}>Verificando asistencia...</p>
            </div>
        )
    }

    // Ya marcó hoy
    if (asistenciaHoy) {
        const esNormal = asistenciaHoy.estado === 'normal'

        return (
            <div style={{
                padding: '2rem',
                background: esNormal ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: `2px solid ${esNormal ? '#10b981' : '#f59e0b'}`,
                borderRadius: '12px',
                textAlign: 'center'
            }}>
                <div style={{
                    fontSize: '48px',
                    marginBottom: '1rem'
                }}>
                    {esNormal ? '✅' : '⚠️'}
                </div>
                <h3 style={{
                    margin: '0 0 0.5rem 0',
                    color: 'var(--text-primary)',
                    fontSize: '1.25rem'
                }}>
                    Asistencia Registrada
                </h3>
                <p style={{
                    margin: '0 0 0.5rem 0',
                    color: 'var(--text-secondary)',
                    fontSize: '1rem'
                }}>
                    Llegaste a las <strong style={{ color: 'var(--text-primary)' }}>{asistenciaHoy.hora}</strong>
                </p>
                {!esNormal && (
                    <p style={{
                        margin: 0,
                        color: '#f59e0b',
                        fontSize: '0.875rem',
                        fontWeight: 600
                    }}>
                        (Tarde)
                    </p>
                )}
            </div>
        )
    }

    // Pendiente de marcar
    return (
        <div style={{
            padding: '2rem',
            background: 'var(--card-background)',
            borderRadius: '12px'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                    fontSize: '48px',
                    marginBottom: '1rem'
                }}>
                    ⏰
                </div>
                <h3 style={{
                    margin: '0 0 0.5rem 0',
                    color: 'var(--text-primary)',
                    fontSize: '1.25rem'
                }}>
                    Marcar Asistencia
                </h3>
                <p style={{
                    margin: 0,
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem'
                }}>
                    Ingresa la clave del día (pídela a recepción)
                </p>
            </div>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <input
                    type="text"
                    value={clave}
                    onChange={(e) => setClave(e.target.value.toUpperCase())}
                    onKeyPress={handleKeyPress}
                    placeholder="Ej: B4R-2201"
                    disabled={loading}
                    style={{
                        padding: '1rem',
                        fontSize: '1.25rem',
                        textAlign: 'center',
                        letterSpacing: '0.1em',
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                        background: 'var(--input-background)',
                        border: '2px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        textTransform: 'uppercase'
                    }}
                    maxLength={10}
                />

                <button
                    onClick={handleMarcar}
                    disabled={loading || !clave.trim()}
                    style={{
                        padding: '1rem 2rem',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        background: loading || !clave.trim()
                            ? 'var(--border-color)'
                            : 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
                        color: loading || !clave.trim() ? 'var(--text-secondary)' : '#121212',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: loading || !clave.trim() ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        opacity: loading || !clave.trim() ? 0.5 : 1
                    }}
                >
                    {loading ? '⏳ Marcando...' : '✓ Marcar Asistencia'}
                </button>
            </div>

            <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
            }}>
                <strong style={{ color: 'var(--text-primary)' }}>💡 Información:</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                    <li>La clave cambia cada día</li>
                    <li>Solo puedes marcar una vez por día</li>
                    <li>Llegadas después de 9:30 AM = tarde</li>
                    <li><strong>📍 Debes estar físicamente en la barbería</strong></li>
                    <li>Acepta los permisos de ubicación cuando te los pida</li>
                </ul>
            </div>
        </div>
    )
}
