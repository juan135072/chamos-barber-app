/**
 * Admin auth & DB helpers for Next.js API routes.
 *
 * Replaces these Supabase admin patterns:
 *   supabase.auth.admin.getUserById(id)
 *   supabase.auth.admin.createUser({email, password, ...})
 *   supabase.auth.admin.updateUserById(id, {password, ...})
 *   supabase.auth.admin.deleteUser(id)
 *
 * InsForge has no `auth.admin` namespace on the SDK; admin user
 * operations are done by directly hitting `auth.users` / `auth.user_providers`
 * via the raw-SQL endpoint with the project's `ik_*` admin API key.
 *
 * Server-only. Never import from client components.
 * Migrated 2026-05-12.
 */

import bcrypt from 'bcryptjs'

const BCRYPT_COST = 10
const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
const API_KEY = process.env.INSFORGE_API_KEY

function ensureConfig(): { baseUrl: string; apiKey: string } {
    if (!BASE_URL || !API_KEY) {
        throw new Error(
            'Missing InsForge admin env vars: NEXT_PUBLIC_INSFORGE_BASE_URL and INSFORGE_API_KEY are required'
        )
    }
    return { baseUrl: BASE_URL, apiKey: API_KEY }
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
 * Create a user with email + password (already-hashed bcrypt is supported
 * by setting `passwordHash` directly; otherwise plaintext is hashed here).
 *
 * Drop-in for `supabase.auth.admin.createUser({email, password, ...})`.
 *
 * Note: `user_metadata` -> InsForge `profile` (display data)
 *       `app_metadata`  -> InsForge `metadata` (app/role data)
 */
export async function adminCreateUser(input: {
    email: string
    password?: string
    passwordHash?: string
    email_confirm?: boolean
    user_metadata?: Record<string, unknown>
    app_metadata?: Record<string, unknown>
}): Promise<{ data: { user: AdminUser | null }; error: Error | null }> {
    try {
        const passwordHash =
            input.passwordHash ??
            (input.password ? await bcrypt.hash(input.password, BCRYPT_COST) : null)
        if (!passwordHash) {
            return {
                data: { user: null },
                error: new Error('adminCreateUser requires either `password` or `passwordHash`'),
            }
        }

        const { rows } = await adminRawSql<AdminUser>(
            `INSERT INTO auth.users (email, password, email_verified, profile, metadata)
             VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
             RETURNING id, email, email_verified, created_at, updated_at, profile, metadata,
                       COALESCE(is_anonymous,false) AS is_anonymous,
                       COALESCE(is_project_admin,false) AS is_project_admin`,
            [
                input.email,
                passwordHash,
                input.email_confirm ?? true,
                JSON.stringify(input.user_metadata ?? {}),
                JSON.stringify(input.app_metadata ?? {}),
            ]
        )
        const user = rows[0]
        if (!user) {
            return { data: { user: null }, error: new Error('INSERT returned no row') }
        }

        // Mirror auth.identities row from Supabase: an email-provider linkage.
        await adminRawSql(
            `INSERT INTO auth.user_providers (user_id, provider, provider_account_id, provider_data)
             VALUES ($1, 'email', $2, '{}'::jsonb)
             ON CONFLICT DO NOTHING`,
            [user.id, input.email]
        )

        return { data: { user }, error: null }
    } catch (err: any) {
        return { data: { user: null }, error: err }
    }
}

/**
 * Update a user's password / email / profile / metadata.
 * Drop-in for `supabase.auth.admin.updateUserById(id, attrs)`.
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
    try {
        const sets: string[] = []
        const params: unknown[] = []
        let p = 1

        if (attributes.password) {
            sets.push(`password = $${p++}`)
            params.push(await bcrypt.hash(attributes.password, BCRYPT_COST))
        }
        if (attributes.email) {
            sets.push(`email = $${p++}`)
            params.push(attributes.email)
        }
        if (attributes.user_metadata) {
            sets.push(`profile = $${p++}::jsonb`)
            params.push(JSON.stringify(attributes.user_metadata))
        }
        if (attributes.app_metadata) {
            sets.push(`metadata = $${p++}::jsonb`)
            params.push(JSON.stringify(attributes.app_metadata))
        }
        sets.push(`updated_at = NOW()`)
        params.push(userId)

        const { rows } = await adminRawSql<AdminUser>(
            `UPDATE auth.users SET ${sets.join(', ')} WHERE id = $${p}
             RETURNING id, email, email_verified, created_at, updated_at, profile, metadata,
                       COALESCE(is_anonymous,false) AS is_anonymous,
                       COALESCE(is_project_admin,false) AS is_project_admin`,
            params
        )
        return { data: { user: rows[0] ?? null }, error: null }
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
