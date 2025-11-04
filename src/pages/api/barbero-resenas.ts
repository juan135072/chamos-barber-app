import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '../../../lib/database.types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient<Database>({ req, res })

  if (req.method === 'GET') {
    try {
      const { barbero_id, aprobado, limit = '50' } = req.query

      let query = supabase
        .from('barbero_resenas')
        .select('*')
        .order('created_at', { ascending: false })

      if (barbero_id) {
        query = query.eq('barbero_id', barbero_id as string)
      }

      if (aprobado !== undefined) {
        query = query.eq('aprobado', aprobado === 'true')
      }

      if (limit) {
        query = query.limit(parseInt(limit as string))
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching reseñas:', error)
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ data: data || [] })
    } catch (error) {
      console.error('Error in GET /api/barbero-resenas:', error)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        barbero_id,
        cliente_nombre,
        cliente_email,
        calificacion,
        comentario,
        servicio_recibido,
        fecha_cita
      } = req.body

      // Validaciones
      if (!barbero_id || !cliente_nombre || !calificacion) {
        return res.status(400).json({ 
          error: 'Campos requeridos: barbero_id, cliente_nombre, calificacion' 
        })
      }

      if (calificacion < 1 || calificacion > 5) {
        return res.status(400).json({ 
          error: 'La calificación debe estar entre 1 y 5' 
        })
      }

      const { data, error } = await supabase
        .from('barbero_resenas')
        .insert({
          barbero_id,
          cliente_nombre,
          cliente_email,
          calificacion,
          comentario,
          servicio_recibido,
          fecha_cita,
          aprobado: false // Por defecto requiere aprobación
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating reseña:', error)
        return res.status(500).json({ error: error.message })
      }

      return res.status(201).json({ 
        message: 'Reseña creada exitosamente. Será visible una vez aprobada.',
        data 
      })
    } catch (error) {
      console.error('Error in POST /api/barbero-resenas:', error)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }
  }

  if (req.method === 'PATCH') {
    try {
      // Verificar autenticación de admin
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        return res.status(401).json({ error: 'No autenticado' })
      }

      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', session.user.id)
        .eq('activo', true)
        .single()

      if (adminError || !adminUser) {
        return res.status(403).json({ error: 'No autorizado' })
      }

      const { id, aprobado, destacada } = req.body

      if (!id) {
        return res.status(400).json({ error: 'ID de reseña requerido' })
      }

      const updateData: any = {}
      if (aprobado !== undefined) {
        updateData.aprobado = aprobado
        if (aprobado) {
          updateData.fecha_aprobacion = new Date().toISOString()
        }
      }
      if (destacada !== undefined) {
        updateData.destacada = destacada
      }

      const { data, error } = await supabase
        .from('barbero_resenas')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating reseña:', error)
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ 
        message: 'Reseña actualizada exitosamente',
        data 
      })
    } catch (error) {
      console.error('Error in PATCH /api/barbero-resenas:', error)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }
  }

  return res.status(405).json({ error: 'Método no permitido' })
}
