// API Route: Cambiar Contraseña (desde el panel del propio usuario)
// Migrado a InsForge 2026-05-12: usa adminVerifyPassword
// 2026-11-23: authenticated with requireStaff. It only changes the caller's own
// password (any userId in the body must match it) and stores the new bcrypt
// hash with adminSetUserPassword, instead of sending a reset email.
// 2026-11-24: the current-password check accepts 5 attempts per 15 minutes.
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireStaff } from '@/lib/server-authorization'
import {
  adminGetUserById,
  adminSetUserPassword,
  adminVerifyPassword,
} from '@/lib/insforge-admin'
import { clearAttempts, returnAttempt, takeAttempt } from '@/lib/security/rateLimit'

// Attempts are counted per user, not per IP: the whole shop shares one address,
// so an IP limit would lock every staff member out together. The count is kept
// in memory (the site runs as one container) and a deploy starts it over.
// Only a wrong password counts: a check that could not run (a backend or
// database error) gives its attempt back.
const MAX_ATTEMPTS = 5
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000

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

  // The attempt this request holds. It stays counted only when the password
  // was compared and was wrong; any other outcome gives it back (see finally).
  let held: { key: string; windowEnd: number } | null = null

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

    // bcrypt only uses the first 72 bytes: a longer password would be truncated.
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({
        error: 'La nueva contraseña es demasiado larga. Usa como máximo 72 caracteres (menos si lleva tildes o símbolos).'
      })
    }

    // Count the attempt here, before the first await below: requests that
    // arrive together cannot all get through. Invalid bodies (above) do not count.
    const attemptKey = `change-password:${userId}`
    const attempt = takeAttempt(attemptKey, MAX_ATTEMPTS, ATTEMPT_WINDOW_MS)
    if (!attempt.allowed) {
      console.warn('⚠️ [Change Password] Attempt limit reached:', { userId })
      const minutos = Math.ceil(attempt.retryAfter / 60)
      res.setHeader('Retry-After', String(attempt.retryAfter))
      return res.status(429).json({
        error: `Demasiados intentos. Vuelve a intentarlo en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`
      })
    }
    held = { key: attemptKey, windowEnd: attempt.windowEnd }

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
      // A real wrong-password answer: this attempt counts.
      held = null
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

    // The user proved they know the password: earlier wrong guesses no longer count.
    held = null
    clearAttempts(attemptKey)

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
  } finally {
    // The password was not compared (the user lookup, the comparison or the
    // update failed, or the account is never checked here): give the attempt back.
    if (held) returnAttempt(held.key, held.windowEnd)
  }
}
