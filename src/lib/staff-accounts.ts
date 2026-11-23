/**
 * Server-only helpers for barber records and their staff login accounts
 * (admin_users rows linked to InsForge auth users).
 *
 * Every email is trimmed and lowercased before it is written, because the
 * login lookup in /api/auth/access compares emails case-sensitively.
 * Generated passwords are returned to the caller once and never logged.
 */
import { randomInt } from 'crypto'
import {
    adminCreateUser,
    adminDeleteUser,
    adminGetUserByEmail,
    adminGetUserById,
    adminRawSql,
    adminSetUserPassword,
} from '@/lib/insforge-admin'

/** Supabase-shaped admin client from createPagesAdminClient(). */
type AdminClient = any

export type Failure = { ok: false; status: number; error: string }

export const EMAIL_IN_USE = 'Ese email ya lo usa otra cuenta de acceso. Usa otro email.'
const ACCOUNT_FAILED = 'No se pudo crear la cuenta de acceso. Intenta de nuevo.'

export function normalizeEmail(value: unknown): string | null {
    if (typeof value !== 'string') return null
    return value.trim().toLowerCase() || null
}

const PASSWORD_CHARS = 'abcdefghijkmnpqrstuvwxyz23456789'
const PASSWORD_DIGITS = '0123456789'

/** Temporary password with upper and lower case letters, digits and a symbol. */
export function generateTemporaryPassword(): string {
    const pick = (chars: string, length: number) =>
        Array.from({ length }, () => chars[randomInt(chars.length)]).join('')
    return `Chamos${pick(PASSWORD_CHARS, 8)}!${pick(PASSWORD_DIGITS, 4)}`
}

