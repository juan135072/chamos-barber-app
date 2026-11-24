/**
 * General opening hours of a shop, derived from the settings the owner edits in
 * the admin panel (Configuración → Horario Base del Local).
 *
 * Pure and without I/O: callers read the `sitio_configuracion` rows when they
 * are asked and pass them in, so nothing here keeps a copy that can go stale.
 * The rules are the ones of the SQL function app_general_hours()
 * (database/migrations/20260911_general_hours.sql), which drives the booking
 * calendar; tests/business-hours.test.cjs pins the defaults against it.
 */

export const DEFAULT_OPEN = '10:30'
export const DEFAULT_CLOSE = '20:00'
export const DEFAULT_INTERVAL = 30
export const MIN_INTERVAL = 5
export const MAX_INTERVAL = 120

/** The settings keys the general hours are built from, and the only ones. */
export const GENERAL_HOURS_KEYS = [
  'horario_apertura', 'horario_cierre',
  'horario_sabado_apertura', 'horario_sabado_cierre',
  'horario_domingo_apertura', 'horario_domingo_cierre', 'horario_domingo_activo',
  'intervalo_citas',
]

/** Settings as a key → value map; missing, null and empty values mean "not configured". */
export type HoursConfig = Record<string, string | null | undefined>

export interface DayHours {
  abierto: boolean
  /** Wall-clock time as stored by the panel ('HH:MM'), in the shop's timezone. */
  apertura: string
  cierre: string
}

export interface GeneralHours {
  /** Monday to Friday. */
  semana: DayHours
  sabado: DayHours
  domingo: DayHours
  /** Minutes between two bookable start times. */
  intervaloMinutos: number
}

/**
 * General hours from the panel settings: each day group falls back to the
 * weekday hours and then to the defaults, Sunday is open only when
 * `horario_domingo_activo` is 'true', and the interval is clamped.
 */
export function generalHours(config: HoursConfig): GeneralHours {
  const pick = (key: string) => (config[key] ?? '').trim()
  const day = (prefix: string, abierto: boolean): DayHours => ({
    abierto,
    apertura: pick(`${prefix}_apertura`) || pick('horario_apertura') || DEFAULT_OPEN,
    cierre: pick(`${prefix}_cierre`) || pick('horario_cierre') || DEFAULT_CLOSE,
  })
  const interval = Number.parseInt(pick('intervalo_citas'), 10)

  return {
    semana: day('horario', true),
    sabado: day('horario_sabado', true),
    domingo: day('horario_domingo', pick('horario_domingo_activo') === 'true'),
    intervaloMinutos: Number.isFinite(interval)
      ? Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, interval))
      : DEFAULT_INTERVAL,
  }
}

/** Hours of one weekday, numbered like JavaScript and Postgres: 0 = Sunday … 6 = Saturday. */
export function hoursForWeekday(hours: GeneralHours, weekday: number): DayHours {
  if (weekday === 0) return hours.domingo
  return weekday === 6 ? hours.sabado : hours.semana
}

const CLOCK = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/

/** Minutes since midnight of 'HH:MM' or a Postgres time ('HH:MM:SS'); null when the value is not a time. */
function clockMinutes(value: string | null | undefined): number | null {
  const match = CLOCK.exec((value ?? '').trim())
  if (!match) return null
  const minutes = Number(match[1]) * 60 + Number(match[2])
  return minutes <= 24 * 60 ? minutes : null
}

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

/** 'HH:MM' for display; a value that is not a time is shown as stored. */
function displayClock(value: string): string {
  const minutes = clockMinutes(value)
  return minutes === null ? value : clock(minutes)
}

// --- Display -------------------------------------------------------------------

/** Shown in place of the hours while they are unknown (still loading, or the read failed). */
export const HOURS_UNKNOWN = '—'

const DAY_GROUPS = [
  { key: 'semana', dias: 'Lunes a viernes', diasCorto: 'Lun — Vie' },
  { key: 'sabado', dias: 'Sábado', diasCorto: 'Sábado' },
  { key: 'domingo', dias: 'Domingo', diasCorto: 'Domingo' },
] as const

