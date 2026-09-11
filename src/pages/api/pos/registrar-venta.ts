import type { NextApiRequest, NextApiResponse } from 'next'
import { requireStaff } from '@/lib/server-authorization'
import { calculateSale, SaleValidationError } from '@/lib/sale-validation'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const actor = await requireStaff(req, res, ['admin', 'cajero'])
  if (!actor) return
  try {
    const body = req.body ?? {}
    const { admin, access, user } = actor
    const { data: barber, error } = await admin.from('barberos').select('id, porcentaje_comision, activo')
      .eq('id', body.barbero_id).eq('comercio_id', access.comercio_id).single()
    if (error || !barber || !barber.activo) return res.status(400).json({ message: 'Barbero no disponible en este comercio' })
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100) return res.status(400).json({ message: 'Artículos inválidos' })
    const catalog = new Map<string, any>()
    for (const [table, type, field] of [['servicios', 'servicio', 'servicio_id'], ['productos', 'producto', 'producto_id']]) {
      const ids = [...new Set(body.items.map((i: any) => i?.[field]).filter(Boolean))]
      if (!ids.length) continue
      const result = await admin.from(table).select('*').in('id', ids).eq('comercio_id', access.comercio_id)
      if (result.error) throw result.error
      for (const entry of result.data ?? []) catalog.set(`${type}:${entry.id}`, entry)
    }
    const calculated = calculateSale(body, barber, catalog)
    const payload = {
      ...calculated, barbero_id: barber.id, comercio_id: access.comercio_id,
      created_by: user.id, cajero_id: access.id, cita_id: body.cita_id || null,
      cliente_nombre: typeof body.cliente_nombre === 'string' ? body.cliente_nombre.trim().slice(0,150) || 'Consumidor Final' : 'Consumidor Final',
      cliente_rut: body.cliente_rut || null, tipo_documento: body.tipo_documento, metodo_pago: body.metodo_pago,
    }
    const result = await admin.rpc('app_record_sale', { p_data: payload })
    if (result.error) {
      if (['23505', 'P0001'].includes(result.error.code)) return res.status(409).json({ message: 'La cita ya fue cobrada, no está disponible o no hay stock suficiente' })
      throw result.error
    }
    return res.status(200).json({ factura: result.data })
  } catch (error) {
    if (error instanceof SaleValidationError) return res.status(400).json({ message: error.message })
    console.error('[registrar-venta] Failed to record sale')
    return res.status(500).json({ message: 'No se pudo registrar la venta' })
  }
}
