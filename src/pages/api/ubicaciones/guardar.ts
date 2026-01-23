import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@/lib/supabase-server'

/**
 * =====================================================
 * API: GUARDAR/ACTUALIZAR UBICACIÓN DE BARBERÍA
 * =====================================================
 * Permite al admin guardar o actualizar una ubicación GPS
 */

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' })
    }

    try {
        const { id, nombre, latitud, longitud, radio_permitido, activa } = req.body

        // Validaciones
        if (!nombre || typeof nombre !== 'string') {
            return res.status(400).json({ error: 'Nombre requerido' })
        }

        if (typeof latitud !== 'number' || typeof longitud !== 'number') {
            return res.status(400).json({ error: 'Coordenadas GPS requeridas' })
        }

        if (latitud < -90 || latitud > 90) {
            return res.status(400).json({ error: 'Latitud inválida (debe estar entre -90 y 90)' })
        }

        if (longitud < -180 || longitud > 180) {
            return res.status(400).json({ error: 'Longitud inválida (debe estar entre -180 y 180)' })
        }

        const supabase = createPagesServerClient(req, res)

        // Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return res.status(401).json({ error: 'No autenticado' })
        }

        // Verificar que es admin
        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' })
        }

        // Si es actualización
        if (id) {
            const { data, error } = await supabase
                .from('ubicaciones_barberia')
                .update({
                    nombre: nombre.trim(),
                    latitud,
                    longitud,
                    radio_permitido: radio_permitido || 100,
                    activa: activa !== false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                console.error('❌ [guardar-ubicacion] Error al actualizar:', error)
                return res.status(500).json({ error: 'Error al actualizar ubicación' })
            }

            console.log(`✅ [guardar-ubicacion] Ubicación actualizada: ${nombre}`)
            return res.status(200).json({ ubicacion: data, mensaje: 'Ubicación actualizada correctamente' })
        }

        // Es nueva ubicación
        const { data, error } = await supabase
            .from('ubicaciones_barberia')
            .insert({
                nombre: nombre.trim(),
                latitud,
                longitud,
                radio_permitido: radio_permitido || 100,
                activa: activa !== false
            })
            .select()
            .single()

        if (error) {
            console.error('❌ [guardar-ubicacion] Error al crear:', error)

            // Error de duplicado
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Ya existe una ubicación con ese nombre' })
            }

            return res.status(500).json({ error: 'Error al guardar ubicación' })
        }

        console.log(`✅ [guardar-ubicacion] Nueva ubicación creada: ${nombre}`)
        return res.status(201).json({ ubicacion: data, mensaje: 'Ubicación guardada correctamente' })

    } catch (error: any) {
        console.error('❌ [guardar-ubicacion] Error general:', error)
        return res.status(500).json({ error: 'Error interno del servidor' })
    }
}
