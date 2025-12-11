/**
 * Simple In-Memory Rate Limiter para Chamos Barber
 * 
 * NOTA: Esta es una implementación básica que funciona en un solo servidor.
 * Para producción con múltiples instancias, considerar usar Redis con Upstash.
 * 
 * Ventajas: No requiere dependencias externas, fácil de implementar
 * Desventajas: Se resetea al reiniciar el servidor, no funciona con múltiples instancias
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { logRateLimitExceeded } from './logger'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Store in-memory para rate limiting
const requestStore = new Map<string, RateLimitEntry>()

// Limpiar entradas expiradas cada 10 minutos
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of requestStore.entries()) {
    if (entry.resetTime < now) {
      requestStore.delete(key)
    }
  }
}, 10 * 60 * 1000) // 10 minutos

/**
 * Configuración de rate limit por endpoint
 */
export const RATE_LIMIT_CONFIG = {
  // APIs públicas críticas
  '/api/crear-cita': {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hora
    message: 'Demasiadas reservas. Por favor espera 1 hora antes de intentar nuevamente.',
  },
  '/api/consultar-citas': {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hora
    message: 'Demasiadas consultas. Por favor espera antes de intentar nuevamente.',
  },
  // APIs de administración
  '/api/barberos/create': {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minuto
    message: 'Demasiadas operaciones. Por favor espera antes de continuar.',
  },
  '/api/barberos/update': {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minuto
    message: 'Demasiadas actualizaciones. Por favor espera antes de continuar.',
  },
  '/api/barberos/delete-permanent': {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minuto
    message: 'Demasiadas eliminaciones. Por favor espera antes de continuar.',
  },
  // Default para otras APIs
  default: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minuto
    message: 'Demasiadas solicitudes. Por favor espera antes de continuar.',
  },
}

/**
 * Obtener identificador único del cliente
 * Prioriza: IP real → X-Forwarded-For → IP de conexión
 */
function getClientIdentifier(req: NextApiRequest): string {
  // Intentar obtener IP real detrás de proxy (Cloudflare, Nginx, etc.)
  const forwardedFor = req.headers['x-forwarded-for']
  const realIp = req.headers['x-real-ip']
  
  if (forwardedFor) {
    // X-Forwarded-For puede tener múltiples IPs, tomar la primera
    const ips = Array.isArray(forwardedFor) 
      ? forwardedFor[0] 
      : forwardedFor.split(',')[0]
    return ips.trim()
  }
  
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp
  }
  
  // Fallback a socket IP
  return req.socket.remoteAddress || 'unknown'
}

/**
 * Obtener configuración de rate limit para un endpoint
 */
function getRateLimitConfig(endpoint: string) {
  // Normalizar endpoint (remover query params)
  const normalizedEndpoint = endpoint.split('?')[0]
  
  return RATE_LIMIT_CONFIG[normalizedEndpoint as keyof typeof RATE_LIMIT_CONFIG] 
    || RATE_LIMIT_CONFIG.default
}

/**
 * Verificar si el cliente ha excedido el rate limit
 */
function checkRateLimit(
  identifier: string,
  endpoint: string
): { allowed: boolean; limit: number; remaining: number; resetTime: number } {
  const config = getRateLimitConfig(endpoint)
  const key = `${identifier}:${endpoint}`
  const now = Date.now()
  
  let entry = requestStore.get(key)
  
  // Si no existe o ya expiró, crear nueva entrada
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    requestStore.set(key, entry)
    
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    }
  }
  
  // Incrementar contador
  entry.count++
  
  // Verificar si excedió el límite
  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }
  
  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Middleware de Rate Limiting
 * 
 * Uso:
 * ```typescript
 * export default async function handler(req, res) {
 *   const rateLimitResult = await applyRateLimit(req, res)
 *   if (!rateLimitResult.allowed) return
 *   
 *   // ... resto de tu código
 * }
 * ```
 */
export async function applyRateLimit(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ allowed: boolean }> {
  const identifier = getClientIdentifier(req)
  const endpoint = req.url?.split('?')[0] || 'unknown'
  const config = getRateLimitConfig(endpoint)
  
  const result = checkRateLimit(identifier, endpoint)
  
  // Agregar headers de rate limit (estándar RFC 6585)
  res.setHeader('X-RateLimit-Limit', result.limit.toString())
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString())
  res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString())
  
  if (!result.allowed) {
    // Log del evento
    logRateLimitExceeded(identifier, endpoint, result.limit)
    
    // Calcular tiempo de espera en segundos
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
    res.setHeader('Retry-After', retryAfter.toString())
    
    res.status(429).json({
      error: config.message,
      code: 'RATE_LIMIT_EXCEEDED',
      limit: result.limit,
      retryAfter,
      resetTime: new Date(result.resetTime).toISOString(),
    })
    
    return { allowed: false }
  }
  
  return { allowed: true }
}

/**
 * HOC (Higher Order Component) para aplicar rate limiting a una API handler
 * 
 * Uso:
 * ```typescript
 * export default withRateLimit(async function handler(req, res) {
 *   // Tu código aquí - solo se ejecuta si pasa el rate limit
 * })
 * ```
 */
export function withRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const rateLimitResult = await applyRateLimit(req, res)
    
    if (!rateLimitResult.allowed) {
      return // Ya se envió la respuesta de error
    }
    
    return handler(req, res)
  }
}

/**
 * Limpiar todas las entradas de rate limit (útil para testing)
 */
export function clearRateLimitStore() {
  requestStore.clear()
}

/**
 * Obtener estadísticas de rate limit (útil para monitoring)
 */
export function getRateLimitStats() {
  const now = Date.now()
  let activeEntries = 0
  let totalRequests = 0
  
  for (const entry of requestStore.values()) {
    if (entry.resetTime > now) {
      activeEntries++
      totalRequests += entry.count
    }
  }
  
  return {
    activeClients: activeEntries,
    totalRequests,
    storeSize: requestStore.size,
  }
}

export default applyRateLimit
