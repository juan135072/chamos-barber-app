// ===================================================================
// API ROUTE: Aprobar Solicitud de Barbero
// ===================================================================
// Esta API route se ejecuta en el servidor, donde tiene acceso a
// SUPABASE_SERVICE_ROLE_KEY para crear usuarios en Supabase Auth
// ===================================================================

import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../../lib/supabase-admin'
import { supabase } from '../../../../lib/initSupabase'
import type { Database } from '../../../../lib/database.types'

type Barbero = Database['public']['Tables']['barberos']['Row']
type AdminUser = Database['public']['Tables']['admin_users']['Row']
type Solicitud = Database['public']['Tables']['solicitudes_barberos']['Row']

interface RequestBody {
  solicitudId: string
  adminId: string
  barberoData: {
    nombre: string
    apellido: string
    email: string
    telefono: string
    especialidad: string
    descripcion?: string
    experiencia_anos: number
    imagen_url?: string
  }
}

interface SuccessResponse {
  success: true
  barbero: Barbero
  adminUser: AdminUser
  solicitud: Solicitud
  password: string
}

interface ErrorResponse {
  success: false
  error: string
  details?: any
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Método no permitido. Usa POST.'
    })
  }

  const { solicitudId, adminId, barberoData } = req.body as RequestBody

  // Validar datos requeridos
  if (!solicitudId || !adminId || !barberoData) {
    return res.status(400).json({
      success: false,
      error: 'Faltan datos requeridos: solicitudId, adminId, barberoData'
    })
  }

  // Generar contraseña segura
  const password = `Chamos${Math.random().toString(36).slice(-8)}!${Date.now().toString(36).slice(-4)}`
  
  console.log('🔄 [API /aprobar-barbero] Iniciando proceso de aprobación...')
  console.log('📧 Email:', barberoData.email)

  let authUserId: string | null = null
  let barberoId: string | null = null

  try {
    // PASO 1: Crear usuario en Supabase Auth
    console.log('🔐 [Paso 1] Creando usuario en Supabase Auth...')
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: barberoData.email,
      password: password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        nombre: barberoData.nombre,
        apellido: barberoData.apellido,
        rol: 'barbero'
      }
    })

    if (authError || !authUser.user) {
      console.error('❌ [Paso 1] Error creando usuario en Auth:', authError)
      return res.status(500).json({
        success: false,
        error: `Error creando usuario en Supabase Auth: ${authError?.message || 'Usuario no retornado'}`,
        details: authError
      })
    }

    authUserId = authUser.user.id
    console.log('✅ [Paso 1] Usuario creado en Auth con ID:', authUserId)

    // PASO 2: Crear barbero con el UUID de Auth
    console.log('💈 [Paso 2] Creando barbero en tabla barberos...')
    const { data: barbero, error: barberoError } = await supabase
      .from('barberos')
      .insert([{
        id: authUserId, // ✅ Usar UUID de Auth para sincronización
        nombre: barberoData.nombre,
        apellido: barberoData.apellido,
        email: barberoData.email,
        telefono: barberoData.telefono,
        especialidad: barberoData.especialidad,
        descripcion: barberoData.descripcion,
        experiencia_anos: barberoData.experiencia_anos,
        imagen_url: barberoData.imagen_url,
        activo: true
      }] as any)
      .select()
      .single()

    if (barberoError || !barbero) {
      console.error('❌ [Paso 2] Error creando barbero:', barberoError)
      throw new Error(`Error creando barbero: ${barberoError?.message || 'Barbero no retornado'}`)
    }

    barberoId = barbero!.id // ✅ Aserción de tipo: barbero es no-nulo aquí
    console.log('✅ [Paso 2] Barbero creado con ID:', barberoId)

    // PASO 3: Crear admin_user con el mismo UUID
    console.log('👤 [Paso 3] Creando admin_user...')
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .insert([{
        id: authUserId, // ✅ Mismo UUID que Auth
        email: barberoData.email,
        nombre: `${barberoData.nombre} ${barberoData.apellido}`,
        rol: 'barbero',
        barbero_id: barberoId,
        activo: true
      }] as any)
      .select()
      .single()

    if (adminError || !adminUser) {
      console.error('❌ [Paso 3] Error creando admin_user:', adminError)
      throw new Error(`Error creando admin_user: ${adminError?.message || 'AdminUser no retornado'}`)
    }

    console.log('✅ [Paso 3] Admin_user creado con ID:', adminUser!.id) // ✅ Aserción de tipo

    // PASO 4: Actualizar la solicitud como aprobada
    console.log('📝 [Paso 4] Actualizando solicitud...')
    const { data: solicitud, error: solicitudError } = await supabase
      .from('solicitudes_barberos')
      .update({
        estado: 'aprobada',
        barbero_id: barberoId,
        revisada_por: adminId,
        fecha_revision: new Date().toISOString()
      } as any)
      .eq('id', solicitudId)
      .select()
      .single()

    if (solicitudError || !solicitud) {
      console.error('❌ [Paso 4] Error actualizando solicitud:', solicitudError)
      throw new Error(`Error actualizando solicitud: ${solicitudError?.message || 'Solicitud no retornada'}`)
    }

    console.log('✅ [Paso 4] Solicitud actualizada correctamente')
    console.log('🎉 [API /aprobar-barbero] Proceso completado exitosamente')

    // Retornar éxito
    return res.status(200).json({
      success: true,
      barbero: barbero!,
      adminUser: adminUser!,
      solicitud: solicitud!,
      password
    })

  } catch (error) {
    // ROLLBACK: Limpiar todo lo que se haya creado
    console.error('🔄 [ROLLBACK] Error detectado, iniciando rollback...')
    
    if (authUserId) {
      console.log('🗑️ [ROLLBACK] Eliminando usuario de Auth:', authUserId)
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        console.log('✅ [ROLLBACK] Usuario de Auth eliminado')
      } catch (rollbackError) {
        console.error('❌ [ROLLBACK] Error eliminando usuario de Auth:', rollbackError)
      }
    }

    if (barberoId) {
      console.log('🗑️ [ROLLBACK] Eliminando barbero:', barberoId)
      try {
        await supabase.from('barberos').delete().eq('id', barberoId)
        console.log('✅ [ROLLBACK] Barbero eliminado')
      } catch (rollbackError) {
        console.error('❌ [ROLLBACK] Error eliminando barbero:', rollbackError)
      }
    }

    if (authUserId) {
      console.log('🗑️ [ROLLBACK] Eliminando admin_user:', authUserId)
      try {
        await supabase.from('admin_users').delete().eq('id', authUserId)
        console.log('✅ [ROLLBACK] Admin_user eliminado')
      } catch (rollbackError) {
        console.error('❌ [ROLLBACK] Error eliminando admin_user:', rollbackError)
      }
    }

    console.error('❌ [API /aprobar-barbero] Proceso fallido después de rollback')
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido durante la aprobación',
      details: error
    })
  }
}
