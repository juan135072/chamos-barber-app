import type { NextApiRequest, NextApiResponse } from 'next'
import { requireStaff } from '@/lib/server-authorization'
import { respondPosError } from '@/lib/pos-errors'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'POST'].includes(req.method ?? '')) return res.status(405).end()
  const actor = await requireStaff(req, res, ['admin', 'cajero'])
  if (!actor) return
  const body = req.body ?? {}
  const action = req.method === 'GET' ? 'get' : body.action
  if (!['get', 'open', 'close'].includes(action)) return res.status(400).json({ message: 'Operación de caja inválida' })
  if (action !== 'get' && (typeof body.monto !== 'number' || !Number.isFinite(body.monto) || body.monto < 0 || body.monto > 100000000)) {
    return res.status(400).json({ message: 'Ingresa un monto de caja válido' })
  }
  if (action === 'close' && !/^[0-9a-f-]{36}$/i.test(body.sesion_id ?? '')) return res.status(400).json({ message: 'Selecciona un turno de caja' })
  try {
    const { data, error } = await actor.admin.rpc('app_cash_register', {
      p_comercio: actor.access.comercio_id, p_actor: actor.user.id, p_action: action,
      p_data: { monto: body.monto, sesion_id: body.sesion_id, notas: typeof body.notas === 'string' ? body.notas.slice(0, 2000) : '' },
    })
    if (error) return respondPosError(res, error, 'caja')
    return res.status(200).json(data)
  } catch (error) { return respondPosError(res, error, 'caja') }
}
