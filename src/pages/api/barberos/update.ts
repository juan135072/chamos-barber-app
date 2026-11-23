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

    // Admin edits can change the slug, the email and activo, which must stay
    // consistent with the rest of the shop and with the barber's login account.
    if (isAdmin) {
      // Loaded only here: barber profile edits never need the admin auth helpers.
      const { changeBarberEmail, findEmailConflict, normalizeEmail, pickBarberAccount, uniqueBarberSlug } =
        await import('@/lib/staff-accounts')
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
            .select('id, email')
            .eq('barbero_id', barberoId)
            .eq('comercio_id', comercioId)
          if (cuentasError) throw cuentasError
          if (cuentas?.length) {
            if (!email) {
              return res.status(409).json({ error: 'Este barbero tiene una cuenta de acceso: su email no puede quedar vacío.' })
            }
            const cuenta = pickBarberAccount(cuentas as Array<{ id: string; email: string | null }>, actual.email)
            if (!cuenta) {
              return res.status(409).json({ error: 'Este barbero tiene más de una cuenta de acceso; no se puede cambiar su email automáticamente.' })
            }
            const changed = await changeBarberEmail({ comercioId, barberoId, accountId: cuenta.id, email })
            if (!changed.ok) return res.status(changed.status).json({ error: changed.error })
            // Already written together with the login row and the auth user.
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

    // Deactivating a barber also blocks its login, like toggle-active.
    if (isAdmin && typeof allowedUpdates.activo === 'boolean') {
      const { error: accesoError } = await supabase
        .from('admin_users')
        .update({ activo: allowedUpdates.activo })
        .eq('barbero_id', barberoId)
        .eq('comercio_id', comercioId)
      if (accesoError) {
        console.error('❌ Error updating admin_users.activo:', { barberoId, code: accesoError.code ?? null, message: accesoError.message ?? null })
        return res.status(500).json({ error: 'El barbero se guardó, pero no se pudo actualizar su acceso. Intenta de nuevo.' })
      }
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
