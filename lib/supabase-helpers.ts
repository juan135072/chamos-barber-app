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
    return data as PortfolioItem[]
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
      .update(updates)
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

  // Admin Users
  getAdminUsers: async () => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('nombre')

    if (error) throw error
    return data as AdminUser[]
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
          upsert: true
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

  // Storage - Eliminar imagen de barbero (no crítico, timeout/red no bloquean)
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
      // Errores no críticos: timeout, red, archivo no encontrado → solo warning
      const msg = (error.message || error.error_description || '').toLowerCase()
      if (msg.includes('not found') || msg.includes('timeout') || msg.includes('timed out') || msg.includes('network') || msg.includes('fetch')) {
        devLog('⚠️ [deleteBarberoFoto] Error no crítico (timeout/red/not found), continuando...')
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
        .from('barberos-fotos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        console.error('❌ [uploadServicioFoto] Error subiendo:', error)
        throw error
      }

      devLog('✅ [uploadServicioFoto] Archivo subido:', data.path)

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('barberos-fotos')
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

  // Storage - Eliminar imagen de servicio (no crítico, timeout/red no bloquean)
  deleteServicioFoto: async (filePath: string) => {
    try {
      devLog('🗑️ [deleteServicioFoto] Eliminando archivo:', filePath)

      const { error } = await supabase.storage
        .from('barberos-fotos')
        .remove([filePath])

      if (error) {
        console.error('❌ [deleteServicioFoto] Error eliminando:', error)
        throw error
      }

      devLog('✅ [deleteServicioFoto] Archivo eliminado')
    } catch (error: any) {
      console.error('❌ [deleteServicioFoto] Error:', error)
      // Errores no críticos: timeout, red, archivo no encontrado → solo warning
      const msg = (error.message || error.error_description || '').toLowerCase()
      if (msg.includes('not found') || msg.includes('timeout') || msg.includes('timed out') || msg.includes('network') || msg.includes('fetch')) {
        devLog('⚠️ [deleteServicioFoto] Error no crítico (timeout/red/not found), continuando...')
        return
      }
      throw error
    }
  },

  // Categorías de servicios
  getCategorias: async () => {
    const { data, error } = await supabase
      .from('categorias_servicios')
      .select('*')
      .order('nombre')

    if (error) throw error
    return data
  },

  createCategoria: async (categoria: Database['public']['Tables']['categorias_servicios']['Insert']) => {
    const { data, error } = await db
      .from('categorias_servicios')
      .insert([categoria])
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateCategoria: async (id: string, updates: Database['public']['Tables']['categorias_servicios']['Update']) => {
    const { data, error } = await db
      .from('categorias_servicios')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  deleteCategoria: async (id: string) => {
    const { error } = await supabase
      .from('categorias_servicios')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Productos
  getProductos: async (activo?: boolean) => {
    let query = supabase
      .from('productos')
      .select('*')

    if (activo !== undefined) {
      query = query.eq('activo', activo)
    }

    const { data, error } = await query.order('nombre')

    if (error) throw error
    return data
  },

  createProducto: async (producto: Database['public']['Tables']['productos']['Insert']) => {
    const { data, error } = await db
      .from('productos')
      .insert([producto])
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateProducto: async (id: string, updates: Database['public']['Tables']['productos']['Update']) => {
    const { data, error } = await db
      .from('productos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  deleteProducto: async (id: string) => {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Inventario - Movimientos
  getInventarioMovimientos: async (producto_id?: string, limit = 50) => {
    let query = supabase
      .from('inventario_movimientos')
      .select(`
        *,
        productos (nombre, sku)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (producto_id) {
      query = query.eq('producto_id', producto_id)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },

  createInventarioMovimiento: async (movimiento: Database['public']['Tables']['inventario_movimientos']['Insert']) => {
    const { data, error } = await db
      .from('inventario_movimientos')
      .insert([movimiento])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Ubicaciones
  getUbicaciones: async (activo?: boolean) => {
    let query = supabase
      .from('ubicaciones_barberia')
      .select('*')

    if (activo !== undefined) {
      query = query.eq('activo', activo)
    }

    const { data, error } = await query.order('nombre')

    if (error) throw error
    return data
  },

  createUbicacion: async (ubicacion: Database['public']['Tables']['ubicaciones_barberia']['Insert']) => {
    const { data, error } = await db
      .from('ubicaciones_barberia')
      .insert([ubicacion])
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateUbicacion: async (id: string, updates: Database['public']['Tables']['ubicaciones_barberia']['Update']) => {
    const { data, error } = await db
      .from('ubicaciones_barberia')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  deleteUbicacion: async (id: string) => {
    const { error } = await supabase
      .from('ubicaciones_barberia')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Configuración del sitio
  getSitioConfig: async () => {
    const { data, error } = await supabase
      .from('sitio_configuracion')
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  updateSitioConfig: async (updates: Database['public']['Tables']['sitio_configuracion']['Update']) => {
    const { data, error } = await db
      .from('sitio_configuracion')
      .update(updates)
      .eq('id', 1)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Enlaces sociales
  getEnlacesSociales: async () => {
    const { data, error } = await supabase
      .from('enlaces_sociales')
      .select('*')
      .order('orden')

    if (error) throw error
    return data
  },

  updateEnlaceSocial: async (id: string, updates: Database['public']['Tables']['enlaces_sociales']['Update']) => {
    const { data, error } = await db
      .from('enlaces_sociales')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Solicitudes de barberos
  getSolicitudes: async () => {
    const { data, error } = await supabase
      .from('solicitudes_barberos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  createSolicitud: async (solicitud: Database['public']['Tables']['solicitudes_barberos']['Insert']) => {
    const { data, error } = await db
      .from('solicitudes_barberos')
      .insert([solicitud])
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateSolicitud: async (id: string, updates: Database['public']['Tables']['solicitudes_barberos']['Update']) => {
    const { data, error } = await db
      .from('solicitudes_barberos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Asistencias
  getAsistencias: async (filters?: { barbero_id?: string, fecha?: string }) => {
    let query = supabase
      .from('asistencias')
      .select(`
        *,
        barberos (nombre, apellido)
      `)
      .order('fecha', { ascending: false })

    if (filters?.barbero_id) {
      query = query.eq('barbero_id', filters.barbero_id)
    }
    if (filters?.fecha) {
      query = query.eq('fecha', filters.fecha)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },

  createAsistencia: async (asistencia: Database['public']['Tables']['asistencias']['Insert']) => {
    const { data, error } = await db
      .from('asistencias')
      .insert([asistencia])
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateAsistencia: async (id: string, updates: Database['public']['Tables']['asistencias']['Update']) => {
    const { data, error } = await db
      .from('asistencias')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Ventas / Caja
  getCajaSesiones: async (filters?: { fecha?: string }) => {
    let query = supabase
      .from('caja_sesiones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (filters?.fecha) {
      query = query.eq('fecha_apertura', filters.fecha)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },

  createCajaSesion: async (sesion: any) => {
    const { data, error } = await db
      .from('caja_sesiones')
      .insert([sesion])
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateCajaSesion: async (id: string, updates: any) => {
    const { data, error } = await db
      .from('caja_sesiones')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  getMovimientosCaja: async (sesion_id: string) => {
    const { data, error } = await db
      .from('movimientos_caja')
      .select('*')
      .eq('sesion_id', sesion_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  createMovimientoCaja: async (movimiento: any) => {
    const { data, error } = await db
      .from('movimientos_caja')
      .insert([movimiento])
      .select()
      .single()

    if (error) throw error
    return data
  },

  getCierresCaja: async (filters?: { fecha?: string }) => {
    let query = db
      .from('cierres_caja')
      .select('*')
      .order('fecha_cierre', { ascending: false })

    if (filters?.fecha) {
      query = query.eq('fecha_cierre', filters.fecha)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },

  createCierreCaja: async (cierre: any) => {
    const { data, error } = await db
      .from('cierres_caja')
      .insert([cierre])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Gastos
  getGastos: async (filters?: { fecha_inicio?: string, fecha_fin?: string, categoria_id?: string }) => {
    let query = supabase
      .from('gastos')
      .select(`
        *,
        gastos_categorias (nombre, color)
      `)
      .order('fecha_gasto', { ascending: false })

    if (filters?.fecha_inicio) query = query.gte('fecha_gasto', filters.fecha_inicio)
    if (filters?.fecha_fin) query = query.lte('fecha_gasto', filters.fecha_fin)
    if (filters?.categoria_id) query = query.eq('categoria_id', filters.categoria_id)

    const { data, error } = await query

    if (error) throw error
    return data
  },

  createGasto: async (gasto: Database['public']['Tables']['gastos']['Insert']) => {
    const { data, error } = await db
      .from('gastos')
      .insert([gasto])
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateGasto: async (id: string, updates: Database['public']['Tables']['gastos']['Update']) => {
    const { data, error } = await db
      .from('gastos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  deleteGasto: async (id: string) => {
    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Categorías de gastos
  getGastosCategorias: async () => {
    const { data, error } = await supabase
      .from('gastos_categorias')
      .select('*')
      .order('nombre')

    if (error) throw error
    return data
  },

  createGastoCategoria: async (categoria: Database['public']['Tables']['gastos_categorias']['Insert']) => {
    const { data, error } = await db
      .from('gastos_categorias')
      .insert([categoria])
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateGastoCategoria: async (id: string, updates: Database['public']['Tables']['gastos_categorias']['Update']) => {
    const { data, error } = await db
      .from('gastos_categorias')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  deleteGastoCategoria: async (id: string) => {
    const { error } = await supabase
      .from('gastos_categorias')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Liquidaciones
  getLiquidaciones: async (filters?: { barbero_id?: string, fecha_inicio?: string, fecha_fin?: string }) => {
    let query = supabase
      .from('liquidaciones')
      .select(`
        *,
        barberos (nombre, apellido)
      `)
      .order('fecha_inicio', { ascending: false })

    if (filters?.barbero_id) query = query.eq('barbero_id', filters.barbero_id)
    if (filters?.fecha_inicio) query = query.gte('fecha_inicio', filters.fecha_inicio)
    if (filters?.fecha_fin) query = query.lte('fecha_fin', filters.fecha_fin)

    const { data, error } = await query

    if (error) throw error
    return data
  },

  createLiquidacion: async (liquidacion: Database['public']['Tables']['liquidaciones']['Insert']) => {
    const { data, error } = await db
      .from('liquidaciones')
      .insert([liquidacion])
      .select()
      .single()

    if (error) throw error
    return data
  },

  updateLiquidacion: async (id: string, updates: Database['public']['Tables']['liquidaciones']['Update']) => {
    const { data, error } = await db
      .from('liquidaciones')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  deleteLiquidacion: async (id: string) => {
    const { error } = await supabase
      .from('liquidaciones')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Facturas
  getFacturas: async (filters?: { fecha_inicio?: string, fecha_fin?: string, cita_id?: string }) => {
    let query = supabase
      .from('facturas')
      .select(`
        *,
        citas!inner (
          cliente_nombre, cliente_telefono, barbero_id,
          barberos (nombre, apellido)
        )
      `)
      .order('created_at', { ascending: false })

    if (filters?.fecha_inicio) query = query.gte('created_at', filters.fecha_inicio)
    if (filters?.fecha_fin) query = query.lte('created_at', filters.fecha_fin)
    if (filters?.cita_id) query = query.eq('cita_id', filters.cita_id)

    const { data, error } = await query

    if (error) throw error
    return data
  },

  createFactura: async (factura: any) => {
    const { data, error } = await db
      .from('facturas')
      .insert([factura])
      .select()
      .single()

    if (error) throw error
    return data
  },

  getFacturaDetalle: async (factura_id: string) => {
    const { data, error } = await db
      .from('facturas_detalle')
      .select(`
        *,
        servicios (nombre, precio)
      `)
      .eq('factura_id', factura_id)

    if (error) throw error
    return data
  },

  createFacturaDetalle: async (detalle: any) => {
    const { data, error } = await db
      .from('facturas_detalle')
      .insert([detalle])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Claves diarias
  getClaveDiaria: async (fecha?: string) => {
    let query = db
      .from('claves_diarias')
      .select('*')

    if (fecha) {
      query = query.eq('fecha', fecha)
    }

    const { data, error } = await query
      .order('fecha', { ascending: false })
      .limit(1)

    if (error) throw error
    return data?.[0] || null
  },

  createClaveDiaria: async (clave: any) => {
    const { data, error } = await db
      .from('claves_diarias')
      .insert([clave])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Notas de clientes
  getNotasCliente: async (cliente_telefono: string) => {
    const { data, error } = await supabase
      .from('notas_clientes')
      .select('*')
      .eq('cliente_telefono', cliente_telefono)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  createNotaCliente: async (nota: Database['public']['Tables']['notas_clientes']['Insert']) => {
    const { data, error } = await db
      .from('notas_clientes')
      .insert([nota])
      .select()
      .single()

    if (error) throw error
    return data
  },

  deleteNotaCliente: async (id: string) => {
    const { error } = await supabase
      .from('notas_clientes')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Comisiones / Roles
  getRolesPermisos: async () => {
    const { data, error } = await supabase
      .from('roles_permisos')
      .select('*')
      .order('nombre')

    if (error) throw error
    return data
  },

  // Categorías de clientes
  getClientesCategorias: async () => {
    const { data, error } = await supabase
      .from('clientes_categorias')
      .select('*')
      .order('nombre')

    if (error) throw error
    return data
  },
}