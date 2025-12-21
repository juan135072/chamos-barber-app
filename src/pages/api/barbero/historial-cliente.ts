// ================================================================
// API: Historial de Cliente
// Obtiene citas pasadas de un cliente para la ficha técnica
// ================================================================

import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' })
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
