import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@/lib/supabase-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const supabase = createPagesServerClient(req, res)

    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        return res.status(401).json({ error: 'No autenticado' })
    }

    // Obtener comercio_id del usuario para aislamiento multitenant
    const { data: adminUser } = await supabase
        .from('admin_users')
        .select('comercio_id')
        .eq('id', session.user.id)
        .single()

    const comercioId = adminUser?.comercio_id
    if (!comercioId) {
        return res.status(403).json({ error: 'Usuario no asociado a un comercio' })
    }

    // GET - Listar movimientos (filtrado por comercio)
    if (req.method === 'GET') {
        try {
            const { producto_id, limit = '50' } = req.query

            let query = supabase
                .from('inventario_movimientos')
                .select('*, productos(nombre)')
                .eq('comercio_id', comercioId)
                .order('created_at', { ascending: false })
                .limit(Number(limit))

            if (producto_id && typeof producto_id === 'string') {
                query = query.eq('producto_id', producto_id)
            }

            const { data, error } = await query
            if (error) throw error

            return res.status(200).json(data)
        } catch (error: any) {
            return res.status(500).json({ error: error.message })
        }
    }

    // POST - Registrar movimiento y actualizar stock
    if (req.method === 'POST') {
        try {
            const { producto_id, tipo, cantidad, motivo } = req.body

            if (!producto_id || !tipo || cantidad === undefined) {
                return res.status(400).json({ error: 'producto_id, tipo y cantidad son requeridos' })
            }

            if (!['entrada', 'salida', 'ajuste'].includes(tipo)) {
                return res.status(400).json({ error: 'Tipo debe ser: entrada, salida o ajuste' })
            }

            const cantidadNum = Number(cantidad)
            if (isNaN(cantidadNum) || cantidadNum < 0) {
                return res.status(400).json({ error: 'Cantidad debe ser un número positivo' })
            }

            // Obtener stock actual (solo del mismo comercio)
            const { data: producto, error: fetchError } = await supabase
                .from('productos')
                .select('stock_actual, nombre')
                .eq('id', producto_id)
                .eq('comercio_id', comercioId)
                .single()

            if (fetchError) {
                return res.status(404).json({ error: 'Producto no encontrado' })
            }

            const stockAnterior = producto.stock_actual
            let stockNuevo = stockAnterior

            if (tipo === 'entrada') stockNuevo = stockAnterior + cantidadNum
            else if (tipo === 'salida') {
                stockNuevo = stockAnterior - cantidadNum
                if (stockNuevo < 0) {
                    return res.status(400).json({ error: `Stock insuficiente. Stock actual: ${stockAnterior}` })
                }
            }
            else stockNuevo = cantidadNum // ajuste = set directo

            // Registrar movimiento (con comercio_id)
            const { data: movimiento, error: movError } = await supabase
                .from('inventario_movimientos')
                .insert([{
                    producto_id,
                    tipo,
                    cantidad: cantidadNum,
                    stock_anterior: stockAnterior,
                    stock_nuevo: stockNuevo,
                    motivo: motivo || null,
                    created_by: session.user.id,
                    comercio_id: comercioId,
                }])
                .select()
                .single()

            if (movError) throw movError

            // Actualizar stock del producto (solo del mismo comercio)
            const { error: updateError } = await supabase
                .from('productos')
                .update({ stock_actual: stockNuevo })
                .eq('id', producto_id)
                .eq('comercio_id', comercioId)

            if (updateError) throw updateError

            return res.status(201).json({
                movimiento,
                producto: producto.nombre,
                stockAnterior,
                stockNuevo
            })
        } catch (error: any) {
            return res.status(500).json({ error: error.message })
        }
    }

    return res.status(405).json({ error: 'Método no permitido' })
}
