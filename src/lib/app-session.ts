import { supabase } from '@/lib/supabase'

let restoreInFlight: Promise<any | null> | null = null

function getTokenManager(): any {
    return (supabase as any)?._insforge?.tokenManager ?? null
}

function sessionFromMemory(): any | null {
    const tokenManager = getTokenManager()
    const nativeSession = tokenManager?.getSession?.()

    if (!nativeSession?.accessToken || !nativeSession?.user) return null

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
export async function getAppSession(): Promise<any | null> {
    const memorySession = sessionFromMemory()
    if (memorySession) return memorySession

    if (typeof window === 'undefined') return null

    if (!restoreInFlight) {
        restoreInFlight = fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { Accept: 'application/json' },
        })
            .then(async (response) => {
                if (!response.ok) return null
                const payload = await response.json()
                const session = payload?.session ?? null
                if (session) hydrateMemorySession(session)
                return session
            })
            .catch((error) => {
                console.error('[auth] Failed to restore app session:', error)
                return null
            })
            .finally(() => {
                restoreInFlight = null
            })
    }

    return restoreInFlight
}

export async function getAppUser(): Promise<any | null> {
    const session = await getAppSession()
    return session?.user ?? null
}
