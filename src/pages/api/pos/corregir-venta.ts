import { requireStaff } from '@/lib/server-authorization'
import { NextApiRequest, NextApiResponse } from 'next'
import { respondPosError } from '@/lib/pos-errors'
import { PAYMENT_METHODS } from '@/lib/pos-values'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' })
    }

    const { facturaId, nuevoBarberoId, nuevoServicioId, nuevoMetodoPago, claveSeguridad } = req.body

    if (nuevoMetodoPago && !PAYMENT_METHODS.includes(nuevoMetodoPago)) return res.status(400).json({ message: 'Método de pago inválido' })
    if (!facturaId) {
        return res.status(400).json({ message: 'Falta el ID de la factura' })
    }

    try {
        const actor = await requireStaff(req, res, ['admin', 'cajero'])
        if (!actor) return
        const supabase = actor.admin
        const adminUser = actor.access

        // 1. Obtener datos de la factura original y verificar tenant
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

        // 2. Verificar clave de seguridad del tenant correcto
        const { data: pinValido, error: pinError } = await supabase.rpc('app_verify_pos_pin', {
            p_comercio: adminUser.comercio_id,
            p_pin: typeof claveSeguridad === 'string' ? claveSeguridad : null,
        })
        if (pinError) return respondPosError(res, pinError, 'validar-clave')
        if (pinValido !== true) {
            return res.status(403).json({ success: false, message: 'Clave de seguridad incorrecta' })
        }

        let barbero_id = nuevoBarberoId || factura.barbero_id
        let porcentajeComision = factura.porcentaje_comision
        let total = parseFloat(factura.total.toString())
        let items = Array.isArray(factura.items) ? [...factura.items] : []

        // 3. Si hay nuevo barbero, obtener su porcentaje de comisión
        if (nuevoBarberoId && nuevoBarberoId !== factura.barbero_id) {
            const { data: barbero, error: barberoError } = await supabase
                .from('barberos')
                .select('porcentaje_comision')
                .eq('activo', true)
                .eq('id', nuevoBarberoId)
                .eq('comercio_id', adminUser.comercio_id)
                .single()

            if (barberoError || !barbero) return res.status(400).json({ message: 'Barbero no disponible en este comercio' })
            if (barbero) {
                porcentajeComision = barbero.porcentaje_comision ?? 50
            }
        }

        // 3. Si hay nuevo servicio, obtener su precio y actualizar items
        const servicioCambiado = nuevoServicioId && nuevoServicioId !== items.find((item: any) => !item.producto_id && item.tipo !== 'producto')?.servicio_id
        if (servicioCambiado) {
            const { data: servicio, error: servicioError } = await supabase
                .from('servicios')
                .select('nombre, precio')
                .eq('activo', true)
                .eq('id', nuevoServicioId)
                .eq('comercio_id', adminUser.comercio_id)
                .single()

            if (servicioError || !servicio) return res.status(400).json({ message: 'Servicio no disponible en este comercio' })
            if (servicio) {
                const index = items.findIndex((item: any) => !item.producto_id && item.tipo !== 'producto')
                const quantity = index >= 0 ? Number(items[index].cantidad ?? 1) : 1
                if (!Number.isInteger(quantity) || quantity < 1) return res.status(409).json({ message: 'La cantidad del servicio requiere revisión' })
                const updatedItem = { servicio_id: nuevoServicioId, tipo: 'servicio', nombre: servicio.nombre, precio: Number(servicio.precio), cantidad: quantity, subtotal: Number(servicio.precio)*quantity }
                if (index >= 0) items[index] = updatedItem
                else items.push(updatedItem)
                total = items.reduce((sum: number, item: any) => sum + Number(item.precio) * Number(item.cantidad ?? 1), 0)
                if (!Number.isFinite(total) || total < 0) return res.status(409).json({ message: 'Los importes de la venta requieren revisión' })

            }
        }

        // 4. Recalcular comisiones
        const comisionBarbero = Math.round(total * (porcentajeComision / 100))
        const ingresoCasa = total - comisionBarbero

        const { error: changeError } = await supabase.rpc('app_change_sale', {
            p_comercio: adminUser.comercio_id, p_invoice: factura.id, p_actor: actor.user.id, p_action: 'correct',
            p_data: { barbero_id, servicio_id: nuevoServicioId || null, porcentaje_comision: porcentajeComision,
                comision_barbero: comisionBarbero, ingreso_casa: ingresoCasa, total,
                subtotal: servicioCambiado ? total : factura.subtotal, descuento: servicioCambiado ? 0 : factura.descuento ?? 0,
                items, metodo_pago: nuevoMetodoPago || factura.metodo_pago, expected_updated_at: factura.updated_at },
        })
        if (changeError) return respondPosError(res, changeError, 'corregir-venta')

        return res.status(200).json({
            success: true,
            message: 'Venta corregida exitosamente',
            data: {
                total,
                comision: comisionBarbero
            }
        })

    } catch (error: any) {
        return respondPosError(res, error, 'corregir-venta')
    }
}