export function slugify(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/** `desired` as a slug, or the first of `-2`, `-3`… still free in the shop. */
export async function uniqueBarberSlug(
    admin: AdminClient,
    comercioId: string,
    desired: string,
    excludeBarberoId?: string
): Promise<string> {
    const base = slugify(desired) || 'barbero'
    const { data, error } = await admin.from('barberos').select('id, slug').eq('comercio_id', comercioId)
    if (error) throw error
    const taken = new Set(
        (data ?? []).filter((row: any) => row.id !== excludeBarberoId).map((row: any) => row.slug)
    )
    if (!taken.has(base)) return base
    let n = 2
    while (taken.has(`${base}-${n}`)) n++
    return `${base}-${n}`
}

/**
 * Spanish 409 message when another barber or login account of the shop
 * already uses `email`, or null when it is free. Accounts linked to
 * `barberoId` itself do not count.
 */
export async function findEmailConflict(
    admin: AdminClient,
    comercioId: string,
    email: string,
    barberoId?: string
): Promise<string | null> {
    const { data: barberos, error } = await admin
        .from('barberos')
        .select('id, nombre, apellido, activo')
        .eq('comercio_id', comercioId)
        .eq('email', email)
        .limit(2)
    if (error) throw error
    const other = (barberos ?? []).find((row: any) => row.id !== barberoId)
    if (other) {
        const nombre = `${other.nombre ?? ''} ${other.apellido ?? ''}`.trim()
        return other.activo === false
            ? `Ese email pertenece a ${nombre}, un barbero desactivado. Reactívalo o usa otro email.`
            : `Ese email ya lo usa el barbero ${nombre}.`
    }
    const { data: cuentas, error: cuentasError } = await admin
        .from('admin_users')
        .select('id, barbero_id')
        .eq('comercio_id', comercioId)
        .eq('email', email)
        .limit(2)
    if (cuentasError) throw cuentasError
    if ((cuentas ?? []).some((row: any) => !barberoId || row.barbero_id !== barberoId)) return EMAIL_IN_USE
    return null
}

/** Inserts a barber of the shop with a normalized email and a free slug. */
export async function insertBarber(
    admin: AdminClient,
    comercioId: string,
    fields: Record<string, unknown>
): Promise<{ ok: true; barbero: any } | Failure> {
    const slug = await uniqueBarberSlug(
        admin,
        comercioId,
        String(fields.slug || `${fields.nombre ?? ''}-${fields.apellido ?? ''}`)
    )
    const { data, error } = await admin
        .from('barberos')
        .insert([{ ...fields, email: normalizeEmail(fields.email), slug, comercio_id: comercioId }])
        .select()
        .single()
    if (error || !data) {
        console.error('[staff-accounts] barber insert failed', { code: error?.code ?? null, message: error?.message ?? null })
        return error?.code === '23505'
            ? { ok: false, status: 409, error: 'Ya existe un barbero con ese email o nombre. Revisa la lista de barberos.' }
            : { ok: false, status: 500, error: 'No se pudo crear el barbero. Intenta de nuevo.' }
    }
    return { ok: true, barbero: data }
}

/** Deletes a barber created by a failed request; its schedules go by cascade. */
export async function removeBarber(admin: AdminClient, comercioId: string, barberoId: string): Promise<boolean> {
    const { error } = await admin.from('barberos').delete().eq('id', barberoId).eq('comercio_id', comercioId)
    if (error) {
        console.error('[staff-accounts] rollback: barber delete failed', { barberoId, code: error.code ?? null, message: error.message ?? null })
        return false
    }
    console.info('[staff-accounts] rollback: barber deleted', { barberoId })
    return true
}

/**
 * Checks that `email` can get a new login account in the shop. Returns the id
 * of an orphan auth user to adopt (one left with no admin_users row by an
 * earlier failed creation), or null when a new auth user must be created.
 */
export async function checkAccountEmail(
    admin: AdminClient,
    comercioId: string,
    email: string
): Promise<{ ok: true; adoptUserId: string | null } | Failure> {
    const inUse: Failure = { ok: false, status: 409, error: EMAIL_IN_USE }
    const { data: cuentas, error } = await admin
        .from('admin_users')
        .select('id')
        .eq('comercio_id', comercioId)
        .eq('email', email)
        .limit(1)
    if (error) throw error
    if ((cuentas ?? []).length > 0) return inUse

    const { data, error: authError } = await adminGetUserByEmail(email)
    if (authError) throw authError
    const user = data.user
    if (!user) return { ok: true, adoptUserId: null }
    if (user.is_project_admin) return inUse
    // A staff row in any shop means the auth user is in use: never adopt it.
    // This guard looks the known id up across shops and reads nothing else.
    const { data: linked, error: linkedError } = await admin.from('admin_users').select('id').eq('id', user.id).limit(1)
    if (linkedError) throw linkedError
    if ((linked ?? []).length > 0) return inUse
    return { ok: true, adoptUserId: user.id }
}

/**
 * The login account to act on among those linked to a barber: the only one,
 * or the one with the barber's email. Null when it is ambiguous or missing.
 */
export function pickBarberAccount<T extends { email?: string | null }>(accounts: T[], barberEmail: unknown): T | null {
    if (accounts.length === 1) return accounts[0]
    const email = normalizeEmail(barberEmail)
    const matches = email ? accounts.filter((account) => normalizeEmail(account.email) === email) : []
    return matches.length === 1 ? matches[0] : null
}

export type BarberForAccount = {
    id: string
    nombre?: string | null
    apellido?: string | null
    activo?: boolean | null
}

/**
 * Creates the auth user (or adopts the orphan from checkAccountEmail) and
 * links it to the barber with an admin_users row of role 'barbero'. If the
 * link fails, deletes the auth user only when this call created it.
 */
export async function openBarberAccount(
    admin: AdminClient,
    input: { comercioId: string; barbero: BarberForAccount; email: string; adoptUserId: string | null }
): Promise<{ ok: true; userId: string; email: string; password: string } | Failure> {
    const { comercioId, barbero, email, adoptUserId } = input
    const password = generateTemporaryPassword()
    let userId: string
    let created = false

    if (adoptUserId) {
        const { updated, error } = await adminSetUserPassword(adoptUserId, password, { onlyUnlinked: true })
        if (error) {
            console.error('[staff-accounts] adopting auth user failed', { userId: adoptUserId, message: error.message })
            return { ok: false, status: 500, error: ACCOUNT_FAILED }
        }
        if (!updated) return { ok: false, status: 409, error: EMAIL_IN_USE }
        userId = adoptUserId
    } else {
        const { data, error } = await adminCreateUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { nombre: barbero.nombre, apellido: barbero.apellido, rol: 'barbero' },
        })
        if (error || !data.user) {
            console.error('[staff-accounts] auth user creation failed', { message: error?.message ?? 'no user returned' })
            return (error as any)?.statusCode === 409
                ? { ok: false, status: 409, error: EMAIL_IN_USE }
                : { ok: false, status: 500, error: ACCOUNT_FAILED }
        }
        userId = data.user.id
        created = true
    }

    const { error: linkError } = await admin.from('admin_users').insert({
        id: userId,
        email,
        nombre: `${barbero.nombre ?? ''} ${barbero.apellido ?? ''}`.trim() || email,
        rol: 'barbero',
        barbero_id: barbero.id,
        comercio_id: comercioId,
        activo: barbero.activo !== false,
    })
    if (linkError) {
        console.error('[staff-accounts] account link failed', { userId, barberoId: barbero.id, code: linkError.code ?? null, message: linkError.message ?? null })
        if (created) {
            const { error: deleteError } = await adminDeleteUser(userId)
            if (deleteError) console.error('[staff-accounts] rollback: auth user delete failed', { userId, message: deleteError.message })
            else console.info('[staff-accounts] rollback: auth user deleted', { userId })
        }
        return linkError.code === '23505'
            ? { ok: false, status: 409, error: EMAIL_IN_USE }
            : { ok: false, status: 500, error: ACCOUNT_FAILED }
    }
    return { ok: true, userId, email, password }
}

