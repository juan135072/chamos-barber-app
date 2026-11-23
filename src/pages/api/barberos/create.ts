import { requireStaff, barberFields } from '@/lib/server-authorization'
import type { NextApiRequest, NextApiResponse } from 'next'
import { findEmailConflict, insertBarber, normalizeEmail } from '@/lib/staff-accounts'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const actor = await requireStaff(req, res, ['admin'])
    if (!actor) return
    const fields = barberFields(req.body)

    if (!fields.nombre || !fields.apellido) {
      return res.status(400).json({ error: 'nombre y apellido son requeridos' })
    }

    const email = normalizeEmail(fields.email)
    if (email) {
      const conflict = await findEmailConflict(actor.admin, actor.access.comercio_id, email)
      if (conflict) return res.status(409).json({ error: conflict })
    }

    const created = await insertBarber(actor.admin, actor.access.comercio_id, { ...fields, email })
    if (!created.ok) return res.status(created.status).json({ error: created.error })

    return res.status(201).json({
      success: true,
      barbero: created.barbero,
      message: 'Barbero creado exitosamente'
    })

  } catch (error: any) {
    console.error('❌ Error en create barbero:', error?.message ?? error)
    return res.status(500).json({ error: 'No se pudo crear el barbero. Intenta de nuevo.' })
  }
}
