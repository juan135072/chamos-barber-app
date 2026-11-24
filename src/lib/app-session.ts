import { supabase } from '@/lib/supabase'
import { createTimeoutLadder } from '@/lib/timeout-ladder'

/**
 * Result of asking whether the user is signed in:
 *   signed-in  → session restored (memory or app cookie)
 *   signed-out → the server answered that there is no session
 *   unknown    → no answer (offline, timeout, 5xx during a deploy). Callers
 *                must not treat this as a logout. `timedOut` is set when the
 *                restore request was abandoned at its limit, as opposed to
 *                failing quickly.
 */
export type AppSessionCheck =
    | { status: 'signed-in'; session: any }
    | { status: 'signed-out' }
    | { status: 'unknown'; timedOut?: boolean }

let restoreInFlight: Promise<AppSessionCheck> | null = null

// Limit of the shared restore request. It grows while the request keeps timing
// out (20 s, 40 s, 80 s) and starts over once the server answers.
const restoreTimeout = createTimeoutLadder()

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
        restoreInFlight = restoreSession().finally(() => {
            restoreInFlight = null
        })
    }

    return restoreInFlight
}

/**
 * One request to /api/auth/session with its own limit. A request that never
 * answers is aborted at the limit and reported as "unknown", so it cannot
 * block the checks that come after it. The limit does not depend on fetch
 * rejecting: the timer itself settles the check.
 */
function restoreSession(): Promise<AppSessionCheck> {
    const controller = new AbortController()
    const limit = restoreTimeout.current()
    let timer: ReturnType<typeof setTimeout> | undefined

    const request = fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
    })
        .then(async (response): Promise<AppSessionCheck> => {
            if (response.status === 401 || response.status === 403) return { status: 'signed-out' }
            // A proxy or server error says nothing about the session.
            if (!response.ok) return { status: 'unknown' }
            const payload = await response.json()
            const session = payload?.session ?? null
            if (!session) return { status: 'signed-out' }
            // Abandoned at the limit: its answer no longer counts, not even to fill the memory.
            if (controller.signal.aborted) return { status: 'unknown' }
            hydrateMemorySession(session)
            return { status: 'signed-in', session }
        })
        .catch((error): AppSessionCheck => {
            // The abort at the limit was already reported by the timer.
            if (!controller.signal.aborted) console.warn('[auth] Could not check the app session:', error)
            return { status: 'unknown' }
        })

    const timeout = new Promise<AppSessionCheck>((resolve) => {
        timer = setTimeout(() => {
            restoreTimeout.timedOut()
            console.warn(`[auth] The app session check did not answer in ${limit / 1000} s.`)
            resolve({ status: 'unknown', timedOut: true })
            controller.abort()
        }, limit)
    })

    return Promise.race([request, timeout])
        .then((result) => {
            // Only an answer from the server starts the limit over.
            if (result.status !== 'unknown') restoreTimeout.reset()
            return result
        })
        .finally(() => clearTimeout(timer))
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
