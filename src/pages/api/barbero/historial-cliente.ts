// ================================================================
// API: Historial de Cliente
// Obtiene citas pasadas de un cliente para la ficha técnica
// ================================================================

import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient } from '@/lib/supabase-server'
import { createPagesServerClient } from '@/lib/supabase-server'

const supabase = createPagesAdminClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' })
    }

    const supabaseAuth = createPagesServerClient(req, res)
    const { data: { session } } = await supabaseAuth.auth.getSession()
    if (!session) {
        return res.status(401).json({ error: 'No autorizado' })
    }

    try {
        const { nombre } = req.query

        if (!nombre) {
            return res.status(400).json({ success: false, error: 'Nombre de cliente requerido' })
        }

        // Buscar citas completadas del cliente
        // Filtramos por nombre exacto (podría mejorarse con ID de cliente si existiera tabla clientes robusta)
        const { data, error } = await supabase
            .from('citas')
            .select(`
        id,
        fecha,
        hora,
        notas_tecnicas,
        foto_resultado_url,
        servicios (nombre)
      `)
            .eq('cliente_nombre', nombre as string)
            .eq('estado', 'completada')
            .order('fecha', { ascending: false })
            .limit(5)

        if (error) throw error

        return res.status(200).json({
            success: true,
            data
        })

    } catch (error: any) {
        console.error('Error en historial-cliente:', error)
        return res.status(500).json({ success: false, error: 'Error interno del servidor' })
    }
}
