import type { NextApiRequest, NextApiResponse } from 'next'
import { requireStaff } from '@/lib/server-authorization'
import { deleteOrphanAuthUsers } from '@/lib/staff-accounts'

const GENERIC_ERROR = 'No se pudo eliminar el barbero. Intenta de nuevo más tarde.'

/** The exception app_delete_unused_barber raises for a barber with history. */
function isHistoryError(error: any): boolean {
  return String(error?.message ?? '').includes('tiene historial')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).end()
  const actor = await requireStaff(req, res, ['admin'])
  if (!actor) return
  const { barberoId } = req.body ?? {}
  if (typeof barberoId !== 'string' || !/^[0-9a-f-]{36}$/i.test(barberoId)) return res.status(400).json({ error: 'Barbero inválido' })
  const comercioId = actor.access.comercio_id

  try {
    // The RPC deletes the barber's admin_users rows but never auth.users:
    // read the account ids first so their emails can be reused afterwards.
    const { data: cuentas, error: cuentasError } = await actor.admin
      .from('admin_users')
      .select('id')
      .eq('barbero_id', barberoId)
      .eq('comercio_id', comercioId)
    if (cuentasError) throw cuentasError

    const { error } = await actor.admin.rpc('app_delete_unused_barber', { p_comercio: comercioId, p_barber: barberoId })
    if (error) {
      if (isHistoryError(error)) {
        return res.status(409).json({ error: 'El barbero tiene historial. Desactívalo para conservar sus registros.' })
      }
      console.error('[barberos/delete-permanent] delete failed', { barberoId, code: error.code ?? null, message: error.message ?? null })
      return res.status(500).json({ error: GENERIC_ERROR })
    }

    const { deleted, failed } = await deleteOrphanAuthUsers(actor.admin, (cuentas ?? []).map((row: any) => row.id))
    if (failed.length > 0) {
      console.error('[barberos/delete-permanent] barber deleted but its auth users were not', { barberoId, authUserIds: failed })
      return res.status(200).json({
        success: true,
        partial: true,
        message: 'Barbero eliminado, pero no se pudo borrar su cuenta de acceso, así que su email aún no se puede reutilizar. Avísale al soporte.',
        cuentas_eliminadas: deleted.length,
      })
    }
    return res.status(200).json({ success: true, message: 'Barbero eliminado', cuentas_eliminadas: deleted.length })
  } catch (error: any) {
    console.error('[barberos/delete-permanent] failed', { barberoId, message: error?.message ?? String(error) })
    return res.status(500).json({ error: GENERIC_ERROR })
  }
}
