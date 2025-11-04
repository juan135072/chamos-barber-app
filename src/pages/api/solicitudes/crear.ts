// API Route: Crear Solicitud de Barbero
// Enfoque SIMPLE - Sin tipos complejos para evitar errores de TypeScript

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Crear cliente de Supabase SIN tipos genéricos
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const {
      nombre,
      apellido,
      email,
      telefono,
      especialidad,
      descripcion,
      experiencia_anos,
      imagen_url
    } = req.body

    // Validación básica
    if (!nombre || !apellido || !email || !telefono || !especialidad) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: nombre, apellido, email, telefono, especialidad'
      })
    }

    // Verificar si el email ya existe
    const { data: existing } = await supabase
      .from('solicitudes_barberos')
      .select('id')
      .eq('email', email)
      .eq('estado', 'pendiente')
      .single()

    if (existing) {
      return res.status(400).json({
        error: 'Ya existe una solicitud pendiente con este email'
      })
    }

    // Crear solicitud - Objeto literal simple
    const solicitudData = {
      nombre,
      apellido,
      email,
      telefono,
      especialidad,
      descripcion: descripcion || null,
      experiencia_anos: experiencia_anos || 0,
      imagen_url: imagen_url || null,
      estado: 'pendiente'
    }

    const { data, error } = await supabase
      .from('solicitudes_barberos')
      .insert([solicitudData])
      .select()
      .single()

    if (error) {
      console.error('Error insertando solicitud:', error)
      throw new Error(error.message)
    }

    return res.status(201).json({
      success: true,
      solicitud: data
    })

  } catch (error: any) {
    console.error('Error en /api/solicitudes/crear:', error)
    return res.status(500).json({
      error: error.message || 'Error creando solicitud'
    })
  }
}
