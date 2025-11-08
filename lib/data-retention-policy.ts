/**
 * Política de Retención de Datos - Clientes Inactivos
 * 
 * Sistema automático de categorización y archivo de clientes
 * basado en su última actividad (última cita).
 */

export const DATA_RETENTION_POLICY = {
  /**
   * Categorización de Clientes por Actividad
   * Basado en meses desde la última cita
   */
  CATEGORIAS: {
    ACTIVO: {
      label: 'Activo',
      icon: '🟢',
      color: '#10B981', // green-500
      meses_min: 0,
      meses_max: 3,
      descripcion: 'Cliente frecuente, última cita reciente',
      acciones_sugeridas: []
    },
    REGULAR: {
      label: 'Regular',
      icon: '🟡',
      color: '#F59E0B', // amber-500
      meses_min: 3,
      meses_max: 6,
      descripcion: 'Cliente regular, puede necesitar recordatorio',
      acciones_sugeridas: ['enviar_recordatorio', 'ofrecer_promocion']
    },
    INACTIVO: {
      label: 'Inactivo',
      icon: '🟠',
      color: '#F97316', // orange-500
      meses_min: 6,
      meses_max: 12,
      descripcion: 'No ha visitado en varios meses',
      acciones_sugeridas: ['campaña_reactivacion', 'llamada_seguimiento']
    },
    DORMIDO: {
      label: 'Dormido',
      icon: '🔴',
      color: '#EF4444', // red-500
      meses_min: 12,
      meses_max: 24,
      descripcion: 'Inactivo por más de 1 año',
      acciones_sugeridas: ['archivar', 'ultimo_intento_contacto']
    },
    ABANDONADO: {
      label: 'Abandonado',
      icon: '⚫',
      color: '#6B7280', // gray-500
      meses_min: 24,
      meses_max: Infinity,
      descripcion: 'No ha vuelto en más de 2 años',
      acciones_sugeridas: ['eliminar', 'exportar_historial']
    }
  },

  /**
   * Configuración de Auto-Archivo
   */
  AUTO_ARCHIVE: {
    // ¿Habilitar archivo automático?
    enabled: true,
    
    // Meses de inactividad antes de archivar
    after_months: 12,
    
    // ¿Notificar admin antes de archivar?
    notify_before: true,
    notify_days: 7,
    
    // ¿Mantener accesible en "Archivados"?
    keep_accessible: true
  },

  /**
   * Configuración de Auto-Eliminación
   */
  AUTO_DELETE: {
    // ¿Habilitar eliminación automática?
    // IMPORTANTE: false por defecto por seguridad
    enabled: false,
    
    // Meses de inactividad antes de eliminar (solo si está archivado)
    after_months: 36, // 3 años total (12 activo + 24 archivado)
    
    // Días de gracia después de notificación
    grace_period_days: 30,
    
    // ¿Notificar admin antes de eliminar?
    notify_before: true,
    notify_days: 30,
    
    // ¿Mantener estadísticas anónimas?
    keep_anonymous_stats: true
  },

  /**
   * Configuración de Notificaciones
   */
  NOTIFICATIONS: {
    // Email del administrador
    admin_email: process.env.ADMIN_EMAIL || '',
    
    // Frecuencia de reportes
    report_frequency: 'monthly', // 'weekly' | 'monthly' | 'quarterly'
    
    // Incluir en reporte
    include_in_report: {
      total_por_categoria: true,
      lista_abandonados: true,
      sugerencias_eliminacion: true,
      espacio_liberado: true
    }
  },

  /**
   * Configuración de Exportación antes de Eliminar
   */
  EXPORT_BEFORE_DELETE: {
    // ¿Exportar automáticamente antes de eliminar?
    enabled: true,
    
    // Formato de exportación
    format: 'json', // 'json' | 'csv' | 'pdf'
    
    // Ubicación de backups
    backup_location: 'supabase_storage', // 'supabase_storage' | 'local' | 's3'
    
    // ¿Mantener backups por cuánto tiempo?
    backup_retention_years: 7 // Para cumplimiento legal
  }
}

/**
 * Categoría de un cliente
 */
export type ClienteCategoria = keyof typeof DATA_RETENTION_POLICY.CATEGORIAS

