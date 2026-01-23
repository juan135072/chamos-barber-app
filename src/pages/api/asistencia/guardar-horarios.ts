import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

/**
 * =====================================================
 * API: GUARDAR CONFIGURACIÓN DE HORARIOS
 * =====================================================
 * Permite al admin actualizar los horarios de asistencia
 */

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' })
    }

    try {
        const { hora_entrada_puntual, hora_salida_minima } = req.body

        // Validaciones
        if (!hora_entrada_puntual) {
            return res.status(400).json({ error: 'Hora de entrada requerida' })
        }

        // Validar formato de hora (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        if (!timeRegex.test(hora_entrada_puntual)) {
            return res.status(400).json({ error: 'Formato de hora de entrada inválido (usa HH:MM)' })
        }

        if (hora_salida_minima && !timeRegex.test(hora_salida_minima)) {
            return res.status(400).json({ error: 'Formato de hora de salida inválido (usa HH:MM)' })
        }

        const supabase = createPagesServerClient({ req, res })

        // Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return res.status(401).json({ error: 'No autenticado' })
        }

        // Verificar que es admin
        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('role, rol')
            .eq('id', user.id)
            .single()

        if (!adminUser || (adminUser.role !== 'admin' && adminUser.rol !== 'admin')) {
            return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' })
        }

        // Buscar configuración activa
        const { data: configExistente } = await supabase
            .from('configuracion_horarios')
            .select('id')
            .eq('activa', true)
            .limit(1)
            .single()

        let result

        if (configExistente) {
            // Actualizar existente
            const { data, error } = await supabase
                .from('configuracion_horarios')
                .update({
                    hora_entrada_puntual: hora_entrada_puntual + ':00',
                    hora_salida_minima: hora_salida_minima ? hora_salida_minima + ':00' : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', configExistente.id)
                .select()
                .single()

            if (error) {
                console.error('❌ [guardar-horarios] Error al actualizar:', error)
                return res.status(500).json({ error: 'Error al actualizar configuración' })
            }

            result = data
        } else {
            // Crear nueva
            const { data, error } = await supabase
                .from('configuracion_horarios')
                .insert({
                    nombre: 'Horario General',
                    hora_entrada_puntual: hora_entrada_puntual + ':00',
                    hora_salida_minima: hora_salida_minima ? hora_salida_minima + ':00' : null,
                    activa: true
                })
                .select()
                .single()

            if (error) {
                console.error('❌ [guardar-horarios] Error al crear:', error)
                return res.status(500).json({ error: 'Error al guardar configuración' })
            }

            result = data
        }

        console.log(`✅ [guardar-horarios] Configuración actualizada: Entrada until ${hora_entrada_puntual}`)

        return res.status(200).json({
            success: true,
            configuracion: result,
            mensaje: 'Horarios actualizados correctamente'
        })

    } catch (error: any) {
        console.error('❌ [guardar-horarios] Error general:', error)
        return res.status(500).json({ error: 'Error interno del servidor' })
    }
}
