import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient, createPagesServerClient, getUserFromBearer } from './supabase-server'

export type StaffRole = 'admin' | 'cajero' | 'barbero'

/** Resolve identity from a verified session, never from an ID in the request body. */
export async function requireStaff(req: NextApiRequest, res: NextApiResponse, roles: StaffRole[]) {
  try {
    const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
    if (!bearer && !req.headers.cookie?.includes('insforge_')) {
      res.status(401).json({ error: 'No autenticado', message: 'No autenticado' })
      return null
    }
    const user = bearer
      ? (await getUserFromBearer(bearer)).data?.user
      : (await createPagesServerClient(req, res).auth.getSession()).data?.session?.user
    if (!user?.id || !/^[0-9a-f-]{36}$/i.test(user.id)) {
      res.status(401).json({ error: 'Sesión inválida', message: 'Sesión inválida' })
      return null
    }
    const admin = createPagesAdminClient()
    const { data, error } = await admin.from('admin_users').select('*').eq('id', user.id).limit(2)
    if (error) throw error
    const access = Array.isArray(data) && data.length === 1 ? data[0] : null
    if (!access || access.activo !== true || !access.comercio_id || !roles.includes(access.rol)) {
      res.status(403).json({ error: 'Sin permisos para esta operación', message: 'Sin permisos para esta operación' })
      return null
    }
    return { user, access, admin }
  } catch (error) {
    console.error('[authorization] Access verification failed')
    res.status(503).json({ error: 'No se pudo verificar el acceso', message: 'No se pudo verificar el acceso' })
    return null
  }
}

const BARBER_FIELDS = new Set([
  'nombre', 'apellido', 'telefono', 'email', 'instagram', 'descripcion', 'especialidades',
  'imagen_url', 'activo', 'slug', 'porcentaje_comision', 'banco', 'tipo_cuenta', 'numero_cuenta',
  'titular_cuenta', 'rut', 'rut_titular', 'color', 'disponible',
])

export function barberFields(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  return Object.fromEntries(Object.entries(input).filter(([key]) => BARBER_FIELDS.has(key)))
}
