import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@/lib/supabase-server'

/**
 * =====================================================
 * API: OBTENER CLAVE ACTUAL
 * =====================================================
 * Retorna la clave activa del día según el timezone configurado
 * Solo accesible por administradores
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

        // Verificar que es administrador y obtener comercio_id
        const { data: adminData, error: adminError } = await supabase
            .from('admin_users')
            .select('rol, comercio_id')
            .eq('id', user.id)
            .single()

        if (adminError || !adminData || !['admin', 'administrador', 'cajero'].includes(adminData.rol)) {
            return res.status(403).json({ error: 'No autorizado' })
        }

        const comercioId = adminData.comercio_id

        if (!comercioId) {
            return res.status(403).json({ error: 'Configuración incompleta: sin comercio asignado' })
        }

        // Obtener timezone configurado para este comercio
        const { data: configTimezone } = await supabase
            .from('sitio_configuracion')
            .select('valor')
            .eq('clave', 'sitio_timezone')
            .eq('comercio_id', comercioId)
            .maybeSingle()

        const timezone = configTimezone?.valor || 'America/Santiago'

        // Calcular fecha actual según timezone
        const { getDynamicHoy } = await import('@/lib/date-utils')
        const fechaActual = getDynamicHoy(timezone)

        // Obtener clave del día para este comercio
        const { data: clave, error: claveError } = await supabase
            .from('claves_diarias')
            .select('*')
            .eq('fecha', fechaActual)
            .eq('activa', true)
            .eq('comercio_id', comercioId)
            .maybeSingle()

        if (claveError) {
            console.error('❌ [clave-actual] Error buscando clave:', claveError)
            return res.status(500).json({ error: 'Error al buscar clave' })
        }

        if (!clave) {
            return res.status(200).json({
                existe: false,
                clave: null,
                fecha: fechaActual,
                timezone: timezone,
                mensaje: 'No hay clave generada para hoy'
            })
        }

        return res.status(200).json({
            existe: true,
            clave: clave.clave,
            fecha: clave.fecha,
            timezone: timezone,
            creada_en: clave.created_at
        })

    } catch (error: any) {
        console.error('❌ [clave-actual] Error:', error)
        return res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        })
    }
}
