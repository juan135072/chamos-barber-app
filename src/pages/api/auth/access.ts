import type { NextApiRequest, NextApiResponse } from 'next'
import {
  createPagesAdminClient,
  createPagesServerClient,
  getUserFromBearer,
} from '@/lib/supabase-server'

const LEGACY_EMAIL_ALIASES: Record<string, string> = {
  // The original Chamos admin_users row was created with this legacy email.
  // Only the authenticated current owner account may use this compatibility alias.
  'contacto@chamosbarber.com': 'admin@chamosbarber.com',
}

const ALLOWED_ROLES = new Set(['admin', 'cajero', 'barbero'])

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function getBearerToken(req: NextApiRequest): string | null {
  const authorization = req.headers.authorization
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice('Bearer '.length).trim()
  return token || null
}

async function getAuthenticatedUser(req: NextApiRequest, res: NextApiResponse) {
  const bearer = getBearerToken(req)

  if (bearer) {
    const { data, error } = await getUserFromBearer(bearer)
    if (error || !data?.user) return null
    return data.user
  }

  const userClient = createPagesServerClient(req, res)
  const { data, error } = await userClient.auth.getSession()
  if (error || !data?.session?.user) return null
  return data.session.user
}

async function findAdminRow(admin: any, email: string) {
  const { data, error, status, statusText } = await admin
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .limit(2)
    .setHeader('Accept', 'application/json')

  return {
    rows: Array.isArray(data) ? data : [],
    error,
    status,
    statusText,
  }
}

async function findPermissionProfile(admin: any, email: string) {
  try {
    const { data, error } = await admin
      .from('usuarios_con_permisos')
      .select('*')
      .eq('email', email)
      .limit(1)
      .setHeader('Accept', 'application/json')

    if (error) {
      console.warn('[auth/access] usuarios_con_permisos enrichment unavailable', {
        code: error?.code ?? null,
        message: error?.message ?? null,
      })
      return null
    }

    return Array.isArray(data) && data.length === 1 ? data[0] : null
  } catch (error: any) {
    console.warn('[auth/access] usuarios_con_permisos enrichment failed', {
      message: error?.message ?? String(error),
    })
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Vary', 'Cookie, Authorization')

  try {
    const authUser = await getAuthenticatedUser(req, res)
    const authenticatedEmail = normalizeEmail(authUser?.email)

    if (!authUser?.id || !authenticatedEmail) {
      return res.status(401).json({
        code: 'AUTH_REQUIRED',
        message: 'La sesión no es válida o expiró.',
      })
    }

    if (!process.env.INSFORGE_API_KEY) {
      console.error('[auth/access] INSFORGE_API_KEY is not configured')
      return res.status(503).json({
        code: 'ACCESS_CONFIG_MISSING',
        message: 'Falta configuración privada del servidor para verificar permisos.',
      })
    }

    const admin = createPagesAdminClient()
    const candidates = [authenticatedEmail]
    const legacyAlias = LEGACY_EMAIL_ALIASES[authenticatedEmail]
    if (legacyAlias && legacyAlias !== authenticatedEmail) candidates.push(legacyAlias)

    for (const candidate of candidates) {
      const result = await findAdminRow(admin, candidate)

      if (result.error) {
        const backendStatus = typeof result.status === 'number' ? result.status : null
        const backendCode = typeof result.error?.code === 'string' ? result.error.code : null

        console.error('[auth/access] admin_users lookup failed', {
          status: backendStatus,
          statusText: result.statusText ?? null,
          code: backendCode,
          message: result.error?.message ?? null,
        })
        return res.status(503).json({
          code: 'ACCESS_LOOKUP_FAILED',
          message: 'No se pudo consultar los permisos del usuario.',
          // Safe diagnostics only: never expose API keys, tokens or backend messages.
          backendStatus,
          backendCode,
        })
      }

      if (result.rows.length > 1) {
        console.error('[auth/access] Duplicate admin_users rows', {
          candidate,
          rowCount: result.rows.length,
        })
        return res.status(409).json({
          code: 'ACCESS_DUPLICATE',
          message: 'Hay más de un registro de acceso para esta cuenta.',
        })
      }

      if (result.rows.length === 0) continue

      const row = result.rows[0]
      const usingLegacyAlias = candidate !== authenticatedEmail

      // The compatibility alias must never promote a non-admin legacy record.
      if (usingLegacyAlias && row?.rol !== 'admin') continue

      if (row?.activo !== true) {
        return res.status(403).json({
          code: 'ACCESS_INACTIVE',
          message: 'La cuenta está desactivada.',
        })
      }

      if (!ALLOWED_ROLES.has(row?.rol)) {
        return res.status(403).json({
          code: 'ACCESS_ROLE_INVALID',
          message: 'El rol de la cuenta no es válido.',
        })
      }

      // Preserve optional custom permissions/comercio information from the
      // existing view, but never depend on that view to grant access.
      const permissionProfile = await findPermissionProfile(admin, candidate)

      console.info('[auth/access] Access resolved', {
        authenticatedEmail,
        role: row.rol,
        source: usingLegacyAlias ? 'legacy_alias' : 'direct',
      })

      return res.status(200).json({
        user: {
          // Use the current InsForge auth id/email. The legacy database id/email
          // are authorization metadata, not the current authenticated identity.
          id: authUser.id,
          email: authenticatedEmail,
          nombre: permissionProfile?.nombre || row.nombre || authUser.name || authenticatedEmail,
          rol: row.rol,
          activo: true,
          telefono: permissionProfile?.telefono ?? row.telefono ?? null,
          barbero_id: permissionProfile?.barbero_id ?? row.barbero_id ?? null,
          comercio_id: permissionProfile?.comercio_id ?? row.comercio_id ?? null,
          permisos: permissionProfile?.permisos ?? row.permisos ?? null,
        },
        accessSource: usingLegacyAlias ? 'legacy_alias' : 'direct',
      })
    }

    console.warn('[auth/access] No active access row found', { authenticatedEmail })
    return res.status(403).json({
      code: 'ACCESS_NOT_FOUND',
      message: 'No existe un registro de acceso activo para esta cuenta.',
    })
  } catch (error: any) {
    const message = error?.message ?? String(error)
    const configMissing = message.includes('INSFORGE_API_KEY') || message.includes('Missing InsForge env vars')

    console.error('[auth/access] Unexpected access check failure', { message })

    return res.status(configMissing ? 503 : 500).json({
      code: configMissing ? 'ACCESS_CONFIG_MISSING' : 'ACCESS_INTERNAL_ERROR',
      message: configMissing
        ? 'Falta configuración privada del servidor para verificar permisos.'
        : 'Error interno al verificar permisos.',
    })
  }
}
