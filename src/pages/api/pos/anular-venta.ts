import { requireStaff } from '@/lib/server-authorization'
import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient, getUserFromBearer } from '@/lib/supabase-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' })
    }

    const { facturaId, motivo_anulacion, usuario_id, claveSeguridad } = req.body

    if (!facturaId) {
        return res.status(400).json({ message: 'Falta el ID de la factura' })
    }

    try {
        const actor = await requireStaff(req, res, ['admin', 'cajero'])
        if (!actor) return
        const supabase = actor.admin
        const adminUser = actor.access

        // 1. Obtener la factura y verificar que pertenece al tenant del usuario
        const { data: factura, error: facturaError } = await supabase
            .from('facturas')
            .select('*')
            .eq('id', facturaId)
            .eq('comercio_id', adminUser.comercio_id)
            .single()

        if (facturaError || !factura) {
            return res.status(404).json({ message: 'Factura no encontrada' })
        }

        if (factura.comercio_id !== adminUser.comercio_id) {
            return res.status(403).json({ message: 'No tienes acceso a esta factura' })
        }

        if (factura.anulada) {
            return res.status(400).json({ message: 'La factura ya está anulada' })
        }

        // 2. Verificar clave de seguridad del tenant correcto
        const { data: configClave, error: configError } = await supabase
            .from('sitio_configuracion')
            .select('valor')
            .eq('clave', 'pos_clave_seguridad')
            .eq('comercio_id', adminUser.comercio_id)
            .single()

        if (configError || !configClave?.valor || configClave.valor !== claveSeguridad) {
            return res.status(403).json({ success: false, message: 'Clave de seguridad incorrecta' })
        }

        const { error: changeError } = await supabase.rpc('app_change_sale', {
            p_comercio: adminUser.comercio_id, p_invoice: factura.id, p_actor: actor.user.id,
            p_action: 'cancel', p_data: { motivo: typeof motivo_anulacion === 'string' ? motivo_anulacion.slice(0,2000) : 'Anulación por el cajero' },
        })
        if (changeError) return res.status(409).json({ message: 'No se pudo anular la venta; comprueba si ya está anulada, cerrada o liquidada' })

        return res.status(200).json({
            success: true,
            message: 'Venta anulada exitosamente. La cita (si existe) ha vuelto a estado pendiente.'
        })

    } catch (error: any) {
        console.error('Error en anular-venta:', error)
        return res.status(500).json({ message: 'Error interno del servidor', error: error.message })
    }
}
