import { botRoute, sendBotData } from '@/lib/bot/api'

/** GET /api/bot/servicios — active services of the bot tenant. */
export default botRoute({
  GET: async (_req, res, { db, tenant }) => {
    const { data, error } = await db
      .from('servicios')
      .select('id, nombre, descripcion, precio, duracion_minutos, categoria')
      .eq('comercio_id', tenant.id)
      .eq('activo', true)
      .order('nombre')
    if (error) throw new Error(`Services lookup failed: ${error.message}`)

    return sendBotData(res, (data || []).map((s: any) => ({
      id: s.id,
      nombre: s.nombre,
      descripcion: s.descripcion ?? null,
      precio: s.precio,
      duracion_minutos: s.duracion_minutos,
      categoria: s.categoria ?? null,
    })))
  },
})
