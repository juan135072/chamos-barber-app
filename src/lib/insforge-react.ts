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
import { getAppSession, getAppUser } from '@/lib/app-session'

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
 */

export function useUser(): any | null | undefined {
    const [user, setUser] = useState<any | null | undefined>(undefined)

    useEffect(() => {
        let cancelled = false

        const check = () => getAppUser().then((currentUser) => {
            if (cancelled) return
            setUser(currentUser ?? null)
        })

        check()

        const onVis = () => {
            if (document.visibilityState !== 'visible') return
            check()
        }
        document.addEventListener('visibilitychange', onVis)
        return () => {
            cancelled = true
            document.removeEventListener('visibilitychange', onVis)
        }
    }, [])

    return user
}

export function useSession(): any | null | undefined {
    const [session, setSession] = useState<any | null | undefined>(undefined)

    useEffect(() => {
        let cancelled = false

        const check = () => getAppSession().then((currentSession) => {
            if (cancelled) return
            setSession(currentSession ?? null)
        })

        check()

        const onVis = () => {
            if (document.visibilityState !== 'visible') return
            check()
        }
        document.addEventListener('visibilitychange', onVis)
        return () => {
            cancelled = true
            document.removeEventListener('visibilitychange', onVis)
        }
    }, [])

    return session
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
