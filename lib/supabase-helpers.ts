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
  getBarberos: async (activo?: boolean) => {
    const query = supabase.from('barberos').select('*')
    
    // Solo filtrar por activo si se especifica explícitamente
    if (activo !== undefined && activo !== null) {
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
    // Usar API route con service_role key para bypasear RLS
    const response = await fetch('/api/barberos/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(barbero)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Error al crear barbero')
    }

    const result = await response.json()
    return result.barbero as Barbero
  },

  updateBarbero: async (id: string, updates: Database['public']['Tables']['barberos']['Update']) => {
    // Si solo se está actualizando el campo 'activo', usar la API route específica
    if (Object.keys(updates).length === 1 && 'activo' in updates) {
      const response = await fetch('/api/barberos/toggle-active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          barberoId: id,
          activo: updates.activo 
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar barbero')
      }

      const result = await response.json()
      return result.barbero as Barbero
    }

    // Para otras actualizaciones, usar API route general con service_role
    const response = await fetch('/api/barberos/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        barberoId: id,
        updates 
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Error al actualizar barbero')
    }

    const result = await response.json()
    return result.barbero as Barbero
  },

  deleteBarbero: async (id: string) => {
    // Soft delete: marcar como inactivo en vez de eliminar
    // Usa API route con service_role key para bypasear RLS
    const response = await fetch('/api/barberos/toggle-active', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        barberoId: id,
        activo: false 
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Error al desactivar barbero')
    }

    return await response.json()
  },

  // Eliminar barbero PERMANENTEMENTE (solo para casos especiales)
  // ⚠️ ADVERTENCIA: Esto elimina todos los datos y NO se puede deshacer
  permanentlyDeleteBarbero: async (id: string) => {
    // Usa API route con service_role key para bypasear RLS
    const response = await fetch('/api/barberos/delete-permanent', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        barberoId: id
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Error al eliminar barbero permanentemente')
    }

    return await response.json()
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
    // VALIDACIÓN 1: Verificar disponibilidad antes de insertar
    const { data: existingCitas } = await supabase
      .from('citas')
      .select('id, cliente_nombre')
      .eq('barbero_id', cita.barbero_id)
      .eq('fecha', cita.fecha)
      .eq('hora', cita.hora)
      .in('estado', ['pendiente', 'confirmada']) // Solo considerar activas

    if (existingCitas && existingCitas.length > 0) {
      throw new Error('⚠️ Lo sentimos, este horario acaba de ser reservado por otro cliente. Por favor selecciona otro horario.')
    }

    // VALIDACIÓN 2: Verificar que no sea una hora pasada
    const fechaHora = new Date(`${cita.fecha}T${cita.hora}`)
    const ahora = new Date()
    
    if (fechaHora <= ahora) {
      throw new Error('⚠️ No puedes reservar una cita en el pasado. Por favor selecciona otra fecha u hora.')
    }

    // VALIDACIÓN 3: Intentar insertar con manejo de race conditions
    const { data, error } = await supabase
      .from('citas')
      .insert([cita] as any)
      .select()
      .single()
    
    if (error) {
      // Si es un error de constraint único (race condition), mensaje más claro
      if (error.code === '23505') {
        throw new Error('⚠️ Este horario fue reservado mientras completabas el formulario. Por favor selecciona otro horario.')
      }
      throw error
    }
    
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
      .select('id, email, nombre, rol, activo, created_at')
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
      .select('id, email, nombre, rol, activo, created_at')
      .single()
    
    if (error) throw error
    return data
  },

  updateAdminUser: async (id: string, updates: Database['public']['Tables']['admin_users']['Update']) => {
    const { data, error } = await supabase
      .from('admin_users')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select('id, email, nombre, rol, activo, created_at')
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
    const { data, error } = await supabase
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

  // Storage - Subir imagen de barbero
  uploadBarberoFoto: async (file: File, barberoId: string) => {
    try {
      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      if (!validTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)')
      }

      // Validar tamaño (5MB máximo)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error('La imagen es muy grande. Tamaño máximo: 5MB')
      }

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${barberoId}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      console.log('📤 [uploadBarberoFoto] Subiendo archivo:', fileName)

      // Subir archivo a Supabase Storage
      const { data, error } = await supabase.storage
        .from('barberos-fotos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('❌ [uploadBarberoFoto] Error subiendo:', error)
        throw error
      }

      console.log('✅ [uploadBarberoFoto] Archivo subido:', data.path)

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('barberos-fotos')
        .getPublicUrl(data.path)

      console.log('🔗 [uploadBarberoFoto] URL pública:', urlData.publicUrl)

      return {
        path: data.path,
        publicUrl: urlData.publicUrl
      }
    } catch (error: any) {
      console.error('❌ [uploadBarberoFoto] Error:', error)
      throw error
    }
  },

  // Storage - Eliminar imagen de barbero
  deleteBarberoFoto: async (filePath: string) => {
    try {
      console.log('🗑️ [deleteBarberoFoto] Eliminando archivo:', filePath)

      const { error } = await supabase.storage
        .from('barberos-fotos')
        .remove([filePath])

      if (error) {
        console.error('❌ [deleteBarberoFoto] Error eliminando:', error)
        throw error
      }

      console.log('✅ [deleteBarberoFoto] Archivo eliminado')
    } catch (error: any) {
      console.error('❌ [deleteBarberoFoto] Error:', error)
      // No lanzar error si el archivo no existe
      if (error.message?.includes('not found')) {
        console.log('⚠️ [deleteBarberoFoto] Archivo no encontrado, continuando...')
        return
      }
      throw error
    }
  }
}