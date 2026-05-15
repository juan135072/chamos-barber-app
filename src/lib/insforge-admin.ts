/**
 * Admin auth & DB helpers for Next.js API routes.
 *
 * Replaces these Supabase admin patterns:
 *   supabase.auth.admin.getUserById(id)
 *   supabase.auth.admin.createUser({email, password, ...})
 *   supabase.auth.admin.updateUserById(id, {password, ...})
 *   supabase.auth.admin.deleteUser(id)
 *
 * Server-only. Never import from client components.
 * Migrated 2026-05-12.
 */

import bcrypt from 'bcryptjs'
import { createClient as createInsforgeClient } from '@insforge/sdk'

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
const API_KEY = process.env.INSFORGE_API_KEY

function ensureConfig(): { baseUrl: string; anonKey: string; apiKey: string } {
    if (!BASE_URL || !ANON_KEY || !API_KEY) {
        throw new Error(
            'Missing InsForge admin env vars: NEXT_PUBLIC_INSFORGE_BASE_URL, NEXT_PUBLIC_INSFORGE_ANON_KEY, and INSFORGE_API_KEY are required'
        )
    }
    return { baseUrl: BASE_URL, anonKey: ANON_KEY, apiKey: API_KEY }
}

function getAdminInsForgeClient() {
    const { baseUrl, anonKey, apiKey } = ensureConfig()
    return createInsforgeClient({
        baseUrl,
        anonKey,
        isServerMode: true,
        edgeFunctionToken: apiKey,
    } as Parameters<typeof createInsforgeClient>[0])
}

/**
 * Execute an arbitrary parameterized SQL statement against InsForge with
 * the project_admin role. Bypasses RLS. Use sparingly — prefer
 * `client.database.from('public_table')` for public-schema operations.
 *
 * @returns { rows, rowCount } on success; throws on HTTP/PG error.
 */
