// API Route: Aprobar Solicitud de Barbero
// Migrado a InsForge 2026-05-12: adminCreateUser + adminDeleteUser
import type { NextApiRequest, NextApiResponse } from 'next'
import { adminCreateUser, adminDeleteUser } from '@/lib/insforge-admin'
import { createPagesAdminClient } from '@/lib/supabase-server'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { solicitudId } = req.body

    if (!solicitudId) {
      return res.status(400).json({ error: 'Faltan datos: solicitudId' })
    }

    const supabaseAdmin = createPagesAdminClient()

    // PASO 0: Obtener datos de la solicitud
    const { data: solicitud, error: solicitudError } = await supabaseAdmin
      .from('solicitudes_barberos')
      .select('email, nombre, apellido')
      .eq('id', solicitudId)
      .single()

    if (solicitudError || !solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' })
    }

    // Generar contraseña segura
    const password = `Chamos${Math.random().toString(36).slice(-8)}!${Date.now().toString(36).slice(-4)}`

    // PASO 1: Crear usuario en InsForge auth
    const { data: authUser, error: authError } = await adminCreateUser({
      email: solicitud.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        nombre: solicitud.nombre,
        apellido: solicitud.apellido,
        rol: 'barbero'
      }
    })

    if (authError || !authUser.user) {
      console.error('Error creando usuario en Auth:', authError)
      return res.status(500).json({
        error: `Error creando usuario: ${authError?.message}`
      })
    }

    const authUserId = authUser.user.id

    // PASO 2: Llamar a función SQL que crea barbero, admin_user y actualiza solicitud
    const { data: result, error: funcError } = await supabaseAdmin
      .rpc('aprobar_solicitud_barbero', {
        p_solicitud_id: solicitudId,
        p_auth_user_id: authUserId
      })

    if (funcError) {
      console.error('Error en función aprobar_solicitud_barbero:', funcError)
      try {
        await adminDeleteUser(authUserId)
      } catch (rollbackError) {
        console.error('Error en rollback:', rollbackError)
      }
      throw new Error(funcError.message)
    }

    // PASO 3: Enviar email con credenciales (opcional)
    try {
      const { emailService } = await import('../../../../lib/email-service')
      const emailSent = await emailService.sendCredentials({
        email: solicitud.email,
        password: password,
        nombre: solicitud.nombre,
        apellido: solicitud.apellido
      })

      if (emailSent) {
        console.log('✅ [Aprobar] Email enviado exitosamente')
      } else {
        console.warn('⚠️ [Aprobar] Email no se pudo enviar, pero la aprobación fue exitosa')
      }
    } catch (emailError) {
      console.error('❌ [Aprobar] Error sending email (no crítico):', emailError)
    }

    return res.status(200).json({
      success: true,
      ...result,
      email: solicitud.email,
      password: password,
      message: 'Barbero aprobado exitosamente'
    })

  } catch (error: any) {
    console.error('Error en /api/solicitudes/aprobar:', error)
    return res.status(500).json({
      error: error.message || 'Error aprobando solicitud'
    })
  }
}
