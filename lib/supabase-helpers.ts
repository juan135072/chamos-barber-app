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
    // Verificar disponibilidad
    const { data: existingCitas } = await supabase
      .from('citas')
      .select('*')
      .eq('barbero_id', cita.barbero_id)
      .eq('fecha', cita.fecha)
      .eq('hora', cita.hora)
      .neq('estado', 'cancelada')

    if (existingCitas && existingCitas.length > 0) {
      throw new Error('El horario seleccionado no está disponible')
    }

    const { data, error } = await supabase
      .from('citas')
      .insert([cita] as any)
      .select()
      .single()
    
    if (error) throw error
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
    const { data, error } = await supabase
      .rpc('get_horarios_disponibles', {
        barbero_id,
        fecha
      })
    
    if (error) throw error
    return data
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
  }
}