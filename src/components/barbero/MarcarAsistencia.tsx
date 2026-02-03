/**
 * =====================================================
 * MARCAR ASISTENCIA - BARBERO
 * =====================================================
 * Componente para que el barbero marque su asistencia diaria
 */

'use client'

import { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import toast from 'react-hot-toast'

interface AsistenciaHoy {
    fecha: string
    hora: string
    estado: string
}

interface Props {
    barberoId: string
}

export default function MarcarAsistencia({ barberoId }: Props) {
    const supabase = useSupabaseClient()

    const [clave, setClave] = useState('')
    const [loading, setLoading] = useState(false)
    const [verificandoAsistencia, setVerificandoAsistencia] = useState(true)
    const [asistenciaHoy, setAsistenciaHoy] = useState<AsistenciaHoy | null>(null)
    const [ubicacionId, setUbicacionId] = useState<string | null>(null)
    const [debugError, setDebugError] = useState<string | null>(null)

    // Al cargar el componente o cambiar el ID del barbero
    useEffect(() => {
        if (barberoId) {
            verificarAsistenciaHoy()
            obtenerUbicacionActiva()
        }
    }, [barberoId])

    const obtenerUbicacionActiva = async () => {
        try {
            const { data: ubicaciones } = await supabase
                .from('ubicaciones_barberia')
                .select('id')
                .eq('activa', true)
                .limit(1)

            if (ubicaciones && ubicaciones.length > 0) {
                setUbicacionId(ubicaciones[0].id)
            }
        } catch (error) {
            console.error('Error al obtener ubicación:', error)
        }
    }

    const verificarAsistenciaHoy = async () => {
        if (!barberoId) return

        setVerificandoAsistencia(true)
        try {
            const fechaHoy = new Date().toISOString().split('T')[0]

            const { data, error } = await supabase
                .from('asistencias')
                .select('fecha, hora, estado')
                .eq('barbero_id', barberoId)
                .eq('fecha', fechaHoy)
                .maybeSingle()

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

        if (!ubicacionId) {
            toast.error('❌ Error de configuración: No hay ubicación activa registrada.')
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

            toast.loading('📍 Obteniendo tu ubicación...', { id: 'gps' })

            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                })
            }).catch(err => {
                throw err
            })

            const latitud = position.coords.latitude
            const longitud = position.coords.longitude

            toast.success('✓ Ubicación obtenida', { id: 'gps' })

            // 🔐 PASO 2: Enviar asistencia con ubicación
            console.log('🧪 [DEBUG] Intentando marcar asistencia:', {
                clave: clave.trim().toUpperCase(),
                latitud,
                longitud,
                ubicacion_id: ubicacionId
            })

            const response = await fetch('/api/asistencia/marcar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clave: clave.trim().toUpperCase(),
                    latitud,
                    longitud,
                    ubicacion_id: ubicacionId
                })
            })

            console.log('🧪 [DEBUG] Status de respuesta:', response.status)

            const data = await response.json()
            console.log('🧪 [DEBUG] Cuerpo de respuesta:', data)

            if (!response.ok) {
                const errorMsg = data.error || 'Error al registrar asistencia'
                toast.error(errorMsg)
                console.error('❌ [DEBUG] Error al marcar:', errorMsg)
                setDebugError(`Status: ${response.status}. Error: ${errorMsg}. ${data.debug || ''}`)
                return
            }

            setDebugError(null)

            // Éxito
            toast.success(data.mensaje || '✅ Asistencia marcada')
            setClave('')

            // Actualizar estado local para mostrar el ticket de éxito
            setAsistenciaHoy({
                fecha: data.asistencia?.fecha || new Date().toISOString().split('T')[0],
                hora: data.asistencia?.hora || new Date().toLocaleTimeString(),
                estado: data.asistencia?.estado || 'normal'
            })

        } catch (error: any) {
            console.error('Error al marcar asistencia:', error)

            // Manejar errores de GPS específicamente
            if (error instanceof GeolocationPositionError) {
                if (error.code === error.PERMISSION_DENIED) {
                    toast.error('❌ Debes permitir el acceso a tu ubicación')
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    toast.error('❌ Posición no disponible. Intenta en exteriores.')
                } else if (error.code === error.TIMEOUT) {
                    toast.error('❌ Tiempo agotado al obtener ubicación')
                } else {
                    toast.error('❌ Error de GPS')
                }
            } else {
                toast.error(error.message || 'Error de conexión')
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
                    onChange={(e) => {
                        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                        if (value.length > 3) {
                            value = value.substring(0, 3) + '-' + value.substring(3)
                        }
                        setClave(value)
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Ej: ABC-1234"
                    disabled={loading}
                    style={{
                        padding: '1rem',
                        fontSize: '1.5rem',
                        textAlign: 'center',
                        letterSpacing: '0.15em',
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '2px solid var(--accent-color)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        boxShadow: '0 0 15px rgba(212, 175, 55, 0.1)'
                    }}
                    maxLength={8}
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
                    <li><strong>📍 Debes estar en la barbería (GPS)</strong></li>
                    <li>Acepta los permisos de ubicación</li>
                </ul>
            </div>

            {debugError && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontFamily: 'monospace',
                    color: '#ef4444',
                    wordBreak: 'break-all'
                }}>
                    <strong>DEBUG:</strong> {debugError}
                </div>
            )}
        </div>
    )
}
