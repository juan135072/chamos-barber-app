import type { NextApiRequest, NextApiResponse } from 'next'
import { requireStaff } from '@/lib/server-authorization'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const actor = await requireStaff(req, res, ['admin', 'cajero', 'barbero'])
  if (!actor) return
  const { cita_id, monto_cobrado, metodo_pago, notas_tecnicas, foto_resultado_url } = req.body ?? {}
  if (typeof monto_cobrado !== 'number' || !Number.isFinite(monto_cobrado) || monto_cobrado <= 0 || monto_cobrado > 100000000 || !['efectivo', 'tarjeta', 'transferencia'].includes(metodo_pago)) {
    return res.status(400).json({ error: 'Monto o método de pago inválido' })
  }
  try {
    const { data: cita, error } = await actor.admin.from('citas')
      .select('*, barberos(porcentaje_comision), servicios(nombre)')
      .eq('id', cita_id).eq('comercio_id', actor.access.comercio_id).single()
    if (error || !cita) return res.status(404).json({ error: 'Cita no encontrada' })
    if (actor.access.rol === 'barbero' && cita.barbero_id !== actor.access.barbero_id) return res.status(403).json({ error: 'No puedes cobrar la cita de otro barbero' })
    const porcentaje = Number(cita.barberos?.porcentaje_comision ?? 50)
    const comision = Math.round(monto_cobrado * porcentaje / 100)
    const { error: saleError } = await actor.admin.rpc('app_record_sale', { p_data: {
      cita_id, comercio_id: actor.access.comercio_id, barbero_id: cita.barbero_id,
      created_by: actor.user.id, cajero_id: actor.access.id, cliente_nombre: cita.cliente_nombre,
      tipo_documento: 'boleta', metodo_pago, subtotal: monto_cobrado, descuento: 0, total: monto_cobrado,
      monto_recibido: monto_cobrado, cambio: 0, porcentaje_comision: porcentaje,
      comision_barbero: comision, ingreso_casa: monto_cobrado - comision,
      items: [{ servicio_id: cita.servicio_id, nombre: cita.servicios?.nombre, cantidad: 1, precio: monto_cobrado, subtotal: monto_cobrado }],
      notas_tecnicas, foto_resultado_url,
    } })
    if (saleError) return res.status(409).json({ error: 'No se pudo registrar el cobro; comprueba si la cita ya fue cobrada' })
    return res.status(200).json({ success: true, message: 'Cita completada y cobro registrado', data: { cita_id, monto_cobrado, metodo_pago, comision, porcentaje_comision: porcentaje } })
  } catch {
    return res.status(500).json({ error: 'No se pudo registrar el cobro' })
  }
}
