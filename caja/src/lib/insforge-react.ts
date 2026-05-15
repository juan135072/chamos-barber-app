/**
 * Compat shim for @supabase/auth-helpers-react — caja app copy.
 * Identical to src/lib/insforge-react.ts in the main app.
 *
 * Drop-in for:
 *   import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react'
 * →
 *   import { useSupabaseClient, useSession } from '@/lib/insforge-react'
 */

import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

export function useSupabaseClient<_T = unknown>() {
    return supabase
}

export function useUser(): any | null | undefined {
    const [user, setUser] = useState<any | null | undefined>(undefined)

    useEffect(() => {
        let cancelled = false
        supabase.auth.getCurrentUser().then(({ data }: any) => {
            if (cancelled) return
            setUser(data?.user ?? null)
        })

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
