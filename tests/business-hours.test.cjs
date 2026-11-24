// General opening hours: one helper mirrors the SQL function app_general_hours()
// and feeds the footer, /consultar and the bot API. Nothing here reads a clock,
// so the results are the same under any TZ.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const lib = require('../src/lib/business-hours.ts')
const { generalHours, hoursForWeekday, hoursRows, hoursSentence, barberWeek } = lib

// The panel values on 2026-11-23: Sunday open with its own hours.
const LIVE = {
  horario_apertura: '10:30', horario_cierre: '20:00',
  horario_sabado_apertura: '10:30', horario_sabado_cierre: '20:00',
  horario_domingo_apertura: '12:00', horario_domingo_cierre: '17:00', horario_domingo_activo: 'true',
  intervalo_citas: '30',
}
const DEFAULT_DAY = { abierto: true, apertura: '10:30', cierre: '20:00' }

test('general hours come from the panel keys', () => {
  assert.deepEqual(generalHours(LIVE), {
    semana: { abierto: true, apertura: '10:30', cierre: '20:00' },
    sabado: { abierto: true, apertura: '10:30', cierre: '20:00' },
    domingo: { abierto: true, apertura: '12:00', cierre: '17:00' },
    intervaloMinutos: 30,
  })
})

test('an empty configuration gives the database defaults with Sunday closed', () => {
  const blank = { horario_apertura: '', horario_cierre: null, horario_sabado_apertura: undefined, horario_domingo_activo: '', intervalo_citas: '' }
  for (const config of [{}, blank]) {
    assert.deepEqual(generalHours(config), {
      semana: DEFAULT_DAY, sabado: DEFAULT_DAY, domingo: { ...DEFAULT_DAY, abierto: false }, intervaloMinutos: 30,
    })
  }
})

test('Saturday and Sunday fall back to the weekday hours, then to the defaults', () => {
  const hours = generalHours({
    horario_apertura: '09:00', horario_cierre: '19:00',
    horario_sabado_cierre: '14:00', horario_domingo_apertura: '11:00', horario_domingo_activo: 'true',
  })
  assert.deepEqual(hours.semana, { abierto: true, apertura: '09:00', cierre: '19:00' })
  assert.deepEqual(hours.sabado, { abierto: true, apertura: '09:00', cierre: '14:00' })
  assert.deepEqual(hours.domingo, { abierto: true, apertura: '11:00', cierre: '19:00' })

  // A Saturday value never leaks into the weekdays.
  const onlySaturday = generalHours({ horario_sabado_apertura: '11:00' })
  assert.deepEqual(onlySaturday.semana, DEFAULT_DAY)
  assert.deepEqual(onlySaturday.sabado, { abierto: true, apertura: '11:00', cierre: '20:00' })
})

test('Sunday is open only when horario_domingo_activo is "true"; the other days are always open', () => {
  for (const value of ['false', '', null, undefined, 'TRUE', '1', 'si']) {
    const hours = generalHours({ ...LIVE, horario_domingo_activo: value })
    assert.deepEqual(hours.domingo, { abierto: false, apertura: '12:00', cierre: '17:00' }, String(value))
    assert.equal(hours.semana.abierto && hours.sabado.abierto, true)
  }
  assert.equal(generalHours(LIVE).domingo.abierto, true)
})

test('the booking interval is clamped to 5-120 minutes and defaults to 30', () => {
  const cases = [['15', 15], ['5', 5], ['120', 120], ['1', 5], ['0', 5], ['-10', 5], ['500', 120], ['', 30], [null, 30], [undefined, 30], ['abc', 30]]
  for (const [value, expected] of cases) {
    assert.equal(generalHours({ intervalo_citas: value }).intervaloMinutos, expected, String(value))
  }
})

