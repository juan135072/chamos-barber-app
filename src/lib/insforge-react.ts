/**
 * Compat shim for @supabase/auth-helpers-react.
 *
 * Replaces these three exports with thin wrappers around the InsForge
 * SDK (exposed as `supabase` from @/lib/supabase):
 *
 *   useSupabaseClient<T>()    -> returns the InsForge-backed client
 *   useUser()                 -> reactive user from getCurrentUser()
 *   useSession()              -> reactive session shim (user-only)
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

export function useSupabaseClient<_T = unknown>() {
    return supabase
}

/**
 * Tri-state session/user values:
 *   undefined → still loading (the SDK's session check is async on
 *               first render because InsForge stores tokens in cookies,
 *               which JS can't peek at synchronously)
 *   null      → confirmed no session
 *   object    → confirmed user/session
 *
 * Callers that want the old "redirect on missing user" pattern must
 * guard with `if (session === undefined) return` before treating null
 * as "logged out" — otherwise they redirect during the loading window
 * and create a /admin ↔ /chamos-acceso bucle.
 */

export function useUser(): any | null | undefined {
    const [user, setUser] = useState<any | null | undefined>(undefined)

    useEffect(() => {
        let cancelled = false
        supabase.auth.getCurrentUser().then(({ data }: any) => {
            if (cancelled) return
            setUser(data?.user ?? null)
        })

        // Refresh on tab regain so auth state doesn't go stale forever.
        // (InsForge has no onAuthStateChange equivalent.)
        const onVis = () => {
            if (document.visibilityState !== 'visible') return
            supabase.auth.getCurrentUser().then(({ data }: any) => {
                if (cancelled) return
                setUser(data?.user ?? null)
            })
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
        supabase.auth.getSession().then(({ data }: any) => {
            if (cancelled) return
            setSession(data?.session ?? null)
        })
        return () => {
            cancelled = true
        }
    }, [])

    return session
}

export function useSessionContext() {
    const session = useSession()
    return {
        session,
        isLoading: false,
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
