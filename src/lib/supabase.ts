// Re-export the InsForge-backed client from the root bridge, with one app-level
// logout guarantee: Chamos' own httpOnly auth cookies must be cleared too.
import { supabase as bridgedSupabase } from '../../lib/initSupabase'

const SIGN_OUT_PATCH = '__chamos_app_cookie_logout_patched__'
const patchedClient = bridgedSupabase as any

if (!patchedClient[SIGN_OUT_PATCH]) {
    const originalSignOut = patchedClient.auth.signOut.bind(patchedClient.auth)

    patchedClient.auth.signOut = async (...args: any[]) => {
        try {
            return await originalSignOut(...args)
        } finally {
            if (typeof window !== 'undefined') {
                await fetch('/api/auth/clear-session', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json' },
                }).catch((error) => {
                    console.error('[auth] Failed to clear app session cookies:', error)
                })
            }
        }
    }

    patchedClient[SIGN_OUT_PATCH] = true
}

export const supabase = bridgedSupabase

// Re-export permissions utilities
export * from '../../lib/permissions'

// Re-export database types
export type { Database } from '../../lib/database.types'
