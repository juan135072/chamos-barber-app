/**
 * Compat shim for @supabase/auth-helpers-react.
 *
 * Replaces these three exports with thin wrappers around the InsForge
 * SDK (exposed as `supabase` from @/lib/supabase):
 *
 *   useSupabaseClient<T>()    -> returns the InsForge-backed client
 *   useUser()                 -> reactive user from the app-owned session
 *   useSession()              -> reactive session from the app-owned session
 *   SessionContextProvider    -> identity passthrough (no context needed,
 *                                client is module-singleton)
 *
 * Migrated 2026-05-12. Drop-in for components that did:
 *
 *   import { useSupabaseClient } from '@supabase/auth-helpers-react'
 *
 * Just change the import path to '@/lib/insforge-react'.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { checkAppSession, isSameSession } from '@/lib/app-session'

export function useSupabaseClient<_T = unknown>() {
    return supabase
}

/**
 * Tri-state session/user values:
 *   undefined → still loading
 *   null      → confirmed no session
 *   object    → confirmed user/session
 *
 * Session restoration goes through Chamos' own httpOnly cookies. This avoids
 * calling InsForge's browser /api/auth/refresh endpoint when its in-memory
 * TokenManager is empty after a reload.
 *
 * The value keeps its identity until the user or access token changes, so
 * pages that depend on it do not reload every time the app comes back to the
 * foreground. When the check cannot reach the server (offline, deploy) the
 * last known value stays and the check is retried quietly.
 */

// Quiet retry schedule for session checks that got no answer (offline, deploy):
// 3 s, 6 s, 12 s, 24 s, then every 30 s. Shared with useBarberAppAuth.
export const RETRY_MIN_MS = 3000
export const RETRY_MAX_MS = 30000

export interface RetryBackoff {
    /** Delay before the next retry; each call doubles the following one, up to RETRY_MAX_MS. */
    next(): number
    /** After an answer: the next failure starts over at RETRY_MIN_MS. */
    reset(): void
}

export function createRetryBackoff(): RetryBackoff {
    let delay = RETRY_MIN_MS
    return {
        next() {
            const current = delay
            delay = Math.min(delay * 2, RETRY_MAX_MS)
            return current
        },
        reset() {
            delay = RETRY_MIN_MS
        },
    }
}

function useAppSessionState(): any | null | undefined {
    const [session, setSession] = useState<any | null | undefined>(undefined)

    useEffect(() => {
        let cancelled = false
        let retryTimer: ReturnType<typeof setTimeout> | undefined
        const backoff = createRetryBackoff()

        const check = () => {
            clearTimeout(retryTimer)
            checkAppSession().then((result) => {
                if (cancelled) return
                if (result.status === 'unknown') {
                    retryTimer = setTimeout(check, backoff.next())
                    return
                }
                backoff.reset()
                const next = result.status === 'signed-in' ? result.session : null
                setSession((current: any) => (isSameSession(current, next) ? current : next))
            })
        }

        check()

        const onVis = () => {
            if (document.visibilityState !== 'visible') return
            check()
        }
        document.addEventListener('visibilitychange', onVis)
        window.addEventListener('online', check)
        return () => {
            cancelled = true
            clearTimeout(retryTimer)
            document.removeEventListener('visibilitychange', onVis)
            window.removeEventListener('online', check)
        }
    }, [])

    return session
}

export function useUser(): any | null | undefined {
    const session = useAppSessionState()
    return session === undefined ? undefined : session?.user ?? null
}

export function useSession(): any | null | undefined {
    return useAppSessionState()
}

export function useSessionContext() {
    const session = useSession()
    return {
        session,
        isLoading: session === undefined,
        supabaseClient: supabase,
        error: null,
    }
}

export function SessionContextProvider({
    children,
}: {
    children: ReactNode
    supabaseClient?: unknown
    initialSession?: unknown
}) {
    return children as any
}