export interface HoursRow {
  /** 'Lunes a viernes', 'Sábado' or 'Domingo'. */
  dias: string
  /** Short label for narrow tables: 'Lun — Vie', 'Sábado' or 'Domingo'. */
  diasCorto: string
  /** 'desconocido' while the hours have not been read: it must never be shown as closed. */
  estado: 'abierto' | 'cerrado' | 'desconocido'
  /** 'HH:MM' when `estado` is 'abierto', otherwise null. */
  apertura: string | null
  cierre: string | null
}

/** The three rows of an hours table. Pass null while the hours are unknown. */
export function hoursRows(hours: GeneralHours | null): HoursRow[] {
  return DAY_GROUPS.map(({ key, dias, diasCorto }): HoursRow => {
    const day = hours?.[key]
    if (!day?.abierto) return { dias, diasCorto, estado: day ? 'cerrado' : 'desconocido', apertura: null, cierre: null }
    return { dias, diasCorto, estado: 'abierto', apertura: displayClock(day.apertura), cierre: displayClock(day.cierre) }
  })
}

/**
 * The hours in one line, e.g.
 * 'Lunes a viernes 10:30 - 20:00 | Sábado 10:30 - 20:00 | Domingo cerrado'.
 * Unknown hours give HOURS_UNKNOWN, never "cerrado".
 */
export function hoursSentence(hours: GeneralHours | null): string {
  if (!hours) return HOURS_UNKNOWN
  return hoursRows(hours)
    .map((row) => `${row.dias} ${row.estado === 'abierto' ? `${row.apertura} - ${row.cierre}` : 'cerrado'}`)
    .join(' | ')
}

// --- A barber's week -------------------------------------------------------------

/** The columns of a `horarios_atencion` row the week is built from. */
export interface BarberScheduleRow {
  /** 0 = Sunday … 6 = Saturday. */
  dia_semana: number
  hora_inicio: string | null
  hora_fin: string | null
  activo: boolean | null
  pausa_inicio?: string | null
  pausa_fin?: string | null
}

export interface BarberDay {
  dia: string
  atiende: boolean
  /** 'HH:MM', the barber's hours clipped to the shop's; null on a day off. */
  desde: string | null
  hasta: string | null
  pausa: { desde: string; hasta: string } | null
}

/** Monday to Sunday, with the number `horarios_atencion.dia_semana` uses for each day. */
const WEEK: ReadonlyArray<readonly [number, string]> = [
  [1, 'lunes'], [2, 'martes'], [3, 'miércoles'], [4, 'jueves'], [5, 'viernes'], [6, 'sábado'], [0, 'domingo'],
]

/**
 * One barber's working week, Monday to Sunday. A barber works a day when the
 * shop opens it, the barber has an active row for it, and that row overlaps the
 * shop hours: the same intersection get_horarios_disponibles() applies to every
 * slot. The pause is reported inside the hours the barber works.
 */
export function barberWeek(hours: GeneralHours, rows: BarberScheduleRow[]): BarberDay[] {
  return WEEK.map(([weekday, dia]): BarberDay => {
    const dayOff: BarberDay = { dia, atiende: false, desde: null, hasta: null, pausa: null }
    const shop = hoursForWeekday(hours, weekday)
    // (barbero_id, dia_semana) is unique in the database: at most one row matches.
    const row = rows.find((candidate) => candidate.dia_semana === weekday && candidate.activo === true)
    if (!shop.abierto || !row) return dayOff

    const open = clockMinutes(shop.apertura)
    const close = clockMinutes(shop.cierre)
    const start = clockMinutes(row.hora_inicio)
    const end = clockMinutes(row.hora_fin)
    if (open === null || close === null || start === null || end === null) return dayOff
    const desde = Math.max(open, start)
    const hasta = Math.min(close, end)
    if (desde >= hasta) return dayOff

    const pauseStart = clockMinutes(row.pausa_inicio)
    const pauseEnd = clockMinutes(row.pausa_fin)
    const pausa = pauseStart !== null && pauseEnd !== null && Math.max(pauseStart, desde) < Math.min(pauseEnd, hasta)
      ? { desde: clock(Math.max(pauseStart, desde)), hasta: clock(Math.min(pauseEnd, hasta)) }
      : null
    return { dia, atiende: true, desde: clock(desde), hasta: clock(hasta), pausa }
  })
}
