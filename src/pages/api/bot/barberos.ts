import { botRoute, sendBotData } from '@/lib/bot/api'
import { GENERAL_HOURS_KEYS, barberWeek, generalHours, type BarberScheduleRow } from '@/lib/business-hours'

/** GET /api/bot/barberos — active barbers of the bot tenant, each with the week they work. */
export default botRoute({
  GET: async (_req, res, { db, tenant }) => {
    const { data, error } = await db
      .from('barberos')
      .select('id, nombre, apellido, especialidades, descripcion')
      .eq('comercio_id', tenant.id)
      .eq('activo', true)
      .order('nombre')
    if (error) throw new Error(`Barbers lookup failed: ${error.message}`)
    const barbers: any[] = data || []
    const weekOf = await loadWeeks(db, tenant.id, barbers.map((b) => b.id))

    return sendBotData(res, barbers.map((b) => ({
      id: b.id,
      nombre: b.nombre,
      apellido: b.apellido ?? null,
      especialidades: Array.isArray(b.especialidades) ? b.especialidades : [],
      descripcion: b.descripcion ?? null,
      ...(weekOf && { horario_semanal: weekOf(b.id) }),
    })))
  },
})

/**
 * Each barber's week, built from the admin panel on every request (general
 * hours and schedule rows), so it can never go stale.
 *
 * Returns null when the schedule cannot be read. The field is then left out,
 * which clients read as "unknown": an added field must neither take the barber
 * list down nor be filled with guessed hours.
 */
async function loadWeeks(db: any, tenantId: string, barberIds: string[]) {
  if (barberIds.length === 0) return null
  try {
    const [schedules, settings] = await Promise.all([
      db
        .from('horarios_atencion')
        .select('barbero_id, dia_semana, hora_inicio, hora_fin, activo, pausa_inicio, pausa_fin')
        .in('barbero_id', barberIds),
      db
        .from('sitio_configuracion')
        .select('clave, valor')
        .eq('comercio_id', tenantId)
        .in('clave', GENERAL_HOURS_KEYS),
    ])
    const failure = schedules.error || settings.error
    if (failure) throw new Error(failure.message)

    const hours = generalHours(Object.fromEntries((settings.data || []).map((row: any) => [row.clave, row.valor])))
    const rows: Array<BarberScheduleRow & { barbero_id: string }> = schedules.data || []
    return (barberId: string) => barberWeek(hours, rows.filter((row) => row.barbero_id === barberId))
  } catch (error) {
    console.error('[bot-api] weekly schedule lookup failed:', error)
    return null
  }
}
