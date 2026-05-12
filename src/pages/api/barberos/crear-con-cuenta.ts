// API Route: Crear Barbero con Cuenta de Usuario desde Admin
// Migrado a InsForge 2026-05-12: adminGetUserById / adminCreateUser / adminDeleteUser
import type { NextApiRequest, NextApiResponse } from 'next'
import { adminGetUserById, adminCreateUser, adminDeleteUser } from '@/lib/insforge-admin'
import { createPagesAdminClient } from '@/lib/supabase-server'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { barberoData, crearCuenta, adminId } = req.body

    if (!barberoData || !adminId) {
      return res.status(400).json({ error: 'Faltan datos requeridos' })
    }

    console.log('🔄 [Crear Barbero] Iniciando creación:', {
      nombre: barberoData.nombre,
      crearCuenta
    })

    const supabaseAdmin = createPagesAdminClient()

    // PASO 0: Verificar que el solicitante existe y es admin
    const { data: authData, error: authError } = await adminGetUserById(adminId)

    if (authError || !authData.user) {
      return res.status(403).json({ error: 'No se pudo verificar tu identidad' })
    }

    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, rol')
      .eq('id', adminId)
      .single()

    if (adminError || !adminUser || adminUser.rol !== 'admin') {
      return res.status(403).json({
        error: 'No tienes permisos para realizar esta acción'
      })
    }

    console.log('✅ [Crear Barbero] Admin verificado:', authData.user.email)

    // PASO 1: Crear barbero
    const { data: nuevoBarbero, error: barberoError } = await supabaseAdmin
      .from('barberos')
      .insert([barberoData])
      .select()
      .single()

    if (barberoError || !nuevoBarbero) {
      console.error('❌ [Crear Barbero] Error creando barbero:', barberoError)
      throw new Error('Error creando barbero en base de datos')
    }

    console.log('✅ [Crear Barbero] Barbero creado:', nuevoBarbero.id)

    let password: string | null = null
    let authUserId: string | null = null

    // PASO 2: Si se solicita crear cuenta, crear usuario auth
    if (crearCuenta && barberoData.email) {
      password = `Chamos${Math.random().toString(36).slice(-8)}!${Date.now().toString(36).slice(-4)}`

      console.log('🔑 [Crear Barbero] Creando cuenta de usuario en InsForge auth')

      const { data: authUser, error: authUserError } = await adminCreateUser({
        email: barberoData.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          nombre: barberoData.nombre,
          apellido: barberoData.apellido,
          rol: 'barbero'
        }
      })

      if (authUserError || !authUser.user) {
        console.error('❌ [Crear Barbero] Error creando usuario en Auth:', authUserError)
        console.warn('⚠️ [Crear Barbero] Barbero creado pero sin cuenta de usuario')
      } else {
        authUserId = authUser.user.id
        console.log('✅ [Crear Barbero] Usuario Auth creado:', authUserId)

        // PASO 3: Crear entrada en admin_users
        const { error: adminUserError } = await supabaseAdmin
          .from('admin_users')
          .insert({
            id: authUserId,
            email: barberoData.email,
            nombre: `${barberoData.nombre} ${barberoData.apellido}`,
            rol: 'barbero',
            barbero_id: nuevoBarbero.id,
            activo: true
          })

        if (adminUserError) {
          console.error('❌ [Crear Barbero] Error creando admin_user:', adminUserError)
          // Rollback: eliminar usuario auth
          try {
            await adminDeleteUser(authUserId)
            console.log('🔄 [Crear Barbero] Rollback: Usuario Auth eliminado')
          } catch (rollbackError) {
            console.error('❌ [Crear Barbero] Error en rollback:', rollbackError)
          }
          throw new Error('Error creando cuenta de usuario')
        }

        console.log('✅ [Crear Barbero] Entrada admin_users creada')

        // PASO 4: Enviar email con credenciales (opcional)
        if (password) {
          try {
            const { emailService } = await import('../../../../lib/email-service')
            const emailSent = await emailService.sendCredentials({
              email: barberoData.email,
              password: password,
              nombre: barberoData.nombre,
              apellido: barberoData.apellido
            })

            if (emailSent) {
              console.log('✅ [Crear Barbero] Email enviado exitosamente')
            } else {
              console.warn('⚠️ [Crear Barbero] Email no se pudo enviar')
            }
          } catch (emailError) {
            console.error('❌ [Crear Barbero] Error sending email (no crítico):', emailError)
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      barbero: nuevoBarbero,
      cuenta_creada: !!authUserId,
      email: barberoData.email,
      password: password,
      message: crearCuenta && authUserId
        ? 'Barbero y cuenta de usuario creados exitosamente'
        : 'Barbero creado exitosamente (sin cuenta de usuario)'
    })

  } catch (error: any) {
    console.error('❌ [Crear Barbero] Error:', error)
    return res.status(500).json({
      error: error.message || 'Error creando barbero'
    })
  }
}