/**
 * Información de categoría de cliente
 */
export interface ClienteCategoriaInfo {
  categoria: ClienteCategoria
  meses_inactivo: number
  ultima_cita_fecha: string
  label: string
  icon: string
  color: string
  acciones_sugeridas: string[]
}

/**
 * Calcular la categoría de un cliente según su última cita
 * 
 * @param ultimaCitaFecha - Fecha de la última cita (formato ISO o Date)
 * @returns Información de la categoría del cliente
 */
export function calcularCategoriaCliente(ultimaCitaFecha: string | Date): ClienteCategoriaInfo {
  const fecha = typeof ultimaCitaFecha === 'string' 
    ? new Date(ultimaCitaFecha) 
    : ultimaCitaFecha

  const hoy = new Date()
  const mesesInactivo = Math.floor(
    (hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24 * 30)
  )

  // Determinar categoría
  let categoriaKey: ClienteCategoria = 'ACTIVO'
  
  for (const [key, config] of Object.entries(DATA_RETENTION_POLICY.CATEGORIAS)) {
    if (mesesInactivo >= config.meses_min && mesesInactivo < config.meses_max) {
      categoriaKey = key as ClienteCategoria
      break
    }
  }

  const categoria = DATA_RETENTION_POLICY.CATEGORIAS[categoriaKey]

  return {
    categoria: categoriaKey,
    meses_inactivo: mesesInactivo,
    ultima_cita_fecha: fecha.toISOString(),
    label: categoria.label,
    icon: categoria.icon,
    color: categoria.color,
    acciones_sugeridas: categoria.acciones_sugeridas
  }
}

/**
 * Verificar si un cliente debe ser archivado
 */
export function debeSerArchivado(mesesInactivo: number): boolean {
  if (!DATA_RETENTION_POLICY.AUTO_ARCHIVE.enabled) return false
  return mesesInactivo >= DATA_RETENTION_POLICY.AUTO_ARCHIVE.after_months
}

/**
 * Verificar si un cliente debe ser eliminado
 */
export function debeSerEliminado(mesesInactivo: number, estaArchivado: boolean): boolean {
  if (!DATA_RETENTION_POLICY.AUTO_DELETE.enabled) return false
  if (!estaArchivado) return false
  return mesesInactivo >= DATA_RETENTION_POLICY.AUTO_DELETE.after_months
}

/**
 * Obtener clientes por categoría (query helper)
 */
export function getClientesPorCategoriaQuery() {
  // Esta query se puede usar en Supabase
  return `
    WITH ultima_cita_por_cliente AS (
      SELECT 
        cliente_telefono,
        cliente_nombre,
        cliente_email,
        MAX(fecha) as ultima_cita,
        COUNT(*) as total_citas,
        EXTRACT(EPOCH FROM (NOW() - MAX(fecha))) / (60 * 60 * 24 * 30) as meses_inactivo
      FROM citas
      GROUP BY cliente_telefono, cliente_nombre, cliente_email
    )
    SELECT 
      *,
      CASE 
        WHEN meses_inactivo < 3 THEN 'ACTIVO'
        WHEN meses_inactivo < 6 THEN 'REGULAR'
        WHEN meses_inactivo < 12 THEN 'INACTIVO'
        WHEN meses_inactivo < 24 THEN 'DORMIDO'
        ELSE 'ABANDONADO'
      END as categoria
    FROM ultima_cita_por_cliente
    ORDER BY meses_inactivo DESC;
  `
}

/**
 * Obtener mensaje de notificación para admin
 */
export function generarMensajeNotificacion(
  clientesAbandonados: number,
  espacioEstimado: string
): string {
  return `
    🔔 REPORTE DE RETENCIÓN DE DATOS
    
    Clientes Abandonados (>24 meses sin actividad): ${clientesAbandonados}
    Espacio estimado a liberar: ${espacioEstimado}
    
    Acciones disponibles:
    1. Revisar lista de abandonados
    2. Exportar historiales antes de eliminar
    3. Eliminar seleccionados manualmente
    4. Habilitar eliminación automática (30 días de gracia)
    
    Panel Admin → Clientes → Abandonados
  `
}
