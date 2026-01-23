import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@/lib/supabase-server'

/**
 * =====================================================
 * API: LISTAR UBICACIONES DE BARBERÍAS
 * =====================================================
 * Obtiene todas las ubicaciones registradas
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

        // Obtener todas las ubicaciones
        const { data: ubicaciones, error } = await supabase
            .from('ubicaciones_barberia')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('❌ [listar-ubicaciones] Error:', error)
            return res.status(500).json({ error: 'Error al obtener ubicaciones' })
        }

        return res.status(200).json({ ubicaciones })

    } catch (error: any) {
        console.error('❌ [listar-ubicaciones] Error general:', error)
        return res.status(500).json({ error: 'Error interno del servidor' })
    }
}
