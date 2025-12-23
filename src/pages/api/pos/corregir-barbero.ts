import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' })
    }

    const { facturaId, nuevoBarberoId, usuarioId } = req.body

    if (!facturaId || !nuevoBarberoId) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos' })
    }

    try {
        // 1. Obtener datos del nuevo barbero
        const { data: barbero, error: barberoError } = await supabase
            .from('barberos')
            .select('nombre, apellido, porcentaje_comision')
            .eq('id', nuevoBarberoId)
            .single()

        if (barberoError || !barbero) {
            return res.status(404).json({ message: 'Barbero no encontrado' })
        }

        // 2. Obtener datos de la factura original
        const { data: factura, error: facturaError } = await supabase
            .from('facturas')
            .select('*')
            .eq('id', facturaId)
            .single()

        if (facturaError || !factura) {
            return res.status(404).json({ message: 'Factura no encontrada' })
        }

        // 3. Recalcular comisión
        const porcentajeComision = barbero.porcentaje_comision || 50
        const total = parseFloat(factura.total.toString())
        const comisionBarbero = Math.floor(total * (porcentajeComision / 100))
        const ingresoCasa = total - comisionBarbero

        // 4. Iniciar transacción de actualización
        // Actualizar factura
        const { error: updateFacturaError } = await supabase
            .from('facturas')
            .update({
                barbero_id: nuevoBarberoId,
                porcentaje_comision: porcentajeComision,
                comision_barbero: comisionBarbero,
                ingreso_casa: ingresoCasa,
                updated_at: new Date().toISOString()
            })
            .eq('id', facturaId)

        if (updateFacturaError) throw updateFacturaError

        // 5. Si tiene una cita asociada, actualizar el barbero en la cita también
        if (factura.cita_id) {
            const { error: updateCitaError } = await supabase
                .from('citas')
                .update({
                    barbero_id: nuevoBarberoId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', factura.cita_id)

            if (updateCitaError) {
                console.error('Error actualizando cita asociada:', updateCitaError)
                // No fallamos toda la operación si esto falla, pero lo logueamos
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Barbero corregido exitosamente',
            data: {
                nuevoBarbero: `${barbero.nombre} ${barbero.apellido}`,
                comision: comisionBarbero
            }
        })

    } catch (error: any) {
        console.error('Error en corregir-barbero:', error)
        return res.status(500).json({ message: 'Error interno del servidor', error: error.message })
    }
}
