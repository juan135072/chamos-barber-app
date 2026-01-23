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
          barbero_id: string | null
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
          barbero_id?: string | null
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
          barbero_id?: string | null
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
          especialidades: string[] | null
          imagen_url: string | null
          activo: boolean
          descripcion: string | null
          instagram: string | null
          slug: string | null
          porcentaje_comision: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          apellido: string
          email?: string | null
          telefono?: string | null
          especialidades?: string[] | null
          imagen_url?: string | null
          activo?: boolean
          descripcion?: string | null
          instagram?: string | null
          slug?: string | null
          porcentaje_comision?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          apellido?: string
          email?: string | null
          telefono?: string | null
          especialidades?: string[] | null
          imagen_url?: string | null
          activo?: boolean
          descripcion?: string | null
          instagram?: string | null
          slug?: string | null
          porcentaje_comision?: number
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
          tiempo_buffer: number
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
          tiempo_buffer?: number
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
          tiempo_buffer?: number
          activo?: boolean
          categoria?: string
          imagen_url?: string | null
          popular?: boolean
          orden_display?: number
          created_at?: string
          updated_at?: string
        }
      }
      categorias_servicios: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          icono: string | null
          orden: number
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          icono?: string | null
          orden?: number
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          icono?: string | null
          orden?: number
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      solicitudes_barberos: {
        Row: {
          id: string
          nombre: string
          apellido: string
          email: string
          telefono: string
          especialidad: string
          descripcion: string | null
          experiencia_anos: number
          imagen_url: string | null
          estado: string
          barbero_id: string | null
          revisada_por: string | null
          fecha_solicitud: string
          fecha_revision: string | null
          notas_revision: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          apellido: string
          email: string
          telefono: string
          especialidad: string
          descripcion?: string | null
          experiencia_anos?: number
          imagen_url?: string | null
          estado?: string
          barbero_id?: string | null
          revisada_por?: string | null
          fecha_solicitud?: string
          fecha_revision?: string | null
          notas_revision?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          apellido?: string
          email?: string
          telefono?: string
          especialidad?: string
          descripcion?: string | null
          experiencia_anos?: number
          imagen_url?: string | null
          estado?: string
          barbero_id?: string | null
          revisada_por?: string | null
          fecha_solicitud?: string
          fecha_revision?: string | null
          notas_revision?: string | null
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
          foto_resultado_url: string | null
          notas_tecnicas: string | null
          items: any | null
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
          foto_resultado_url?: string | null
          notas_tecnicas?: string | null
          items?: any | null
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
          foto_resultado_url?: string | null
          notas_tecnicas?: string | null
          items?: any | null
        }
      }
      notas_clientes: {
        Row: {
          id: string
          barbero_id: string
          cliente_email: string
          cliente_nombre: string
          cliente_telefono: string | null
          notas: string
          cita_id: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
          imagen_url: string | null
        }
        Insert: {
          id?: string
          barbero_id: string
          cliente_email: string
          cliente_nombre: string
          cliente_telefono?: string | null
          notas: string
          cita_id?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbero_id?: string
          cliente_email?: string
          cliente_nombre?: string
          cliente_telefono?: string | null
          notas?: string
          cita_id?: string | null
          tags?: string[] | null
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
      facturas: {
        Row: {
          id: string
          numero_factura: string
          cita_id: string | null
          barbero_id: string
          cliente_nombre: string
          cliente_telefono: string | null
          cliente_email: string | null
          items: Json
          subtotal: number
          descuento: number
          iva: number
          total: number
          metodo_pago: string
          monto_recibido: number | null
          cambio: number
          porcentaje_comision: number
          comision_barbero: number
          ingreso_casa: number
          mesa_silla: string | null
          notas: string | null
          impresa: boolean
          anulada: boolean
          fecha_anulacion: string | null
          motivo_anulacion: string | null
          anulada_por: string | null
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          numero_factura?: string
          cita_id?: string | null
          barbero_id: string
          cliente_nombre: string
          cliente_telefono?: string | null
          cliente_email?: string | null
          items: Json
          subtotal: number
          descuento?: number
          iva?: number
          total: number
          metodo_pago?: string
          monto_recibido?: number | null
          cambio?: number
          porcentaje_comision: number
          comision_barbero: number
          ingreso_casa: number
          mesa_silla?: string | null
          notas?: string | null
          impresa?: boolean
          anulada?: boolean
          fecha_anulacion?: string | null
          motivo_anulacion?: string | null
          anulada_por?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          numero_factura?: string
          cita_id?: string | null
          barbero_id?: string
          cliente_nombre?: string
          cliente_telefono?: string | null
          cliente_email?: string | null
          items?: Json
          subtotal?: number
          descuento?: number
          iva?: number
          total?: number
          metodo_pago?: string
          monto_recibido?: number | null
          cambio?: number
          porcentaje_comision?: number
          comision_barbero?: number
          ingreso_casa?: number
          mesa_silla?: string | null
          notas?: string | null
          impresa?: boolean
          anulada?: boolean
          fecha_anulacion?: string | null
          motivo_anulacion?: string | null
          anulada_por?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
      }
      configuracion_comisiones: {
        Row: {
          id: string
          barbero_id: string
          porcentaje: number
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barbero_id: string
          porcentaje?: number
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbero_id?: string
          porcentaje?: number
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      roles_permisos: {
        Row: {
          id: string
          rol: string
          nombre_display: string
          descripcion: string | null
          permisos: Json
          created_at: string
        }
        Insert: {
          id?: string
          rol: string
          nombre_display: string
          descripcion?: string | null
          permisos: Json
          created_at?: string
        }
        Update: {
          id?: string
          rol?: string
          nombre_display?: string
          descripcion?: string | null
          permisos?: Json
          created_at?: string
        }
      }
      horarios_atencion: {
        Row: {
          id: string
          barbero_id: string
          dia_semana: number
          hora_inicio: string
          hora_fin: string
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          barbero_id: string
          dia_semana: number
          hora_inicio: string
          hora_fin: string
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          barbero_id?: string
          dia_semana?: number
          hora_inicio?: string
          hora_fin?: string
          activo?: boolean
          created_at?: string
        }
      }
      horarios_bloqueados: {
        Row: {
          id: string
          barbero_id: string
          fecha_hora_inicio: string
          fecha_hora_fin: string
          motivo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          barbero_id: string
          fecha_hora_inicio: string
          fecha_hora_fin: string
          motivo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          barbero_id?: string
          fecha_hora_inicio?: string
          fecha_hora_fin?: string
          motivo?: string | null
          created_at?: string
        }
      }
      asistencias: {
        Row: {
          id: string
          barbero_id: string
          fecha: string
          hora: string
          estado: string
          clave_usada: string | null
          ubicacion_barberia_id: string | null
          latitud_registrada: number | null
          longitud_registrada: number | null
          distancia_metros: number | null
          dispositivo: string | null
          ip_address: string | null
          salida_registrada: boolean
          hora_salida: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barbero_id: string
          fecha: string
          hora: string
          estado: string
          clave_usada?: string | null
          ubicacion_barberia_id?: string | null
          latitud_registrada?: number | null
          longitud_registrada?: number | null
          distancia_metros?: number | null
          dispositivo?: string | null
          ip_address?: string | null
          salida_registrada?: boolean
          hora_salida?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbero_id?: string
          fecha?: string
          hora?: string
          estado?: string
          clave_usada?: string | null
          ubicacion_barberia_id?: string | null
          latitud_registrada?: number | null
          longitud_registrada?: number | null
          distancia_metros?: number | null
          dispositivo?: string | null
          ip_address?: string | null
          salida_registrada?: boolean
          hora_salida?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      claves_diarias: {
        Row: {
          id: string
          fecha: string
          clave: string
          activa: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          fecha: string
          clave: string
          activa?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          fecha?: string
          clave?: string
          activa?: boolean
          created_at?: string
          created_by?: string | null
        }
      }
      configuracion_horarios: {
        Row: {
          id: string
          nombre: string
          hora_entrada_puntual: string
          hora_salida_minima: string | null
          activa: boolean
          ubicacion_barberia_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          hora_entrada_puntual?: string
          hora_salida_minima?: string | null
          activa?: boolean
          ubicacion_barberia_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          hora_entrada_puntual?: string
          hora_salida_minima?: string | null
          activa?: boolean
          ubicacion_barberia_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ubicaciones_barberia: {
        Row: {
          id: string
          nombre: string
          direccion: string | null
          latitud: number
          longitud: number
          radio_metros: number
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          direccion?: string | null
          latitud: number
          longitud: number
          radio_metros?: number
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          direccion?: string | null
          latitud?: number
          longitud?: number
          radio_metros?: number
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
      }
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
      calcular_comisiones_factura: {
        Args: {
          p_barbero_id: string
          p_total: number
        }
        Returns: {
          porcentaje: number
          comision_barbero: number
          ingreso_casa: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
    Views: {
      ventas_diarias_por_barbero: {
        Row: {
          barbero_id: string
          barbero_nombre: string
          fecha: string
          total_ventas: number
          total_ingresos: number
          total_comision: number
          total_casa: number
          porcentaje_promedio: number
        }
      }
      cierre_caja_diario: {
        Row: {
          fecha: string
          metodo_pago: string
          cantidad_transacciones: number
          total_cobrado: number
          total_comisiones: number
          ingreso_neto_casa: number
        }
      }
      usuarios_con_permisos: {
        Row: {
          id: string
          email: string
          nombre: string
          rol: string
          activo: boolean
          telefono: string | null
          barbero_id: string | null
          rol_nombre: string | null
          rol_descripcion: string | null
          permisos: Json | null
          rol_created_at: string | null
        }
      }
    }
  }
}

// Tipos extendidos para el sistema POS
export interface FacturaItem {
  servicio_id: string
  nombre: string
  precio: number
  cantidad: number
  subtotal: number
}

export type Factura = Database['public']['Tables']['facturas']['Row'] & {
  items: FacturaItem[]
  barberos?: {
    nombre: string
    apellido: string
  }
  citas?: {
    cliente_nombre: string
    fecha: string
    hora: string
  }
}

export type ConfiguracionComision = Database['public']['Tables']['configuracion_comisiones']['Row'] & {
  barberos?: {
    nombre: string
    apellido: string
  }
}
