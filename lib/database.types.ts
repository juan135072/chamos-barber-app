export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string
          email: string
          password_hash: string
          nombre: string
          rol: string
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          nombre: string
          rol?: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          nombre?: string
          rol?: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      barberos: {
        Row: {
          id: string
          nombre: string
          apellido: string
          email: string | null
          telefono: string | null
          especialidad: string
          imagen_url: string | null
          activo: boolean
          descripcion: string | null
          instagram: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          apellido: string
          email?: string | null
          telefono?: string | null
          especialidad: string
          imagen_url?: string | null
          activo?: boolean
          descripcion?: string | null
          instagram?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          apellido?: string
          email?: string | null
          telefono?: string | null
          especialidad?: string
          imagen_url?: string | null
          activo?: boolean
          descripcion?: string | null
          instagram?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      servicios: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          precio: number
          duracion_minutos: number
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          precio: number
          duracion_minutos: number
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          precio?: number
          duracion_minutos?: number
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      citas: {
        Row: {
          id: string
          cliente_nombre: string
          cliente_email: string | null
          cliente_telefono: string | null
          barbero_id: string
          servicio_id: string
          fecha: string
          hora: string
          estado: string
          notas: string | null
          precio_final: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cliente_nombre: string
          cliente_email?: string | null
          cliente_telefono?: string | null
          barbero_id: string
          servicio_id: string
          fecha: string
          hora: string
          estado?: string
          notas?: string | null
          precio_final?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cliente_nombre?: string
          cliente_email?: string | null
          cliente_telefono?: string | null
          barbero_id?: string
          servicio_id?: string
          fecha?: string
          hora?: string
          estado?: string
          notas?: string | null
          precio_final?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      barbero_portfolio: {
        Row: {
          id: string
          barbero_id: string
          titulo: string
          descripcion: string | null
          imagen_url: string
          activo: boolean
          orden: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barbero_id: string
          titulo: string
          descripcion?: string | null
          imagen_url: string
          activo?: boolean
          orden?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbero_id?: string
          titulo?: string
          descripcion?: string | null
          imagen_url?: string
          activo?: boolean
          orden?: number
          created_at?: string
          updated_at?: string
        }
      }
      portfolio_galerias: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          activo: boolean
          orden: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          activo?: boolean
          orden?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          activo?: boolean
          orden?: number
          created_at?: string
          updated_at?: string
        }
      }
      sitio_configuracion: {
        Row: {
          id: string
          clave: string
          valor: string | null
          tipo: string
          descripcion: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clave: string
          valor?: string | null
          tipo?: string
          descripcion?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clave?: string
          valor?: string | null
          tipo?: string
          descripcion?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      horarios_trabajo: {
        Row: {
          id: string
          barbero_id: string
          dia_semana: number
          hora_inicio: string
          hora_fin: string
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barbero_id: string
          dia_semana: number
          hora_inicio: string
          hora_fin: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbero_id?: string
          dia_semana?: number
          hora_inicio?: string
          hora_fin?: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_horarios_disponibles: {
        Args: {
          barbero_id: string
          fecha: string
        }
        Returns: {
          hora: string
          disponible: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}