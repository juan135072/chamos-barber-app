import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' })
    }

    const { facturaId, motivo_anulacion, usuario_id, claveSeguridad } = req.body

    if (!facturaId) {
        return res.status(400).json({ message: 'Falta el ID de la factura' })
    }

    try {
        // 0. Verificar clave de seguridad
        const { data: configClave } = await supabase
            .from('sitio_configuracion')
            .select('valor')
            .eq('clave', 'pos_clave_seguridad')
            .single()

        if (configClave && configClave.valor && configClave.valor !== claveSeguridad) {
            return res.status(403).json({ success: false, message: 'Clave de seguridad incorrecta' })
        }

        // 1. Obtener la factura para saber si tiene cita asociada
        const { data: factura, error: facturaError } = await supabase
            .from('facturas')
            .select('*')
            .eq('id', facturaId)
            .single()

        if (facturaError || !factura) {
            return res.status(404).json({ message: 'Factura no encontrada' })
        }

        if (factura.anulada) {
            return res.status(400).json({ message: 'La factura ya está anulada' })
        }

        // 2. Anular la factura
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
