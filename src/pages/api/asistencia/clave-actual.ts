import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

/**
 * =====================================================
 * API: OBTENER CLAVE ACTUAL
 * =====================================================
 * Retorna la clave activa del día
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
        const supabase = createPagesServerClient({ req, res })

        // Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return res.status(401).json({ error: 'No autenticado' })
        }

        // Verificar que es administrador
        const { data: adminData, error: adminError } = await supabase
            .from('admin_users')
            .select('rol')
            .eq('id', user.id)
            .single()

        if (adminError || !adminData || adminData.rol !== 'administrador') {
            return res.status(403).json({ error: 'No autorizado' })
        }

        // Obtener clave del día
        const fechaActual = new Date().toISOString().split('T')[0]

        const { data: clave, error: claveError } = await supabase
            .from('claves_diarias')
            .select('*')
            .eq('fecha', fechaActual)
            .eq('activa', true)
            .single()

        if (claveError || !clave) {
            return res.status(200).json({
                existe: false,
                clave: null,
                fecha: fechaActual,
                mensaje: 'No hay clave generada para hoy'
            })
        }

        return res.status(200).json({
            existe: true,
            clave: clave.clave,
            fecha: clave.fecha,
            creada_en: clave.created_at
        })

    } catch (error: any) {
        console.error('❌ [clave-actual] Error:', error)
        return res.status(500).json({ error: 'Error interno del servidor' })
    }
}
