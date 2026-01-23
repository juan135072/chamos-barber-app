/**
 * =====================================================
 * GESTIÓN DE UBICACIONES GPS - ADMIN
 * =====================================================
 * Permite al admin capturar y gestionar las ubicaciones
 * de las barberías para validación de asistencia
 */

'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Ubicacion {
    id: string
    nombre: string
    latitud: number
    longitud: number
    radio_permitido: number
    activa: boolean
    created_at: string
    updated_at: string
}

export default function GestionUbicaciones() {
    const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
    const [loading, setLoading] = useState(true)
    const [capturandoGPS, setCapturandoGPS] = useState(false)
    const [guardando, setGuardando] = useState(false)

    // Formulario
    const [editando, setEditando] = useState<string | null>(null)
    const [nombre, setNombre] = useState('')
    const [latitud, setLatitud] = useState<number | ''>('')
    const [longitud, setLongitud] = useState<number | ''>('')
    const [radio, setRadio] = useState(100)

    useEffect(() => {
        cargarUbicaciones()
    }, [])

    const cargarUbicaciones = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/ubicaciones/listar')
            const data = await response.json()

            if (response.ok) {
                setUbicaciones(data.ubicaciones || [])
            } else {
                toast.error(data.error || 'Error al cargar ubicaciones')
            }
        } catch (error) {
            console.error('Error al cargar ubicaciones:', error)
            toast.error('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    const capturarUbicacionActual = () => {
        if (!navigator.geolocation) {
            toast.error('Tu navegador no soporta geolocalización')
            return
        }

        setCapturandoGPS(true)
        toast.loading('Obteniendo tu ubicación GPS...', { id: 'gps' })

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude
                const lng = position.coords.longitude
                const precision = position.coords.accuracy

                setLatitud(Number(lat.toFixed(6)))
                setLongitud(Number(lng.toFixed(6)))

                toast.success(
                    `📍 Ubicación capturada (precisión: ${Math.round(precision)}m)`,
                    { id: 'gps' }
                )
                setCapturandoGPS(false)
            },
            (error) => {
                console.error('Error GPS:', error)
                let mensaje = 'Error al obtener ubicación'

                if (error.code === error.PERMISSION_DENIED) {
                    mensaje = 'Permisos de GPS denegados. Actívalos en tu navegador.'
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    mensaje = 'Ubicación no disponible. ¿Estás en interiores?'
                } else if (error.code === error.TIMEOUT) {
                    mensaje = 'Tiempo de espera agotado. Intenta de nuevo.'
                }

                toast.error(mensaje, { id: 'gps' })
                setCapturandoGPS(false)
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        )
    }

    const handleGuardar = async () => {
        if (!nombre.trim()) {
            toast.error('Ingresa un nombre para la ubicación')
            return
        }

        if (latitud === '' || longitud === '') {
            toast.error('Captura la ubicación GPS primero')
            return
        }

        if (radio < 10 || radio > 1000) {
            toast.error('El radio debe estar entre 10 y 1000 metros')
            return
        }

        setGuardando(true)

        try {
            const response = await fetch('/api/ubicaciones/guardar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editando,
                    nombre: nombre.trim(),
                    latitud,
                    longitud,
                    radio_permitido: radio,
                    activa: true
                })
            })

            const data = await response.json()

            if (response.ok) {
                toast.success(data.mensaje)
                limpiarFormulario()
                cargarUbicaciones()
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

    const editarUbicacion = (ubicacion: Ubicacion) => {
        setEditando(ubicacion.id)
        setNombre(ubicacion.nombre)
        setLatitud(ubicacion.latitud)
        setLongitud(ubicacion.longitud)
        setRadio(ubicacion.radio_permitido)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const limpiarFormulario = () => {
        setEditando(null)
        setNombre('')
        setLatitud('')
        setLongitud('')
        setRadio(100)
    }

    const abrirEnMaps = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
    }

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Cargando ubicaciones...</p>
            </div>
        )
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
        }}>
            {/* FORMULARIO */}
            <div style={{
                padding: '2rem',
                background: 'var(--card-background)',
                borderRadius: '12px',
                border: '2px solid var(--border-color)'
            }}>
                <h3 style={{
                    margin: '0 0 1.5rem 0',
                    color: 'var(--text-primary)',
                    fontSize: '1.25rem'
                }}>
                    {editando ? '✏️ Editar Ubicación' : '➕ Nueva Ubicación'}
                </h3>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    {/* Nombre */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'var(--text-secondary)',
                            fontSize: '0.875rem',
                            fontWeight: 600
                        }}>
                            Nombre de la Barbería
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Chamos Barber - Providencia"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'var(--input-background)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    {/* Capturar GPS */}
                    <button
                        onClick={capturarUbicacionActual}
                        disabled={capturandoGPS}
                        style={{
                            padding: '1rem',
                            background: capturandoGPS
                                ? 'var(--border-color)'
                                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: capturandoGPS ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {capturandoGPS ? '📡 Obteniendo GPS...' : '📍 Capturar Ubicación Actual'}
                    </button>

                    {/* Coordenadas */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem'
                    }}>
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: 'var(--text-secondary)',
                                fontSize: '0.875rem',
                                fontWeight: 600
                            }}>
                                Latitud
                            </label>
                            <input
                                type="number"
                                step="0.000001"
                                value={latitud}
                                onChange={(e) => setLatitud(e.target.value ? Number(e.target.value) : '')}
                                placeholder="-33.437916"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'var(--input-background)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.875rem',
                                    fontFamily: 'monospace'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: 'var(--text-secondary)',
                                fontSize: '0.875rem',
                                fontWeight: 600
                            }}>
                                Longitud
                            </label>
                            <input
                                type="number"
                                step="0.000001"
                                value={longitud}
                                onChange={(e) => setLongitud(e.target.value ? Number(e.target.value) : '')}
                                placeholder="-70.650410"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'var(--input-background)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.875rem',
                                    fontFamily: 'monospace'
                                }}
                            />
                        </div>
                    </div>

                    {/* Radio permitido */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'var(--text-secondary)',
                            fontSize: '0.875rem',
                            fontWeight: 600
                        }}>
                            Radio Permitido: <strong style={{ color: 'var(--text-primary)' }}>{radio}m</strong>
                        </label>
                        <input
                            type="range"
                            min="10"
                            max="500"
                            step="10"
                            value={radio}
                            onChange={(e) => setRadio(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            marginTop: '0.25rem'
                        }}>
                            <span>10m (muy estricto)</span>
                            <span>500m (muy flexible)</span>
                        </div>
                    </div>

                    {/* Botones */}
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        marginTop: '0.5rem'
                    }}>
                        <button
                            onClick={handleGuardar}
                            disabled={guardando || !nombre.trim() || latitud === '' || longitud === ''}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                background: guardando || !nombre.trim() || latitud === '' || longitud === ''
                                    ? 'var(--border-color)'
                                    : 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
                                color: guardando || !nombre.trim() || latitud === '' || longitud === ''
                                    ? 'var(--text-secondary)'
                                    : '#121212',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: guardando || !nombre.trim() || latitud === '' || longitud === ''
                                    ? 'not-allowed'
                                    : 'pointer'
                            }}
                        >
                            {guardando ? '💾 Guardando...' : editando ? '✓ Actualizar' : '✓ Guardar Ubicación'}
                        </button>

                        {editando && (
                            <button
                                onClick={limpiarFormulario}
                                style={{
                                    padding: '1rem 1.5rem',
                                    background: 'var(--border-color)',
                                    color: 'var(--text-primary)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ✕ Cancelar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* LISTA DE UBICACIONES */}
            <div>
                <h3 style={{
                    margin: '0 0 1rem 0',
                    color: 'var(--text-primary)',
                    fontSize: '1.25rem'
                }}>
                    📍 Ubicaciones Registradas ({ubicaciones.length})
                </h3>

                {ubicaciones.length === 0 ? (
                    <div style={{
                        padding: '3rem 2rem',
                        background: 'var(--card-background)',
                        borderRadius: '12px',
                        textAlign: 'center',
                        border: '2px dashed var(--border-color)'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🗺️</div>
                        <p style={{
                            margin: 0,
                            color: 'var(--text-secondary)',
                            fontSize: '0.875rem'
                        }}>
                            No hay ubicaciones registradas. Captura la ubicación GPS de tu barbería.
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        {ubicaciones.map((ubicacion) => (
                            <div
                                key={ubicacion.id}
                                style={{
                                    padding: '1.5rem',
                                    background: 'var(--card-background)',
                                    borderRadius: '12px',
                                    border: `2px solid ${ubicacion.activa ? '#10b981' : 'var(--border-color)'}`,
                                    opacity: ubicacion.activa ? 1 : 0.6
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '1rem'
                                }}>
                                    <div>
                                        <h4 style={{
                                            margin: '0 0 0.5rem 0',
                                            color: 'var(--text-primary)',
                                            fontSize: '1.1rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {ubicacion.nombre}
                                        </h4>
                                        <div style={{
                                            display: 'inline-block',
                                            padding: '0.25rem 0.75rem',
                                            background: ubicacion.activa
                                                ? 'rgba(16, 185, 129, 0.2)'
                                                : 'rgba(156, 163, 175, 0.2)',
                                            color: ubicacion.activa ? '#10b981' : '#9ca3af',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {ubicacion.activa ? '✓ Activa' : '✕ Inactiva'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => editarUbicacion(ubicacion)}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            background: 'var(--border-color)',
                                            color: 'var(--text-primary)',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '0.875rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✏️ Editar
                                    </button>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '1rem',
                                    marginBottom: '1rem'
                                }}>
                                    <div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-secondary)',
                                            marginBottom: '0.25rem'
                                        }}>
                                            Latitud
                                        </div>
                                        <div style={{
                                            color: 'var(--text-primary)',
                                            fontFamily: 'monospace',
                                            fontSize: '0.875rem'
                                        }}>
                                            {ubicacion.latitud.toFixed(6)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-secondary)',
                                            marginBottom: '0.25rem'
                                        }}>
                                            Longitud
                                        </div>
                                        <div style={{
                                            color: 'var(--text-primary)',
                                            fontFamily: 'monospace',
                                            fontSize: '0.875rem'
                                        }}>
                                            {ubicacion.longitud.toFixed(6)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-secondary)',
                                            marginBottom: '0.25rem'
                                        }}>
                                            Radio Permitido
                                        </div>
                                        <div style={{
                                            color: 'var(--text-primary)',
                                            fontSize: '0.875rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {ubicacion.radio_permitido}m
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => abrirEnMaps(ubicacion.latitud, ubicacion.longitud)}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        width: '100%'
                                    }}
                                >
                                    🗺️ Ver en Google Maps
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
