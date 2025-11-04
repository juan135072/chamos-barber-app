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
      const { barbero_id, verificado } = req.query

      let query = supabase
        .from('barbero_certificaciones')
        .select('*')
        .order('fecha_obtencion', { ascending: false })

      if (barbero_id) {
        query = query.eq('barbero_id', barbero_id as string)
      }

      if (verificado !== undefined) {
        query = query.eq('verificado', verificado === 'true')
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching certificaciones:', error)
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ data: data || [] })
    } catch (error) {
      console.error('Error in GET /api/barbero-certificaciones:', error)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }
  }

  if (req.method === 'POST') {
    try {
      // Verificar autenticación
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        return res.status(401).json({ error: 'No autenticado' })
      }

      // Verificar que es admin o el barbero propietario
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', session.user.id)
        .eq('activo', true)
        .single()

      if (!adminUser) {
        return res.status(403).json({ error: 'No autorizado' })
      }

      const {
        barbero_id,
        nombre,
        institucion,
        fecha_obtencion,
        fecha_expiracion,
        numero_certificado,
        documento_url
      } = req.body

      // Validaciones
      if (!barbero_id || !nombre || !institucion) {
        return res.status(400).json({ 
          error: 'Campos requeridos: barbero_id, nombre, institucion' 
        })
      }

      // Si no es admin, verificar que el barbero_id coincida con el del usuario
      if (adminUser.rol !== 'admin' && adminUser.barbero_id !== barbero_id) {
        return res.status(403).json({ 
          error: 'Solo puedes agregar certificaciones a tu propio perfil' 
        })
      }

      const { data, error } = await supabase
        .from('barbero_certificaciones')
        .insert({
          barbero_id,
          nombre,
          institucion,
          fecha_obtencion,
          fecha_expiracion,
          numero_certificado,
          documento_url,
          verificado: adminUser.rol === 'admin' // Admin puede verificar directamente
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating certificacion:', error)
        return res.status(500).json({ error: error.message })
      }

      return res.status(201).json({ 
        message: 'Certificación agregada exitosamente',
        data 
      })
    } catch (error) {
      console.error('Error in POST /api/barbero-certificaciones:', error)
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

      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', session.user.id)
        .eq('activo', true)
        .eq('rol', 'admin')
        .single()

      if (!adminUser) {
        return res.status(403).json({ error: 'Solo administradores pueden verificar certificaciones' })
      }

      const { id, verificado } = req.body

      if (!id || verificado === undefined) {
        return res.status(400).json({ error: 'ID y estado de verificación requeridos' })
      }

      const { data, error } = await supabase
        .from('barbero_certificaciones')
        .update({ verificado })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating certificacion:', error)
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ 
        message: 'Certificación actualizada exitosamente',
        data 
      })
    } catch (error) {
      console.error('Error in PATCH /api/barbero-certificaciones:', error)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Verificar autenticación
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        return res.status(401).json({ error: 'No autenticado' })
      }

      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', session.user.id)
        .eq('activo', true)
        .single()

      if (!adminUser) {
        return res.status(403).json({ error: 'No autorizado' })
      }

      const { id } = req.query

      if (!id) {
        return res.status(400).json({ error: 'ID requerido' })
      }

      // Si no es admin, verificar que la certificación pertenezca a su perfil
      if (adminUser.rol !== 'admin') {
        const { data: cert } = await supabase
          .from('barbero_certificaciones')
          .select('barbero_id')
          .eq('id', id as string)
          .single()

        if (!cert || cert.barbero_id !== adminUser.barbero_id) {
          return res.status(403).json({ error: 'No autorizado' })
        }
      }

      const { error } = await supabase
        .from('barbero_certificaciones')
        .delete()
        .eq('id', id as string)

      if (error) {
        console.error('Error deleting certificacion:', error)
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ 
        message: 'Certificación eliminada exitosamente'
      })
    } catch (error) {
      console.error('Error in DELETE /api/barbero-certificaciones:', error)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }
  }

  return res.status(405).json({ error: 'Método no permitido' })
}
