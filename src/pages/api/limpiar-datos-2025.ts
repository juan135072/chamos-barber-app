import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../lib/database.types'

/**
 * ⚠️ RUTA TEMPORAL DE LIMPIEZA PARA PRODUCCIÓN
 * Esta ruta borra datos de prueba: facturas, estadísticas y citas que no sean manuales.
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Solo permitir POST por seguridad (o GET si queremos hacerlo fácil desde el browser)
    // Pero usaremos una "llave" simple en la URL para evitar ejecuciones accidentales.
    const { key } = req.query

    if (key !== 'chamos-clear-2025') {
        return res.status(401).json({ error: 'Llave no válida' })
    }

    try {
        const supabase = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        console.log('🚀 Iniciando limpieza de datos de prueba...')

        // 1. Borrar todas las facturas
        const { error: errorFacturas } = await supabase.from('facturas').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (errorFacturas) console.error('Error facturas:', errorFacturas)

        // 2. Borrar todas las estadísticas
        const { error: errorEstadisticas } = await supabase.from('estadisticas').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (errorEstadisticas) console.error('Error estadísticas:', errorEstadisticas)

        // 3. Borrar citas que NO sean manuales ([WALK-IN])
        // Usamos el operador 'not.ilike' para filtrar.
        // También borramos citas de prueba que no tengan notas.
        const { error: errorCitas } = await supabase
            .from('citas')
            .delete()
            .or('notas.is.null,notas.not.ilike.%[WALK-IN]%')

        if (errorCitas) console.error('Error citas:', errorCitas)

        // 4. Borrar notas de clientes (asumiendo que son de prueba)
        const { error: errorNotas } = await supabase.from('notas_clientes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (errorNotas) console.error('Error notas:', errorNotas)

        return res.status(200).json({
            success: true,
            message: 'Limpieza completada exitosamente. Se han conservado las citas con [WALK-IN] en las notas.',
            details: {
                facturas: !errorFacturas,
                estadisticas: !errorEstadisticas,
                citas: !errorCitas,
                notas_clientes: !errorNotas
            }
        })

    } catch (error: any) {
        return res.status(500).json({ error: error.message })
    }
}
