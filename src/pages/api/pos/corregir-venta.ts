import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' })
    }

    const { facturaId, nuevoBarberoId, nuevoServicioId, nuevoMetodoPago } = req.body

    if (!facturaId) {
        return res.status(400).json({ message: 'Falta el ID de la factura' })
    }

    try {
        // 1. Obtener datos de la factura original
        const { data: factura, error: facturaError } = await supabase
            .from('facturas')
            .select('*')
            .eq('id', facturaId)
            .single()

        if (facturaError || !factura) {
            return res.status(404).json({ message: 'Factura no encontrada' })
        }

        let barbero_id = nuevoBarberoId || factura.barbero_id
        let porcentajeComision = factura.porcentaje_comision
        let total = parseFloat(factura.total.toString())
        let items = Array.isArray(factura.items) ? [...factura.items] : []

        // 2. Si hay nuevo barbero, obtener su porcentaje de comisión
        if (nuevoBarberoId && nuevoBarberoId !== factura.barbero_id) {
            const { data: barbero, error: barberoError } = await supabase
                .from('barberos')
                .select('porcentaje_comision')
                .eq('id', nuevoBarberoId)
                .single()

            if (!barberoError && barbero) {
                porcentajeComision = barbero.porcentaje_comision || 50
            }
        }

        // 3. Si hay nuevo servicio, obtener su precio y actualizar items
        if (nuevoServicioId) {
            const { data: servicio, error: servicioError } = await supabase
                .from('servicios')
                .select('nombre, precio')
                .eq('id', nuevoServicioId)
                .single()

            if (!servicioError && servicio) {
                total = servicio.precio
                // Actualizar el primer item (asumimos que es el servicio principal)
                if (items.length > 0) {
                    items[0] = {
                        ...items[0],
                        servicio: servicio.nombre,
                        precio: total
                    }
                } else {
                    items = [{
                        servicio: servicio.nombre,
                        precio: total,
                        cantidad: 1
                    }]
                }
            }
        }

        // 4. Recalcular comisiones
        const comisionBarbero = Math.floor(total * (porcentajeComision / 100))
        const ingresoCasa = total - comisionBarbero

        // 5. Actualizar factura
        const { error: updateFacturaError } = await supabase
            .from('facturas')
            .update({
                barbero_id: barbero_id,
                porcentaje_comision: porcentajeComision,
                comision_barbero: comisionBarbero,
                ingreso_casa: ingresoCasa,
                total: total,
                subtotal: total,
                items: items,
                metodo_pago: nuevoMetodoPago || factura.metodo_pago,
                updated_at: new Date().toISOString()
            })
            .eq('id', facturaId)

        if (updateFacturaError) throw updateFacturaError

        // 6. Actualizar cita asociada si existe
        if (factura.cita_id) {
            const updateCita: any = {
                updated_at: new Date().toISOString()
            }
            if (nuevoBarberoId) updateCita.barbero_id = nuevoBarberoId
            if (nuevoServicioId) updateCita.servicio_id = nuevoServicioId

            await supabase
                .from('citas')
                .update(updateCita)
                .eq('id', factura.cita_id)
        }

        return res.status(200).json({
            success: true,
            message: 'Venta corregida exitosamente',
            data: {
                total,
                comision: comisionBarbero
            }
        })

    } catch (error: any) {
        console.error('Error en corregir-venta:', error)
        return res.status(500).json({ message: 'Error interno del servidor', error: error.message })
    }
}
