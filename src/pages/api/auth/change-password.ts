// API Route: Cambiar Contraseña (desde panel del barbero)
// Migrado a InsForge 2026-05-12: usa adminVerifyPassword + adminUpdateUserById
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  adminGetUserById,
  adminUpdateUserById,
  adminVerifyPassword,
} from '@/lib/insforge-admin'
import { createPagesAdminClient } from '@/lib/supabase-server'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { userId, currentPassword, newPassword } = req.body

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Faltan datos: userId, currentPassword, newPassword son requeridos'
      })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'La nueva contraseña debe tener al menos 8 caracteres'
      })
    }

    console.log('🔐 [Change Password] Procesando cambio para usuario:', userId)

    // PASO 1: Verificar que el usuario exista
    const { data: getUserData, error: getUserError } = await adminGetUserById(userId)

    if (getUserError || !getUserData.user) {
      console.error('❌ [Change Password] Usuario no encontrado:', getUserError)
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // PASO 2: Verificar contraseña actual (compara bcrypt hash)
    const { valid, error: verifyError } = await adminVerifyPassword(userId, currentPassword)

    if (verifyError) {
      console.error('❌ [Change Password] Error verificando contraseña:', verifyError)
      return res.status(500).json({ error: 'Error verificando contraseña actual' })
    }

    if (!valid) {
      console.error('❌ [Change Password] Contraseña actual incorrecta')
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' })
    }

    console.log('✅ [Change Password] Contraseña actual verificada')

    // PASO 3: Actualizar a la nueva contraseña (bcrypt hash interno)
    const { error: updateError } = await adminUpdateUserById(userId, {
      password: newPassword
    })

    if (updateError) {
      console.error('❌ [Change Password] Error actualizando contraseña:', updateError)
      throw new Error(`Error actualizando contraseña: ${updateError.message}`)
    }

    console.log('✅ [Change Password] Contraseña actualizada exitosamente')

    // PASO 4: Tocar el timestamp en la tabla de barberos
    const supabaseAdmin = createPagesAdminClient()
    await supabaseAdmin
      .from('barberos')
      .update({ updated_at: new Date().toISOString() })
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