export async function adminRawSql<T = any>(
    query: string,
    params: unknown[] = []
): Promise<{ rows: T[]; rowCount: number }> {
    const { baseUrl, apiKey } = ensureConfig()
    const response = await fetch(`${baseUrl}/api/database/advance/rawsql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query, params }),
    })
    if (!response.ok) {
        const text = await response.text()
        throw new Error(`InsForge rawsql ${response.status}: ${text.slice(0, 300)}`)
    }
    const json = (await response.json()) as { rows: T[]; rowCount: number }
    return json
}

export type AdminUser = {
    id: string
    email: string
    email_verified: boolean
    created_at: string
    updated_at: string
    profile: Record<string, unknown> | null
    metadata: Record<string, unknown> | null
    is_anonymous: boolean
    is_project_admin: boolean
}

/**
 * Look up an auth user by UUID.
 * Drop-in for `supabase.auth.admin.getUserById(id)`.
 */
export async function adminGetUserById(
    userId: string
): Promise<{ data: { user: AdminUser | null }; error: Error | null }> {
    try {
        const { rows } = await adminRawSql<AdminUser>(
            `SELECT id, email, email_verified, created_at, updated_at,
                    profile, metadata, COALESCE(is_anonymous,false) AS is_anonymous,
                    COALESCE(is_project_admin,false) AS is_project_admin
             FROM auth.users WHERE id = $1 LIMIT 1`,
            [userId]
        )
        return { data: { user: rows[0] ?? null }, error: null }
    } catch (err: any) {
        return { data: { user: null }, error: err }
    }
}

/**
 * Create a user via the InsForge SDK signUp endpoint.
 * Drop-in for `supabase.auth.admin.createUser({email, password, ...})`.
 *
 * Note: `user_metadata.nombre` + `user_metadata.apellido` -> SDK `name` field.
 */
export async function adminCreateUser(input: {
    email: string
    password?: string
    passwordHash?: string
    email_confirm?: boolean
    user_metadata?: Record<string, unknown>
    app_metadata?: Record<string, unknown>
}): Promise<{ data: { user: AdminUser | null }; error: Error | null }> {
    if (!input.password && !input.passwordHash) {
        return {
            data: { user: null },
            error: new Error('adminCreateUser requires either `password` or `passwordHash`'),
        }
    }
    try {
        const client = getAdminInsForgeClient()
        const nameParts = [
            (input.user_metadata?.nombre as string) || '',
            (input.user_metadata?.apellido as string) || '',
        ].filter(Boolean)
        const name = nameParts.join(' ') || undefined

        const { data, error } = await client.auth.signUp({
            email: input.email,
            password: input.password ?? input.passwordHash!,
            ...(name ? { name } : {}),
            autoConfirm: input.email_confirm ?? true,
        } as any)

        if (error) return { data: { user: null }, error: error as Error }

        const rawUser = (data as any)?.user
        if (!rawUser) {
            return { data: { user: null }, error: new Error('signUp returned no user') }
        }

        const user: AdminUser = {
            id: rawUser.id,
            email: rawUser.email ?? input.email,
            email_verified: rawUser.email_verified ?? (input.email_confirm ?? true),
            created_at: rawUser.created_at ?? new Date().toISOString(),
            updated_at: rawUser.updated_at ?? new Date().toISOString(),
            profile: rawUser.profile ?? input.user_metadata ?? null,
            metadata: rawUser.metadata ?? input.app_metadata ?? null,
            is_anonymous: rawUser.is_anonymous ?? false,
            is_project_admin: rawUser.is_project_admin ?? false,
        }
        return { data: { user }, error: null }
    } catch (err: any) {
        return { data: { user: null }, error: err }
    }
}

/**
 * Trigger a password reset email via the InsForge SDK.
 * Only password resets are supported — email/metadata changes throw loudly.
 * Drop-in for `supabase.auth.admin.updateUserById(id, { password })`.
 */
export async function adminUpdateUserById(
    userId: string,
    attributes: {
        password?: string
        email?: string
        user_metadata?: Record<string, unknown>
        app_metadata?: Record<string, unknown>
    }
): Promise<{ data: { user: AdminUser | null }; error: Error | null }> {
    if (attributes.email || attributes.user_metadata || attributes.app_metadata) {
        throw new Error('adminUpdateUserById: only password resets are supported')
    }
    if (!attributes.password) {
        return { data: { user: null }, error: new Error('adminUpdateUserById: password attribute required') }
    }
    try {
        const { data: userData } = await adminGetUserById(userId)
        if (!userData.user?.email) {
            return { data: { user: null }, error: new Error('User not found or has no email') }
        }
        const client = getAdminInsForgeClient()
        const { error } = await (client.auth as any).sendResetPasswordEmail({ email: userData.user.email })
        if (error) return { data: { user: null }, error: error as Error }
        return { data: { user: null }, error: null }
    } catch (err: any) {
        return { data: { user: null }, error: err }
    }
}

/**
 * Delete an auth user. FKs with ON DELETE CASCADE handle dependent rows.
 * Drop-in for `supabase.auth.admin.deleteUser(id)`.
 */
export async function adminDeleteUser(
    userId: string
): Promise<{ data: { user: null }; error: Error | null }> {
    try {
        await adminRawSql(`DELETE FROM auth.users WHERE id = $1`, [userId])
        return { data: { user: null }, error: null }
    } catch (err: any) {
        return { data: { user: null }, error: err }
    }
}

/**
 * Verify a user's current password by comparing against the bcrypt hash
 * stored in auth.users. Used by change-password flows.
 */
export async function adminVerifyPassword(
    userId: string,
    plaintextPassword: string
): Promise<{ valid: boolean; error: Error | null }> {
    try {
        const { rows } = await adminRawSql<{ password: string }>(
            `SELECT password FROM auth.users WHERE id = $1 LIMIT 1`,
            [userId]
        )
        const hash = rows[0]?.password
        if (!hash) return { valid: false, error: new Error('User not found') }
        const valid = await bcrypt.compare(plaintextPassword, hash)
        return { valid, error: null }
    } catch (err: any) {
        return { valid: false, error: err }
    }
}
