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
    console.log('🔄 [Reset Password] Admin ID recibido:', adminId)

    // PASO 1: Verificar que el solicitante es admin
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('rol, email, nombre')
      .eq('auth_user_id', adminId)
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

    // PASO 2.5: Buscar el auth_user_id del barbero en admin_users
    const { data: adminUserData, error: adminUserError } = await supabaseAdmin
      .from('admin_users')
      .select('auth_user_id, email')
      .eq('email', barbero.email)
      .eq('rol', 'barbero')
      .single()

    console.log('🔍 [Reset Password] Query admin_users (barbero) result:', { adminUserData, adminUserError })

    if (adminUserError || !adminUserData) {
      console.error('❌ [Reset Password] Barbero no tiene cuenta de usuario en admin_users')
      return res.status(400).json({
        error: 'Este barbero no tiene cuenta de usuario en el sistema. Debe ser aprobado primero.'
      })
    }

    const authUserId = adminUserData.auth_user_id
    console.log('✅ [Reset Password] auth_user_id del barbero:', authUserId)

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
