// API Route: login credentials for an existing barber (admin only).
// accion 'crear': creates a new account for an active barber that has none;
//   an email that already has an auth user is refused, never adopted.
// accion 'nueva': generates a new temporary password for its barber account.
// Either way the password is returned once, in this response only.
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireStaff } from '@/lib/server-authorization'
import { adminSetUserPassword } from '@/lib/insforge-admin'
import {
  barberLogins,
  checkAccountEmail,
  generateTemporaryPassword,
  normalizeEmail,
  openBarberAccount,
  pickBarberAccount,
  sendCredentialsEmail,
} from '@/lib/staff-accounts'

const UUID_RE = /^[0-9a-f-]{36}$/i

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })
  const actor = await requireStaff(req, res, ['admin'])
  if (!actor) return

  const { barberoId, accion } = req.body ?? {}
  if (typeof barberoId !== 'string' || !UUID_RE.test(barberoId)) return res.status(400).json({ error: 'Barbero inválido' })
  if (accion !== 'crear' && accion !== 'nueva') return res.status(400).json({ error: 'Acción inválida' })

  const admin = actor.admin
  const comercioId = actor.access.comercio_id

  try {
    const { data: barbero, error: barberoError } = await admin
      .from('barberos')
      .select('id, nombre, apellido, email, activo')
      .eq('id', barberoId)
      .eq('comercio_id', comercioId)
      .maybeSingle()
    if (barberoError) throw barberoError
    if (!barbero) return res.status(404).json({ error: 'Barbero no encontrado' })

    const { data: cuentas, error: cuentasError } = await admin
      .from('admin_users')
      .select('id, email, rol')
      .eq('barbero_id', barberoId)
      .eq('comercio_id', comercioId)
    if (cuentasError) throw cuentasError

    res.setHeader('Cache-Control', 'no-store')

    if (!cuentas?.length) {
      if (accion === 'nueva') return res.status(409).json({ error: 'Este barbero aún no tiene acceso. Usa "Crear acceso".' })
      const email = normalizeEmail(barbero.email)
      if (!email) return res.status(400).json({ error: 'Agrega un email al barbero antes de crear su acceso.' })
      // An inactive barber cannot log in: no account and no "you have access" email.
      if (barbero.activo === false) return res.status(409).json({ error: 'Activa al barbero antes de crear su acceso.' })

      const check = await checkAccountEmail(admin, comercioId, email)
      if (!check.ok) return res.status(check.status).json({ error: check.error })
      const account = await openBarberAccount(admin, { comercioId, barbero, email })
      if (!account.ok) return res.status(account.status).json({ error: account.error })
      // Only a new account is emailed; "Nueva contraseña" is shown to the admin alone.
      const emailEnviado = await sendCredentialsEmail({
        email: account.email,
        password: account.password,
        nombre: barbero.nombre,
        apellido: barbero.apellido,
      })
      return res.status(200).json({ success: true, accion, cuenta_creada: true, email: account.email, password: account.password, email_enviado: emailEnviado })
    }

    if (accion === 'crear') return res.status(409).json({ error: 'Este barbero ya tiene acceso. Usa "Nueva contraseña".' })
    // Only barber logins, never the actor's own account or another role.
    const logins = barberLogins(cuentas as Array<{ id: string; email: string; rol: string }>, actor.user.id)
    if (!logins.length) {
      return res.status(409).json({ error: 'Esta cuenta no es de un barbero, así que su contraseña no se cambia desde aquí.' })
    }
    const cuenta = pickBarberAccount(logins, barbero.email)
    if (!cuenta) {
      return res.status(409).json({ error: 'Este barbero tiene más de una cuenta de acceso. Revisa sus cuentas antes de generar una contraseña.' })
    }

    const password = generateTemporaryPassword()
    const { updated, error } = await adminSetUserPassword(cuenta.id, password)
    if (error) throw error
    if (!updated) return res.status(409).json({ error: 'No se pudo cambiar la contraseña de esta cuenta.' })
    return res.status(200).json({ success: true, accion, email: cuenta.email, password })
  } catch (error: any) {
    console.error('[barberos/credenciales] failed', { barberoId, accion, message: error?.message ?? String(error) })
    return res.status(500).json({ error: 'No se pudieron generar las credenciales. Intenta de nuevo.' })
  }
}
