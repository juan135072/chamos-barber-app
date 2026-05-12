// API Route: Cambiar Contraseña (desde panel del barbero)
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Cliente admin para operaciones privilegiadas
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
    const { userId, currentPassword, newPassword } = req.body

    // Validar datos
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Faltan datos: userId, currentPassword, newPassword son requeridos'
      })
    }

    // Validar longitud mínima de contraseña nueva
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'La nueva contraseña debe tener al menos 8 caracteres'
      })
    }

    console.log('🔐 [Change Password] Procesando cambio para usuario:', userId)

    // PASO 1: Obtener email del usuario
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (getUserError || !authUser.user) {
      console.error('❌ [Change Password] Usuario no encontrado:', getUserError)
      return res.status(404).json({
        error: 'Usuario no encontrado'
      })
    }

    const userEmail = authUser.user.email

    if (!userEmail) {
      return res.status(400).json({
        error: 'Email del usuario no encontrado'
      })
    }

    // PASO 2: Verificar contraseña actual intentando hacer login
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword
    })

    if (signInError) {
      console.error('❌ [Change Password] Contraseña actual incorrecta')
      return res.status(401).json({
        error: 'La contraseña actual es incorrecta'
      })
    }

    console.log('✅ [Change Password] Contraseña actual verificada')

    // PASO 3: Actualizar a la nueva contraseña
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('❌ [Change Password] Error actualizando contraseña:', updateError)
      throw new Error(`Error actualizando contraseña: ${updateError.message}`)
    }

    console.log('✅ [Change Password] Contraseña actualizada exitosamente')

    // PASO 4: Registrar el cambio en la tabla de barberos (actualizar timestamp)
    await supabaseAdmin
      .from('barberos')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    return res.status(200).json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    })

  } catch (error: any) {
    console.error('❌ [Change Password] Error:', error)
    return res.status(500).json({
      error: error.message || 'Error cambiando contraseña'
    })
  }
}
