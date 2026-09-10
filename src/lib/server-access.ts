export type AccessRole = 'admin' | 'cajero' | 'barbero'

export interface ServerAccessUser {
  id: string
  email: string
  nombre: string
  rol: AccessRole
  activo: boolean
  telefono?: string | null
  barbero_id?: string | null
  comercio_id?: string | null
  permisos?: Record<string, unknown> | null
}

export interface ServerAccessResult {
  user: ServerAccessUser
  accessSource: 'direct' | 'legacy_alias'
}

export class ServerAccessError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'ServerAccessError'
    this.status = status
    this.code = code
  }
}

/**
 * Persist the browser's freshly-issued InsForge token on the Chamos domain
 * before navigating away from the login page. This removes the race where
 * the old bridge fired /api/auth/set-session without awaiting the response.
 */
export async function persistAppSession(
  accessToken: string,
  refreshToken?: string | null
): Promise<void> {
  const response = await fetch('/api/auth/set-session', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accessToken,
      refreshToken: refreshToken || '',
    }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new ServerAccessError(
      payload?.error || 'No se pudo guardar la sesión del usuario.',
      response.status,
      'SESSION_PERSIST_FAILED'
    )
  }
}

/**
 * Resolve the authenticated user's Chamos role through our own Next.js API.
 * The browser never reads admin_users/usuarios_con_permisos directly, so
 * legacy Supabase RLS policies cannot hide the migrated InsForge account.
 */
export async function getServerAccess(accessToken?: string | null): Promise<ServerAccessResult> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch('/api/auth/access', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload?.user) {
    throw new ServerAccessError(
      payload?.message || 'No se pudo verificar el acceso al sistema.',
      response.status,
      payload?.code || 'ACCESS_CHECK_FAILED'
    )
  }

  return payload as ServerAccessResult
}
