/**
 * Bridge wrapper: exposes a Supabase-shaped client backed by @insforge/sdk.
 *
 * Why: the app has ~220 `.from()` / `.rpc()` call sites + many `auth.*`
 * usages spread across 46 files. Rather than rewriting each call site, we
 * adapt the InsForge SDK surface to match what Supabase exposed, so the
 * existing code keeps compiling and running unchanged.
 *
 * Surface preserved (drop-in compatible):
 *   supabase.from(table)              -> client.database.from(table)
 *   supabase.rpc(fn, args)            -> client.database.rpc(fn, args)
 *   supabase.auth.signInWithPassword  -> client.auth.signInWithPassword
 *   supabase.auth.signOut             -> client.auth.signOut
 *   supabase.auth.signUp              -> client.auth.signUp
 *   supabase.auth.getUser()           -> wraps client.auth.getCurrentUser()
 *   supabase.auth.getSession()        -> synthesized from getCurrentUser
 *   supabase.auth.onAuthStateChange   -> no-op stub (poll-based pattern recommended)
 *   supabase.auth.resetPasswordForEmail -> client.auth.sendResetPasswordEmail
 *   supabase.storage.from(b).upload   -> client.storage.from(b).upload
 *   supabase.storage.from(b).getPublicUrl -> { data: { publicUrl } } wrapper
 *   supabase.storage.from(b).remove(paths) -> handles string or array
 *
 * Migrated 2026-05-12 from @supabase/supabase-js to @insforge/sdk@1.2.x.
 */

import { createClient as createInsforgeClient, type InsForgeClient } from '@insforge/sdk'

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY

if (!BASE_URL || !ANON_KEY) {
    throw new Error(
        'Missing InsForge env vars: NEXT_PUBLIC_INSFORGE_BASE_URL and NEXT_PUBLIC_INSFORGE_ANON_KEY are required'
    )
}

const _client: InsForgeClient = createInsforgeClient({
    baseUrl: BASE_URL,
    anonKey: ANON_KEY,
})

const authAdapter = {
    // Native InsForge methods (passthrough)
    signUp: _client.auth.signUp.bind(_client.auth),
    signInWithPassword: _client.auth.signInWithPassword.bind(_client.auth),
    signOut: _client.auth.signOut.bind(_client.auth),
    refreshSession: _client.auth.refreshSession.bind(_client.auth),
    signInWithOAuth: _client.auth.signInWithOAuth.bind(_client.auth),
    exchangeOAuthCode: _client.auth.exchangeOAuthCode.bind(_client.auth),
    getCurrentUser: _client.auth.getCurrentUser.bind(_client.auth),

    // Supabase-shape: { data: { user }, error }
    async getUser() {
        const { data, error } = await _client.auth.getCurrentUser()
        return { data: { user: (data?.user as any) ?? null }, error }
    },

    // Supabase-shape: { data: { session }, error }. Session is synthesized
    // since InsForge keeps tokens internal — only the user object surfaces.
    async getSession() {
        const { data, error } = await _client.auth.getCurrentUser()
        const user = (data?.user as any) ?? null
        const session = user
            ? {
                user,
                access_token: '',
                refresh_token: '',
                expires_at: 0,
                expires_in: 0,
                token_type: 'bearer',
            }
            : null
        return { data: { session }, error }
    },

    // No-op stub. Supabase callers expected an event subscription; InsForge
    // has no equivalent. Callers that depend on auth-state events should poll
    // getCurrentUser() on visibility change or after explicit sign-in/out.
    onAuthStateChange(_callback: (event: string, session: any) => void) {
        return {
            data: {
                subscription: {
                    unsubscribe: () => {
                        /* no-op */
                    },
                },
            },
        }
    },

    // Supabase used updateUser({password}) for password change; InsForge
    // routes password change through the reset-password email flow.
    async updateUser(_attrs: { password?: string; email?: string; data?: unknown }) {
        return {
            data: null as any,
            error: new Error(
                'auth.updateUser() not supported on InsForge. Use sendResetPasswordEmail -> exchangeResetPasswordToken -> resetPassword.'
            ),
        }
    },

    // Supabase: resetPasswordForEmail(email, {redirectTo})
    async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
        return _client.auth.sendResetPasswordEmail({
            email,
            redirectTo: options?.redirectTo,
        })
    },
}

const storageAdapter = {
    from(bucketName: string) {
        const bucket = _client.storage.from(bucketName)
        return {
            upload: bucket.upload.bind(bucket),
            uploadAuto: bucket.uploadAuto.bind(bucket),
            download: bucket.download.bind(bucket),
            list: bucket.list.bind(bucket),

            // Supabase: remove([path1, path2]) — array of paths
            // InsForge: remove(path) — single string
            async remove(paths: string | string[]) {
                const arr = Array.isArray(paths) ? paths : [paths]
                const results = await Promise.all(arr.map((p) => bucket.remove(p)))
                const firstError = results.find((r: any) => r?.error)?.error ?? null
                return { data: arr, error: firstError }
            },

            // Supabase: getPublicUrl(path) returns { data: { publicUrl: string } }
            // InsForge: getPublicUrl(path) returns the URL string directly
            getPublicUrl(path: string) {
                return { data: { publicUrl: bucket.getPublicUrl(path) } }
            },
        }
    },
}

/**
 * Drop-in Supabase-compatible client backed by InsForge SDK.
 * The underlying InsForge client is exposed as `_insforge` for advanced cases.
 */
export const supabase: any = {
    from: (table: string) => _client.database.from(table),
    rpc: (fn: string, args?: Record<string, unknown>, options?: any) =>
        _client.database.rpc(fn, args, options),
    auth: authAdapter,
    storage: storageAdapter,
    functions: _client.functions,
    realtime: _client.realtime,
    // Stub for legacy `supabase.channel(name).on(...).subscribe(...)` callsites.
    // Returns a chainable object whose .on / .subscribe / .unsubscribe are
    // no-ops, so the existing useCitasRealtime hook compiles and renders
    // without throwing; it just won't receive live updates until the
    // realtime backend is wired up (see Phase 5 of the migration plan).
    channel: (_name: string) => {
        const chain: any = {
            on() { return chain },
            subscribe(cb?: (status: string) => void) {
                if (typeof cb === 'function') cb('SUBSCRIBED')
                return chain
            },
            unsubscribe() { /* no-op */ },
        }
        return chain
    },
    removeChannel: (_channel: unknown) => {
        /* no-op stub */
    },
    _insforge: _client,
}
