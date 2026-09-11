import type { NextApiRequest, NextApiResponse } from 'next'
import { requireStaff } from '@/lib/server-authorization'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).end()
  const actor = await requireStaff(req, res, ['admin'])
  if (!actor) return
  const { barberoId } = req.body ?? {}
  if (typeof barberoId !== 'string' || !/^[0-9a-f-]{36}$/i.test(barberoId)) return res.status(400).json({ error: 'Barbero inválido' })
  const { error } = await actor.admin.rpc('app_delete_unused_barber', { p_comercio: actor.access.comercio_id, p_barber: barberoId })
  if (error) return res.status(409).json({ error: 'No se pudo eliminar. Si el barbero tiene historial, desactívalo para conservar sus registros.' })
  return res.status(200).json({ success: true, message: 'Barbero eliminado' })
}
