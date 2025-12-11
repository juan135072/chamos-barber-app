/**
 * Security Logger para Chamos Barber
 * Registra eventos de seguridad, errores y actividades sospechosas
 */

import winston from 'winston'

// Configurar formato de logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

// Crear logger de seguridad
const securityLogger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'chamos-barber-security' },
  transports: [
    // Logs de error a archivo separado
    new winston.transports.File({ 
      filename: 'logs/security-error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Todos los logs de seguridad
    new winston.transports.File({ 
      filename: 'logs/security.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
})

// En desarrollo, también mostrar en consola
if (process.env.NODE_ENV !== 'production') {
  securityLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }))
}

// Tipos de eventos de seguridad
export enum SecurityEventType {
  AUTHENTICATION_FAILED = 'authentication_failed',
  AUTHENTICATION_SUCCESS = 'authentication_success',
  AUTHORIZATION_FAILED = 'authorization_failed',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  VALIDATION_ERROR = 'validation_error',
  API_ERROR = 'api_error',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
}

interface SecurityLogData {
  eventType: SecurityEventType
  userId?: string
  ip?: string
  userAgent?: string
  endpoint?: string
  method?: string
  statusCode?: number
  errorMessage?: string
  data?: any
}

/**
 * Registrar evento de seguridad
 */
export function logSecurityEvent(data: SecurityLogData) {
  const logLevel = data.statusCode && data.statusCode >= 400 ? 'error' : 'info'
  
  securityLogger.log(logLevel, 'Security Event', {
    timestamp: new Date().toISOString(),
    ...data,
  })
}

/**
 * Registrar intento de acceso sospechoso
 */
export function logSuspiciousActivity(
  ip: string,
  endpoint: string,
  reason: string,
  details?: any
) {
  securityLogger.warn('Suspicious Activity Detected', {
    timestamp: new Date().toISOString(),
    eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
    ip,
    endpoint,
    reason,
    details,
  })
}

/**
 * Registrar error de validación
 */
export function logValidationError(
  endpoint: string,
  errors: any,
  ip?: string
) {
  securityLogger.error('Validation Error', {
    timestamp: new Date().toISOString(),
    eventType: SecurityEventType.VALIDATION_ERROR,
    endpoint,
    errors,
    ip,
  })
}

/**
 * Registrar límite de rate exceeded
 */
export function logRateLimitExceeded(
  ip: string,
  endpoint: string,
  limit: number
) {
  securityLogger.warn('Rate Limit Exceeded', {
    timestamp: new Date().toISOString(),
    eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
    ip,
    endpoint,
    limit,
  })
}

/**
 * Registrar error de API
 */
export function logApiError(
  endpoint: string,
  method: string,
  error: Error,
  ip?: string,
  userId?: string
) {
  securityLogger.error('API Error', {
    timestamp: new Date().toISOString(),
    eventType: SecurityEventType.API_ERROR,
    endpoint,
    method,
    errorMessage: error.message,
    errorStack: error.stack,
    ip,
    userId,
  })
}

export default securityLogger
