/**
 * Zod Validation Schemas para Chamos Barber
 * Define los esquemas de validación para todas las APIs
 */

import { z } from 'zod'

// ============================================
// SCHEMAS DE CITAS
// ============================================

/**
 * Schema para crear una nueva cita
 */
export const CrearCitaSchema = z.object({
  barbero_id: z.string().uuid('ID de barbero inválido'),
  fecha: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Formato de fecha inválido. Use YYYY-MM-DD'
  ),
  hora: z.string().regex(
    /^([01]\d|2[0-3]):([0-5]\d)$/,
    'Formato de hora inválido. Use HH:MM (00:00-23:59)'
  ),
  cliente_nombre: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      'El nombre solo puede contener letras y espacios'
    ),
  cliente_telefono: z.string()
    .regex(
      /^\+?[1-9]\d{7,14}$/,
      'Número de teléfono inválido. Debe tener entre 8 y 15 dígitos'
    ),
  cliente_email: z.string().email('Email inválido').optional().or(z.literal('')),
  servicios_ids: z.array(z.string().uuid('ID de servicio inválido'))
    .min(1, 'Debe seleccionar al menos un servicio'),
  servicio_id: z.string().uuid('ID de servicio inválido').optional(), // Legacy support
  notas: z.string().max(500, 'Las notas no pueden exceder 500 caracteres').optional(),
  estado: z.enum(['pendiente', 'confirmada', 'completada', 'cancelada']).default('pendiente'),
})

/**
 * Schema para consultar citas por teléfono
 */
export const ConsultarCitasSchema = z.object({
  telefono: z.string()
    .regex(
      /^\+?[1-9]\d{7,14}$/,
      'Número de teléfono inválido'
    )
})

// ============================================
// SCHEMAS DE BARBEROS
// ============================================

/**
 * Schema para crear/actualizar barbero
 */
export const BarberoSchema = z.object({
  nombre: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  apellido: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede exceder 50 caracteres'),
  telefono: z.string()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Número de teléfono inválido')
    .optional(),
  email: z.string().email('Email inválido'),
  instagram: z.string()
    .regex(/^@?[\w.]+$/, 'Usuario de Instagram inválido')
    .optional(),
  descripcion: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
  especialidades: z.array(z.string()).optional(),
  activo: z.boolean().default(true),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones')
    .optional(),
})

/**
 * Schema para actualizar barbero (campos opcionales)
 */
export const ActualizarBarberoSchema = z.object({
  barberoId: z.string().uuid('ID de barbero inválido'),
  updates: BarberoSchema.partial(),
})

/**
 * Schema para toggle activo/inactivo
 */
export const ToggleBarberoActivoSchema = z.object({
  barberoId: z.string().uuid('ID de barbero inválido'),
  activo: z.boolean(),
})

/**
 * Schema para eliminar barbero
 */
export const EliminarBarberoSchema = z.object({
  barberoId: z.string().uuid('ID de barbero inválido'),
})

/**
 * Schema para consultar barbero por ID
 */
export const BarberoIdSchema = z.object({
  id: z.string().uuid('ID de barbero inválido'),
})

// ============================================
// SCHEMAS DE PORTFOLIO
// ============================================

/**
 * Schema para consultar portfolio de barbero
 */
export const BarberoPortfolioQuerySchema = z.object({
  barbero_id: z.string().uuid('ID de barbero inválido').optional(),
  aprobado: z.enum(['true', 'false']).optional(),
  activo: z.enum(['true', 'false']).optional(),
  limit: z.string().regex(/^\d+$/, 'Límite debe ser un número').optional(),
})

// ============================================
// SCHEMAS DE SOLICITUDES
// ============================================

/**
 * Schema para crear solicitud de barbero
 */
export const CrearSolicitudSchema = z.object({
  nombre: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  apellido: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede exceder 50 caracteres'),
  telefono: z.string()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Número de teléfono inválido'),
  email: z.string().email('Email inválido'),
  instagram: z.string()
    .regex(/^@?[\w.]+$/, 'Usuario de Instagram inválido')
    .optional(),
  experiencia_anos: z.number()
    .int('La experiencia debe ser un número entero')
    .min(0, 'La experiencia no puede ser negativa')
    .max(50, 'La experiencia no puede exceder 50 años'),
  descripcion: z.string()
    .min(50, 'La descripción debe tener al menos 50 caracteres')
    .max(1000, 'La descripción no puede exceder 1000 caracteres'),
  especialidades: z.array(z.string())
    .min(1, 'Debe seleccionar al menos una especialidad'),
  portafolio_urls: z.array(z.string().url('URL inválida')).optional(),
})

/**
 * Schema para aprobar solicitud
 */
export const AprobarSolicitudSchema = z.object({
  solicitudId: z.string().uuid('ID de solicitud inválido'),
})

// ============================================
// SCHEMAS DE CONFIGURACIÓN
// ============================================

/**
 * Schema para redes sociales
 */
export const RedesSocialesSchema = z.object({
  facebook: z.string().url('URL de Facebook inválida').optional().or(z.literal('')),
  instagram: z.string().url('URL de Instagram inválida').optional().or(z.literal('')),
  twitter: z.string().url('URL de Twitter inválida').optional().or(z.literal('')),
  youtube: z.string().url('URL de YouTube inválida').optional().or(z.literal('')),
  tiktok: z.string().url('URL de TikTok inválida').optional().or(z.literal('')),
})

// ============================================
// HELPER TYPES
// ============================================

export type CrearCitaInput = z.infer<typeof CrearCitaSchema>
export type ConsultarCitasInput = z.infer<typeof ConsultarCitasSchema>
export type BarberoInput = z.infer<typeof BarberoSchema>
export type ActualizarBarberoInput = z.infer<typeof ActualizarBarberoSchema>
export type CrearSolicitudInput = z.infer<typeof CrearSolicitudSchema>

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Función helper para validar datos con mejor manejo de errores
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: Record<string, string[]>
} {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {}
      error.issues.forEach((err) => {
        const path = err.path.join('.')
        if (!errors[path]) {
          errors[path] = []
        }
        errors[path].push(err.message)
      })
      return { success: false, errors }
    }
    return { 
      success: false, 
      errors: { general: ['Error de validación desconocido'] } 
    }
  }
}

/**
 * Safe parse que devuelve resultado más amigable
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true as const, data: result.data }
  }
  
  const errors: Record<string, string[]> = {}
  result.error.issues.forEach((err) => {
    const path = err.path.join('.') || 'general'
    if (!errors[path]) {
      errors[path] = []
    }
    errors[path].push(err.message)
  })
  
  return { success: false as const, errors }
}
