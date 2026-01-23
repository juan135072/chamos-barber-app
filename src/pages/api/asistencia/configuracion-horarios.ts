import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

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
        const supabase = createPagesServerClient({ req, res })

        // Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return res.status(401).json({ error: 'No autenticado' })
        }

        // Obtener configuración activa
        const { data: config, error } = await supabase
            .from('configuracion_horarios')
            .select('*')
            .eq('activa', true)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single()

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
