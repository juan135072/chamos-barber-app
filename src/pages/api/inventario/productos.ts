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

    // GET - Listar productos (filtrado por comercio)
    if (req.method === 'GET') {
        try {
            const { activo, categoria, buscar } = req.query

            let query = supabase.from('productos').select('*')
                .eq('comercio_id', comercioId)
                .order('nombre')

            if (activo !== undefined) {
                query = query.eq('activo', activo === 'true')
            }
            if (categoria && typeof categoria === 'string') {
                query = query.eq('categoria', categoria)
            }
            if (buscar && typeof buscar === 'string') {
                query = query.ilike('nombre', `%${buscar}%`)
            }

            const { data, error } = await query
            if (error) throw error

            return res.status(200).json(data)
        } catch (error: any) {
            return res.status(500).json({ error: error.message })
        }
    }

    // POST - Crear producto (con comercio_id)
    if (req.method === 'POST') {
        try {
            const { nombre, descripcion, precio_venta, precio_costo, stock_actual, stock_minimo, categoria, imagen_url, codigo_barras } = req.body

            if (!nombre || precio_venta === undefined) {
                return res.status(400).json({ error: 'Nombre y precio de venta son requeridos' })
            }

            const { data, error } = await supabase
                .from('productos')
                .insert([{
                    nombre,
                    descripcion: descripcion || null,
                    precio_venta: Number(precio_venta),
                    precio_costo: Number(precio_costo || 0),
                    stock_actual: Number(stock_actual || 0),
                    stock_minimo: Number(stock_minimo || 5),
                    categoria: categoria || 'General',
                    imagen_url: imagen_url || null,
                    codigo_barras: codigo_barras || null,
                    comercio_id: comercioId,
                }])
                .select()
                .single()

            if (error) throw error

            return res.status(201).json(data)
        } catch (error: any) {
            return res.status(500).json({ error: error.message })
        }
    }

    // PUT - Actualizar producto (solo del mismo comercio)
    if (req.method === 'PUT') {
        try {
            const { id, ...updates } = req.body

            if (!id) {
                return res.status(400).json({ error: 'ID del producto es requerido' })
            }

            // Convert numeric fields
            if (updates.precio_venta !== undefined) updates.precio_venta = Number(updates.precio_venta)
            if (updates.precio_costo !== undefined) updates.precio_costo = Number(updates.precio_costo)
            if (updates.stock_actual !== undefined) updates.stock_actual = Number(updates.stock_actual)
            if (updates.stock_minimo !== undefined) updates.stock_minimo = Number(updates.stock_minimo)

            // No permitir cambiar comercio_id
            delete updates.comercio_id

            const { data, error } = await supabase
                .from('productos')
                .update(updates)
                .eq('id', id)
                .eq('comercio_id', comercioId)
                .select()
                .single()

            if (error) throw error

            return res.status(200).json(data)
        } catch (error: any) {
            return res.status(500).json({ error: error.message })
        }
    }

    // DELETE - Soft delete (desactivar, solo del mismo comercio)
    if (req.method === 'DELETE') {
        try {
            const { id } = req.query

            if (!id || typeof id !== 'string') {
                return res.status(400).json({ error: 'ID del producto es requerido' })
            }

            const { data, error } = await supabase
                .from('productos')
                .update({ activo: false })
                .eq('id', id)
                .eq('comercio_id', comercioId)
                .select()
                .single()

            if (error) throw error

            return res.status(200).json(data)
        } catch (error: any) {
            return res.status(500).json({ error: error.message })
        }
    }

    return res.status(405).json({ error: 'Método no permitido' })
}
