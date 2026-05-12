import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

/**
 * =====================================================
 * API: OBTENER CONFIGURACIÓN DE HORARIOS
 * =====================================================
 * Obtiene la configuración activa de horarios
 */

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' })
    }

    try {
        const supabase = createPagesServerClient(req, res)

        // Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return res.status(401).json({ error: 'No autenticado' })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Obtener comercio_id del admin por UUID — unívoco entre tenants
        const { data: adminUser, error: adminQueryError } = await supabaseAdmin
            .from('admin_users')
            .select('comercio_id')
            .eq('id', user.id)
            .single()

        if (adminQueryError) {
            console.error('❌ [configuracion-horarios] Error al consultar admin_users:', adminQueryError)
        }

        if (!adminUser?.comercio_id) {
            return res.status(403).json({ error: 'Usuario no asociado a un comercio' })
        }

        // Obtener configuración activa PARA ESTE COMERCIO usando admin para omitir RLS
        const { data: config, error } = await supabaseAdmin
            .from('configuracion_horarios')
            .select('*')
            .eq('activa', true)
            .eq('comercio_id', adminUser.comercio_id)
            .maybeSingle()

        if (error) {
            // Si no existe configuración, retornar valores por defecto
            if (error.code === 'PGRST116') {
                return res.status(200).json({
                    configuracion: {
                        hora_entrada_puntual: '09:30:00',
                        hora_salida_minima: '18:00:00',
                        nombre: 'Horario General (por defecto)'
                    }
                })
            }

            console.error('❌ [obtener-configuracion] Error:', error)
            return res.status(500).json({ error: 'Error al obtener configuración' })
        }

        return res.status(200).json({ configuracion: config })

    } catch (error: any) {
        console.error('❌ [obtener-configuracion] Error general:', error)
        return res.status(500).json({ error: 'Error interno del servidor' })
    }
}
