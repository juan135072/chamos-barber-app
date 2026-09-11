import type { NextApiRequest, NextApiResponse } from 'next'
import { requireStaff } from '@/lib/server-authorization'
import { validateSettings } from '@/lib/settings-validation'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Método no permitido' })
  const actor = await requireStaff(req, res, ['admin'])
  if (!actor) return
  const invalid = validateSettings(req.body)
  if (invalid) return res.status(400).json({ error: invalid })
  const { error } = await actor.admin.rpc('app_save_settings', {
    p_comercio: actor.access.comercio_id, p_values: req.body,
  })
  if (error) return res.status(500).json({ error: 'No se pudo guardar la configuración' })
  return res.status(200).json({ success: true })
}
