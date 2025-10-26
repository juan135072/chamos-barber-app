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
          nombre: string
          rol: string
          activo: boolean
          telefono: string | null
          avatar_url: string | null
          ultimo_acceso: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          nombre: string
          rol?: string
          activo?: boolean
          telefono?: string | null
          avatar_url?: string | null
          ultimo_acceso?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nombre?: string
          rol?: string
          activo?: boolean
          telefono?: string | null
          avatar_url?: string | null
          ultimo_acceso?: string | null
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
          experiencia_anos: number
          calificacion: number
          precio_base: number
          orden_display: number
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
          experiencia_anos?: number
          calificacion?: number
          precio_base?: number
          orden_display?: number
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
          experiencia_anos?: number
          calificacion?: number
          precio_base?: number
          orden_display?: number
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
          categoria: string
          imagen_url: string | null
          popular: boolean
          orden_display: number
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
          categoria?: string
          imagen_url?: string | null
          popular?: boolean
          orden_display?: number
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
          categoria?: string
          imagen_url?: string | null
          popular?: boolean
          orden_display?: number
          created_at?: string
          updated_at?: string
        }
      }
      citas: {
        Row: {
          id: string
          cliente_nombre: string
          cliente_email: string | null
          cliente_telefono: string
          barbero_id: string | null
          servicio_id: string | null
          fecha: string
          hora: string
          estado: string
          notas: string | null
          precio_final: number | null
          metodo_pago: string
          confirmada_por: string | null
          fecha_confirmacion: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cliente_nombre: string
          cliente_email?: string | null
          cliente_telefono: string
          barbero_id?: string | null
          servicio_id?: string | null
          fecha: string
          hora: string
          estado?: string
          notas?: string | null
          precio_final?: number | null
          metodo_pago?: string
          confirmada_por?: string | null
          fecha_confirmacion?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cliente_nombre?: string
          cliente_email?: string | null
          cliente_telefono?: string
          barbero_id?: string | null
          servicio_id?: string | null
          fecha?: string
          hora?: string
          estado?: string
          notas?: string | null
          precio_final?: number | null
          metodo_pago?: string
          confirmada_por?: string | null
          fecha_confirmacion?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      horarios_trabajo: {
        Row: {
          id: string
          barbero_id: string | null
          dia_semana: number
          hora_inicio: string
          hora_fin: string
          activo: boolean
          descanso_inicio: string | null
          descanso_fin: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barbero_id?: string | null
          dia_semana: number
          hora_inicio: string
          hora_fin: string
          activo?: boolean
          descanso_inicio?: string | null
          descanso_fin?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbero_id?: string | null
          dia_semana?: number
          hora_inicio?: string
          hora_fin?: string
          activo?: boolean
          descanso_inicio?: string | null
          descanso_fin?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      barbero_portfolio: {
        Row: {
          id: string
          barbero_id: string | null
          titulo: string
          descripcion: string | null
          imagen_url: string
          activo: boolean
          orden: number
          likes: number
          tags: string[] | null
          fecha_trabajo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barbero_id?: string | null
          titulo: string
          descripcion?: string | null
          imagen_url: string
          activo?: boolean
          orden?: number
          likes?: number
          tags?: string[] | null
          fecha_trabajo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbero_id?: string | null
          titulo?: string
          descripcion?: string | null
          imagen_url?: string
          activo?: boolean
          orden?: number
          likes?: number
          tags?: string[] | null
          fecha_trabajo?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      portfolio_galerias: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          imagen_url: string
          activo: boolean
          orden: number
          categoria: string
          destacada: boolean
          likes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          imagen_url: string
          activo?: boolean
          orden?: number
          categoria?: string
          destacada?: boolean
          likes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          imagen_url?: string
          activo?: boolean
          orden?: number
          categoria?: string
          destacada?: boolean
          likes?: number
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
          categoria: string
          publico: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clave: string
          valor?: string | null
          tipo?: string
          descripcion?: string | null
          categoria?: string
          publico?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clave?: string
          valor?: string | null
          tipo?: string
          descripcion?: string | null
          categoria?: string
          publico?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      estadisticas: {
        Row: {
          id: string
          fecha: string
          total_citas: number
          total_completadas: number
          total_canceladas: number
          total_ingresos: number
          barbero_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fecha: string
          total_citas?: number
          total_completadas?: number
          total_canceladas?: number
          total_ingresos?: number
          barbero_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fecha?: string
          total_citas?: number
          total_completadas?: number
          total_canceladas?: number
          total_ingresos?: number
          barbero_id?: string | null
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
          p_barbero_id: string
          p_fecha: string
        }
        Returns: {
          hora: string
          disponible: boolean
          motivo: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
