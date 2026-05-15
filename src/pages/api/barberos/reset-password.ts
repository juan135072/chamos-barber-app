// API Route: Reset Password para Barbero
// Migrado a InsForge 2026-05-12: adminGetUserById + adminUpdateUserById
import type { NextApiRequest, NextApiResponse } from 'next'
import { adminGetUserById, adminUpdateUserById } from '@/lib/insforge-admin'
import { createPagesAdminClient } from '@/lib/supabase-server'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { barberoId } = req.body

    if (!barberoId) {
      return res.status(400).json({ error: 'Faltan datos: barberoId' })
    }

    console.log('[Reset Password] Procesando reset para barbero:', barberoId)

    const supabaseAdmin = createPagesAdminClient()

    // PASO 0: Obtener email del admin desde Auth
    const { data: authData, error: authError } = await adminGetUserById(adminId)

    if (authError || !authData.user) {
      console.error('❌ [Reset Password] No se pudo obtener usuario de Auth:', authError)
      return res.status(403).json({ error: 'No se pudo verificar tu identidad' })
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
      return res.status(404).json({ error: 'Barbero no encontrado o sin email' })
    }

    console.log('✅ [Reset Password] Barbero encontrado:', barbero.email)

    // PASO 3: Determinar el authUserId del barbero
    let authUserId: string | null = null
    const barberEmailNormalized = barbero.email.trim().toLowerCase()

    // A. Buscar en admin_users por barbero_id (más rápido y directo)
    const { data: adminEntry } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('barbero_id', barberoId)
      .single()

    if (adminEntry) {
      authUserId = adminEntry.id
      console.log('🔍 [Reset Password] authUserId encontrado en admin_users por barbero_id:', authUserId)
    }

    // B. Fallback: buscar por email en admin_users
    if (!authUserId) {
      const { data: adminByEmail } = await supabaseAdmin
        .from('admin_users')
        .select('id')
        .eq('email', barberEmailNormalized)
        .single()

      if (adminByEmail) {
        authUserId = adminByEmail.id
        console.log('🔍 [Reset Password] authUserId encontrado en admin_users por email:', authUserId)
      }
    }

    if (!authUserId) {
      console.error('❌ [Reset Password] Barbero sin cuenta en admin_users:', barberEmailNormalized)
      return res.status(404).json({
        error: 'Este barbero no tiene cuenta de autenticación. Usa "Aprobar solicitud" para crear su cuenta primero.'
      })
    }

    console.log('✅ [Reset Password] auth_user_id listo para procesar:', authUserId)

    // PASO 4: Enviar email de reset via InsForge SDK
    const { error: updateError } = await adminUpdateUserById(authUserId, {
      password: 'trigger-reset'
    })

    if (updateError) {
      console.error('[Reset Password] Error enviando reset email:', updateError)
      throw new Error(`Error enviando email de reset: ${updateError.message}`)
    }

    console.log('[Reset Password] Email de reset enviado exitosamente')

    return res.status(200).json({
      success: true,
      email: barbero.email,
      nombre: `${barbero.nombre} ${barbero.apellido}`,
      message: 'Email de reseteo enviado al barbero'
    })

  } catch (error: any) {
    console.error('❌ [Reset Password] Error:', error)
    return res.status(500).json({
      error: error.message || 'Error reseteando contraseña'
    })
  }
}
