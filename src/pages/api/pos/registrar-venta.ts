import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient, createPagesServerClient, clearAuthCookies } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const REQUIRED_FIELDS = [
    'barbero_id',
    'tipo_documento',
    'items',
    'subtotal',
    'total',
    'metodo_pago',
    'monto_recibido',
    'cambio',
    'porcentaje_comision',
    'comision_barbero',
    'ingreso_casa',
] as const

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' })
    }

    try {
        const serverClient = createPagesServerClient(req, res)
        const { data: { session } } = await serverClient.auth.getSession()
        const user = session?.user

        if (!user || !UUID_RE.test(user.id)) {
            clearAuthCookies(res)
            return res.status(401).json({ message: 'Sesión inválida. Por favor iniciá sesión nuevamente.' })
        }

        const supabase = createPagesAdminClient()

        // Derive comercio_id from admin_users — never trust the request body
        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('comercio_id, rol')
            .eq('id', user.id)
            .single()

        if (!adminUser?.comercio_id) {
            return res.status(403).json({ message: 'Sin permisos' })
        }

        const body = req.body

        // Validate required fields
        const missingFields = REQUIRED_FIELDS.filter(
            (field) => body[field] === undefined || body[field] === null || body[field] === ''
        )
        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `Faltan campos requeridos: ${missingFields.join(', ')}`,
                fields: missingFields,
            })
        }

        if (!Array.isArray(body.items) || body.items.length === 0) {
            return res.status(400).json({
                message: 'El campo items debe ser un arreglo con al menos un elemento',
                fields: ['items'],
            })
        }

        // tipo_documento=factura requires cliente_rut
        if (body.tipo_documento === 'factura' && !body.cliente_rut?.trim()) {
            return res.status(400).json({
                message: 'Para emitir factura se requiere el RUT del cliente',
                fields: ['cliente_rut'],
            })
        }

        // Build the insert payload — strip body-supplied tenant fields
        const {
            comercio_id: _ignoredComercioId,
            created_by: _ignoredCreatedBy,
            ...rest
        } = body

        const insertPayload = {
            ...rest,
            cliente_nombre: body.cliente_nombre?.trim() || 'Consumidor Final',
            comercio_id: adminUser.comercio_id,
            created_by: user.id,
        }

        const { data: factura, error: insertError } = await supabase
            .from('facturas')
            .insert([insertPayload])
            .select()
            .single()

        if (insertError) throw insertError

        return res.status(200).json({ factura })

    } catch (error: any) {
        console.error('Error en registrar-venta:', error?.message ?? error)
        return res.status(500).json({ message: error?.message ?? 'Error interno del servidor' })
    }
}
