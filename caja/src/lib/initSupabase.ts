/**
 * Bridge wrapper: exposes a Supabase-shaped client backed by @insforge/sdk.
 * Identical to the root lib/initSupabase.ts — caja is a separate Next.js app
 * so it needs its own copy.
 *
 * Migrated 2026-05-15 from @supabase/supabase-js to @insforge/sdk.
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

let _lastPersistedToken: string | null = null
function maybeSetSessionCookie() {
    if (typeof window === 'undefined') return
    const token = (_client as any).tokenManager?.getAccessToken?.()
    if (token && token !== _lastPersistedToken) {
        _lastPersistedToken = token
        fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: token }),
        }).catch(() => {})
    }
}

const authAdapter = {
    signUp: _client.auth.signUp.bind(_client.auth),
    async signInWithPassword(...args: any[]) {
        const result = await (_client.auth.signInWithPassword as any)(...args)
        if (!result?.error) maybeSetSessionCookie()
        return result
    },
    signOut: _client.auth.signOut.bind(_client.auth),
    async refreshSession(...args: any[]) {
        const result = await (_client.auth.refreshSession as any)(...args)
        if (!result?.error) maybeSetSessionCookie()
        return result
    },
    signInWithOAuth: _client.auth.signInWithOAuth.bind(_client.auth),
    exchangeOAuthCode: _client.auth.exchangeOAuthCode.bind(_client.auth),
    async getCurrentUser() {
        const result = await _client.auth.getCurrentUser()
        if (result?.data?.user) maybeSetSessionCookie()
        return result
    },

    async getUser() {
        const { data, error } = await _client.auth.getCurrentUser()
        return { data: { user: (data?.user as any) ?? null }, error }
    },

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

    onAuthStateChange(_callback: (event: string, session: any) => void) {
        return {
            data: {
                subscription: {
                    unsubscribe: () => { /* no-op */ },
                },
            },
        }
    },

    async updateUser(_attrs: { password?: string; email?: string; data?: unknown }) {
        return {
            data: null as any,
            error: new Error(
                'auth.updateUser() not supported on InsForge. Use sendResetPasswordEmail -> exchangeResetPasswordToken -> resetPassword.'
            ),
        }
    },

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

            async remove(paths: string | string[]) {
                const arr = Array.isArray(paths) ? paths : [paths]
                const results = await Promise.all(arr.map((p) => bucket.remove(p)))
                const firstError = results.find((r: any) => r?.error)?.error ?? null
                return { data: arr, error: firstError }
            },

            getPublicUrl(path: string) {
                return { data: { publicUrl: bucket.getPublicUrl(path) } }
            },
        }
    },
}

export const supabase: any = {
    from: (table: string) => _client.database.from(table),
    rpc: (fn: string, args?: Record<string, unknown>, options?: any) =>
        _client.database.rpc(fn, args, options),
    auth: authAdapter,
    storage: storageAdapter,
    functions: _client.functions,
    realtime: _client.realtime,
    channel: (name: string) => {
        const normalized = name.includes(':')
            ? name
            : name.replace(/^citas-barbero-/, 'citas:barbero:')
                  .replace(/^citas-comercio-/, 'citas:comercio:')

        const handlers: Array<(payload: any) => void> = []
        let chainSubscribed = false
        let cleanup: (() => void) | null = null

        const internalListener = (msg: any) => {
            const payload = msg?.payload ?? msg ?? {}
            for (const cb of handlers) {
                try { cb(payload) } catch (err) { console.error('[realtime] handler error:', err) }
            }
        }

        const chain: any = {
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

    removeChannel: (channel: any) => {
        if (channel && typeof channel.unsubscribe === 'function') channel.unsubscribe()
    },
    _insforge: _client,
}
