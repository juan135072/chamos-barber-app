import { supabase } from '@/lib/supabase'

/**
 * Result of asking whether the user is signed in:
 *   signed-in  → session restored (memory or app cookie)
 *   signed-out → the server answered that there is no session
 *   unknown    → no answer (offline, timeout, 5xx during a deploy). Callers
 *                must not treat this as a logout.
 */
export type AppSessionCheck =
    | { status: 'signed-in'; session: any }
    | { status: 'signed-out' }
    | { status: 'unknown' }

let restoreInFlight: Promise<AppSessionCheck> | null = null

function getTokenManager(): any {
    return (supabase as any)?._insforge?.tokenManager ?? null
}

function sessionFromMemory(): any | null {
    const tokenManager = getTokenManager()
    const nativeSession = tokenManager?.getSession?.()

    if (!nativeSession?.accessToken || !nativeSession?.user) return null

    // Memory can outlive the 15-minute access token. Restore through the app
    // server before reusing an expired token (the refresh cookie stays httpOnly).
    try {
        const part = nativeSession.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(atob(part))
        if (!payload.exp || payload.exp * 1000 <= Date.now() + 30000) return null
    } catch { return null }

    return {
        user: nativeSession.user,
        access_token: nativeSession.accessToken,
        refresh_token: '',
        expires_at: 0,
        expires_in: 0,
        token_type: 'bearer',
    }
}

function hydrateMemorySession(session: any) {
    if (!session?.user || !session?.access_token) return

    const tokenManager = getTokenManager()
    if (!tokenManager) return

    if (typeof tokenManager.saveSession === 'function') {
        tokenManager.saveSession({
            accessToken: session.access_token,
            user: session.user,
        })
        return
    }

    tokenManager.setAccessToken?.(session.access_token)
    tokenManager.setUser?.(session.user)
}

/**
 * Restore auth from Chamos' own httpOnly cookies.
 *
 * Important: when InsForge's browser TokenManager is empty, calling
 * auth.getCurrentUser()/getSession() makes the SDK try its own
 * /api/auth/refresh endpoint. Chamos manages refresh tokens on the Next.js
 * server instead, so that path returns 401. This helper avoids that path.
 */
export async function checkAppSession(): Promise<AppSessionCheck> {
    const memorySession = sessionFromMemory()
    if (memorySession) return { status: 'signed-in', session: memorySession }

    if (typeof window === 'undefined') return { status: 'signed-out' }

    if (!restoreInFlight) {
        restoreInFlight = fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { Accept: 'application/json' },
        })
            .then(async (response): Promise<AppSessionCheck> => {
                if (response.status === 401 || response.status === 403) return { status: 'signed-out' }
                // A proxy or server error says nothing about the session.
                if (!response.ok) return { status: 'unknown' }
                const payload = await response.json()
                const session = payload?.session ?? null
                if (!session) return { status: 'signed-out' }
                hydrateMemorySession(session)
                return { status: 'signed-in', session }
            })
            .catch((error): AppSessionCheck => {
                console.warn('[auth] Could not check the app session:', error)
                return { status: 'unknown' }
            })
            .finally(() => {
                restoreInFlight = null
            })
    }

    return restoreInFlight
}

/** Session or null. A failed check also yields null; use checkAppSession() to tell them apart. */
export async function getAppSession(): Promise<any | null> {
    const result = await checkAppSession()
    return result.status === 'signed-in' ? result.session : null
}

/** Same user and access token: hooks keep their current object so pages do not reload. */
export function isSameSession(a: any, b: any): boolean {
    if (!a || !b) return a === b
    return a.user?.id === b.user?.id && a.access_token === b.access_token
}

/**
 * PostgREST answers `.single()` with no matching row as PGRST116: a real
 * "not found". Any other error (network, timeout) is not an answer.
 */
export function isNoRowsError(error: any): boolean {
    return error?.code === 'PGRST116'
}

export async function getAppUser(): Promise<any | null> {
    const session = await getAppSession()
    return session?.user ?? null
}