/**
 * Deletes the auth users of `userIds` that are left with no admin_users row
 * and are not project admins (after their barber was deleted), so their
 * emails can be reused. Returns the ids deleted and the ids that failed.
 */
export async function deleteOrphanAuthUsers(
    admin: AdminClient,
    userIds: string[]
): Promise<{ deleted: string[]; failed: string[] }> {
    const deleted: string[] = []
    const failed: string[] = []
    for (const userId of userIds) {
        const { data, error } = await adminGetUserById(userId)
        if (error) {
            failed.push(userId)
            continue
        }
        if (!data.user || data.user.is_project_admin) continue
        // Same cross-shop guard as checkAccountEmail: any staff row keeps the user.
        const { data: linked, error: linkedError } = await admin.from('admin_users').select('id').eq('id', userId).limit(1)
        if (linkedError) {
            failed.push(userId)
            continue
        }
        if ((linked ?? []).length > 0) continue
        const { error: deleteError } = await adminDeleteUser(userId)
        if (deleteError) failed.push(userId)
        else deleted.push(userId)
    }
    return { deleted, failed }
}

// One statement, so the barber email, its login row and its auth user change
// together or not at all (a unique violation aborts all three). The target
// CTE requires the account to be linked to the barber in the shop and not to
// be a project admin; otherwise nothing is updated.
const CHANGE_EMAIL_SQL = `
WITH target AS (
    SELECT au.id
    FROM public.admin_users au
    JOIN auth.users uu ON uu.id = au.id
    WHERE au.id = $4 AND au.barbero_id = $1 AND au.comercio_id = $2
      AND NOT COALESCE(uu.is_project_admin, false)
), b AS (
    UPDATE public.barberos SET email = $3, updated_at = now()
    WHERE id = $1 AND comercio_id = $2 AND EXISTS (SELECT 1 FROM target)
    RETURNING id
), a AS (
    UPDATE public.admin_users SET email = $3, updated_at = now()
    WHERE id IN (SELECT id FROM target)
    RETURNING id
), u AS (
    UPDATE auth.users SET email = $3, updated_at = now()
    WHERE id IN (SELECT id FROM target)
    RETURNING id
)
SELECT (SELECT count(*) FROM b)::int AS barberos,
       (SELECT count(*) FROM a)::int AS cuentas,
       (SELECT count(*) FROM u)::int AS usuarios`

function isUniqueViolation(error: unknown): boolean {
    return /23505|duplicate key|unique constraint/i.test(String((error as any)?.message ?? error))
}

/**
 * Changes the email of a barber that has a login account: barberos.email,
 * admin_users.email and auth.users.email, atomically. `email` must already
 * be normalized.
 */
export async function changeBarberEmail(input: {
    comercioId: string
    barberoId: string
    accountId: string
    email: string
}): Promise<{ ok: true } | Failure> {
    const { comercioId, barberoId, accountId, email } = input
    try {
        const { rows } = await adminRawSql<{ barberos: number; cuentas: number; usuarios: number }>(
            CHANGE_EMAIL_SQL,
            [barberoId, comercioId, email, accountId]
        )
        const counts = rows?.[0]
        if (counts?.barberos === 1 && counts.cuentas === 1 && counts.usuarios === 1) return { ok: true }
        console.warn('[staff-accounts] email change matched nothing', { barberoId, accountId, counts: counts ?? null })
        return { ok: false, status: 409, error: 'El barbero o su cuenta cambiaron mientras guardabas. Recarga la lista e intenta de nuevo.' }
    } catch (error: any) {
        if (isUniqueViolation(error)) return { ok: false, status: 409, error: EMAIL_IN_USE }
        console.error('[staff-accounts] email change failed', { barberoId, accountId, message: error?.message ?? String(error) })
        return { ok: false, status: 500, error: 'No se pudo cambiar el email. Intenta de nuevo.' }
    }
}