test('weekday numbers map to their group: 0 Sunday, 6 Saturday, 1-5 weekdays', () => {
  const hours = generalHours({ ...LIVE, horario_sabado_cierre: '18:00' })
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => hoursForWeekday(hours, weekday).cierre),
    ['17:00', '20:00', '20:00', '20:00', '20:00', '20:00', '18:00'],
  )
  assert.equal(hoursForWeekday(generalHours({}), 0).abierto, false)
})

test('rows and sentence print the configured hours', () => {
  const hours = generalHours(LIVE)
  assert.deepEqual(hoursRows(hours), [
    { dias: 'Lunes a viernes', diasCorto: 'Lun — Vie', estado: 'abierto', apertura: '10:30', cierre: '20:00' },
    { dias: 'Sábado', diasCorto: 'Sábado', estado: 'abierto', apertura: '10:30', cierre: '20:00' },
    { dias: 'Domingo', diasCorto: 'Domingo', estado: 'abierto', apertura: '12:00', cierre: '17:00' },
  ])
  assert.equal(hoursSentence(hours), 'Lunes a viernes 10:30 - 20:00 | Sábado 10:30 - 20:00 | Domingo 12:00 - 17:00')
})

test('a closed Sunday reads "cerrado" and carries no hours', () => {
  const hours = generalHours({ ...LIVE, horario_cierre: '21:00', horario_domingo_activo: 'false' })
  assert.deepEqual(hoursRows(hours)[2], { dias: 'Domingo', diasCorto: 'Domingo', estado: 'cerrado', apertura: null, cierre: null })
  assert.equal(hoursSentence(hours), 'Lunes a viernes 10:30 - 21:00 | Sábado 10:30 - 20:00 | Domingo cerrado')
})

test('times stored with seconds or one-digit hours are shown as HH:MM', () => {
  const hours = generalHours({ horario_apertura: '9:00', horario_cierre: '19:30:00' })
  assert.equal(hoursSentence(hours), 'Lunes a viernes 09:00 - 19:30 | Sábado 09:00 - 19:30 | Domingo cerrado')
})

test('unknown hours are shown as a dash, never as closed', () => {
  assert.deepEqual(hoursRows(null), [
    { dias: 'Lunes a viernes', diasCorto: 'Lun — Vie', estado: 'desconocido', apertura: null, cierre: null },
    { dias: 'Sábado', diasCorto: 'Sábado', estado: 'desconocido', apertura: null, cierre: null },
    { dias: 'Domingo', diasCorto: 'Domingo', estado: 'desconocido', apertura: null, cierre: null },
  ])
  assert.equal(hoursSentence(null), '—')
  assert.equal(lib.HOURS_UNKNOWN, '—')
})

// --- A barber's week (GET /api/bot/barberos → horario_semanal) ---------------

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
/** horarios_atencion row; dia_semana is 0 = Sunday … 6 = Saturday and times are Postgres `time` values. */
const row = (dia_semana, extra = {}) => ({ dia_semana, hora_inicio: '10:30:00', hora_fin: '20:00:00', activo: true, pausa_inicio: null, pausa_fin: null, ...extra })
/** Seven rows equal to the LIVE general hours, Sunday first as the table numbers it. */
const liveRows = (overrides = {}) => [0, 1, 2, 3, 4, 5, 6].map((weekday) =>
  row(weekday, { ...(weekday === 0 ? { hora_inicio: '12:00:00', hora_fin: '17:00:00' } : {}), ...overrides[weekday] }))
const dayOf = (week, dia) => week.find((day) => day.dia === dia)
const OFF = { atiende: false, desde: null, hasta: null, pausa: null }

test('a barber on the general hours works them all week, listed Monday to Sunday', () => {
  const week = barberWeek(generalHours(LIVE), liveRows())
  assert.deepEqual(week.map((day) => day.dia), DAYS)
  assert.deepEqual(week, [
    ...DAYS.slice(0, 6).map((dia) => ({ dia, atiende: true, desde: '10:30', hasta: '20:00', pausa: null })),
    { dia: 'domingo', atiende: true, desde: '12:00', hasta: '17:00', pausa: null },
  ])
  assert.deepEqual(Object.keys(week[0]), ['dia', 'atiende', 'desde', 'hasta', 'pausa'])
})

