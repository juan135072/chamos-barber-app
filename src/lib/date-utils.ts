/**
 * Utilidades para manejo de fechas centradas en la zona horaria de Chile (America/Santiago).
 * Esto evita el desfase de 3-4 horas al usar UTC (ISOString).
 */

/**
 * Obtiene un objeto Date que representa el momento exacto en la zona horaria especificada.
 */
export const getDynamicAhora = (timeZone: string = 'America/Santiago'): Date => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    });

    const parts = formatter.formatToParts(now);
    const p: any = {};
    parts.forEach(part => p[part.type] = part.value);

    return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
};

// Mantener compatibilidad con Chile para no romper código existente de inmediato
export const getChileAhora = () => getDynamicAhora('America/Santiago');

export const CHILE_TIMEZONE = 'America/Santiago'

type Instante = Date | number | string

const wallFormatters = new Map<string, Intl.DateTimeFormat>()

/** Wall-clock date ('YYYY-MM-DD') and time ('HH:mm:ss', 24 h) of an instant in the zone. */
function partesEnZona(instante: Instante, timeZone: string) {
    let formatter = wallFormatters.get(timeZone)
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
        })
        wallFormatters.set(timeZone, formatter)
    }
    const date = instante instanceof Date ? instante : new Date(instante)
    const p = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]))
    return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}:${p.second}` }
}

/** Calendar day 'YYYY-MM-DD' of an instant (e.g. a created_at) in the zone. */
export const fechaEnZona = (instante: Instante, timeZone: string = CHILE_TIMEZONE): string =>
    partesEnZona(instante, timeZone).fecha

/** Time 'HH:mm' of an instant in the zone. */
export const horaEnZona = (instante: Instante, timeZone: string = CHILE_TIMEZONE): string =>
    partesEnZona(instante, timeZone).hora.slice(0, 5)

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD ajustada a la zona horaria.
 * Nunca usar new Date().toISOString().split('T')[0]: es el día en UTC, que en
 * Chile ya es mañana desde las 21:00 (20:00 en invierno).
 */
export const getDynamicHoy = (timeZone: string = CHILE_TIMEZONE, now: Date = new Date()): string =>
    fechaEnZona(now, timeZone)

export const getChileHoy = (now: Date = new Date()) => getDynamicHoy(CHILE_TIMEZONE, now);

/** Half-open UTC boundaries for Chilean calendar dates, including DST days. */
export function chileDateRange(first: string, last: string) {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' })
    const boundary = (day: string) => {
        const utc = Date.parse(day + 'T00:00:00Z')
        if (!Number.isFinite(utc)) throw new Error('Fecha inválida')
        let low = utc - 18 * 3600000, high = utc + 30 * 3600000
        while (high - low > 1) {
            const mid = Math.floor((low + high) / 2)
            const parts = Object.fromEntries(formatter.formatToParts(mid).map(p => [p.type, p.value]))
            const local = `${parts.year}-${parts.month}-${parts.day}`
            if (local < day) low = mid
            else high = mid
        }
        return new Date(high).toISOString()
    }
    const next = new Date(Date.parse(last + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10)
    return { start: boundary(first), end: boundary(next) }
}

/**
 * Obtiene la hora actual en formato HH:mm ajustada a la zona horaria.
 */
export const getDynamicHora = (timeZone: string = CHILE_TIMEZONE, now: Date = new Date()): string =>
    horaEnZona(now, timeZone)

/**
 * Formatea una fecha a string legible según la zona horaria.
 */
export const formatFechaDynamic = (date: string | Date, timeZone: string = 'America/Santiago'): string => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    // Un string YYYY-MM-DD es un día del calendario: se formatea sin convertir zona.
    if (typeof date === 'string' && parseFechaSolo(date)) return formatFechaSolo(date, options)
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-CL', { ...options, timeZone });
};

export const formatFechaChile = (date: string | Date) => formatFechaDynamic(date, CHILE_TIMEZONE);

// ---------------------------------------------------------------------------
// Fechas sin hora (columnas DATE como citas.fecha, gastos.fecha o
// liquidaciones.fecha_inicio). new Date('2026-11-23') es la medianoche UTC, que
// en Chile todavía es el 22 a las 21:00: por eso estas fechas nunca pasan por
// la zona horaria del navegador ni del servidor.
// ---------------------------------------------------------------------------

/** Calendar parts of an exact 'YYYY-MM-DD' value, or null when it is not a real date. */
export function parseFechaSolo(fecha: unknown): { year: number; month: number; day: number } | null {
    if (typeof fecha !== 'string') return null
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
    if (!match) return null
    const [year, month, day] = match.slice(1).map(Number)
    const check = new Date(Date.UTC(year, month - 1, day))
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null
    return { year, month, day }
}

const fechaSoloUTC = (fecha: unknown): Date | null => {
    const parts = parseFechaSolo(fecha)
    return parts ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day)) : null
}

/**
 * Formats a 'YYYY-MM-DD' calendar date in Spanish without shifting the day,
 * e.g. "23 nov" or, with { weekday: 'long', day: 'numeric', month: 'long' },
 * "lunes, 23 de noviembre". Anything that is not a date is returned as is.
 */
export function formatFechaSolo(
    fecha: string | null | undefined,
    options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
    locale: string = 'es-CL'
): string {
    const date = fechaSoloUTC(fecha)
    return date ? date.toLocaleDateString(locale, { ...options, timeZone: 'UTC' }) : (fecha ?? '')
}

/** 'dd/MM/yyyy' of a 'YYYY-MM-DD' calendar date (tables and PDFs). */
export function formatFechaSoloNumerica(fecha: string | null | undefined): string {
    const parts = parseFechaSolo(fecha)
    if (!parts) return fecha ?? ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(parts.day)}/${pad(parts.month)}/${parts.year}`
}

