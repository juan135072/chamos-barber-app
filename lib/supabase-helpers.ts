import { supabase } from './initSupabase'
import type { Database } from './database.types'

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') console.log(...args)
}

// Alias sin tipo estricto para operaciones sobre tablas no presentes en los tipos
// generados (cierres_caja, caja_sesiones, movimientos_caja) o RPCs no tipados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

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
    let query = supabase.from('barberos').select('*')

    if (activo !== undefined && activo !== null) {
      query = query.eq('activo', activo)
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
  getServicios: async (activo?: boolean) => {
    let query = supabase.from('servicios').select('*')

    if (activo !== undefined) {
      query = query.eq('activo', activo)
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
    const { data, error } = await db
      .from('servicios')
      .insert([servicio])
      .select()
      .single()

    if (error) throw error
    return data as Servicio
  },

  updateServicio: async (id: string, updates: Database['public']['Tables']['servicios']['Update']) => {
    const { data, error } = await db
      .from('servicios')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Servicio
  },

  deleteServicio: async (id: string) => {
    // Primero verificar si hay citas asociadas
    const { data: citas, error: citasError } = await supabase
      .from('citas')
      .select('id')
      .eq('servicio_id', id)
      .limit(1)

    if (citasError) throw citasError

    // Si hay citas asociadas, lanzar error descriptivo
    if (citas && citas.length > 0) {
      throw new Error(
        'No se puede eliminar este servicio porque tiene citas asociadas. ' +
        'Por favor, desactiva el servicio en lugar de eliminarlo, o elimina primero las citas asociadas.'
      )
    }

    // Si no hay citas, proceder con la eliminación
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
      .eq('barbero_id', cita.barbero_id ?? '')
      .eq('fecha', cita.fecha ?? '')
      .eq('hora', cita.hora ?? '')
      .in('estado', ['pendiente', 'confirmada'])

    if (existingCitas && existingCitas.length > 0) {
      throw new Error('⚠️ Lo sentimos, este horario acaba de ser reservado por otro cliente. Por favor selecciona otro horario.')
    }

    // VALIDACIÓN 2: Verificar que no sea una hora pasada
    const { getChileAhora } = await import('../src/lib/date-utils')
    const ahora = getChileAhora()
    const [hReserva, mReserva] = cita.hora.split(':').map(Number)
    const fechaHora = new Date(`${cita.fecha}T00:00:00`)
    fechaHora.setHours(hReserva, mReserva, 0, 0)

    if (fechaHora <= ahora) {
      throw new Error('⚠️ No puedes reservar una cita en el pasado. Por favor selecciona otra fecha u hora.')
    }

    // VALIDACIÓN 3: Intentar insertar con manejo de race conditions
    const { data, error } = await db
      .from('citas')
      .insert([cita])
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
    const { data, error } = await db
      .from('citas')
      .update({ ...updates, updated_at: new Date().toISOString() })
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
  getHorariosDisponibles: async (barbero_id: string, fecha: string, duracion_minutos: number = 30): Promise<{ hora: string, disponible: boolean, motivo?: string }[] | null> => {
    try {
      const { data, error } = await db
        .rpc('get_horarios_disponibles', {
          p_barbero_id: barbero_id,
          p_fecha: fecha,
          p_duracion_minutos: duracion_minutos
        })

      if (error) {
        console.error('Error en getHorariosDisponibles:', error)
        throw error
      }

      return (data as { hora: string, disponible: boolean, motivo?: string }[] | null) || []
    } catch (error) {
      console.error('Error calling get_horarios_disponibles:', error)
      // Si la función no existe aún, retornar null para usar horarios por defecto
      return null
    }
  },

  // Horarios de atención (horarios_atencion)
  getHorariosAtencion: async (barbero_id?: string) => {
    let query = supabase
      .from('horarios_atencion')
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

  createHorarioAtencion: async (horario: Database['public']['Tables']['horarios_atencion']['Insert']) => {
    const { data, error } = await db
      .from('horarios_atencion')
      .insert([horario])
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateHorarioAtencion: async (id: string, updates: Database['public']['Tables']['horarios_atencion']['Update']) => {
    const { data, error } = await db
      .from('horarios_atencion')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  deleteHorarioAtencion: async (id: string) => {
    const { error } = await supabase
      .from('horarios_atencion')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Horarios bloqueados (horarios_bloqueados)
  getHorariosBloqueados: async (barbero_id?: string) => {
    let query = supabase
      .from('horarios_bloqueados')
      .select(`
        *,
        barberos (nombre, apellido)
      `)

    if (barbero_id) {
      query = query.eq('barbero_id', barbero_id)
    }

    const { data, error } = await query.order('fecha_hora_inicio', { ascending: false })

    if (error) throw error
    return data
  },

  createHorarioBloqueado: async (bloqueo: Database['public']['Tables']['horarios_bloqueados']['Insert']) => {
    const { data, error } = await db
      .from('horarios_bloqueados')
      .insert([bloqueo])
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateHorarioBloqueado: async (id: string, updates: Database['public']['Tables']['horarios_bloqueados']['Update']) => {
    const { data, error } = await db
      .from('horarios_bloqueados')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  deleteHorarioBloqueado: async (id: string) => {
    const { error } = await supabase
      .from('horarios_bloqueados')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // DEPRECATED: Legacy functions for backward compatibility
  getHorariosTrabajo: async (barbero_id?: string) => {
    console.warn('⚠️ getHorariosTrabajo is deprecated. Use getHorariosAtencion instead.')
    return chamosSupabase.getHorariosAtencion(barbero_id)
  },

  createHorarioTrabajo: async (horario: Database['public']['Tables']['horarios_atencion']['Insert']) => {
    console.warn('⚠️ createHorarioTrabajo is deprecated. Use createHorarioAtencion instead.')
    return chamosSupabase.createHorarioAtencion(horario)
  },

  updateHorarioTrabajo: async (id: string, updates: Database['public']['Tables']['horarios_atencion']['Update']) => {
    console.warn('⚠️ updateHorarioTrabajo is deprecated. Use updateHorarioAtencion instead.')
    return chamosSupabase.updateHorarioAtencion(id, updates)
  },

  deleteHorarioTrabajo: async (id: string) => {
    console.warn('⚠️ deleteHorarioTrabajo is deprecated. Use deleteHorarioAtencion instead.')
    return chamosSupabase.deleteHorarioAtencion(id)
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
    const { data, error } = await db
      .from('barbero_portfolio')
      .insert([item])
      .select()
      .single()

    if (error) throw error
    return data as PortfolioItem
  },

  updatePortfolioItem: async (id: string, updates: Database['public']['Tables']['barbero_portfolio']['Update']) => {
    const { data, error } = await db
      .from('barbero_portfolio')
      .update({ ...updates, updated_at: new Date().toISOString() })
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
    const { data, error } = await db
      .from('admin_users')
      .insert([user])
      .select('id, email, nombre, rol, activo, created_at')
      .single()

    if (error) throw error
    return data
  },

  updateAdminUser: async (id: string, updates: Database['public']['Tables']['admin_users']['Update']) => {
    const { data, error } = await db
      .from('admin_users')
      .update({ ...updates, updated_at: new Date().toISOString() })
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

  // Configuración del sitio (Multitenant Aware)
  getConfiguracion: async (clave?: string) => {
    if (clave) {
      const { data, error } = await supabase
        .from('sitio_configuracion')
        .select('*')
        .eq('clave', clave)
        .single()
      if (error) throw error
      return data
    }

    const { data, error } = await supabase
      .from('sitio_configuracion')
      .select('*')
      .order('clave')

    if (error) throw error
    return data
  },

  updateConfiguracion: async (clave: string, valor: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    const { data: adminUser } = await db
      .from('admin_users')
      .select('comercio_id')
      .eq('id', user.id)
      .single()

    const comercio_id = adminUser?.comercio_id

    const { data, error } = await db
      .from('sitio_configuracion')
      .upsert({ clave, valor, comercio_id, updated_at: new Date().toISOString() }, {
        onConflict: 'clave,comercio_id'
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Gestión de Horario General (Configuración de puntualidad)
  getHorarioGeneral: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    const { data: adminUser } = await db
      .from('admin_users')
      .select('comercio_id')
      .eq('id', user.id)
      .single()

    if (!adminUser?.comercio_id) throw new Error('Comercio no asociado al usuario')

    const { data, error } = await db
      .from('configuracion_horarios')
      .select('*')
      .eq('comercio_id', adminUser.comercio_id)
      .eq('activa', true)
      .maybeSingle()

    if (error) throw error
    return data
  },

  updateHorarioGeneral: async (updates: { hora_entrada_puntual: string, hora_salida_minima?: string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    const { data: adminUser } = await db
      .from('admin_users')
      .select('comercio_id')
      .eq('id', user.id)
      .single()

    if (!adminUser?.comercio_id) throw new Error('Comercio no asociado al usuario')

    const { data, error } = await db
      .from('configuracion_horarios')
      .upsert({
        nombre: 'Horario General',
        comercio_id: adminUser.comercio_id,
        hora_entrada_puntual: updates.hora_entrada_puntual,
        hora_salida_minima: updates.hora_salida_minima,
        activa: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'nombre,comercio_id'
      })
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

      devLog('📤 [uploadBarberoFoto] Subiendo archivo:', fileName)

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

      devLog('✅ [uploadBarberoFoto] Archivo subido:', data.path)

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('barberos-fotos')
        .getPublicUrl(data.path)

      devLog('🔗 [uploadBarberoFoto] URL pública:', urlData.publicUrl)

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
      devLog('🗑️ [deleteBarberoFoto] Eliminando archivo:', filePath)

      const { error } = await supabase.storage
        .from('barberos-fotos')
        .remove([filePath])

      if (error) {
        console.error('❌ [deleteBarberoFoto] Error eliminando:', error)
        throw error
      }

      devLog('✅ [deleteBarberoFoto] Archivo eliminado')
    } catch (error: any) {
      console.error('❌ [deleteBarberoFoto] Error:', error)
      // No lanzar error si el archivo no existe
      if (error.message?.includes('not found')) {
        devLog('⚠️ [deleteBarberoFoto] Archivo no encontrado, continuando...')
        return
      }
      throw error
    }
  },

  // Storage - Subir imagen de servicio
  uploadServicioFoto: async (file: File, servicioId: string) => {
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
      const fileName = `${servicioId}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      devLog('📤 [uploadServicioFoto] Subiendo archivo:', fileName)

      // Subir archivo a Supabase Storage
      const { data, error } = await supabase.storage
        .from('servicios-fotos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('❌ [uploadServicioFoto] Error subiendo:', error)
        throw error
      }

      devLog('✅ [uploadServicioFoto] Archivo subido:', data.path)

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('servicios-fotos')
        .getPublicUrl(data.path)

      devLog('🔗 [uploadServicioFoto] URL pública:', urlData.publicUrl)

      return {
        path: data.path,
        publicUrl: urlData.publicUrl
      }
    } catch (error: any) {
      console.error('❌ [uploadServicioFoto] Error:', error)
      throw error
    }
  },

  // Storage - Eliminar imagen de servicio
  deleteServicioFoto: async (filePath: string) => {
    try {
      devLog('🗑️ [deleteServicioFoto] Eliminando archivo:', filePath)

      const { error } = await supabase.storage
        .from('servicios-fotos')
        .remove([filePath])

      if (error) {
        console.error('❌ [deleteServicioFoto] Error eliminando:', error)
        throw error
      }

      devLog('✅ [deleteServicioFoto] Archivo eliminado')
    } catch (error: any) {
      console.error('❌ [deleteServicioFoto] Error:', error)
      // No lanzar error si el archivo no existe
      if (error.message?.includes('not found')) {
        devLog('⚠️ [deleteServicioFoto] Archivo no encontrado, continuando...')
        return
      }
      throw error
    }
  },

  // Storage - Subir imagen de producto
  uploadProductoFoto: async (file: File, productoId: string) => {
    try {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      if (!validTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)')
      }

      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error('La imagen es muy grande. Tamaño máximo: 5MB')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${productoId}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      devLog('📤 [uploadProductoFoto] Subiendo archivo:', fileName)

      const { data, error } = await supabase.storage
        .from('productos-fotos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('❌ [uploadProductoFoto] Error subiendo:', error)
        throw error
      }

      devLog('✅ [uploadProductoFoto] Archivo subido:', data.path)

      const { data: urlData } = supabase.storage
        .from('productos-fotos')
        .getPublicUrl(data.path)

      devLog('🔗 [uploadProductoFoto] URL pública:', urlData.publicUrl)

      return {
        path: data.path,
        publicUrl: urlData.publicUrl
      }
    } catch (error: any) {
      console.error('❌ [uploadProductoFoto] Error:', error)
      throw error
    }
  },

  // Storage - Eliminar imagen de producto
  deleteProductoFoto: async (filePath: string) => {
    try {
      devLog('🗑️ [deleteProductoFoto] Eliminando archivo:', filePath)

      const { error } = await supabase.storage
        .from('productos-fotos')
        .remove([filePath])

      if (error) {
        console.error('❌ [deleteProductoFoto] Error eliminando:', error)
        throw error
      }

      devLog('✅ [deleteProductoFoto] Archivo eliminado')
    } catch (error: any) {
      console.error('❌ [deleteProductoFoto] Error:', error)
      if (error.message?.includes('not found')) {
        devLog('⚠️ [deleteProductoFoto] Archivo no encontrado, continuando...')
        return
      }
      throw error
    }
  },

  // Storage - Subir foto de resultado de corte
  uploadCorteFoto: async (file: File, citaId: string) => {
    try {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        throw new Error('Solo se permiten imágenes (JPG, PNG, WEBP)')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${citaId}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { data, error } = await supabase.storage
        .from('cortes')
        .upload(filePath, file)

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('cortes')
        .getPublicUrl(data.path)

      return {
        path: data.path,
        publicUrl: urlData.publicUrl
      }
    } catch (error: any) {
      console.error('❌ [uploadCorteFoto] Error:', error)
      throw error
    }
  },

  // Cierres de Caja
  getCierresCaja: async (limit: number = 30) => {
    const { data, error } = await supabase
      .from('cierres_caja')
      .select('*')
      .order('fecha_inicio', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  },

  getCierreCajaPorRango: async (fechaInicio: string, fechaFin: string) => {
    const { data, error } = await supabase
      .from('cierres_caja')
      .select('*')
      .eq('fecha_inicio', fechaInicio)
      .eq('fecha_fin', fechaFin)
      .maybeSingle()

    if (error) throw error
    return data
  },

  crearCierreCaja: async (cierre: any) => {
    const { data, error } = await db
      .from('cierres_caja')
      .insert([cierre])
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateCierreCaja: async (id: string, updates: any) => {
    const { data, error } = await db
      .from('cierres_caja')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Extensiones para POS y Cierre de Caja
  getCitasHoyPendientes: async () => {
    const hoy = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date()).filter(p => p.type !== 'literal').reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {} as any);

    const hoyStr = `${hoy.year}-${hoy.month}-${hoy.day}`;

    const { data, error } = await supabase
      .from('citas')
      .select(`
        *,
        barberos (nombre, apellido),
        servicios (nombre, precio, duracion_minutos)
      `)
      .eq('fecha', hoyStr)
      .eq('estado_pago', 'pendiente')
      .in('estado', ['confirmada', 'completada'])
      .order('hora')

    if (error) throw error
    return data || []
  },

  getFacturasSinCierre: async (fechaInicio: string, fechaFin: string) => {
    const { data, error } = await supabase
      .from('facturas')
      .select('*')
      .gte('created_at', `${fechaInicio}T00:00:00`)
      .lte('created_at', `${fechaFin}T23:59:59`)
      .is('cierre_caja_id', null)
      .eq('anulada', false)

    if (error) throw error
    return data || []
  },

  vincularFacturasACierre: async (facturaIds: string[], cierreCajaId: string) => {
    const { data, error } = await db
      .from('facturas')
      .update({ cierre_caja_id: cierreCajaId })
      .in('id', facturaIds)
      .select()

    if (error) throw error
    return data
  },

  // =====================================================
  // INVENTARIO - Productos y Movimientos
  // =====================================================

  getProductos: async (soloActivos: boolean = true) => {
    let query = supabase.from('productos').select('*').order('nombre')
    if (soloActivos) query = query.eq('activo', true)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  getProducto: async (id: string) => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  createProducto: async (producto: any) => {
    const { data, error } = await db
      .from('productos')
      .insert([producto])
      .select()
      .single()
    if (error) throw error
    return data
  },

  updateProducto: async (id: string, updates: any) => {
    const { data, error } = await db
      .from('productos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  getProductosConStockBajo: async () => {
    const { data, error } = await db
      .from('productos')
      .select('*')
      .eq('activo', true)
      .filter('stock_actual', 'lte', 'stock_minimo')
      .order('stock_actual')
    if (error) throw error
    return data || []
  },

  getMovimientosInventario: async (productoId?: string, limit: number = 50) => {
    let query = db
      .from('inventario_movimientos')
      .select('*, productos(nombre)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (productoId) query = query.eq('producto_id', productoId)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  registrarMovimientoInventario: async (
    productoId: string,
    tipo: 'entrada' | 'salida' | 'ajuste',
    cantidad: number,
    motivo?: string,
    referenciaId?: string,
    createdBy?: string
  ) => {
    const { data: producto, error: fetchError } = await db
      .from('productos')
      .select('stock_actual')
      .eq('id', productoId)
      .single()

    if (fetchError) throw fetchError

    const stockAnterior = producto.stock_actual
    let stockNuevo = stockAnterior

    if (tipo === 'entrada') stockNuevo = stockAnterior + cantidad
    else if (tipo === 'salida') stockNuevo = stockAnterior - cantidad
    else stockNuevo = cantidad

    const { error: movError } = await db
      .from('inventario_movimientos')
      .insert([{
        producto_id: productoId,
        tipo,
        cantidad,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        motivo: motivo || null,
        referencia_id: referenciaId || null,
        created_by: createdBy || null,
      }])

    if (movError) throw movError

    const { error: updateError } = await db
      .from('productos')
      .update({ stock_actual: stockNuevo })
      .eq('id', productoId)

    if (updateError) throw updateError

    return { stockAnterior, stockNuevo }
  }
}
