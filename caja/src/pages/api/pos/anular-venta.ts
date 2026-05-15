import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient, createPagesAdminClient } from '@/lib/supabase-server'

const adminClient = createPagesAdminClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' })
    }

    const { facturaId, motivo_anulacion, usuario_id, claveSeguridad } = req.body

    if (!facturaId) {
        return res.status(400).json({ message: 'Falta el ID de la factura' })
    }

    try {
        const serverClient = createPagesServerClient(req, res)
        const { data: { session } } = await serverClient.auth.getSession()
        const user = session?.user

        if (!user) {
            return res.status(401).json({ message: 'No autenticado' })
        }

        const { data: adminUser } = await adminClient
            .from('admin_users')
            .select('comercio_id, rol')
            .eq('id', user.id)
            .single()

        if (!adminUser?.comercio_id) {
            return res.status(403).json({ message: 'Sin permisos' })
        }

        // 0. Verificar clave scoped por comercio_id
        const { data: configClave } = await adminClient
            .from('sitio_configuracion')
            .select('valor')
            .eq('clave', 'pos_clave_seguridad')
            .eq('comercio_id', adminUser.comercio_id)
            .single()

        if (configClave && configClave.valor && configClave.valor !== claveSeguridad) {
            return res.status(403).json({ success: false, message: 'Clave de seguridad incorrecta' })
        }

        // 1. Obtener la factura y verificar tenant
        const { data: factura, error: facturaError } = await adminClient
            .from('facturas')
            .select('*')
            .eq('id', facturaId)
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

        // 2. Anular
        const esUUIDValido = usuario_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(usuario_id)

        const { error: updateFacturaError } = await adminClient
            .from('facturas')
            .update({
                anulada: true,
                fecha_anulacion: new Date().toISOString(),
                motivo_anulacion: motivo_anulacion || 'Anulación por el cajero',
                anulada_por: esUUIDValido ? usuario_id : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', facturaId)

        if (updateFacturaError) throw updateFacturaError

        // 3. Revertir cita asociada si existe
        if (factura.cita_id) {
            const { error: updateCitaError } = await adminClient
                .from('citas')
                .update({ estado_pago: 'pendiente', updated_at: new Date().toISOString() })
                .eq('id', factura.cita_id)

            if (updateCitaError) {
                console.error('Error al revertir estado de cita:', updateCitaError)
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Venta anulada exitosamente. La cita (si existe) ha vuelto a estado pendiente.'
        })

    } catch (error: any) {
        console.error('Error en anular-venta (caja):', error)
        return res.status(500).json({ message: 'Error interno del servidor', error: error.message })
    }
}