test('an inactive row is a day off', () => {
  const week = barberWeek(generalHours(LIVE), liveRows({ 2: { activo: false }, 4: { activo: null } }))
  assert.deepEqual(dayOf(week, 'martes'), { dia: 'martes', ...OFF })
  assert.deepEqual(dayOf(week, 'jueves'), { dia: 'jueves', ...OFF })
  assert.equal(week.filter((day) => day.atiende).length, 5)
})

test('a missing row is a day off', () => {
  const rows = liveRows().filter((r) => r.dia_semana !== 3)
  const week = barberWeek(generalHours(LIVE), rows)
  assert.equal(week.length, 7)
  assert.deepEqual(dayOf(week, 'miércoles'), { dia: 'miércoles', ...OFF })
  assert.deepEqual(barberWeek(generalHours(LIVE), []), DAYS.map((dia) => ({ dia, ...OFF })))
})

test('a row wider than the general hours is clipped to them', () => {
  const week = barberWeek(generalHours(LIVE), liveRows({
    1: { hora_inicio: '08:00:00', hora_fin: '22:00:00' }, // wider on both sides
    2: { hora_inicio: '09:00:00', hora_fin: '19:00:00' }, // starts before opening
    0: { hora_inicio: '10:30:00', hora_fin: '20:00:00' }, // weekday hours on a shorter Sunday
  }))
  assert.deepEqual(dayOf(week, 'lunes'), { dia: 'lunes', atiende: true, desde: '10:30', hasta: '20:00', pausa: null })
  assert.deepEqual(dayOf(week, 'martes'), { dia: 'martes', atiende: true, desde: '10:30', hasta: '19:00', pausa: null })
  assert.deepEqual(dayOf(week, 'domingo'), { dia: 'domingo', atiende: true, desde: '12:00', hasta: '17:00', pausa: null })
})

test('a row inside the general hours keeps the barber hours, and one outside them is a day off', () => {
  const week = barberWeek(generalHours(LIVE), liveRows({
    1: { hora_inicio: '12:00:00', hora_fin: '18:00:00' },
    2: { hora_inicio: '06:00:00', hora_fin: '10:30:00' }, // ends when the shop opens: no overlap
    3: { hora_inicio: '20:00:00', hora_fin: '23:00:00' }, // starts when the shop closes
  }))
  assert.deepEqual(dayOf(week, 'lunes'), { dia: 'lunes', atiende: true, desde: '12:00', hasta: '18:00', pausa: null })
  assert.deepEqual(dayOf(week, 'martes'), { dia: 'martes', ...OFF })
  assert.deepEqual(dayOf(week, 'miércoles'), { dia: 'miércoles', ...OFF })
})

test('nobody works on a day the shop is closed, even with an active row', () => {
  const closedSunday = generalHours({ ...LIVE, horario_domingo_activo: 'false' })
  const week = barberWeek(closedSunday, liveRows({ 0: { pausa_inicio: '14:00:00', pausa_fin: '15:00:00' } }))
  assert.deepEqual(dayOf(week, 'domingo'), { dia: 'domingo', ...OFF })
  assert.equal(dayOf(week, 'sábado').atiende, true)
})

