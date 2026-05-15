import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient, createPagesAdminClient } from '@/lib/supabase-server'

const adminClient = createPagesAdminClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' })
    }

    const { facturaId, nuevoBarberoId, nuevoServicioId, nuevoMetodoPago, claveSeguridad } = req.body

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

        // 1. Obtener factura y verificar tenant
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

        let barbero_id = nuevoBarberoId || factura.barbero_id
        let porcentajeComision = factura.porcentaje_comision
        let total = parseFloat(factura.total.toString())
        let items = Array.isArray(factura.items) ? [...factura.items] : []

        // 2. Nuevo barbero → obtener su comisión
        if (nuevoBarberoId && nuevoBarberoId !== factura.barbero_id) {
            const { data: barbero, error: barberoError } = await adminClient
                .from('barberos')
                .select('porcentaje_comision')
                .eq('id', nuevoBarberoId)
                .single()

            if (!barberoError && barbero) {
                porcentajeComision = barbero.porcentaje_comision || 50
            }
        }

        // 3. Nuevo servicio → actualizar precio e items
        if (nuevoServicioId) {
            const { data: servicio, error: servicioError } = await adminClient
                .from('servicios')
                .select('nombre, precio')
                .eq('id', nuevoServicioId)
                .single()

            if (!servicioError && servicio) {
                total = servicio.precio
                if (items.length > 0) {
                    items[0] = { ...items[0], servicio: servicio.nombre, precio: total }
                } else {
                    items = [{ servicio: servicio.nombre, precio: total, cantidad: 1 }]
                }
            }
        }

        // 4. Recalcular comisiones
        const comisionBarbero = Math.floor(total * (porcentajeComision / 100))
        const ingresoCasa = total - comisionBarbero

        // 5. Actualizar factura
        const { error: updateFacturaError } = await adminClient
            .from('facturas')
            .update({
                barbero_id,
                porcentaje_comision: porcentajeComision,
                comision_barbero: comisionBarbero,
                ingreso_casa: ingresoCasa,
                total,
                subtotal: total,
                items,
                metodo_pago: nuevoMetodoPago || factura.metodo_pago,
                updated_at: new Date().toISOString()
            })
            .eq('id', facturaId)

        if (updateFacturaError) throw updateFacturaError

        // 6. Actualizar cita asociada si existe
        if (factura.cita_id) {
            const updateCita: any = { updated_at: new Date().toISOString() }
            if (nuevoBarberoId) updateCita.barbero_id = nuevoBarberoId
            if (nuevoServicioId) updateCita.servicio_id = nuevoServicioId

            await adminClient
                .from('citas')
                .update(updateCita)
                .eq('id', factura.cita_id)
        }

        return res.status(200).json({
            success: true,
            message: 'Venta corregida exitosamente',
            data: { total, comision: comisionBarbero }
        })

    } catch (error: any) {
        console.error('Error en corregir-venta (caja):', error)
        return res.status(500).json({ message: 'Error interno del servidor', error: error.message })
    }
}
