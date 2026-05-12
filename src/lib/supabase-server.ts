/**
 * Server-side InsForge client for Next.js Pages Router API routes.
 *
 * Replaces the old Supabase auth-helpers `createServerClient` with the
 * InsForge SSR pattern: app-managed httpOnly cookies + `isServerMode`.
 *
 * Cookies (matched by exact name, NOT prefix):
 *   insforge_access_token   15 min  — bearer for DB/storage/fn calls
 *   insforge_refresh_token  7 days  — used to mint fresh access tokens
 *
 * Two factory variants:
 *   createPagesServerClient(req, res) -> auth as the cookie's user (RLS applies)
 *   createPagesAdminClient()          -> auth as project_admin (ik_API_KEY)
 *
 * Both expose a Supabase-shaped surface (.from, .rpc, .auth, .storage)
 * so existing API-route code keeps working with minimal changes.
 *
 * Migrated 2026-05-12.
 */

import { createClient as createInsforgeClient, type InsForgeClient } from '@insforge/sdk'
import type { NextApiRequest, NextApiResponse } from 'next'
import { parse as parseCookie, serialize as serializeCookie } from 'cookie'

export const ACCESS_COOKIE = 'insforge_access_token'
export const REFRESH_COOKIE = 'insforge_refresh_token'

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
const API_KEY = process.env.INSFORGE_API_KEY

function readCookie(req: NextApiRequest, name: string): string | undefined {
    const cookieHeader = req.headers.cookie ?? ''
    const cookies = parseCookie(cookieHeader)
    return cookies[name]
}

function setCookies(
    res: NextApiResponse,
    cookies: Array<{ name: string; value: string; maxAge: number }>
) {
    const existing = res.getHeader('Set-Cookie') || []
    const existingArr = Array.isArray(existing) ? existing : [existing as string]
    const fresh = cookies.map(({ name, value, maxAge }) =>
        serializeCookie(name, value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge,
        })
    )
    res.setHeader('Set-Cookie', [...existingArr, ...fresh])
}

/**
 * Build a Supabase-shaped wrapper around an InsForge client so existing
 * code (`supabase.from`, `supabase.rpc`, `supabase.auth.*`) works unchanged.
 */
function makeSupabaseShape(client: InsForgeClient): any {
    return {
        from: (table: string) => client.database.from(table),
        rpc: (fn: string, args?: Record<string, unknown>, options?: any) =>
            client.database.rpc(fn, args, options),
        auth: {
            // Native passthroughs
            signUp: client.auth.signUp.bind(client.auth),
            signInWithPassword: client.auth.signInWithPassword.bind(client.auth),
            signOut: client.auth.signOut.bind(client.auth),
            refreshSession: client.auth.refreshSession.bind(client.auth),
            getCurrentUser: client.auth.getCurrentUser.bind(client.auth),
            // Supabase-shape compat
            async getUser() {
                const { data, error } = await client.auth.getCurrentUser()
                return { data: { user: (data?.user as any) ?? null }, error }
            },
            async getSession() {
                const { data, error } = await client.auth.getCurrentUser()
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
        },
        storage: {
            from(bucketName: string) {
                const bucket = client.storage.from(bucketName)
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
        },
        functions: client.functions,
        _insforge: client,
    }
}

/**
 * Cookie-aware server client. Authenticates as the user whose access
 * token is stored in the request's `insforge_access_token` cookie.
 * If no cookie is present, calls run as anonymous (RLS treats as anon).
 *
 * Drop-in for the old `createPagesServerClient(req, res)` import.
 */
export function createPagesServerClient(req: NextApiRequest, _res: NextApiResponse) {
    if (!BASE_URL || !ANON_KEY) {
        throw new Error(
            'Missing InsForge env vars: NEXT_PUBLIC_INSFORGE_BASE_URL and NEXT_PUBLIC_INSFORGE_ANON_KEY required'
        )
    }
    const accessToken = readCookie(req, ACCESS_COOKIE)
    const client = createInsforgeClient({
        baseUrl: BASE_URL,
        anonKey: ANON_KEY,
        isServerMode: true,
        edgeFunctionToken: accessToken,
    } as Parameters<typeof createInsforgeClient>[0])
    return makeSupabaseShape(client)
}

/**
 * Admin client authenticated with the InsForge API key (project_admin).
 * Used by API routes that need to do operations the calling user can't
 * (create/delete users, write to system tables, etc.). Equivalent to the
 * old Supabase service-role client.
 */
export function createPagesAdminClient() {
    if (!BASE_URL || !ANON_KEY || !API_KEY) {
        throw new Error(
            'Missing InsForge env vars: NEXT_PUBLIC_INSFORGE_BASE_URL, NEXT_PUBLIC_INSFORGE_ANON_KEY, INSFORGE_API_KEY required'
        )
    }
    const client = createInsforgeClient({
        baseUrl: BASE_URL,
        anonKey: ANON_KEY,
        isServerMode: true,
        edgeFunctionToken: API_KEY,
    } as Parameters<typeof createInsforgeClient>[0])
    return makeSupabaseShape(client)
}

/**
 * Verify a bearer access token and return the user it represents.
 * Replaces Supabase's `supabase.auth.getUser(token)` pattern used by API
 * routes that pull the token out of the Authorization header.
 */
export async function getUserFromBearer(
    token: string | undefined | null
): Promise<{ data: { user: any | null }; error: Error | null }> {
    if (!token) return { data: { user: null }, error: null }
    if (!BASE_URL || !ANON_KEY) {
        return {
            data: { user: null },
            error: new Error('Missing InsForge env vars: NEXT_PUBLIC_INSFORGE_BASE_URL / NEXT_PUBLIC_INSFORGE_ANON_KEY'),
        }
    }
    const client = createInsforgeClient({
        baseUrl: BASE_URL,
        anonKey: ANON_KEY,
        isServerMode: true,
        edgeFunctionToken: token,
    } as Parameters<typeof createInsforgeClient>[0])
    const result = await client.auth.getCurrentUser()
    return { data: { user: (result?.data?.user as any) ?? null }, error: result?.error ?? null }
}

/**
 * Cookie helpers exposed for the sign-in / sign-out handlers that need to
 * write the InsForge access + refresh tokens after a successful login.
 */
export function setAuthCookies(
    res: NextApiResponse,
    accessToken: string,
    refreshToken: string
) {
    setCookies(res, [
        { name: ACCESS_COOKIE, value: accessToken, maxAge: 60 * 15 },
        { name: REFRESH_COOKIE, value: refreshToken, maxAge: 60 * 60 * 24 * 7 },
    ])
}

export function clearAuthCookies(res: NextApiResponse) {
    setCookies(res, [
        { name: ACCESS_COOKIE, value: '', maxAge: 0 },
        { name: REFRESH_COOKIE, value: '', maxAge: 0 },
    ])
}