test('the pause is kept on working days, inside the hours the barber works', () => {
  const week = barberWeek(generalHours(LIVE), liveRows({
    1: { pausa_inicio: '14:00:00', pausa_fin: '15:00:00' },
    2: { pausa_inicio: '14:00:00', pausa_fin: null },                             // incomplete pause
    3: { activo: false, pausa_inicio: '14:00:00', pausa_fin: '15:00:00' },       // day off
    4: { pausa_inicio: '19:30:00', pausa_fin: '21:00:00' },                      // runs past closing
    5: { pausa_inicio: '08:00:00', pausa_fin: '09:00:00' },                      // before opening
  }))
  assert.deepEqual(dayOf(week, 'lunes'), { dia: 'lunes', atiende: true, desde: '10:30', hasta: '20:00', pausa: { desde: '14:00', hasta: '15:00' } })
  assert.equal(dayOf(week, 'martes').pausa, null)
  assert.deepEqual(dayOf(week, 'miércoles'), { dia: 'miércoles', ...OFF })
  assert.deepEqual(dayOf(week, 'jueves').pausa, { desde: '19:30', hasta: '20:00' })
  assert.equal(dayOf(week, 'viernes').pausa, null)
})

// --- Guards --------------------------------------------------------------------

test('the defaults equal the ones in the SQL function app_general_hours()', () => {
  const dir = path.join(__dirname, '../database/migrations')
  const marker = 'FUNCTION public.app_general_hours('
  // The newest migration that defines the function is the one the database runs.
  const sql = fs.readdirSync(dir).filter((name) => /^\d.*\.sql$/.test(name)).sort()
    .map((name) => fs.readFileSync(path.join(dir, name), 'utf8'))
    .filter((text) => text.includes(marker)).at(-1)
  assert.ok(sql, 'a migration defines app_general_hours()')
  const body = sql.slice(sql.indexOf(marker))
  const fn = body.slice(0, body.indexOf('$$;'))

  const open = /NULLIF\(c->>'horario_apertura',''\),'(\d\d:\d\d)'\)::time/.exec(fn)
  const close = /NULLIF\(c->>'horario_cierre',''\),'(\d\d:\d\d)'\)::time/.exec(fn)
  const step = /GREATEST\((\d+),LEAST\((\d+),COALESCE\(NULLIF\(c->>'intervalo_citas',''\),'(\d+)'\)::integer\)\)/.exec(fn)
  assert.ok(open && close && step, 'the SQL function still has the shape this guard reads')
  assert.equal(lib.DEFAULT_OPEN, open[1])
  assert.equal(lib.DEFAULT_CLOSE, close[1])
  assert.deepEqual([lib.MIN_INTERVAL, lib.MAX_INTERVAL, lib.DEFAULT_INTERVAL], [step[1], step[2], step[3]].map(Number))
  assert.deepEqual([lib.DEFAULT_OPEN, lib.DEFAULT_CLOSE, lib.DEFAULT_INTERVAL], ['10:30', '20:00', 30])

  // Same day groups and the same Sunday switch.
  assert.match(fn, /CASE p_day WHEN 0 THEN 'horario_domingo' WHEN 6 THEN 'horario_sabado' ELSE 'horario' END/)
  assert.match(fn, /p_day<>0 OR COALESCE\(c->>'horario_domingo_activo','false'\)='true'/)
  // Every key the function reads is one the helper declares, and nothing else.
  const sqlKeys = new Set(['horario', 'horario_sabado', 'horario_domingo'].flatMap((prefix) => [`${prefix}_apertura`, `${prefix}_cierre`]))
  for (const [, key] of fn.matchAll(/c->>'([a-z_]+)'/g)) sqlKeys.add(key)
  assert.deepEqual([...lib.GENERAL_HOURS_KEYS].sort(), [...sqlKeys].sort())
})

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })
}
const root = path.join(__dirname, '..')
const relative = (file) => path.relative(root, file).split(path.sep).join('/')

test('nothing reads the legacy free-text hours key', () => {
  const found = []
  for (const file of [...sourceFiles(path.join(root, 'src')), ...sourceFiles(path.join(root, 'lib'))]) {
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
      if (/horario_atencion/.test(line)) found.push(`${relative(file)}:${index + 1}`)
    })
  }
  assert.deepEqual(found, [])
})
