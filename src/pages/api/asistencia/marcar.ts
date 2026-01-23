import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

/**
 * =====================================================
 * API: MARCAR ASISTENCIA
 * =====================================================
 * Registra la asistencia del barbero con la clave del día
 * Validaciones:
 * - Usuario autenticado
 * - Clave correcta
 * - Clave del día actual
 * - No haber marcado ya hoy
 */

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' })
    }

    try {
        const { clave } = req.body

        if (!clave || typeof clave !== 'string') {
            return res.status(400).json({ error: 'Clave requerida' })
        }

        const supabase = createPagesServerClient({ req, res })

        // 1. Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('❌ [marcar-asistencia] Error de autenticación:', authError)
            return res.status(401).json({ error: 'No autenticado' })
        }

        const barberoId = user.id

        console.log(`🔵 [marcar-asistencia] Barbero ${barberoId} intenta marcar con clave: ${clave}`)

        // 2. Obtener fecha y hora actual del servidor (CRÍTICO para seguridad)
        const ahora = new Date()
        const fechaActual = ahora.toISOString().split('T')[0] // YYYY-MM-DD
        const horaActual = ahora.toTimeString().split(' ')[0].substring(0, 5) // HH:MM

        console.log(`📅 [marcar-asistencia] Fecha: ${fechaActual}, Hora: ${horaActual}`)

        // 3. Buscar clave en la base de datos
        const { data: claveDB, error: claveError } = await supabase
            .from('claves_diarias')
            .select('*')
            .eq('fecha', fechaActual)
            .eq('activa', true)
            .single()

        if (claveError || !claveDB) {
            console.error('❌ [marcar-asistencia] No existe clave para hoy')
            return res.status(400).json({
                error: 'No hay clave generada para hoy. Contacta a recepción.'
            })
        }

        // 4. Validar que la clave coincida
        if (claveDB.clave !== clave.trim().toUpperCase()) {
            console.error(`❌ [marcar-asistencia] Clave incorrecta. Esperada: ${claveDB.clave}, Recibida: ${clave}`)
            return res.status(400).json({
                error: 'Clave incorrecta. Verifica e intenta de nuevo.'
            })
        }

        // 5. Verificar que el barbero no haya marcado ya hoy
        const { data: asistenciaExistente, error: buscarError } = await supabase
            .from('asistencias')
            .select('*')
            .eq('barbero_id', barberoId)
            .eq('fecha', fechaActual)
            .single()

        if (asistenciaExistente) {
            console.warn(`⚠️ [marcar-asistencia] Barbero ya marcó hoy a las ${asistenciaExistente.hora}`)
            return res.status(400).json({
                error: `Ya marcaste asistencia hoy a las ${asistenciaExistente.hora}`
            })
        }

        // 6. Obtener configuración de horarios
        const { data: configuracion } = await supabase
            .from('configuracion_horarios')
            .select('hora_entrada_puntual')
            .eq('activa', true)
            .limit(1)
            .single()

        // Usar configuración o valor por defecto
        let limiteNormal = 9 * 60 + 30 // 9:30 AM por defecto

        if (configuracion && configuracion.hora_entrada_puntual) {
            const [horaLimite, minutosLimite] = configuracion.hora_entrada_puntual.split(':').map(Number)
            limiteNormal = horaLimite * 60 + minutosLimite
        }

        // 7. Determinar estado (normal o tarde)
        const [hora, minutos] = horaActual.split(':').map(Number)
        const minutosTotales = hora * 60 + minutos

        const estado = minutosTotales <= limiteNormal ? 'normal' : 'tarde'

        // 7. Obtener información del dispositivo y IP (auditoría)
        const dispositivo = req.headers['user-agent'] || 'Desconocido'
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            (req.headers['x-real-ip'] as string) ||
            req.socket.remoteAddress ||
            null

        console.log(`📱 [marcar-asistencia] Dispositivo: ${dispositivo}`)
        console.log(`🌐 [marcar-asistencia] IP: ${ipAddress}`)

        // 8. Insertar asistencia
        const { data: nuevaAsistencia, error: insertError } = await supabase
            .from('asistencias')
            .insert({
                barbero_id: barberoId,
                fecha: fechaActual,
                hora: horaActual,
                clave_usada: clave.trim().toUpperCase(),
                estado: estado,
                dispositivo: dispositivo,
                ip_address: ipAddress
            })
            .select()
            .single()

        if (insertError) {
            console.error('❌ [marcar-asistencia] Error al insertar:', insertError)

            // Verificar si es error de duplicado (race condition)
            if (insertError.code === '23505') {
                return res.status(400).json({
                    error: 'Ya marcaste asistencia hoy.'
                })
            }

            return res.status(500).json({ error: 'Error al registrar asistencia' })
        }

        // 9. Obtener nombre del barbero para respuesta
        const { data: barberoData } = await supabase
            .from('barberos')
            .select('nombre')
            .eq('id', barberoId)
            .single()

        const nombreBarbero = barberoData?.nombre || 'Barbero'

        console.log(`✅ [marcar-asistencia] Asistencia registrada: ${nombreBarbero} - ${horaActual} - ${estado}`)

        return res.status(200).json({
            success: true,
            asistencia: {
                fecha: nuevaAsistencia.fecha,
                hora: nuevaAsistencia.hora,
                estado: nuevaAsistencia.estado,
                nombre: nombreBarbero
            },
            mensaje: estado === 'normal'
                ? `✅ Asistencia registrada a las ${horaActual}`
                : `⚠️ Asistencia registrada a las ${horaActual} (Tarde)`
        })

    } catch (error: any) {
        console.error('❌ [marcar-asistencia] Error general:', error)
        return res.status(500).json({ error: 'Error interno del servidor' })
    }
}
