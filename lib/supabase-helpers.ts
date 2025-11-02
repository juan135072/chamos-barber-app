// @ts-nocheck
import { supabase } from './initSupabase'
import type { Database } from './database.types'

// Tipos de base de datos
type Barbero = Database['public']['Tables']['barberos']['Row']
type Servicio = Database['public']['Tables']['servicios']['Row']
type Cita = Database['public']['Tables']['citas']['Row']
type AdminUser = Database['public']['Tables']['admin_users']['Row']
type PortfolioItem = Database['public']['Tables']['barbero_portfolio']['Row']

// Helper para barberos
export const chamosSupabase = {
  // Barberos
  getBarberos: async (activo: boolean = true) => {
    const query = supabase.from('barberos').select('*')
    
    if (activo !== undefined) {
      query.eq('activo', activo)
    }
    
    const { data, error } = await query.order('nombre')
    
    if (error) throw error
    return data as Barbero[]
  },

  getBarbero: async (id: string) => {
    const { data, error } = await supabase
      .from('barberos')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as Barbero
  },

  createBarbero: async (barbero: Database['public']['Tables']['barberos']['Insert']) => {
    const { data, error } = await supabase
      .from('barberos')
      .insert([barbero] as any)
      .select()
      .single()
    
    if (error) throw error
    return data as Barbero
  },

  updateBarbero: async (id: string, updates: Database['public']['Tables']['barberos']['Update']) => {
    const { data, error } = await supabase
      .from('barberos')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Barbero
  },

  deleteBarbero: async (id: string) => {
    const { error } = await supabase
      .from('barberos')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Servicios
  getServicios: async (activo: boolean = true) => {
    const query = supabase.from('servicios').select('*')
    
    if (activo !== undefined) {
      query.eq('activo', activo)
    }
    
    const { data, error } = await query.order('nombre')
    
    if (error) throw error
    return data as Servicio[]
  },

  getServicio: async (id: string) => {
    const { data, error } = await supabase
      .from('servicios')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as Servicio
  },

  createServicio: async (servicio: Database['public']['Tables']['servicios']['Insert']) => {
    const { data, error } = await supabase
      .from('servicios')
      .insert([servicio] as any)
      .select()
      .single()
    
    if (error) throw error
    return data as Servicio
  },

  updateServicio: async (id: string, updates: Database['public']['Tables']['servicios']['Update']) => {
    const { data, error } = await supabase
      .from('servicios')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Servicio
  },

  deleteServicio: async (id: string) => {
    const { error } = await supabase
      .from('servicios')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Citas
  getCitas: async (filters?: {
    barbero_id?: string
    fecha?: string
    estado?: string
  }) => {
    let query = supabase
      .from('citas')
      .select(`
        *,
        barberos (nombre, apellido),
        servicios (nombre, precio, duracion_minutos)
      `)

    if (filters?.barbero_id) {
      query = query.eq('barbero_id', filters.barbero_id)
    }
    if (filters?.fecha) {
      query = query.eq('fecha', filters.fecha)
    }
    if (filters?.estado) {
      query = query.eq('estado', filters.estado)
    }

    const { data, error } = await query.order('fecha').order('hora')
    
    if (error) throw error
    return data || []
  },

  getCita: async (id: string) => {
    const { data, error } = await supabase
      .from('citas')
      .select(`
        *,
        barberos (nombre, apellido),
        servicios (nombre, precio, duracion_minutos)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  createCita: async (cita: Database['public']['Tables']['citas']['Insert']) => {
    console.log('🔍 [createCita] Iniciando validaciones con datos:', cita)
    
    // VALIDACIÓN 1: Verificar disponibilidad antes de insertar
    console.log('🔍 [createCita] VALIDACIÓN 1: Verificando citas existentes...')
    const { data: existingCitas, error: checkError } = await supabase
      .from('citas')
      .select('id, cliente_nombre')
      .eq('barbero_id', cita.barbero_id)
      .eq('fecha', cita.fecha)
      .eq('hora', cita.hora)
      .in('estado', ['pendiente', 'confirmada']) // Solo considerar activas
    
    if (checkError) {
      console.error('❌ [createCita] Error al verificar citas existentes:', checkError)
      throw new Error(`Error al verificar disponibilidad: ${checkError.message}`)
    }

    console.log('🔍 [createCita] Citas existentes encontradas:', existingCitas?.length || 0)
    if (existingCitas && existingCitas.length > 0) {
      console.warn('⚠️ [createCita] Horario ya reservado:', existingCitas)
      throw new Error('⚠️ Lo sentimos, este horario acaba de ser reservado por otro cliente. Por favor selecciona otro horario.')
    }

    // VALIDACIÓN 2: Verificar que no sea una hora pasada
    console.log('🔍 [createCita] VALIDACIÓN 2: Verificando hora no sea pasada...')
    const fechaHora = new Date(`${cita.fecha}T${cita.hora}`)
    const ahora = new Date()
    
    console.log('🔍 [createCita] Fecha/Hora cita:', fechaHora.toISOString())
    console.log('🔍 [createCita] Fecha/Hora actual:', ahora.toISOString())
    
    if (fechaHora <= ahora) {
      console.warn('⚠️ [createCita] Intento de reservar en el pasado')
      throw new Error('⚠️ No puedes reservar una cita en el pasado. Por favor selecciona otra fecha u hora.')
    }

    // VALIDACIÓN 3: Intentar insertar con manejo de race conditions
    console.log('🔍 [createCita] VALIDACIÓN 3: Intentando insertar cita en BD...')
    const { data, error } = await supabase
      .from('citas')
      .insert([cita] as any)
      .select()
      .single()
    
    if (error) {
      console.error('❌ [createCita] Error al insertar cita:', error)
      console.error('❌ [createCita] Código de error:', error.code)
      console.error('❌ [createCita] Mensaje de error:', error.message)
      console.error('❌ [createCita] Detalles completos:', JSON.stringify(error, null, 2))
      
      // Si es un error de constraint único (race condition), mensaje más claro
      if (error.code === '23505') {
        throw new Error('⚠️ Este horario fue reservado mientras completabas el formulario. Por favor selecciona otro horario.')
      }
      throw new Error(`Error de base de datos: ${error.message}`)
    }
    
    console.log('✅ [createCita] Cita creada exitosamente:', data)
    return data as Cita
  },

  updateCita: async (id: string, updates: Database['public']['Tables']['citas']['Update']) => {
    const { data, error } = await supabase
      .from('citas')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Cita
  },

  deleteCita: async (id: string) => {
    const { error } = await supabase
      .from('citas')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Horarios disponibles
  getHorariosDisponibles: async (barbero_id: string, fecha: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_horarios_disponibles', {
          barbero_id_param: barbero_id,
          fecha_param: fecha
        })
      
      if (error) {
        console.error('Error en getHorariosDisponibles:', error)
        throw error
      }
      
      return data || []
    } catch (error) {
      console.error('Error calling get_horarios_disponibles:', error)
      // Si la función no existe aún, retornar null para usar horarios por defecto
      return null
    }
  },

  // Horarios de trabajo
  getHorariosTrabajo: async (barbero_id?: string) => {
    let query = supabase
      .from('horarios_trabajo')
      .select(`
        *,
        barberos (nombre, apellido)
      `)

    if (barbero_id) {
      query = query.eq('barbero_id', barbero_id)
    }

    const { data, error } = await query.order('dia_semana').order('hora_inicio')
    
    if (error) throw error
    return data
  },

  createHorarioTrabajo: async (horario: Database['public']['Tables']['horarios_trabajo']['Insert']) => {
    const { data, error } = await supabase
      .from('horarios_trabajo')
      .insert([horario] as any)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  updateHorarioTrabajo: async (id: string, updates: Database['public']['Tables']['horarios_trabajo']['Update']) => {
    const { data, error } = await supabase
      .from('horarios_trabajo')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  deleteHorarioTrabajo: async (id: string) => {
    const { error } = await supabase
      .from('horarios_trabajo')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Portfolio
  getPortfolio: async (barbero_id?: string) => {
    let query = supabase
      .from('barbero_portfolio')
      .select(`
        *,
        barberos (nombre, apellido)
      `)

    if (barbero_id) {
      query = query.eq('barbero_id', barbero_id)
    }

    const { data, error } = await query
      .eq('activo', true)
      .order('orden')
    
    if (error) throw error
    return data
  },

  createPortfolioItem: async (item: Database['public']['Tables']['barbero_portfolio']['Insert']) => {
    const { data, error } = await supabase
      .from('barbero_portfolio')
      .insert([item] as any)
      .select()
      .single()
    
    if (error) throw error
    return data as PortfolioItem
  },

  updatePortfolioItem: async (id: string, updates: Database['public']['Tables']['barbero_portfolio']['Update']) => {
    const { data, error } = await supabase
      .from('barbero_portfolio')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as PortfolioItem
  },

  deletePortfolioItem: async (id: string) => {
    const { error } = await supabase
      .from('barbero_portfolio')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Usuarios admin
  getAdminUsers: async () => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, nombre, rol, activo, creado_en')
      .order('nombre')
    
    if (error) throw error
    return data
  },

  getAdminUser: async (email: string) => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .eq('activo', true)
      .single()
    
    if (error) throw error
    return data as AdminUser
  },

  createAdminUser: async (user: Database['public']['Tables']['admin_users']['Insert']) => {
    const { data, error } = await supabase
      .from('admin_users')
      .insert([user] as any)
      .select('id, email, nombre, rol, activo, creado_en')
      .single()
    
    if (error) throw error
    return data
  },

  updateAdminUser: async (id: string, updates: Database['public']['Tables']['admin_users']['Update']) => {
    const { data, error } = await supabase
      .from('admin_users')
      .update({ ...updates, actualizado_en: new Date().toISOString() } as any)
      .eq('id', id)
      .select('id, email, nombre, rol, activo, creado_en')
      .single()
    
    if (error) throw error
    return data
  },

  deleteAdminUser: async (id: string) => {
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Configuración del sitio
  getConfiguracion: async (clave?: string) => {
    let query = supabase.from('sitio_configuracion').select('*')
    
    if (clave) {
      query = query.eq('clave', clave).single()
    }
    
    const { data, error } = await query.order('clave')
    
    if (error) throw error
    return data
  },

  updateConfiguracion: async (clave: string, valor: string) => {
    const { data, error} = await supabase
      .from('sitio_configuracion')
      .update({ 
        valor,
        updated_at: new Date().toISOString() 
      } as any)
      .eq('clave', clave)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Solicitudes de Barberos
  getSolicitudesBarberos: async (filters?: {
    estado?: string
    email?: string
  }) => {
    let query = supabase
      .from('solicitudes_barberos')
      .select(`
        *,
        admin_users!revisada_por (nombre, email),
        barberos (nombre, apellido)
      `)

    if (filters?.estado) {
      query = query.eq('estado', filters.estado)
    }
    if (filters?.email) {
      query = query.eq('email', filters.email)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  getSolicitudBarbero: async (id: string) => {
    const { data, error } = await supabase
      .from('solicitudes_barberos')
      .select(`
        *,
        admin_users!revisada_por (nombre, email),
        barberos (nombre, apellido)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  createSolicitudBarbero: async (solicitud: Database['public']['Tables']['solicitudes_barberos']['Insert']) => {
    // Verificar que el email no esté ya registrado
    const { data: existingEmail } = await supabase
      .from('solicitudes_barberos')
      .select('id')
      .eq('email', solicitud.email)
      .in('estado', ['pendiente', 'aprobada'])

    if (existingEmail && existingEmail.length > 0) {
      throw new Error('Ya existe una solicitud con este email')
    }

    const { data, error } = await supabase
      .from('solicitudes_barberos')
      .insert([solicitud] as any)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  updateSolicitudBarbero: async (id: string, updates: Database['public']['Tables']['solicitudes_barberos']['Update']) => {
    const { data, error } = await supabase
      .from('solicitudes_barberos')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  aprobarSolicitudBarbero: async (solicitudId: string, adminId: string, barberoData: {
    nombre: string
    apellido: string
    email: string
    telefono: string
    especialidad: string
    descripcion?: string
    experiencia_anos: number
    imagen_url?: string
  }): Promise<{
    barbero: Barbero
    adminUser: AdminUser
    solicitud: Database['public']['Tables']['solicitudes_barberos']['Row']
    password: string
  }> => {
    // 1. Crear el barbero
    const { data: barbero, error: barberoError } = await supabase
      .from('barberos')
      .insert([{
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

    if (barberoError) throw barberoError

    // 2. Crear usuario admin para el barbero
    const password = `Chamos${Math.random().toString(36).slice(-8)}!`
    
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .insert([{
        email: barberoData.email,
        nombre: `${barberoData.nombre} ${barberoData.apellido}`,
        rol: 'barbero',
        barbero_id: barbero.id,
        activo: true
      }] as any)
      .select()
      .single()

    if (adminError) {
      // Si falla crear el admin_user, eliminar el barbero creado
      await supabase.from('barberos').delete().eq('id', barbero.id)
      throw adminError
    }

    // 3. Actualizar la solicitud como aprobada
    const { data: solicitud, error: solicitudError } = await supabase
      .from('solicitudes_barberos')
      .update({
        estado: 'aprobada',
        barbero_id: barbero.id,
        revisada_por: adminId,
        fecha_revision: new Date().toISOString()
      } as any)
      .eq('id', solicitudId)
      .select()
      .single()

    if (solicitudError) throw solicitudError

    // Non-null assertions: if we reach here, all operations succeeded
    return {
      barbero: barbero!,
      adminUser: adminUser!,
      solicitud: solicitud!,
      password // Devolver la contraseña generada para mostrarla al admin
    }
  },

  rechazarSolicitudBarbero: async (solicitudId: string, adminId: string, motivo: string) => {
    const { data, error } = await supabase
      .from('solicitudes_barberos')
      .update({
        estado: 'rechazada',
        motivo_rechazo: motivo,
        revisada_por: adminId,
        fecha_revision: new Date().toISOString()
      } as any)
      .eq('id', solicitudId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}