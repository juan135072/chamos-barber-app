import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient, getUserFromBearer } from '@/lib/supabase-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' })
    }

    const supabase = createPagesAdminClient()
    const { facturaId, motivo_anulacion, usuario_id, claveSeguridad } = req.body

    if (!facturaId) {
        return res.status(400).json({ message: 'Falta el ID de la factura' })
    }

    try {
        // 0. Autenticar al usuario llamante
        const authHeader = req.headers.authorization
        const token = authHeader?.replace('Bearer ', '')
        const { data: { user } } = await getUserFromBearer(token)

        if (!user) {
            return res.status(401).json({ message: 'No autenticado' })
        }

        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('comercio_id, rol')
            .eq('id', user.id)
            .single()

        if (!adminUser?.comercio_id) {
            return res.status(403).json({ message: 'Sin permisos' })
        }

        // 1. Obtener la factura y verificar que pertenece al tenant del usuario
        const { data: factura, error: facturaError } = await supabase
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

        // 2. Verificar clave de seguridad del tenant correcto
        const { data: configClave } = await supabase
            .from('sitio_configuracion')
            .select('valor')
            .eq('clave', 'pos_clave_seguridad')
            .eq('comercio_id', adminUser.comercio_id)
            .single()

        if (configClave && configClave.valor && configClave.valor !== claveSeguridad) {
            return res.status(403).json({ success: false, message: 'Clave de seguridad incorrecta' })
        }

        // 3. Anular la factura
        // Validamos que usuario_id sea un UUID válido o null
        const esUUIDValido = usuario_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(usuario_id)

        const { error: updateFacturaError } = await supabase
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

        // 3. Si tiene cita asociada, revertir el estado de pago
        if (factura.cita_id) {
            const { error: updateCitaError } = await supabase
                .from('citas')
                .update({
                    estado_pago: 'pendiente',
                    updated_at: new Date().toISOString()
                })
                .eq('id', factura.cita_id)

            if (updateCitaError) {
                console.error('Error al revertir estado de cita:', updateCitaError)
                // No lanzamos error para no fallar la anulación de la factura, 
                // pero lo registramos.
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Venta anulada exitosamente. La cita (si existe) ha vuelto a estado pendiente.'
        })

    } catch (error: any) {
        console.error('Error en anular-venta:', error)
        return res.status(500).json({ message: 'Error interno del servidor', error: error.message })
    }
}
