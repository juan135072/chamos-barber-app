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
        console.log('🧪 [API-MARCAR] Inicia proceso:', {
            clave: clave?.substring(0, 3) + '...',
            latitud,
            longitud,
            ubicacion_id
        })

        if (!clave || typeof clave !== 'string') {
            return res.status(400).json({ error: 'Clave requerida' })
        }

        // Inicializar cliente con helper de servidor (v0.15.0 compatible)
        const supabase = createPagesServerClient(req, res)

        // 1. Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('❌ [marcar-asistencia] No autenticado. Error:', authError)
            // Debug de cookies
            console.log('🧪 [API-MARCAR] Cookies recibidas:', req.headers.cookie ? 'SÍ' : 'NO')
            return res.status(401).json({
                error: 'No autenticado',
                debug: authError?.message || 'Sin sesión'
            })
        }

        console.log('🧪 [API-MARCAR] Usuario autenticado:', user.email)

        const { data: adminData } = await supabase
            .from('admin_users')
            .select('barbero_id')
            .eq('id', user.id)
            .single()

        const realBarberoId = adminData?.barbero_id || user.id
        console.log('🧪 [API-MARCAR] ID resultante:', { authId: user.id, realBarberoId })

        // 2. Obtener información del barbero (para logs y verificación)
        // AHORA: También obtenemos comercio_id para el sistema multitenant
        const { data: barbero, error: barberoError } = await supabase
            .from('barberos')
            .select('nombre, apellido, activo, comercio_id')
            .eq('id', realBarberoId)
            .single()

        if (barberoError || !barbero) {
            console.error('❌ [API-MARCAR] Perfil no encontrado para ID:', realBarberoId)
            return res.status(404).json({
                error: 'Perfil de barbero no encontrado',
                debug: `ID buscado: ${realBarberoId}`
            })
        }

        if (!barbero.activo) {
            return res.status(403).json({ error: 'Tu cuenta de barbero está inactivada' })
        }

        const comercioId = barbero.comercio_id

        if (!comercioId) {
            console.error('❌ [API-MARCAR] El barbero no tiene un comercio_id asignado:', realBarberoId)
            return res.status(403).json({ error: 'Configuración incompleta: Tu perfil de barbero no tiene un comercio asignado.' })
        }

        // 3. Obtener zona horaria y fecha actual ESPECÍFICA para este comercio
        const { data: configTimezone } = await supabase
            .from('sitio_configuracion')
            .select('valor')
            .eq('clave', 'sitio_timezone')
            .eq('comercio_id', comercioId)
            .maybeSingle()

        const timezone = configTimezone?.valor || 'America/Santiago'

        const { getDynamicHoy, getDynamicHora } = await import('@/lib/date-utils')
        const fechaActual = getDynamicHoy(timezone)
        const horaActual = getDynamicHora(timezone)

        console.log(`🧪 [API-MARCAR] Procesando para fecha: ${fechaActual}, hora: ${horaActual}, timezone: ${timezone}, comercio: ${comercioId}`)

        // Verificar si ya registró asistencia hoy (en su comercio)
        const { data: asistenciaExistente } = await supabase
            .from('asistencias')
            .select('id, hora, estado')
            .eq('barbero_id', realBarberoId)
            .eq('fecha', fechaActual)
            .eq('comercio_id', comercioId)
            .maybeSingle()

        if (asistenciaExistente) {
            return res.status(400).json({
                error: 'Ya has registrado tu asistencia por hoy',
                asistencia: asistenciaExistente
            })
        }

        // 4. Validar Clave del Día (ESPECÍFICA para este comercio)
        // Normalizar entrada: quitar guiones y espacios, pasar a mayúsculas
        const claveNormalizada = clave.trim().replace(/-/g, '').toUpperCase()

        // Reconstruir guion para búsqueda
        let claveBuscada = claveNormalizada
        if (claveNormalizada.length >= 3) {
            claveBuscada = claveNormalizada.substring(0, 3) + '-' + claveNormalizada.substring(3)
        }

        const { data: claveValida, error: claveError } = await supabase
            .from('claves_diarias')
            .select('clave')
            .eq('fecha', fechaActual)
            .eq('activa', true)
            .eq('comercio_id', comercioId)
            .or(`clave.eq.${claveBuscada},clave.eq.${claveNormalizada}`)
            .maybeSingle()

        if (claveError || !claveValida) {
            return res.status(403).json({ error: 'La clave ingresada es incorrecta o ha expirado' })
        }

        // 🌍 5. Validar Geolocalización (GPS)
        // ⚠️ TEMPORALMENTE DESACTIVADO PARA PRUEBAS - REACTIVAR EN PRODUCCIÓN
        /*
        if (!latitud || !longitud || !ubicacion_id) {
            return res.status(400).json({
                error: 'Se requiere información de ubicación (GPS) para marcar asistencia'
            })
        }

        const { data: ubicacionValida, error: gpsError } = await supabase
            .rpc('ubicacion_es_valida', {
                p_latitud: latitud,
                p_longitud: longitud,
                p_ubicacion_id: ubicacion_id
            })

        if (gpsError || !ubicacionValida) {
            console.error('❌ [GPS] Error o ubicación fuera de rango:', gpsError)
            return res.status(403).json({
                error: 'No estás en la zona permitida de la barbería para marcar asistencia'
            })
        }
        */
        console.log('⚠️ [GPS] Validación GPS DESACTIVADA temporalmente para pruebas')

        // Obtener la distancia para registrarla (metadatos) - solo si hay coordenadas
        let infoDistancia = null
        if (latitud && longitud && ubicacion_id) {
            const { data: ubicacion } = await supabase
                .from('ubicaciones_barberia')
                .select('latitud, longitud')
                .eq('id', ubicacion_id)
                .single()

            if (ubicacion) {
                const { data: distData } = await supabase
                    .rpc('calcular_distancia_metros', {
                        lat1: latitud,
                        lon1: longitud,
                        lat2: ubicacion.latitud,
                        lon2: ubicacion.longitud
                    })
                infoDistancia = distData
            }
        }

        // 6. Determinar Estado (Normal / Tarde) basado en la configuración
        // horaActual ya fue obtenida arriba usando la zona horaria correcta

        // Obtener configuración de horarios activa PARA ESTE COMERCIO
        const { data: configuracion } = await supabase
            .from('configuracion_horarios')
            .select('hora_entrada_puntual')
            .eq('activa', true)
            .eq('comercio_id', comercioId)
            .maybeSingle()

        const horaLimiteStr = configuracion?.hora_entrada_puntual || '09:30'

        const [hActual, mActual] = horaActual.split(':').map(Number)
        const [hLimite, mLimite] = horaLimiteStr.split(':').map(Number)

        const minutosTotales = hActual * 60 + mActual
        const limiteNormal = hLimite * 60 + mLimite

        const estado = minutosTotales <= limiteNormal ? 'normal' : 'tarde'

        // Metadatos adicionales
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        const dispositivo = req.headers['user-agent'] || 'Desconocido'

        // 7. Registrar Asistencia (CON comercio_id)
        const { data: nuevaAsistencia, error: insertError } = await supabase
            .from('asistencias')
            .insert({
                barbero_id: realBarberoId,
                comercio_id: comercioId, // MULTITENANT FIXED
                fecha: fechaActual,
                hora: horaActual,
                clave_usada: clave.trim().toUpperCase(),
                estado: estado,
                dispositivo: dispositivo,
                ip_address: typeof ipAddress === 'string' ? ipAddress : null,
                latitud_registrada: latitud || null,
                longitud_registrada: longitud || null,
                distancia_metros: typeof infoDistancia === 'number' ? infoDistancia : null,
                ubicacion_barberia_id: ubicacion_id || null
            })
            .select()
            .single()

        if (insertError) {
            console.error('❌ Error al insertar asistencia:', insertError)
            return res.status(500).json({
                error: 'Error al registrar la asistencia en la base de datos',
                details: insertError.message,
                code: insertError.code
            })
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
