/**
 * HTTP plumbing for the WhatsApp agent API under /api/bot/*.
 *
 * - Every route requires the `x-bot-api-key` header to equal BOT_API_KEY
 *   (constant-time comparison). Without a usable BOT_API_KEY the API answers
 *   503 and never runs unauthenticated.
 * - The tenant is fixed by BOT_COMERCIO_SLUG (default "chamos"); requests
 *   cannot choose another one.
 * - Responses use one envelope: { success: true, data } or
 *   { success: false, code, message }. Internal errors never leak details.
 *
 * There is no per-IP rate limit here: the agent runs on one server and is
 * authenticated. Per-customer limits (active bookings) still apply.
 */
import { createHash, timingSafeEqual } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient } from '@/lib/supabase-server'

export const BOT_KEY_HEADER = 'x-bot-api-key'
export const MIN_BOT_KEY_LENGTH = 32
export const DEFAULT_BOT_SLUG = 'chamos'

export type BotErrorCode =
  | 'NO_AUTORIZADO'
  | 'BOT_NO_CONFIGURADO'
  | 'METODO_NO_PERMITIDO'
  | 'DATOS_INVALIDOS'
  | 'BARBERO_NO_DISPONIBLE'
  | 'SERVICIO_NO_DISPONIBLE'
  | 'CITA_NO_ENCONTRADA'
  | 'CITA_NO_MODIFICABLE'
  | 'HORARIO_NO_DISPONIBLE'
  | 'RACE_CONDITION'
  | 'FUERA_DE_PLAZO'
  | 'LIMITE_CITAS_ALCANZADO'
  | 'ERROR_INTERNO'

export interface BotTenant {
  id: string
  slug: string
  nombre: string
  direccion: string | null
  telefono: string | null
  timezone: string
  moneda: string | null
}

export interface BotContext {
  db: any
  tenant: BotTenant
}

type BotHandler = (req: NextApiRequest, res: NextApiResponse, ctx: BotContext) => Promise<unknown>

export function sendBotData(res: NextApiResponse, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data })
}

export function sendBotError(res: NextApiResponse, status: number, code: BotErrorCode, message: string) {
  return res.status(status).json({ success: false, code, message })
}

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest()

/** Constant-time key check. Hashing first yields equal-length buffers, so timing reveals neither length nor content. */
export function botKeyMatches(presented: unknown, expected: string): boolean {
  if (typeof presented !== 'string' || presented.length === 0) return false
  return timingSafeEqual(sha256(presented), sha256(expected))
}

/** Resolves BOT_COMERCIO_SLUG to an active tenant; null when it does not exist or is inactive. */
export async function resolveBotTenant(db: any): Promise<BotTenant | null> {
  const slug = (process.env.BOT_COMERCIO_SLUG || DEFAULT_BOT_SLUG).trim()
  if (!/^[a-z0-9-]{2,50}$/.test(slug)) return null

  const { data, error } = await db
    .from('comercios')
    .select('id, slug, nombre, direccion, telefono, timezone, moneda, activo')
    .eq('slug', slug)
    .limit(1)
  if (error) throw new Error(`Tenant lookup failed: ${error.message}`)

  const row = Array.isArray(data) ? data[0] : null
  // get_horarios_disponibles() only serves tenants with activo IS TRUE.
  if (!row || row.activo !== true) return null
  return {
    id: row.id,
    slug: row.slug,
    nombre: row.nombre,
    direccion: row.direccion ?? null,
    telefono: row.telefono ?? null,
    timezone: row.timezone || 'America/Santiago',
    moneda: row.moneda ?? null,
  }
}

/** Wraps the per-method handlers of one bot route with auth, tenant scoping and error handling. */
export function botRoute(methods: Partial<Record<'GET' | 'POST', BotHandler>>) {
  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Cache-Control', 'no-store')

    const expected = process.env.BOT_API_KEY?.trim()
    if (!expected || expected.length < MIN_BOT_KEY_LENGTH) {
      return sendBotError(res, 503, 'BOT_NO_CONFIGURADO', 'La API del bot no está configurada en el servidor.')
    }
    if (!botKeyMatches(req.headers[BOT_KEY_HEADER], expected)) {
      return sendBotError(res, 401, 'NO_AUTORIZADO', 'Credenciales del bot inválidas.')
    }

    const run = methods[req.method as 'GET' | 'POST']
    if (!run) {
      res.setHeader('Allow', Object.keys(methods).join(', '))
      return sendBotError(res, 405, 'METODO_NO_PERMITIDO', 'Método no permitido.')
    }

    try {
      const db = createPagesAdminClient()
      const tenant = await resolveBotTenant(db)
      if (!tenant) {
        return sendBotError(res, 503, 'BOT_NO_CONFIGURADO', 'El comercio configurado para el bot no existe o está inactivo.')
      }
      return await run(req, res, { db, tenant })
    } catch (error) {
      console.error('[bot-api] unexpected error:', error)
      return sendBotError(res, 500, 'ERROR_INTERNO', 'Error interno. Intenta nuevamente en unos minutos.')
    }
  }
}
