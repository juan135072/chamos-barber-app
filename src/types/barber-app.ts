// ================================================================
// 📱 CHAMOS BARBER APP - TIPOS TYPESCRIPT
// ================================================================

export type EstadoCita = 'pendiente' | 'confirmada' | 'completada' | 'cancelada'

export interface Cita {
  id: string
  barbero_id: string
  servicio_id: string
  cliente_nombre: string
  cliente_email: string
  cliente_telefono: string
  fecha_hora: string
  duracion: number
  estado: EstadoCita
  notas: string | null
  created_at: string
  updated_at: string
  // Datos del servicio (join)
  servicio_nombre?: string
  servicio_precio?: number
}

export interface CitaConServicio extends Cita {
  servicio: {
    id: string
    nombre: string
    precio: number
    duracion: number
  }
}

export interface Barbero {
  id: string
  nombre: string
  apellido: string
  telefono: string | null
  email: string | null
  instagram: string | null
  descripcion: string | null
  especialidades: string[] | null
  imagen_url: string | null
  activo: boolean
  disponibilidad: boolean
  ultima_conexion: string | null
  slug: string | null
  created_at: string
  updated_at: string
}

export interface MetricasDiarias {
  total_citas: number
  citas_completadas: number
  citas_pendientes: number
  ganancia_total: number
  promedio_por_cita: number
}

export interface BarberoSession {
  userId: string
  barberoId: string
  barbero: Barbero
  email: string
  nombre: string
}

export interface CitaAction {
  type: 'check-in' | 'completar' | 'cancelar'
  citaId: string
  nuevoEstado: EstadoCita
}

export interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Cita
  old: Cita
  errors: string[] | null
}

// ================================================================
// PROPS DE COMPONENTES
// ================================================================

export interface CitaCardProps {
  cita: Cita
  onCheckIn: (citaId: string) => void
  onCompletar: (citaId: string) => void
  onCancelar: (citaId: string) => void
  loading?: boolean
}

export interface CitasListProps {
  citas: Cita[]
  loading: boolean
  onRefresh: () => void
  onCheckIn: (citaId: string) => void
  onCompletar: (citaId: string) => void
  onCancelar: (citaId: string) => void
}

export interface MetricasRapidasProps {
  metricas: MetricasDiarias
  loading: boolean
}

export interface ToggleDisponibilidadProps {
  disponibilidad: boolean
  loading: boolean
  onChange: (disponible: boolean) => void
}

export interface BarberAppLayoutProps {
  children: React.ReactNode
  barbero: Barbero
  currentPage: 'agenda' | 'profile' | 'history'
}

export interface BottomNavProps {
  currentPage: 'agenda' | 'profile' | 'history'
}

// ================================================================
// RESPUESTAS DE API
// ================================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface CambiarEstadoResponse {
  id: string
  estado: EstadoCita
  updated_at: string
  success: boolean
  message: string
}

export interface ToggleDisponibilidadResponse {
  id: string
  nombre: string
  disponibilidad: boolean
  updated_at: string
}

// ================================================================
// CONFIGURACIÓN DE NOTIFICACIONES
// ================================================================

export interface NotificationConfig {
  enabled: boolean
  oneSignalAppId: string
  vapidKey?: string
}

export interface PushNotification {
  title: string
  body: string
  data?: {
    citaId?: string
    action?: string
  }
}
