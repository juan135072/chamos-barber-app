import type { NextApiRequest, NextApiResponse } from 'next'
import { requireStaff } from '@/lib/server-authorization'
import { isUuid, validateHora } from '@/lib/booking-validation'
import { firstError, readJsonBody, validateBookingDate } from '@/lib/bot/validation'
import { rescheduleBookingAsStaff, staffMoveSlots, type ChangeFailure } from '@/lib/booking/change'
import { DEFAULT_TIMEZONE } from '@/lib/booking/notify'

/**
 * Staff reschedule of an existing appointment, used by the admin panel.
 *
 *   GET  ?cita_id&fecha[&barbero_id]            slots the appointment can move to that day
 *   POST { cita_id, fecha, hora, barbero_id? }  moves it
 *
 * The tenant always comes from the signed-in staff row, never from the request.
 * The new slot is checked like a new booking (barber hours, breaks, blocks,
 * other appointments, past times) inside the booking window, today to 30 days
 * ahead in the tenant timezone. Staff cannot override a refused slot.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return refuse(res, 405, 'METODO_NO_PERMITIDO', 'Método no permitido')
  }
  const actor = await requireStaff(req, res, ['admin', 'cajero'])
  if (!actor) return

  const moving = req.method === 'POST'
  try {
    const input = moving ? readJsonBody(req) : req.query
    if (!input) return refuse(res, 400, 'DATOS_INVALIDOS', 'Datos inválidos')

    const comercioId: string = actor.access.comercio_id
    const timeZone = await tenantTimeZone(actor.admin, comercioId)
    const invalid = firstError(
      isUuid(input.cita_id) ? null : 'Cita inválida',
      validateBookingDate(input.fecha, timeZone),
      moving ? validateHora(input.hora) : null,
      input.barbero_id == null || isUuid(input.barbero_id) ? null : 'Barbero inválido',
    )
    if (invalid) return refuse(res, 400, 'DATOS_INVALIDOS', invalid)
    const target = { comercioId, citaId: input.cita_id, fecha: input.fecha, barberoId: input.barbero_id ?? undefined, timeZone }

    if (!moving) {
      const result = await staffMoveSlots(actor.admin, target)
      if (!result.ok) return refuseChange(res, result.failure)
      return res.status(200).json({ success: true, slots: result.slots })
    }

    const result = await rescheduleBookingAsStaff(actor.admin, { ...target, hora: input.hora, staffUserId: actor.user.id })
    if (!result.ok) return refuseChange(res, result.failure)
    const { id, fecha, hora, barbero_id, estado } = result.cita
    return res.status(200).json({ success: true, cita: { id, fecha, hora: String(hora).slice(0, 5), barbero_id, estado } })
  } catch (error: any) {
    // Only the error text: never the request, which names a customer's appointment.
    console.error('[admin/citas/reagendar] failed:', String(error?.message ?? error).slice(0, 300))
    return refuse(res, 500, 'ERROR_INTERNO', moving
      ? 'No se pudo reagendar la cita. Intenta de nuevo.'
      : 'No se pudieron cargar los horarios. Intenta de nuevo.')
  }
}

/** `message` is shown to staff as is; `error` repeats it for clients that read that key. */
function refuse(res: NextApiResponse, status: number, code: string, message: string) {
  return res.status(status).json({ error: message, message, code })
}

function refuseChange(res: NextApiResponse, failure: ChangeFailure) {
  switch (failure.code) {
    case 'CITA_NO_ENCONTRADA':
      return refuse(res, 404, failure.code, 'No encontramos esa cita.')
    case 'CITA_NO_MODIFICABLE':
      return refuse(res, 409, failure.code, failure.estado
        ? `La cita está ${failure.estado} y ya no se puede reagendar.`
        : 'La cita cambió de estado y ya no se puede reagendar.')
    case 'BARBERO_NO_DISPONIBLE':
      if (failure.unassigned) return refuse(res, 400, 'BARBERO_REQUERIDO', 'Esta cita no tiene barbero asignado. Elige un barbero para reagendarla.')
      return refuse(res, 400, failure.code, 'El barbero seleccionado no está disponible.')
    case 'MISMO_HORARIO':
      return refuse(res, 400, failure.code, 'La cita ya está agendada en ese horario.')
    case 'HORARIO_NO_DISPONIBLE':
      return refuse(res, 409, failure.code, failure.motivo
        ? `Ese horario no está disponible (${failure.motivo}). Elige otro.`
        : 'Ese horario no está disponible. Elige otro.')
    case 'RACE_CONDITION':
      return refuse(res, 409, failure.code, 'Ese horario se acaba de ocupar. Elige otro.')
  }
}

async function tenantTimeZone(db: any, comercioId: string): Promise<string> {
  const { data, error } = await db.from('comercios').select('timezone').eq('id', comercioId).limit(1)
  if (error) throw new Error(`Tenant lookup failed: ${error.message}`)
  return (Array.isArray(data) && data[0]?.timezone) || DEFAULT_TIMEZONE
}
