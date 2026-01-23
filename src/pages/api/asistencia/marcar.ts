import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@/lib/supabase-server'

/**
 * =====================================================
 * API: MARCAR ASISTENCIA (POST)
 * =====================================================
 * Registra la entrada o salida de un barbero con validación GPS y clave del día.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' })
    }

    try {
        const { clave, latitud, longitud, ubicacion_id } = req.body

        if (!clave || typeof clave !== 'string') {
            return res.status(400).json({ error: 'Clave requerida' })
        }

        // Inicializar cliente con helper de servidor (v0.15.0 compatible)
        const supabase = createPagesServerClient(req, res)

        // 1. Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('❌ [marcar-asistencia] Error de autenticación:', authError)
            return res.status(401).json({ error: 'No autenticado' })
        }

        const barberoId = user.id

        // 2. Obtener información del barbero (para logs y verificación)
        const { data: barbero, error: barberoError } = await supabase
            .from('barberos')
            .select('nombre, apellido, activo')
            .eq('id', barberoId)
            .single()

        if (barberoError || !barbero) {
            return res.status(404).json({ error: 'Perfil de barbero no encontrado' })
        }

        if (!barbero.activo) {
            return res.status(403).json({ error: 'Tu cuenta de barbero está inactivada' })
        }

        // 3. Verificar si ya marcó hoy
        const fechaActual = new Date().toISOString().split('T')[0]
        const { data: asistenciaExistente } = await supabase
            .from('asistencias')
            .select('id, hora, estado')
            .eq('barbero_id', barberoId)
            .eq('fecha', fechaActual)
            .maybeSingle()

        if (asistenciaExistente) {
            return res.status(400).json({
                error: 'Ya has registrado tu asistencia por hoy',
                asistencia: asistenciaExistente
            })
        }

        // 4. Validar Clave del Día
        const { data: claveValida, error: claveError } = await supabase
            .from('claves_diarias')
            .select('clave')
            .eq('fecha', fechaActual)
            .eq('activa', true)
            .eq('clave', clave.trim().toUpperCase())
            .maybeSingle()

        if (claveError || !claveValida) {
            return res.status(403).json({ error: 'La clave ingresada es incorrecta o ha expirado' })
        }

        // 🌍 5. Validar Geolocalización (GPS)
        // Se requiere que el frontend envíe latitud, longitud y ubicacion_id
        if (!latitud || !longitud || !ubicacion_id) {
            return res.status(400).json({
                error: 'Se requiere información de ubicación (GPS) para marcar asistencia'
            })
        }

        // Llamar a la función RPC que calcula si está dentro del radio
        const { data: ubicacionValida, error: gpsError } = await supabase
            .rpc('ubicacion_es_valida', {
                p_lat: latitud,
                p_lng: longitud,
                p_ubicacion_id: ubicacion_id
            })

        if (gpsError || !ubicacionValida) {
            console.error('❌ [GPS] Error o ubicación fuera de rango:', gpsError)
            return res.status(403).json({
                error: 'No estás en la zona permitida de la barbería para marcar asistencia'
            })
        }

        // Obtener la distancia para registrarla (metadatos)
        const { data: infoDistancia } = await supabase
            .rpc('calcular_distancia_metros', {
                lat1: latitud,
                lng1: longitud,
                u_id: ubicacion_id
            })

        // 6. Determinar Estado (Normal / Tarde) basado en la configuración
        const ahora = new Date()
        const horaActual = ahora.toLocaleTimeString('es-CL', { hour12: false, hour: '2-digit', minute: '2-digit' })

        // Obtener configuración de horarios activa
        const { data: configuracion } = await supabase
            .from('configuracion_horarios')
            .select('hora_entrada_puntual')
            .eq('activa', true)
            .limit(1)
            .single()

        const horaLimiteStr = configuracion?.hora_entrada_puntual || '09:30'

        const [hActual, mActual] = horaActual.split(':').map(Number)
        const [hLimite, mLimite] = horaLimiteStr.split(':').map(Number)

        const minutosTotales = hActual * 60 + mActual
        const limiteNormal = hLimite * 60 + mLimite

        const estado = minutosTotales <= limiteNormal ? 'normal' : 'tarde'

        // Metadatos adicionales
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        const dispositivo = req.headers['user-agent'] || 'Desconocido'

        // 7. Registrar Asistencia
        const { data: nuevaAsistencia, error: insertError } = await supabase
            .from('asistencias')
            .insert({
                barbero_id: barberoId,
                fecha: fechaActual,
                hora: horaActual,
                clave_usada: clave.trim().toUpperCase(),
                estado: estado,
                dispositivo: dispositivo,
                ip_address: typeof ipAddress === 'string' ? ipAddress : null,
                latitud_registrada: latitud,
                longitud_registrada: longitud,
                distancia_metros: typeof infoDistancia === 'number' ? infoDistancia : null,
                ubicacion_barberia_id: ubicacion_id
            })
            .select()
            .single()

        if (insertError) {
            console.error('❌ Error al insertar asistencia:', insertError)
            return res.status(500).json({ error: 'Error al registrar la asistencia en la base de datos' })
        }

        // 8. Respuesta Exitosa
        return res.status(200).json({
            mensaje: `Asistencia marcada correctamente (${estado === 'normal' ? 'Puntual' : 'Tarde'})`,
            asistencia: nuevaAsistencia,
            barbero: {
                nombre: barbero.nombre
            }
        })

    } catch (error) {
        console.error('❌ [API-MARCAR] Error crítico:', error)
        return res.status(500).json({ error: 'Error interno del servidor' })
    }
}
