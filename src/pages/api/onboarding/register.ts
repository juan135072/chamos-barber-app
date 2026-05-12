// Onboarding registration: creates a comercio + admin user atomically.
// Migrado a InsForge 2026-05-12: adminCreateUser / adminUpdateUserById / adminDeleteUser
import { NextApiRequest, NextApiResponse } from 'next'
import {
  adminCreateUser,
  adminUpdateUserById,
  adminDeleteUser,
} from '@/lib/insforge-admin'
import { createPagesAdminClient } from '@/lib/supabase-server'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { nombreComercio, slug, colorPrimario, nombreAdmin, apellidoAdmin, email, password } = req.body

  if (!nombreComercio || !slug || !email || !password || !nombreAdmin) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  const slugRegex = /^[a-z0-9-]+$/
  if (!slugRegex.test(slug)) {
    return res.status(400).json({ error: 'El slug solo puede contener letras minúsculas, números y guiones.' })
  }

  try {
    const supabaseAdmin = createPagesAdminClient()

    // 1. Verificar si el slug ya existe
    const { data: existingComercio, error: checkError } = await supabaseAdmin
      .from('comercios')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingComercio) {
      return res.status(400).json({ error: 'El subdominio (slug) ya está en uso. Por favor, elige otro.' })
    }
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    // 2. Crear el usuario en InsForge auth
    const { data: authData, error: authError } = await adminCreateUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        nombre: nombreAdmin,
        apellido: apellidoAdmin
      }
    })

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || 'No se pudo crear el usuario' })
    }

    const userId = authData.user.id

    // 3. Crear el Comercio
    const { data: newComercio, error: comercioError } = await supabaseAdmin
      .from('comercios')
      .insert({
        nombre: nombreComercio,
        slug: slug,
        color_primario: colorPrimario || '#D4AF37',
        plan: 'trial',
        activo: true
      })
      .select('id')
      .single()

    if (comercioError || !newComercio) {
      await adminDeleteUser(userId)
      throw comercioError || new Error('Error al crear el comercio')
    }

    // 4. Vincular el usuario como admin del comercio
    const { error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        id: userId,
        comercio_id: newComercio.id,
        rol: 'admin',
        nombre: nombreAdmin,
        email: email,
        activo: true
      })

    if (adminError) {
      await supabaseAdmin.from('comercios').delete().eq('id', newComercio.id)
      await adminDeleteUser(userId)
      throw adminError
    }

    // 5. Persistir comercio_id en metadata para que se lea desde el JWT
    //    (en InsForge, raw_app_meta_data se mapea a auth.users.metadata)
    await adminUpdateUserById(userId, {
      app_metadata: { comercio_id: newComercio.id }
    })

    return res.status(200).json({
      success: true,
      comercio_id: newComercio.id,
      slug: slug
    })

  } catch (error: any) {
    console.error('Error en registro SaaS:', error)
    return res.status(500).json({ error: error.message || 'Error interno del servidor al registrar el comercio' })
  }
}
