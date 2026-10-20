import type { NextApiResponse } from 'next'
import { appointmentCharge } from '@/lib/pos-values'
import { localWallTimestamp } from '@/lib/booking-validation'
import { formatWallClock, isActiveEstado, isBeforeStart, wallClock } from '@/lib/booking/change-policy'
import type { ChangeFailure } from '@/lib/booking/change'
import type { CreateBookingFailure } from '@/lib/booking/create'
import { sendBotError, type BotTenant } from './api'

/** Marker kept at the start of the notes of bot bookings (find-ai-citas.js searches for it). */
export const BOT_NOTE_PREFIX = '[RESERVA WHATSAPP/IA]'

export function botBookingNotes(notas: unknown): string {
  const text = typeof notas === 'string' ? notas.trim() : ''
  return text ? `${BOT_NOTE_PREFIX} ${text}` : BOT_NOTE_PREFIX
}

/** Maps shared booking failures to the bot error contract (see docs/bot-api.md). */
export function sendBookingFailure(res: NextApiResponse, failure: CreateBookingFailure | ChangeFailure) {
  switch (failure.code) {
    case 'BARBERO_SIN_COMERCIO':
    case 'BARBERO_NO_DISPONIBLE':
      return sendBotError(res, 400, 'BARBERO_NO_DISPONIBLE', 'El barbero seleccionado no está disponible.')
    case 'SERVICIO_NO_DISPONIBLE':
      return sendBotError(res, 400, 'SERVICIO_NO_DISPONIBLE', failure.message)
    case 'MISMO_HORARIO':
      return sendBotError(res, 400, 'DATOS_INVALIDOS', 'La cita ya está agendada en ese horario.')
    case 'CITA_NO_ENCONTRADA':
      return sendBotError(res, 404, 'CITA_NO_ENCONTRADA', 'No encontramos esa cita para este teléfono.')
    case 'CITA_NO_MODIFICABLE':
      if (failure.started) return sendBotError(res, 409, 'CITA_NO_MODIFICABLE', 'La cita ya comenzó o ya pasó y no se puede modificar.')
      return sendBotError(res, 409, 'CITA_NO_MODIFICABLE', failure.estado
        ? `La cita está ${failure.estado} y ya no se puede modificar.`
        : 'La cita cambió de estado y ya no se puede modificar.')
    case 'LIMITE_CITAS_ALCANZADO':
      return sendBotError(res, 409, 'LIMITE_CITAS_ALCANZADO', failure.message)
    case 'HORARIO_NO_DISPONIBLE':
      return sendBotError(res, 409, 'HORARIO_NO_DISPONIBLE', 'Ese horario no está disponible. Elige otro.')
    case 'RACE_CONDITION':
      return sendBotError(res, 409, 'RACE_CONDITION', 'Ese horario se acaba de ocupar. Elige otro.')
    case 'VERIFICACION_FALLIDA':
    case 'ERROR_INSERCION':
      console.error('[bot-api] booking failed:', failure)
      return sendBotError(res, 500, 'ERROR_INTERNO', 'Error interno. Intenta nuevamente en unos minutos.')
  }
}

/** Columns the bot reads from a cita. Contact data and notes are never selected. */
export const BOT_CITA_COLUMNS =
  'id, fecha, hora, estado, cliente_nombre, barbero_id, servicio_id, items, precio_final, ' +
  'barberos(id, nombre, apellido, activo), servicios(id, nombre, precio)'

/** How many past appointments are scanned to build the customer history. */
export const HISTORY_SCAN_LIMIT = 100
const MAX_RECENT_BARBERS = 3

interface BarberRef {
  id: string
  nombre?: string | null
  apellido?: string | null
}

function presentBarber(cita: any, barbero?: BarberRef | null) {
  const source = barbero ?? cita.barberos
  if (source) return { id: source.id, nombre: source.nombre ?? null, apellido: source.apellido ?? null }
  return cita.barbero_id ? { id: cita.barbero_id, nombre: null, apellido: null } : null
}

/** Public shape of one appointment for the agent. */
export function presentCita(cita: any, timeZone: string, now: Date = new Date(), barbero?: BarberRef | null) {
  const { items, total } = appointmentCharge({ ...cita, servicio: cita.servicios ?? cita.servicio })
  const hora = String(cita.hora).slice(0, 5)
  return {
    id: cita.id,
    fecha: cita.fecha,
    hora,
    estado: cita.estado,
    barbero: presentBarber(cita, barbero),
    servicios: items.map((item: any) => ({
      id: item.servicio_id ?? null,
      nombre: item.nombre ?? null,
      cantidad: Number(item.cantidad ?? 1),
      precio: Number(item.precio ?? 0),
    })),
    precio_final: total,
    // Changes are allowed until the booking starts; exposed so the agent can answer before trying.
    modificable: isActiveEstado(cita.estado) && isBeforeStart(cita.fecha, hora, timeZone, now),
    modificable_hasta: formatWallClock(wallClock(cita.fecha, hora)),
  }
}

/**
 * Presents a booking that was just written, re-read with the bot columns so
 * older rows still show their service names.
 */
export async function presentStoredCita(db: any, tenant: BotTenant, cita: any, barbero?: BarberRef | null) {
  const { data, error } = await db
    .from('citas')
    .select(BOT_CITA_COLUMNS)
    .eq('id', cita.id)
    .eq('comercio_id', tenant.id)
    .limit(1)
  const stored = !error && Array.isArray(data) && data[0] ? data[0] : cita
  return presentCita(stored, tenant.timezone, new Date(), barbero)
}

/**
 * Upcoming bookings plus a short history of one customer. `rows` must already
 * be restricted to that customer's phone and the bot tenant.
 */
export function summarizeCustomer(telefono: string, rows: any[], timeZone: string, now: Date = new Date()) {
  const nowWall = localWallTimestamp(now, timeZone)
  const startOf = (cita: any) => wallClock(cita.fecha, String(cita.hora))

  const upcoming = rows
    .filter(cita => isActiveEstado(cita.estado) && startOf(cita) >= nowWall)
    .sort((a, b) => startOf(a) - startOf(b))
    .map(cita => presentCita(cita, timeZone, now))

  const newestFirst = [...rows].sort((a, b) => startOf(b) - startOf(a))
  const completed = newestFirst.filter(cita => cita.estado === 'completada')
  const barbers = new Map<string, { id: string; nombre: string | null; apellido: string | null; activo: boolean; visitas: number; ultima_visita: string }>()
  for (const cita of completed) {
    if (!cita.barbero_id) continue
    const known = barbers.get(cita.barbero_id)
    if (known) {
      known.visitas += 1
      continue
    }
    barbers.set(cita.barbero_id, {
      id: cita.barbero_id,
      nombre: cita.barberos?.nombre ?? null,
      apellido: cita.barberos?.apellido ?? null,
      activo: cita.barberos?.activo === true,
      visitas: 1,
      ultima_visita: cita.fecha,
    })
  }

  const lastName = newestFirst.find(cita => typeof cita.cliente_nombre === 'string' && cita.cliente_nombre.trim())
  return {
    telefono,
    citas: upcoming,
    historial: {
      cliente_nombre: lastName ? lastName.cliente_nombre.trim() : null,
      visitas_completadas: completed.length,
      ultima_visita: completed[0]?.fecha ?? null,
      // Most recent first; a barber appears once with their visit count.
      barberos_recientes: Array.from(barbers.values()).slice(0, MAX_RECENT_BARBERS),
    },
  }
}
