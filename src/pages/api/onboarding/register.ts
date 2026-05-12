import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

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

  // Regex para validar slug (solo letras minúsculas, números y guiones)
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return res.status(400).json({ error: 'El slug solo puede contener letras minúsculas, números y guiones.' })
  }

  try {
    // 1. Inicializar cliente con SERVICE_ROLE para bypass RLS y usar Admin Auth API
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 2. Verificar si el slug ya existe
    const { data: existingComercio, error: checkError } = await supabaseAdmin
      .from('comercios')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingComercio) {
      return res.status(400).json({ error: 'El subdominio (slug) ya está en uso. Por favor, elige otro.' })
    }
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 es "No rows found"
      throw checkError
    }

    // 3. Crear el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirmar para el SaaS
      user_metadata: {
        nombre: nombreAdmin,
        apellido: apellidoAdmin
      }
    })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    const userId = authData.user.id

    const db = supabaseAdmin as any

    // 4. Crear el Comercio
    const { data: newComercio, error: comercioError } = await db
      .from('comercios')
      .insert({
        nombre: nombreComercio,
        slug: slug,
        color_primario: colorPrimario || '#D4AF37',
        plan: 'trial', // Plan por defecto (coincide con el check constraint)
        activo: true
      })
      .select('id')
      .single()

    if (comercioError || !newComercio) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw comercioError || new Error('Error al crear el comercio')
    }

    // 5. Vincular el Usuario como Admin del Comercio
    const { error: adminError } = await db
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
      // Rollback completo si admin_users falla
      await db.from('comercios').delete().eq('id', newComercio.id)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw adminError
    }

    // 6. Escribir comercio_id en app_metadata del JWT para que get_my_comercio_id() lo lea directamente
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { comercio_id: newComercio.id }
    })

    // 7. Éxito
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
