import { requireStaff } from '@/lib/server-authorization'
import { NextApiRequest, NextApiResponse } from 'next'
import { respondPosError } from '@/lib/pos-errors'

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
        const { data: pinValido, error: pinError } = await supabase.rpc('app_verify_pos_pin', {
            p_comercio: adminUser.comercio_id,
            p_pin: typeof claveSeguridad === 'string' ? claveSeguridad : null,
        })
        if (pinError) return respondPosError(res, pinError, 'validar-clave')
        if (pinValido !== true) {
            return res.status(403).json({ success: false, message: 'Clave de seguridad incorrecta' })
        }

        const { error: changeError } = await supabase.rpc('app_change_sale', {
            p_comercio: adminUser.comercio_id, p_invoice: factura.id, p_actor: actor.user.id,
            p_action: 'cancel', p_data: { motivo: typeof motivo_anulacion === 'string' ? motivo_anulacion.slice(0,2000) : 'Anulación por el cajero' },
        })
        if (changeError) return respondPosError(res, changeError, 'anular-venta')

        return res.status(200).json({
            success: true,
            message: 'Venta anulada exitosamente. La cita (si existe) ha vuelto a estado pendiente.'
        })

    } catch (error: any) {
        return respondPosError(res, error, 'anular-venta')
    }
}
