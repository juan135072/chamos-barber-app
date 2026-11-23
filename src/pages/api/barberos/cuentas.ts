// API Route: which barbers of the shop have a login account (admin only).
// Lists the account email and state per barber, never ids of auth users or secrets.
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireStaff } from '@/lib/server-authorization'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' })
  const actor = await requireStaff(req, res, ['admin'])
  if (!actor) return

  const { data, error } = await actor.admin
    .from('admin_users')
    .select('barbero_id, email, activo, rol')
    .eq('comercio_id', actor.access.comercio_id)
    .not('barbero_id', 'is', null)
  if (error) {
    console.error('[barberos/cuentas] failed', { code: error.code ?? null, message: error.message ?? null })
    return res.status(500).json({ error: 'No se pudieron cargar las cuentas de acceso.' })
  }

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    cuentas: (data ?? []).map((row: any) => ({ barbero_id: row.barbero_id, email: row.email, activo: row.activo, rol: row.rol })),
  })
}
