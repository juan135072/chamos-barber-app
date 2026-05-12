import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient, getUserFromBearer } from '@/lib/supabase-server'

const supabase = createPagesAdminClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' })
    }

    const { facturaId, nuevoBarberoId, nuevoServicioId, nuevoMetodoPago, claveSeguridad } = req.body

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
            .select('comercio_id')
            .eq('id', user.id)
            .single()

        if (!adminUser?.comercio_id) {
            return res.status(403).json({ message: 'Sin permisos' })
        }

        // 1. Obtener datos de la factura original y verificar tenant
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

        let barbero_id = nuevoBarberoId || factura.barbero_id
        let porcentajeComision = factura.porcentaje_comision
        let total = parseFloat(factura.total.toString())
        let items = Array.isArray(factura.items) ? [...factura.items] : []

        // 3. Si hay nuevo barbero, obtener su porcentaje de comisión
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
