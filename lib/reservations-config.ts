/**
 * Configuración de Límites de Reservas
 * 
 * Sistema inteligente para prevenir abusos mientras permite
 * a clientes legítimos hacer reservas ilimitadas a lo largo del tiempo.
 */

export const RESERVATION_LIMITS = {
  /**
   * Máximo de citas FUTURAS con estado pendiente/confirmada
   * 
   * Esto previene que un usuario malicioso reserve todos los horarios,
   * pero permite a clientes frecuentes seguir reservando después de
   * que sus citas pasadas se completen.
   * 
   * Valor recomendado: 3-5 citas
   * - 3 citas = Cliente conservador (1 cita por semana = 3 semanas adelante)
   * - 5 citas = Cliente flexible (puede planificar hasta 5 semanas adelante)
   */
  MAX_ACTIVE_APPOINTMENTS: 5,

  /**
   * Estados que se consideran "activos" (ocupan un cupo del límite)
   * 
   * - pendiente: Cita creada pero no confirmada
   * - confirmada: Cita confirmada por el barbero/admin
   * 
   * NO incluimos:
   * - completada: La cita ya pasó y se completó
   * - cancelada: Fue cancelada (libera el cupo)
   * - no_asistio: Cliente no asistió (libera el cupo)
   */
  ACTIVE_STATES: ['pendiente', 'confirmada'] as const,

  /**
   * Período de tiempo para contar citas (en días)
   * 
   * Opcional: Límite adicional por período de tiempo
   * null = desactivado, solo cuenta citas futuras
   * 
   * Ejemplo: 30 días = máximo X citas en los últimos 30 días
   */
  TIME_PERIOD_DAYS: null as number | null,

  /**
   * Máximo de citas en el período de tiempo especificado
   * 
   * Solo aplica si TIME_PERIOD_DAYS está configurado
   */
  MAX_APPOINTMENTS_IN_PERIOD: 15,

  /**
   * Mensaje de error personalizado
   */
  ERROR_MESSAGES: {
    ACTIVE_LIMIT_REACHED: (currentCount: number, maxLimit: number) => 
      `⚠️ Tienes ${currentCount} cita${currentCount > 1 ? 's' : ''} pendiente${currentCount > 1 ? 's' : ''} o confirmada${currentCount > 1 ? 's' : ''}. El límite es de ${maxLimit} citas futuras simultáneas. Por favor espera a que se completen tus citas actuales antes de reservar más.`,
    
    PERIOD_LIMIT_REACHED: (currentCount: number, maxLimit: number, days: number) =>
      `⚠️ Has realizado ${currentCount} citas en los últimos ${days} días. El límite es de ${maxLimit} citas por período. Por favor intenta más tarde o contáctanos para casos especiales.`,
    
    CONTACT_INFO: '📞 Si necesitas hacer más reservas, contáctanos directamente.',
  }
}

/**
 * Interfaz para el resultado de la validación
 */
export interface ReservationValidationResult {
  allowed: boolean
  reason?: string
  currentCount?: number
  maxLimit?: number
}

/**
 * Función helper para validar límites de reservas
 * 
 * @param activeCitasCount - Cantidad de citas activas futuras
 * @param periodCitasCount - Cantidad de citas en el período (opcional)
 * @returns Objeto con resultado de validación
 */
export function validateReservationLimits(
  activeCitasCount: number,
  periodCitasCount?: number
): ReservationValidationResult {
  // Validar límite de citas activas (futuras)
  if (activeCitasCount >= RESERVATION_LIMITS.MAX_ACTIVE_APPOINTMENTS) {
    return {
      allowed: false,
      reason: RESERVATION_LIMITS.ERROR_MESSAGES.ACTIVE_LIMIT_REACHED(
        activeCitasCount,
        RESERVATION_LIMITS.MAX_ACTIVE_APPOINTMENTS
      ),
      currentCount: activeCitasCount,
      maxLimit: RESERVATION_LIMITS.MAX_ACTIVE_APPOINTMENTS
    }
  }

  // Validar límite por período de tiempo (si está habilitado)
  if (
    RESERVATION_LIMITS.TIME_PERIOD_DAYS !== null &&
    periodCitasCount !== undefined &&
    periodCitasCount >= RESERVATION_LIMITS.MAX_APPOINTMENTS_IN_PERIOD
  ) {
    return {
      allowed: false,
      reason: RESERVATION_LIMITS.ERROR_MESSAGES.PERIOD_LIMIT_REACHED(
        periodCitasCount,
        RESERVATION_LIMITS.MAX_APPOINTMENTS_IN_PERIOD,
        RESERVATION_LIMITS.TIME_PERIOD_DAYS
      ),
      currentCount: periodCitasCount,
      maxLimit: RESERVATION_LIMITS.MAX_APPOINTMENTS_IN_PERIOD
    }
  }

  // Permitir reserva
  return {
    allowed: true
  }
}
