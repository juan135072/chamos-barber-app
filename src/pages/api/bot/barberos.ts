import { botRoute, sendBotData } from '@/lib/bot/api'

/** GET /api/bot/barberos — active barbers of the bot tenant. */
export default botRoute({
  GET: async (_req, res, { db, tenant }) => {
    const { data, error } = await db
      .from('barberos')
      .select('id, nombre, apellido, especialidades, descripcion')
      .eq('comercio_id', tenant.id)
      .eq('activo', true)
      .order('nombre')
    if (error) throw new Error(`Barbers lookup failed: ${error.message}`)

    return sendBotData(res, (data || []).map((b: any) => ({
      id: b.id,
      nombre: b.nombre,
      apellido: b.apellido ?? null,
      especialidades: Array.isArray(b.especialidades) ? b.especialidades : [],
      descripcion: b.descripcion ?? null,
    })))
  },
})
