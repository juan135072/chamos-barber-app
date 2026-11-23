import { requireStaff, barberFields } from '@/lib/server-authorization'
import type { NextApiRequest, NextApiResponse } from 'next'
// API Route para actualizar barbero
// Usa service_role key para bypasear RLS
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Solo permitir PUT/PATCH
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const actor = await requireStaff(req, res, ['admin', 'barbero'])
    if (!actor) return
    const { barberoId, updates } = req.body
    if (actor.access.rol === 'barbero' && barberoId !== actor.access.barbero_id) {
      return res.status(403).json({ error: 'Solo puedes editar tu perfil' })
    }
    const allowedUpdates = actor.access.rol === 'admin' ? barberFields(updates) :
      Object.fromEntries(Object.entries(updates ?? {}).filter(([key]) => ['telefono', 'instagram', 'descripcion', 'imagen_url'].includes(key)))

    console.log('🎯 UPDATE BARBERO REQUEST:', {
      barberoId,
      fields: Object.keys(updates ?? {})
    })

    if (!barberoId) {
      return res.status(400).json({ error: 'barberoId es requerido' })
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'updates es requerido' })
    }

    // Crear cliente de Supabase con service_role key para bypasear RLS
    const supabase = actor.admin
    const comercioId = actor.access.comercio_id
    const isAdmin = actor.access.rol === 'admin'
    // An email that moves together with the barber login, after the other fields.
    let emailMove: { accountId: string; email: string } | null = null
    let changeBarberEmail: typeof import('@/lib/staff-accounts').changeBarberEmail | null = null

    // Admin edits can change the slug, the email and activo, which must stay
    // consistent with the rest of the shop and with the barber's login account.
    // Every refusal below happens before anything is written.
    if (isAdmin) {
      // Loaded only here: barber profile edits never need the admin auth helpers.
      const staff = await import('@/lib/staff-accounts')
      const { barberLogins, findEmailConflict, normalizeEmail, pickBarberAccount, uniqueBarberSlug } = staff
      changeBarberEmail = staff.changeBarberEmail
      const { data: actual, error: actualError } = await supabase
        .from('barberos')
        .select('id, email')
        .eq('id', barberoId)
        .eq('comercio_id', comercioId)
        .maybeSingle()
      if (actualError) throw actualError
      if (!actual) return res.status(404).json({ error: 'Barbero no encontrado' })

      if (typeof allowedUpdates.slug === 'string') {
        allowedUpdates.slug = await uniqueBarberSlug(supabase, comercioId, allowedUpdates.slug, barberoId)
      }

      if ('email' in allowedUpdates) {
        const email = normalizeEmail(allowedUpdates.email)
        allowedUpdates.email = email
        if (email !== normalizeEmail(actual.email)) {
          if (email) {
            const conflict = await findEmailConflict(supabase, comercioId, email, barberoId)
            if (conflict) return res.status(409).json({ error: conflict })
          }
          const { data: cuentas, error: cuentasError } = await supabase
            .from('admin_users')
            .select('id, email, rol')
            .eq('barbero_id', barberoId)
            .eq('comercio_id', comercioId)
          if (cuentasError) throw cuentasError
          // Only a barber login moves; an admin or the actor keeps its email.
          const logins = barberLogins((cuentas ?? []) as Array<{ id: string; email: string | null; rol: string }>, actor.user.id)
          if (logins.length) {
            if (!email) {
              return res.status(409).json({ error: 'Este barbero tiene una cuenta de acceso: su email no puede quedar vacío.' })
            }
            const cuenta = pickBarberAccount(logins, actual.email)
            if (!cuenta) {
              return res.status(409).json({ error: 'Este barbero tiene más de una cuenta de acceso; no se puede cambiar su email automáticamente.' })
            }
            // Written after the other fields, together with the login row and the auth user.
            emailMove = { accountId: cuenta.id, email }
            delete allowedUpdates.email
          }
        }
      }
    }

    // Actualizar barbero
    console.log('💾 Actualizando barbero en base de datos...')
    const { data: barbero, error: barberoError } = await supabase
      .from('barberos')
      .update({ ...allowedUpdates, updated_at: new Date().toISOString() })
      .eq('id', barberoId)
      .eq('comercio_id', comercioId)
      .select()
      .single()

    if (barberoError) {
      console.error('❌ Error updating barbero:', barberoError)
      if (barberoError.code === '23505') {
        return res.status(409).json({ error: 'Ya existe un barbero con ese email o nombre. Revisa la lista de barberos.' })
      }
      return res.status(400).json({
        error: 'Error al actualizar barbero',
        details: barberoError.message
      })
    }

    // Deactivating a barber also blocks its login, like toggle-active: only
    // barber logins, never the acting admin's own row or another role.
    if (isAdmin && typeof allowedUpdates.activo === 'boolean') {
      const { error: accesoError } = await supabase
        .from('admin_users')
        .update({ activo: allowedUpdates.activo })
        .eq('barbero_id', barberoId)
        .eq('comercio_id', comercioId)
        .eq('rol', 'barbero')
        .neq('id', actor.user.id)
      if (accesoError) {
        console.error('❌ Error updating admin_users.activo:', { barberoId, code: accesoError.code ?? null, message: accesoError.message ?? null })
        return res.status(500).json({ error: 'El barbero se guardó, pero no se pudo actualizar su acceso. Intenta de nuevo.' })
      }
    }

    if (emailMove && changeBarberEmail) {
      const changed = await changeBarberEmail({ comercioId, barberoId, accountId: emailMove.accountId, actorId: actor.user.id, email: emailMove.email })
      if (!changed.ok) {
        return res.status(409).json({ error: `Se guardaron los demás cambios, pero no el email: ${changed.error}` })
      }
      barbero.email = emailMove.email
    }

    console.log('✅ Barbero actualizado:', barbero?.id)

    return res.status(200).json({
      success: true,
      barbero,
      message: 'Barbero actualizado exitosamente'
    })

  } catch (error: any) {
    console.error('❌ Error en update barbero:', error)
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    })
  }
}
