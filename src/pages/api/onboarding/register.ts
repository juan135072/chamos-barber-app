// Public shop sign-up: creates a comercio and its first admin user.
// Migrado a InsForge 2026-05-12: adminCreateUser / adminDeleteUser
// 2026-11-24: closed unless ONBOARDING_ENABLED is exactly 'true' (see
// docs/guides/ENV_VARIABLES.md). Behind the flag the flow is atomic: one SQL
// statement inserts the shop and its admin row, so both exist or neither does,
// and a failure deletes only the auth user this request created. The old last
// step (comercio_id in the user's JWT metadata) always threw, and nothing read
// that metadata: the shop of a user comes from admin_users.
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  adminCreateUser,
  adminDeleteUser,
  adminGetUserByEmail,
  adminRawSql,
} from '@/lib/insforge-admin'
import { createPagesAdminClient } from '@/lib/supabase-server'
import { normalizeEmail } from '@/lib/staff-accounts'

const SLUG_RE = /^[a-z0-9-]+$/
const DEFAULT_COLOR = '#D4AF37'
const EMAIL_TAKEN = 'Ese correo ya tiene una cuenta. Inicia sesión o usa otro correo.'
const ACCOUNT_FAILED = 'No se pudo crear la cuenta. Revisa el correo y la contraseña e intenta de nuevo.'
const SHOP_FAILED = 'No se pudo registrar la barbería. Intenta de nuevo.'

// One statement, so the shop and its admin row are created together or not at
// all: if the admin row cannot be inserted, the shop is not inserted either.
// $1 shop name, $2 slug, $3 color, $4 auth user id, $5 admin name, $6 email.
const CREATE_SHOP_SQL = `
WITH comercio AS (
    INSERT INTO public.comercios (nombre, slug, color_primario, plan, activo)
    VALUES ($1, $2, $3, 'trial', true)
    RETURNING id
), cuenta AS (
    INSERT INTO public.admin_users (id, comercio_id, rol, nombre, email, activo)
    SELECT $4::uuid, comercio.id, 'admin', $5::text, $6::text, true FROM comercio
    RETURNING id
)
SELECT (SELECT id FROM comercio) AS comercio_id,
       (SELECT count(*) FROM cuenta)::int AS cuentas`

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Closed by default: answer 404 before reading anything from the request.
  if (process.env.ONBOARDING_ENABLED !== 'true') {
    return res.status(404).json({ error: 'No encontrado' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { nombreComercio, slug, colorPrimario, nombreAdmin, apellidoAdmin, password } = req.body ?? {}
  const email = normalizeEmail(req.body?.email)

  if (!isText(nombreComercio) || !isText(slug) || !isText(nombreAdmin) || !email || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  if (!SLUG_RE.test(slug)) {
    return res.status(400).json({ error: 'El slug solo puede contener letras minúsculas, números y guiones.' })
  }

  // Set once this request has created an auth user: from then on a failure deletes it.
  let userId: string | null = null

  try {
    const supabaseAdmin = createPagesAdminClient()

    // 1. The slug must be free.
    const { data: existingComercio, error: checkError } = await supabaseAdmin
      .from('comercios')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingComercio) {
      return res.status(400).json({ error: 'El subdominio (slug) ya está en uso. Por favor, elige otro.' })
    }
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    // 2. An email that already has an auth user is refused, never adopted.
    const { data: existing, error: lookupError } = await adminGetUserByEmail(email)
    if (lookupError) throw lookupError
    if (existing.user) {
      return res.status(409).json({ error: EMAIL_TAKEN })
    }

    // 3. Create the auth user.
    const { data: authData, error: authError } = await adminCreateUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre: nombreAdmin,
        apellido: typeof apellidoAdmin === 'string' ? apellidoAdmin : undefined
      }
    })

    if (authError || !authData.user) {
      const status = (authError as any)?.statusCode
      console.error('[onboarding/register] auth user creation failed', { message: authError?.message ?? 'no user returned' })
      if (status === 409) return res.status(409).json({ error: EMAIL_TAKEN })
      const refused = typeof status === 'number' && status >= 400 && status < 500
      return res.status(refused ? 400 : 500).json({ error: ACCOUNT_FAILED })
    }

    userId = authData.user.id

    // 4. Create the shop and link the user as its admin, in one statement.
    const { rows } = await adminRawSql<{ comercio_id: string | null; cuentas: number }>(CREATE_SHOP_SQL, [
      nombreComercio,
      slug,
      isText(colorPrimario) ? colorPrimario : DEFAULT_COLOR,
      userId,
      nombreAdmin,
      email,
    ])
    const created = rows?.[0]
    if (!created?.comercio_id || created.cuentas !== 1) {
      throw new Error('The shop statement returned no rows')
    }

    return res.status(200).json({
      success: true,
      comercio_id: created.comercio_id,
      slug: slug
    })

  } catch (error: any) {
    console.error('[onboarding/register] sign-up failed', { userId, message: error?.message ?? String(error) })
    if (!userId) {
      return res.status(500).json({ error: 'Error interno del servidor al registrar el comercio' })
    }

    // The statement failed as a whole, so there is no shop and no admin row:
    // the only thing this request created is its auth user.
    const { error: deleteError } = await adminDeleteUser(userId)
    if (deleteError) {
      console.error('[onboarding/register] rollback: auth user delete failed', { userId, message: deleteError.message })
    } else {
      console.info('[onboarding/register] rollback: auth user deleted', { userId })
    }
    return res.status(500).json({ error: SHOP_FAILED })
  }
}
