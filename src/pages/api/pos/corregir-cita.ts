import type { NextApiRequest, NextApiResponse } from 'next'
import { requireStaff } from '@/lib/server-authorization'
import { respondPosError } from '@/lib/pos-errors'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const actor = await requireStaff(req, res, ['admin', 'cajero'])
  if (!actor) return
  const { cita_id, barbero_id, servicio_id } = req.body ?? {}
  if ([cita_id, barbero_id, servicio_id].some(id => typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))) return res.status(400).json({ message: 'Cita, barbero o servicio inválido' })
  try {
    const { data, error } = await actor.admin.rpc('app_update_unpaid_appointment', { p_comercio: actor.access.comercio_id, p_cita: cita_id, p_barbero: barbero_id, p_servicio: servicio_id })
    if (error) return respondPosError(res, error, 'corregir-cita')
    return res.status(200).json(data)
  } catch (error) { return respondPosError(res, error, 'corregir-cita') }
}