/** Formats a timestamptz instant as seen in Chile, whatever the device time zone. */
export function formatInstante(
    instante: Instante,
    options: Intl.DateTimeFormatOptions,
    locale: string = 'es-CL',
    timeZone: string = CHILE_TIMEZONE
): string {
    const date = instante instanceof Date ? instante : new Date(instante)
    return date.toLocaleString(locale, { ...options, timeZone })
}

/** Calendar arithmetic on 'YYYY-MM-DD' values (no time zone involved). */
export function addDays(day: string, days: number): string {
    return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

/** Wall-clock 'HH:mm' plus minutes, wrapping at midnight (e.g. '23:45' + 30 = '00:15'). */
export function horaMasMinutos(hora: string, minutos: number): string {
    const [hours, minutes] = hora.split(':').map(Number)
    const total = (((hours * 60 + minutes + minutos) % 1440) + 1440) % 1440
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

/** First day of the month of a 'YYYY-MM-DD' value. */
export const inicioDeMes = (fecha: string): string => `${fecha.slice(0, 7)}-01`

/** Last day of the month of a 'YYYY-MM-DD' value. */
export function finDeMes(fecha: string): string {
    const [year, month] = fecha.split('-').map(Number)
    return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

/** Monday of the week (Monday to Sunday) that contains a 'YYYY-MM-DD' value. */
export function lunesDeSemana(fecha: string): string {
    const weekday = new Date(`${fecha}T00:00:00Z`).getUTCDay() // 0 = domingo
    return addDays(fecha, weekday === 0 ? -6 : 1 - weekday)
}

/**
 * UTC instant of a wall-clock date and time in the zone, e.g. ('2026-11-23',
 * '18:00') in Chile is 2026-11-23T21:00:00.000Z. A time skipped by the DST
 * change moves forward by the gap; a repeated time takes its first occurrence.
 */
export function instanteDesdeHoraLocal(fecha: string, hora: string, timeZone: string = CHILE_TIMEZONE): Date | null {
    const day = parseFechaSolo(fecha)
    const time = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/.exec(hora ?? '')
    if (!day || !time) return null
    const wall = Date.UTC(day.year, day.month - 1, day.day, Number(time[1]), Number(time[2]), Number(time[3] ?? 0))
    const wallOf = (instant: number) => {
        const p = partesEnZona(instant, timeZone)
        return Date.parse(`${p.fecha}T${p.hora}Z`)
    }
    const offsetAt = (instant: number) => wallOf(instant) - instant
    const before = wall - offsetAt(wall - 86_400_000)
    const after = wall - offsetAt(wall + 86_400_000)
    const matches = [before, after].filter(candidate => wallOf(candidate) === wall)
    return new Date(matches.length ? Math.min(...matches) : before)
}
