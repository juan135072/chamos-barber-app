// API Route: Reset Password para Barbero
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Cliente admin (service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { barberoId, adminId } = req.body

    if (!barberoId || !adminId) {
      return res.status(400).json({
        error: 'Faltan datos: barberoId, adminId'
      })
    }

    console.log('🔄 [Reset Password] Procesando reset para barbero:', barberoId)
    console.log('🔄 [Reset Password] Admin auth_user_id recibido:', adminId)

    // PASO 0: Obtener email del admin desde Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(adminId)

    if (authError || !authData.user) {
      console.error('❌ [Reset Password] No se pudo obtener usuario de Auth:', authError)
      return res.status(403).json({
        error: 'No se pudo verificar tu identidad'
      })
    }

    const adminEmail = authData.user.email
    console.log('🔍 [Reset Password] Email del admin desde Auth:', adminEmail)

    // PASO 1: Verificar que el solicitante es admin en admin_users
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, rol, email, nombre')
      .eq('email', adminEmail)
      .single()

    console.log('🔍 [Reset Password] Query admin_users result:', { adminUser, adminError })

    if (adminError || !adminUser) {
      console.error('❌ [Reset Password] Usuario no encontrado en admin_users:', adminError)
      return res.status(403).json({
        error: 'No tienes permisos para realizar esta acción. Usuario no encontrado en sistema.'
      })
    }

    if (adminUser.rol !== 'admin') {
      console.error('❌ [Reset Password] Usuario no es admin, rol actual:', adminUser.rol)
      return res.status(403).json({
        error: `No tienes permisos para realizar esta acción. Tu rol es: ${adminUser.rol}`
      })
    }

    console.log('✅ [Reset Password] Usuario verificado como admin:', adminUser.email)

    // PASO 2: Obtener datos del barbero
    const { data: barbero, error: barberoError } = await supabaseAdmin
      .from('barberos')
      .select('email, nombre, apellido')
      .eq('id', barberoId)
      .single()

    console.log('🔍 [Reset Password] Query barberos result:', { barbero, barberoError })

    if (barberoError || !barbero || !barbero.email) {
      console.error('❌ [Reset Password] Barbero no encontrado:', barberoError)
      return res.status(404).json({
        error: 'Barbero no encontrado o sin email'
      })
    }

    console.log('✅ [Reset Password] Barbero encontrado:', barbero.email)

    // PASO 2.5: Verificar que el barbero tiene cuenta en admin_users
    const { data: barberoAdminUser, error: barberoAdminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, barbero_id, rol')
      .eq('barbero_id', barberoId)
      .eq('rol', 'barbero')
      .single()

    console.log('🔍 [Reset Password] Query admin_users (barbero) result:', { barberoAdminUser, barberoAdminError })

    // Nota: Se permite que el flujo continúe incluso si no tiene cuenta previa,
    // para que sea creada automáticamente en el PASO 2.6
    /* 
    if (barberoAdminError || !barberoAdminUser) {
      console.error('❌ [Reset Password] Barbero no tiene cuenta de usuario en admin_users')
      return res.status(400).json({
        error: 'Este barbero no tiene cuenta de usuario en el sistema. Debe ser aprobado primero.'
      })
    }
    */

    // PASO 2.6: Determinar el authUserId del barbero
    let authUserId: string | null = null
    const barberEmailNormalized = barbero.email.trim().toLowerCase()

    // A. Intentar obtenerlo desde admin_users (más rápido y directo)
    const { data: adminEntry } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('barbero_id', barberoId)
      .single()

    if (adminEntry) {
      authUserId = adminEntry.id
      console.log('🔍 [Reset Password] authUserId encontrado en admin_users:', authUserId)
    }

    // B. Si no está en admin_users, buscar en Supabase Auth por email
    if (!authUserId) {
      console.log('🔍 [Reset Password] No encontrado en admin_users, buscando en Auth por email:', barberEmailNormalized)
      let page = 1
      const perPage = 1000

      while (!authUserId && page <= 20) { // Aumentamos a 20 páginas (20000 usuarios)
        const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage
        })

        if (listError) {
          console.error('❌ [Reset Password] Error listando usuarios:', listError)
          break
        }

        const foundUser = data.users.find((u: any) =>
          u.email?.trim().toLowerCase() === barberEmailNormalized
        )

        if (foundUser) {
          authUserId = foundUser.id
          console.log('✅ [Reset Password] Usuario encontrado en Auth:', authUserId)
          break
        }

        if (data.users.length < perPage) break
        page++
      }
    }

    if (!authUserId) {
      console.log('🔍 [Reset Password] El barbero no tiene cuenta en Auth. Creando una nueva...')

      // PASO 2.7: Generar contraseña inicial segura para la nueva cuenta
      const initialPassword = `Chamos${Math.random().toString(36).slice(-8)}!${Date.now().toString(36).slice(-4)}`

      const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: barbero.email,
        password: initialPassword,
        email_confirm: true,
        user_metadata: {
          nombre: barbero.nombre,
          apellido: barbero.apellido,
          rol: 'barbero'
        }
      })

      if (createAuthError || !authUser.user) {
        console.error('❌ [Reset Password] Error creando usuario en Auth:', createAuthError)

        // Manejo especial si el error es porque ya existe (redundancia de seguridad)
        if (createAuthError?.message?.includes('already registered') || createAuthError?.status === 422) {
          return res.status(422).json({
            error: 'El correo electrónico ya está registrado en el sistema. Intenta buscarlo manualmente o contacta a soporte.',
            details: createAuthError.message
          })
        }

        return res.status(500).json({
          error: 'No se pudo crear la cuenta de autenticación para el barbero',
          details: createAuthError?.message
        })
      }

      authUserId = authUser.user.id
      console.log('✅ [Reset Password] Nueva cuenta Auth creada:', authUserId)

      // PASO 2.8: Asegurar que existe en admin_users
      const { error: adminUserError } = await supabaseAdmin
        .from('admin_users')
        .upsert({
          id: authUserId,
          email: barbero.email,
          nombre: `${barbero.nombre} ${barbero.apellido}`,
          rol: 'barbero',
          barbero_id: barberoId,
          activo: true
        })

      if (adminUserError) {
        console.error('❌ [Reset Password] Error creando/actualizando admin_user:', adminUserError)
        // No fallar aquí, ya tenemos el authUserId para el reset
      } else {
        console.log('✅ [Reset Password] admin_users actualizado')
      }
    }

    console.log('✅ [Reset Password] auth_user_id listo para procesar:', authUserId)

    // PASO 3: Generar nueva contraseña segura
    const newPassword = `Chamos${Math.random().toString(36).slice(-8)}!${Date.now().toString(36).slice(-4)}`

    console.log('🔑 [Reset Password] Nueva contraseña generada')

    // PASO 4: Actualizar contraseña en Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUserId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('❌ [Reset Password] Error actualizando contraseña:', updateError)
      throw new Error(`Error actualizando contraseña: ${updateError.message}`)
    }

    console.log('✅ [Reset Password] Contraseña actualizada exitosamente')

    // PASO 5: Enviar email con nueva contraseña (opcional)
    try {
      const { emailService } = await import('../../../../lib/email-service')
      const emailSent = await emailService.sendPasswordReset({
        email: barbero.email,
        password: newPassword,
        nombre: barbero.nombre,
        apellido: barbero.apellido
      })

      if (emailSent) {
        console.log('✅ [Reset Password] Email enviado exitosamente')
      } else {
        console.warn('⚠️ [Reset Password] Email no se pudo enviar')
      }
    } catch (emailError) {
      console.error('❌ [Reset Password] Error sending email (no crítico):', emailError)
    }

    // PASO 6: Registrar el cambio (opcional, para auditoría)
    await supabaseAdmin
      .from('barberos')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', barberoId)

    return res.status(200).json({
      success: true,
      email: barbero.email,
      password: newPassword,
      nombre: `${barbero.nombre} ${barbero.apellido}`,
      message: 'Contraseña reseteada exitosamente'
    })

  } catch (error: any) {
    console.error('❌ [Reset Password] Error:', error)
    return res.status(500).json({
      error: error.message || 'Error reseteando contraseña'
    })
  }
}
