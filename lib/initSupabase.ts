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
    async refreshSession(...args: any[]) {
        const result = await (_client.auth.refreshSession as any)(...args)
        const newToken = (result?.data as any)?.accessToken
        if (newToken && typeof window !== 'undefined') {
            fetch('/api/auth/set-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: newToken }),
            }).catch(() => {})
        }
        return result
    },
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
    // Bridge: translate Supabase's `channel(name).on('postgres_changes', cfg, cb)
    // .subscribe()` API into InsForge realtime subscribe + on(event).
    //
    // Channel naming convention used across the app:
    //   citas:barbero:<uuid>    — events scoped to one barbero's citas
    //   citas:comercio:<uuid>   — events scoped to a whole comercio's citas
    //
    // The legacy Supabase API took an arbitrary channel name (e.g.
    // `citas-barbero-<id>`); we accept it as-is. Any callback registered for
    // `postgres_changes` receives the InsForge SocketMessage payload (with
    // `payload.eventType` for backwards compat where possible).
    //
    // Multiple subscribers to the same channel share one InsForge subscription
    // (managed via refcount in `_insforge.realtime.subscribedChannels`).
    channel: (name: string) => {
        // Translate Supabase-style names like `citas-barbero-<uuid>` to
        // InsForge style `citas:barbero:<uuid>` by replacing dashes between
        // the prefix segments with colons. If the caller already passed a
        // colon-style name, leave as-is.
        const normalized = name.includes(':')
            ? name
            : name.replace(/^citas-barbero-/, 'citas:barbero:')
                  .replace(/^citas-comercio-/, 'citas:comercio:')

        const handlers: Array<(payload: any) => void> = []
        let chainSubscribed = false
        let cleanup: (() => void) | null = null

        const internalListener = (msg: any) => {
            // Scope to this channel — InsForge fires on() globally across all
            // subscribed channels, so we must filter by meta.channel to avoid
            // delivering events from unrelated channels to this handler set.
            if (msg?.meta?.channel && msg.meta.channel !== normalized) return
            // Shape minimally to mirror Supabase postgres_changes payload so
            // existing code paths (`payload.eventType`, `payload.new`,
            // `payload.old`) keep working.
            const payload = msg?.payload ?? msg ?? {}
            for (const cb of handlers) {
                try { cb(payload) } catch (err) { console.error('[realtime] handler error:', err) }
            }
        }

        const chain: any = {
            // Supabase: on('postgres_changes', config, callback)
            // We ignore the config (we already scope by channel name) and just
            // register the callback.
            on(_event: string, ...rest: any[]) {
                const cb = rest[rest.length - 1]
                if (typeof cb === 'function') handlers.push(cb)
                return chain
            },

            subscribe(statusCb?: (status: string) => void) {
                if (chainSubscribed) {
                    if (typeof statusCb === 'function') statusCb('SUBSCRIBED')
                    return chain
                }
                chainSubscribed = true

                ;(async () => {
                    try {
                        await _client.realtime.connect()
                        await _client.realtime.subscribe(normalized)
                        // InsForge emits a single 'change' event by convention from our publishers
                        _client.realtime.on('change', internalListener)
                        cleanup = () => {
                            _client.realtime.off('change', internalListener)
                            _client.realtime.unsubscribe(normalized)
                        }
                        if (typeof statusCb === 'function') statusCb('SUBSCRIBED')
                    } catch (err) {
                        console.error('[realtime] subscribe failed:', err)
                        if (typeof statusCb === 'function') statusCb('CHANNEL_ERROR')
                    }
                })()
                return chain
            },

            unsubscribe() {
                if (cleanup) { cleanup(); cleanup = null }
                chainSubscribed = false
            },
        }
        return chain
    },

    // Supabase: removeChannel(channel) calls channel.unsubscribe()
    removeChannel: (channel: any) => {
        if (channel && typeof channel.unsubscribe === 'function') channel.unsubscribe()
    },
    _insforge: _client,
}
