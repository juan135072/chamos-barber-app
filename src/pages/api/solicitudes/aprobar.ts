// API Route: approve a barber application (admin only).
// Migrado a InsForge 2026-05-12.
// 2026-11-24: the route no longer calls the SQL function
// aprobar_solicitud_barbero, which cannot work with the server key: it inserts
// the login row without a shop (comercio_id is NOT NULL) and reuses the auth
// user id as the barber id. The route does the work itself with the
// staff-accounts helpers:
//   1. the application is read within the caller's shop and must be pending;
//   2. every email conflict is checked before anything is written, and an
//      email that already has an auth user is refused, never adopted;
//   3. the application is claimed (pendiente -> aprobada) with a conditional
//      update, so only one of two simultaneous requests goes on;
//   4. the barber is created and linked to the application, and its login is
//      created last, so nothing can fail once a password exists.
// If a step fails after the claim, what this request created is undone and the
// application goes back to pending. The generated password is returned once,
// in this response only, and is never logged.
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireStaff } from '@/lib/server-authorization'
import {
  checkAccountEmail,
  findEmailConflict,
  insertBarber,
  normalizeEmail,
  openBarberAccount,
  removeBarber,
  sendCredentialsEmail,
} from '@/lib/staff-accounts'

const UUID_RE = /^[0-9a-f-]{36}$/i
const ALREADY_REVIEWED = 'Esta solicitud ya fue revisada. Recarga la lista.'
const APPROVAL_FAILED = 'No se pudo aprobar la solicitud. Intenta de nuevo.'
const NOT_UNDONE = 'Revisa la solicitud y la lista de barberos: pudo quedar un barbero guardado sin acceso.'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // The response can carry a password: it must never be cached.
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const actor = await requireStaff(req, res, ['admin'])
  if (!actor) return

  const { solicitudId } = req.body ?? {}
  if (!solicitudId) {
    return res.status(400).json({ error: 'Faltan datos: solicitudId' })
  }
  if (typeof solicitudId !== 'string' || !UUID_RE.test(solicitudId)) {
    return res.status(400).json({ error: 'Solicitud inválida' })
  }

  const admin = actor.admin
  const comercioId = actor.access.comercio_id

  // What this request has to undo if a later step fails.
  let claimed = false
  let barberoId: string | null = null

  /**
   * Puts the application back to pending and removes the barber this request
   * created. The application goes first because it references the barber; if
   * it cannot be released, the barber it points to is kept. Runs at most once.
   * Returns true when nothing this request created is left.
   */
  const undo = async (): Promise<boolean> => {
    if (!claimed) return true
    claimed = false
    try {
      const { data: released, error: releaseError } = await admin
        .from('solicitudes_barberos')
        .update({ estado: 'pendiente', barbero_id: null, fecha_revision: null, revisada_por: null })
        .eq('id', solicitudId)
        .eq('comercio_id', comercioId)
        .eq('estado', 'aprobada')
        .eq('revisada_por', actor.user.id)
        .select('id')
      if (releaseError || !released?.length) {
        console.error('[solicitudes/aprobar] rollback: application not released', { solicitudId, barberoId, code: releaseError?.code ?? null, message: releaseError?.message ?? 'no row matched' })
        return false
      }
      console.info('[solicitudes/aprobar] rollback: application released', { solicitudId })
      return barberoId ? await removeBarber(admin, comercioId, barberoId) : true
    } catch (error: any) {
      console.error('[solicitudes/aprobar] rollback failed', { solicitudId, barberoId, message: error?.message ?? String(error) })
      return false
    }
  }

  /** Answers a failed step after undoing what this request created. */
  const refuse = async (status: number, error: string) => {
    const clean = await undo()
    return res.status(status).json({ error: clean ? error : `${error} ${NOT_UNDONE}` })
  }

  try {
    const { data: solicitud, error: solicitudError } = await admin
      .from('solicitudes_barberos')
      .select('id, nombre, apellido, email, telefono, especialidad, descripcion, imagen_url, estado')
      .eq('id', solicitudId)
      .eq('comercio_id', comercioId)
      .maybeSingle()
    if (solicitudError) throw solicitudError
    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' })
    }
    if (solicitud.estado !== 'pendiente') {
      return res.status(409).json({ error: ALREADY_REVIEWED })
    }

    const email = normalizeEmail(solicitud.email)
    if (!email) {
      return res.status(400).json({ error: 'La solicitud no tiene un email válido.' })
    }

    // Check every conflict before writing anything.
    const conflict = await findEmailConflict(admin, comercioId, email)
    if (conflict) return res.status(409).json({ error: conflict })
    const check = await checkAccountEmail(admin, comercioId, email)
    if (!check.ok) return res.status(check.status).json({ error: check.error })

    // Claim the application: of two requests, only one finds it still pending.
    const { data: claim, error: claimError } = await admin
      .from('solicitudes_barberos')
      .update({ estado: 'aprobada', fecha_revision: new Date().toISOString(), revisada_por: actor.user.id })
      .eq('id', solicitudId)
      .eq('comercio_id', comercioId)
      .eq('estado', 'pendiente')
      .select('id')
    if (claimError) throw claimError
    if (!claim?.length) {
      return res.status(409).json({ error: ALREADY_REVIEWED })
    }
    claimed = true

    const created = await insertBarber(admin, comercioId, {
      nombre: solicitud.nombre,
      apellido: solicitud.apellido,
      email,
      telefono: solicitud.telefono ?? null,
      especialidades: solicitud.especialidad ? [solicitud.especialidad] : null,
      descripcion: solicitud.descripcion ?? null,
      imagen_url: solicitud.imagen_url ?? null,
      activo: true,
    })
    if (!created.ok) return refuse(created.status, created.error)
    const barbero = created.barbero
    barberoId = barbero.id

    const { data: linked, error: linkError } = await admin
      .from('solicitudes_barberos')
      .update({ barbero_id: barbero.id })
      .eq('id', solicitudId)
      .eq('comercio_id', comercioId)
      .eq('estado', 'aprobada')
      .select('id')
    if (linkError || !linked?.length) {
      console.error('[solicitudes/aprobar] application not linked to its barber', { solicitudId, barberoId, code: linkError?.code ?? null, message: linkError?.message ?? 'no row matched' })
      return refuse(500, APPROVAL_FAILED)
    }

    // The login comes last: once a password exists, no later step can fail.
    const account = await openBarberAccount(admin, { comercioId, barbero, email })
    if (!account.ok) return refuse(account.status, account.error)
    claimed = false

    // Best-effort: the approval stays and the admin sees the password either way.
    const emailEnviado = await sendCredentialsEmail({
      email: account.email,
      password: account.password,
      nombre: barbero.nombre,
      apellido: barbero.apellido,
    })

    return res.status(200).json({
      success: true,
      barbero_id: barbero.id,
      email: account.email,
      password: account.password,
      email_enviado: emailEnviado,
      message: 'Barbero aprobado exitosamente'
    })

  } catch (error: any) {
    console.error('[solicitudes/aprobar] failed', { solicitudId, message: error?.message ?? String(error) })
    return refuse(500, APPROVAL_FAILED)
  }
}
