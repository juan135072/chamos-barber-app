import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@/lib/supabase-server'

/**
 * =====================================================
 * API: HISTORIAL DE ASISTENCIAS
 * =====================================================
 * Retorna el historial de asistencias
 * - Barberos: solo ven sus propias asistencias
 * - Admin: puede ver todas o filtrar por barbero
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

        // Verificar si es admin
        const { data: adminData } = await supabase
            .from('admin_users')
            .select('rol, barbero_id')
            .eq('id', user.id)
            .single()

        const esAdmin = adminData?.rol === 'administrador' || adminData?.rol === 'admin'

        // Obtener parámetros de query
        const { mes, barbero_id, limite = '30' } = req.query

        // Construir query base
        let query = supabase
            .from('asistencias')
            .select(`
        *,
        barberos!inner(nombre)
      `)
            .order('fecha', { ascending: false })
            .limit(parseInt(limite as string))

        // Si no es admin, solo ver sus asistencias
        if (!esAdmin) {
            const barberoIdReal = adminData?.barbero_id || user.id
            query = query.eq('barbero_id', barberoIdReal)
        }
        // Si es admin y especifica un barbero
        else if (barbero_id) {
            query = query.eq('barbero_id', barbero_id as string)
        }

        // Filtrar por mes si se especifica (formato: YYYY-MM)
        if (mes && typeof mes === 'string') {
            const [year, month] = mes.split('-')
            const primerDia = `${year}-${month}-01`
            const ultimoDia = new Date(parseInt(year), parseInt(month), 0).getDate()
            const ultimaFecha = `${year}-${month}-${ultimoDia}`

            query = query
                .gte('fecha', primerDia)
                .lte('fecha', ultimaFecha)
        }

        const { data: asistencias, error: queryError } = await query

        if (queryError) {
            console.error('❌ [historial] Error al consultar:', queryError)
            return res.status(500).json({ error: 'Error al obtener historial' })
        }

        // Calcular estadísticas
        const totalDias = asistencias?.length || 0
        const diasPuntuales = asistencias?.filter(a => a.estado === 'normal').length || 0
        const diasTarde = asistencias?.filter(a => a.estado === 'tarde').length || 0

        return res.status(200).json({
            success: true,
            asistencias: asistencias || [],
            estadisticas: {
                total: totalDias,
                puntuales: diasPuntuales,
                tardes: diasTarde,
                porcentajePuntualidad: totalDias > 0 ? Math.round((diasPuntuales / totalDias) * 100) : 0
            }
        })

    } catch (error: any) {
        console.error('❌ [historial] Error general:', error)
        return res.status(500).json({ error: 'Error interno del servidor' })
    }
}
