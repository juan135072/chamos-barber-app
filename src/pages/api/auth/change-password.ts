// API Route: Cambiar Contraseña (desde el panel del propio usuario)
// Migrado a InsForge 2026-05-12: usa adminVerifyPassword
// 2026-11-23: authenticated with requireStaff. It only changes the caller's own
// password (any userId in the body must match it) and stores the new bcrypt
// hash with adminSetUserPassword, instead of sending a reset email.
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireStaff } from '@/lib/server-authorization'
import {
  adminGetUserById,
  adminSetUserPassword,
  adminVerifyPassword,
} from '@/lib/insforge-admin'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const actor = await requireStaff(req, res, ['admin', 'cajero', 'barbero'])
  if (!actor) return
  const userId = actor.user.id

  try {
    const { userId: requestedUserId, currentPassword, newPassword } = req.body ?? {}

    if (requestedUserId != null && requestedUserId !== userId) {
      return res.status(403).json({ error: 'Solo puedes cambiar tu propia contraseña' })
    }

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Faltan datos: currentPassword y newPassword son requeridos'
      })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'La nueva contraseña debe tener al menos 8 caracteres'
      })
    }

    // PASO 1: Verificar que el usuario exista (y que no sea un admin del proyecto)
    const { data: getUserData, error: getUserError } = await adminGetUserById(userId)

    if (getUserError || !getUserData.user) {
      console.error('❌ [Change Password] Usuario no encontrado:', { userId, message: getUserError?.message ?? null })
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (getUserData.user.is_project_admin) {
      return res.status(403).json({ error: 'Esta cuenta no puede cambiar su contraseña desde aquí' })
    }

    // PASO 2: Verificar contraseña actual (compara bcrypt hash)
    const { valid, error: verifyError } = await adminVerifyPassword(userId, currentPassword)

    if (verifyError) {
      console.error('❌ [Change Password] Error verificando contraseña:', { userId, message: verifyError.message })
      return res.status(500).json({ error: 'Error verificando contraseña actual' })
    }

    if (!valid) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' })
    }

    // PASO 3: Guardar el hash bcrypt de la nueva contraseña
    const { updated, error: updateError } = await adminSetUserPassword(userId, newPassword)

    if (updateError) {
      console.error('❌ [Change Password] Error actualizando contraseña:', { userId, message: updateError.message })
      return res.status(500).json({ error: 'Error actualizando contraseña' })
    }

    if (!updated) {
      return res.status(403).json({ error: 'Esta cuenta no puede cambiar su contraseña desde aquí' })
    }

    console.log('✅ [Change Password] Contraseña actualizada:', userId)

    return res.status(200).json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    })

  } catch (error: any) {
    console.error('❌ [Change Password] Error:', { userId, message: error?.message ?? String(error) })
    return res.status(500).json({
      error: 'Error cambiando contraseña'
    })
  }
}
