/**
 * =====================================================
 * MARCAR ASISTENCIA - BARBERO
 * =====================================================
 * Componente para que el barbero marque su asistencia diaria
 */

'use client'

import { useState, useEffect } from 'react'
import { useSupabaseClient } from '@/lib/insforge-react'
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
            const { getChileHoy } = await import('@/lib/date-utils')
            const fechaHoy = getChileHoy()

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
            // 🌍 PASO 1: Intentar obtener ubicación GPS (opcional durante pruebas)
            let latitud: number | null = null
            let longitud: number | null = null

            if (navigator.geolocation) {
                toast.loading('📍 Obteniendo tu ubicación...', { id: 'gps' })

                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0
                        })
                    })

                    latitud = position.coords.latitude
                    longitud = position.coords.longitude
                    toast.success('✓ Ubicación obtenida', { id: 'gps' })
                } catch (gpsError) {
                    // ⚠️ GPS falló pero continuamos (modo pruebas)
                    console.warn('⚠️ GPS no disponible, continuando sin ubicación:', gpsError)
                    toast.dismiss('gps')
                    toast('⚠️ Continuando sin GPS (modo pruebas)', { icon: '📍' })
                }
            }

            // 🔐 PASO 2: Enviar asistencia con ubicación (o sin ella)
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
            <div className="bg-white/[0.02] border border-white/10 p-8 rounded-3xl backdrop-blur-xl text-center">
                <i className="fas fa-circle-notch fa-spin text-gold text-3xl mb-4"></i>
                <p className="text-white/60 font-medium tracking-wider uppercase text-sm">Verificando asistencia...</p>
            </div>
        )
    }

    // Ya marcó hoy
    if (asistenciaHoy) {
        const esNormal = asistenciaHoy.estado === 'normal'

        return (
            <div className={`p-8 rounded-3xl backdrop-blur-xl text-center transition-all ${
                esNormal 
                    ? 'bg-green-500/5 border border-green-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]' 
                    : 'bg-yellow-500/5 border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.1)]'
            }`}>
                <div className="text-6xl mb-6">
                    {esNormal ? '✅' : '⚠️'}
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
                    Asistencia Registrada
                </h3>
                <p className="text-white/70 text-lg">
                    Llegaste a las <strong className="text-white font-black">{asistenciaHoy.hora}</strong>
                </p>
                {!esNormal && (
                    <div className="mt-4 inline-block px-4 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 font-bold text-sm tracking-wider uppercase">
                        Tarde
                    </div>
                )}
            </div>
        )
    }

    // Pendiente de marcar
    return (
        <div className="bg-white/[0.02] border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
            <div className="text-center mb-8">
                <div className="text-6xl mb-4 opacity-90 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                    ⏰
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
                    Marcar Asistencia
                </h3>
                <p className="text-white/60 text-sm">
                    Ingresa la clave del día (pídela a recepción)
                </p>
            </div>

            <div className="flex flex-col gap-6 max-w-sm mx-auto">
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
                    className="w-full px-6 py-4 bg-[#0a0a0a] border-2 border-gold/30 focus:border-gold rounded-2xl text-white text-center text-3xl font-mono tracking-[0.2em] shadow-[0_0_20px_rgba(212,175,55,0.1)] focus:shadow-[0_0_30px_rgba(212,175,55,0.2)] focus:outline-none transition-all placeholder:text-white/20 uppercase"
                    maxLength={8}
                />

                <button
                    onClick={handleMarcar}
                    disabled={loading || !clave.trim()}
                    className="w-full relative group inline-flex overflow-hidden rounded-2xl bg-gold/20 p-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="w-full relative bg-gradient-to-br from-gold to-[#a88647] px-8 py-4 rounded-2xl transition-all duration-300 group-hover:brightness-110 flex items-center justify-center gap-2">
                        {loading ? (
                            <><i className="fas fa-circle-notch fa-spin text-[#080808]"></i><span className="text-[#080808] font-black uppercase tracking-wider text-lg">Marcando...</span></>
                        ) : (
                            <><i className="fas fa-check text-[#080808]"></i><span className="text-[#080808] font-black uppercase tracking-wider text-lg">Marcar Asistencia</span></>
                        )}
                    </div>
                </button>
            </div>

            <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <strong className="text-blue-400 font-bold flex items-center gap-2 mb-3">
                    <i className="fas fa-lightbulb text-xl"></i> Información
                </strong>
                <ul className="space-y-2 text-sm text-blue-200/80 ml-6 list-disc">
                    <li>La clave cambia cada día</li>
                    <li>Solo puedes marcar una vez por día</li>
                    <li><strong className="text-blue-300">📍 Debes estar en la barbería (GPS)</strong></li>
                    <li>Acepta los permisos de ubicación</li>
                </ul>
            </div>

            {debugError && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-mono text-red-400 break-all">
                    <strong className="block mb-1">DEBUG:</strong> {debugError}
                </div>
            )}
        </div>
    )
}
