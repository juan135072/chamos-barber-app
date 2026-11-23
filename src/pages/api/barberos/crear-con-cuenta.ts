import { requireStaff, barberFields } from '@/lib/server-authorization'
// API Route: Crear Barbero con Cuenta de Usuario desde Admin
// Migrado a InsForge 2026-05-12: adminGetUserById / adminCreateUser / adminDeleteUser
// 2026-11-23: normalized emails, unique slug, clear 409s and full rollback.
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  checkAccountEmail,
  findEmailConflict,
  insertBarber,
  normalizeEmail,
  openBarberAccount,
  removeBarber,
  sendCredentialsEmail,
} from '@/lib/staff-accounts'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const actor = await requireStaff(req, res, ['admin'])
    if (!actor) return
    const { barberoData, crearCuenta } = req.body ?? {}

    if (!barberoData || typeof barberoData !== 'object') {
      return res.status(400).json({ error: 'Faltan datos requeridos' })
    }

    const fields = barberFields(barberoData)
    if (!fields.nombre || !fields.apellido) {
      return res.status(400).json({ error: 'Nombre y apellido son requeridos' })
    }

    const email = normalizeEmail(fields.email)
    if (crearCuenta && !email) {
      return res.status(400).json({ error: 'Ingresa un email para crear la cuenta de acceso' })
    }

    const admin = actor.admin
    const comercioId = actor.access.comercio_id

    // Check every conflict before writing anything.
    if (email) {
      const conflict = await findEmailConflict(admin, comercioId, email)
      if (conflict) return res.status(409).json({ error: conflict })
    }
    let adoptUserId: string | null = null
    if (crearCuenta) {
      const check = await checkAccountEmail(admin, comercioId, email!)
      if (!check.ok) return res.status(check.status).json({ error: check.error })
      adoptUserId = check.adoptUserId
    }

    const created = await insertBarber(admin, comercioId, { ...fields, email })
    if (!created.ok) return res.status(created.status).json({ error: created.error })
    const nuevoBarbero = created.barbero

    if (!crearCuenta) {
      return res.status(200).json({
        success: true,
        barbero: nuevoBarbero,
        cuenta_creada: false,
        email,
        message: 'Barbero creado exitosamente (sin cuenta de usuario)'
      })
    }

    const account = await openBarberAccount(admin, {
      comercioId,
      barbero: nuevoBarbero,
      email: email!,
      adoptUserId,
    })

    if (!account.ok) {
      // No account means no barber either: undo the insert.
      const removed = await removeBarber(admin, comercioId, nuevoBarbero.id)
      return res.status(account.status).json({
        error: removed
          ? account.error
          : `${account.error} El barbero quedó guardado sin acceso; revísalo en la lista.`
      })
    }

    // Best-effort: the account stays and the admin sees the password either way.
    const emailEnviado = await sendCredentialsEmail({
      email: account.email,
      password: account.password,
      nombre: nuevoBarbero.nombre,
      apellido: nuevoBarbero.apellido,
    })

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      success: true,
      barbero: nuevoBarbero,
      cuenta_creada: true,
      email: account.email,
      password: account.password,
      email_enviado: emailEnviado,
      message: 'Barbero y cuenta de usuario creados exitosamente'
    })

  } catch (error: any) {
    console.error('❌ [Crear Barbero] Error:', error?.message ?? error)
    return res.status(500).json({ error: 'No se pudo crear el barbero. Intenta de nuevo.' })
  }
}
