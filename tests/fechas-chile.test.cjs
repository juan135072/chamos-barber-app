// Chile dates: every helper must give the same answer whatever the process
// time zone is (npm test runs under TZ=UTC and TZ=America/Santiago).
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { stubModule } = require('./fake-db.cjs')
const {
  getChileHoy, getDynamicHoy, getDynamicHora, fechaEnZona, horaEnZona, chileDateRange,
  parseFechaSolo, formatFechaSolo, formatFechaSoloNumerica, formatInstante, formatFechaChile,
  addDays, inicioDeMes, finDeMes, lunesDeSemana, horaMasMinutos, instanteDesdeHoraLocal,
} = require('../src/lib/date-utils.ts')

const at = (iso) => new Date(iso)

test('the reported POS case: a cita stored for 2026-11-23 shows 23 nov, not 22', () => {
  assert.equal(formatFechaSolo('2026-11-23'), '23 nov')
  assert.equal(`${formatFechaSolo('2026-11-23')} - 18:00:00`, '23 nov - 18:00:00')
  assert.equal(formatFechaSoloNumerica('2026-11-23'), '23/11/2026')
  assert.equal(formatFechaSolo('2026-11-23', { weekday: 'long', day: 'numeric', month: 'long' }), 'lunes, 23 de noviembre')
  assert.equal(formatFechaSolo('2026-11-23', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), 'lunes, 23 de noviembre de 2026')
  assert.equal(formatFechaSolo('2026-11-01', { day: '2-digit', month: '2-digit', year: 'numeric' }), '01-11-2026')
  assert.equal(formatFechaChile('2026-11-23'), 'lunes, 23 de noviembre de 2026')
})

test('date-only parsing rejects anything that is not a real calendar date', () => {
  assert.deepEqual(parseFechaSolo('2026-11-23'), { year: 2026, month: 11, day: 23 })
  for (const value of ['2026-02-30', '2026-13-01', '23/11/2026', '2026-11-23T18:00:00Z', '', null, undefined, 20261123]) {
    assert.equal(parseFechaSolo(value), null, String(value))
  }
  assert.equal(formatFechaSolo(null), '')
  assert.equal(formatFechaSolo('pendiente'), 'pendiente')
  assert.equal(formatFechaSoloNumerica(undefined), '')
})

// [UTC instant, Chile date, Chile time]
const TODAY_CASES = [
  ['2026-11-23T15:00:00Z', '2026-11-23', '12:00', 'midday'],
  ['2026-11-24T00:30:00Z', '2026-11-23', '21:30', '21:30 (UTC is already the 24th)'],
  ['2026-11-24T02:59:00Z', '2026-11-23', '23:59', '23:59 (UTC is already the 24th)'],
  ['2026-11-24T03:30:00Z', '2026-11-24', '00:30', '00:30 of the next day'],
  ['2026-07-16T00:30:00Z', '2026-07-15', '20:30', 'winter 20:30 (UTC-4)'],
  ['2026-04-05T02:30:00Z', '2026-04-04', '23:30', 'April DST change, first 23:30'],
  ['2026-04-05T03:30:00Z', '2026-04-04', '23:30', 'April DST change, repeated 23:30'],
  ['2026-04-05T04:30:00Z', '2026-04-05', '00:30', 'April DST change, after midnight'],
  ['2026-09-06T03:59:00Z', '2026-09-05', '23:59', 'September DST change, last minute of the 5th'],
  ['2026-09-06T04:00:00Z', '2026-09-06', '01:00', 'September DST change, clocks jump to 01:00'],
]
for (const [iso, fecha, hora, label] of TODAY_CASES) {
  test(`today and time in Chile at ${label}`, () => {
    assert.equal(getChileHoy(at(iso)), fecha)
    assert.equal(getDynamicHoy('America/Santiago', at(iso)), fecha)
    assert.equal(getDynamicHora('America/Santiago', at(iso)), hora)
    assert.equal(fechaEnZona(iso), fecha)
    assert.equal(horaEnZona(iso), hora)
  })
}

test('a sale at 21:30 Chile belongs to that Chile day, not to the UTC date', () => {
  const createdAt = '2026-11-24T00:30:00+00:00'
  assert.equal(fechaEnZona(createdAt), '2026-11-23')
  const day = chileDateRange('2026-11-23', '2026-11-23')
  assert.ok(Date.parse(createdAt) >= Date.parse(day.start) && Date.parse(createdAt) < Date.parse(day.end))
  assert.deepEqual(day, { start: '2026-11-23T03:00:00.000Z', end: '2026-11-24T03:00:00.000Z' })
})

test('timestamps are formatted in Chile time whatever the device zone', () => {
  assert.equal(formatInstante('2026-11-24T00:30:00Z', { day: 'numeric', month: 'short' }), '23 nov')
  assert.equal(formatInstante('2026-11-24T00:30:00Z', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }), '21:30')
  assert.equal(formatInstante('2026-07-16T00:30:00Z', { year: 'numeric', month: 'long', day: 'numeric' }), '15 de julio de 2026')
})

test('calendar arithmetic on YYYY-MM-DD values', () => {
  assert.equal(addDays('2026-11-23', -1), '2026-11-22')
  assert.equal(addDays('2026-11-30', 1), '2026-12-01')
  assert.equal(addDays('2026-11-23', -7), '2026-11-16')
  assert.equal(addDays('2026-04-04', 1), '2026-04-05')
  assert.equal(addDays('2026-09-05', 1), '2026-09-06')
  assert.equal(inicioDeMes('2026-12-01'), '2026-12-01')
  assert.equal(inicioDeMes('2026-11-23'), '2026-11-01')
  assert.equal(finDeMes('2026-11-23'), '2026-11-30')
  assert.equal(finDeMes('2026-02-10'), '2026-02-28')
  assert.equal(finDeMes('2028-02-01'), '2028-02-29')
  assert.equal(finDeMes('2026-12-31'), '2026-12-31')
  assert.equal(lunesDeSemana('2026-11-23'), '2026-11-23') // lunes
  assert.equal(lunesDeSemana('2026-11-24'), '2026-11-23')
  assert.equal(lunesDeSemana('2026-11-29'), '2026-11-23') // domingo
  assert.equal(lunesDeSemana('2026-12-02'), '2026-11-30')
  assert.equal(horaMasMinutos('18:00', 30), '18:30')
  assert.equal(horaMasMinutos('18:00:00', 45), '18:45')
  assert.equal(horaMasMinutos('23:45', 30), '00:15')
})

test('weekly POS range at Monday 21:30 Chile starts that Monday, not Tuesday', () => {
  const hoy = getChileHoy(at('2026-11-24T00:30:00Z'))
  assert.deepEqual([lunesDeSemana(hoy), hoy], ['2026-11-23', '2026-11-23'])
})

test('"Últimos 7 días" and "Ayer" at 21:30 Chile stay on the Chile calendar', () => {
  const hoy = getChileHoy(at('2026-11-24T00:30:00Z'))
  assert.deepEqual([addDays(hoy, -7), hoy], ['2026-11-16', '2026-11-23'])
  assert.equal(addDays(hoy, -1), '2026-11-22')
})

test('month filters on the 1st keep that month', () => {
  const hoy = getChileHoy(at('2026-12-01T13:00:00Z'))
  assert.deepEqual([inicioDeMes(hoy), finDeMes(hoy)], ['2026-12-01', '2026-12-31'])
})

// [fecha, hora, expected UTC instant]
const WALL_CASES = [
  ['2026-11-23', '18:00', '2026-11-23T21:00:00.000Z', 'summer'],
  ['2026-11-23', '18:00:00', '2026-11-23T21:00:00.000Z', 'summer with seconds'],
  ['2026-11-23', '22:00', '2026-11-24T01:00:00.000Z', 'late evening'],
  ['2026-07-15', '18:00', '2026-07-15T22:00:00.000Z', 'winter'],
  ['2026-04-04', '23:30', '2026-04-05T02:30:00.000Z', 'repeated hour takes the first occurrence'],
  ['2026-04-05', '00:30', '2026-04-05T04:30:00.000Z', 'after the April change'],
  ['2026-09-06', '00:30', '2026-09-06T04:30:00.000Z', 'skipped hour moves forward to 01:30'],
  ['2026-09-06', '09:00', '2026-09-06T12:00:00.000Z', 'September change day morning'],
]
for (const [fecha, hora, iso, label] of WALL_CASES) {
  test(`Chile wall time ${fecha} ${hora} is ${iso} (${label})`, () => {
    assert.equal(instanteDesdeHoraLocal(fecha, hora).toISOString(), iso)
  })
}

test('wall time round-trips through the block form fields', () => {
  for (const [fecha, hora] of [['2026-11-23', '22:00'], ['2026-07-15', '09:00'], ['2026-11-23', '00:00'], ['2026-11-23', '23:59']]) {
    const iso = instanteDesdeHoraLocal(fecha, hora).toISOString()
    assert.deepEqual([fechaEnZona(iso), horaEnZona(iso)], [fecha, hora])
  }
  assert.equal(instanteDesdeHoraLocal('2026-11-23', '25:00'), null)
  assert.equal(instanteDesdeHoraLocal('2026-02-30', '10:00'), null)
})

test('a full Chile day block starts at local midnight in UTC terms', () => {
  assert.equal(instanteDesdeHoraLocal('2026-11-23', '00:00').toISOString(), chileDateRange('2026-11-23', '2026-11-23').start)
  assert.equal(instanteDesdeHoraLocal('2026-07-15', '00:00').toISOString(), chileDateRange('2026-07-15', '2026-07-15').start)
})

test('liquidation dates: DATE columns keep their day, timestamps show the Chile day', () => {
  stubModule('../src/lib/supabase.ts', { supabase: {} })
  const { formatFecha, formatFechaCorta } = require('../src/lib/supabase-liquidaciones.ts')
  assert.equal(formatFecha('2026-11-01'), '1 de noviembre de 2026')
  assert.equal(formatFecha('2026-11-30'), '30 de noviembre de 2026')
  assert.equal(formatFechaCorta('2026-11-01'), '01-11-2026')
  assert.equal(formatFecha('2026-11-24T00:30:00+00:00'), '23 de noviembre de 2026')
})

// Guard: the patterns that caused the bug must not come back. Each one turns a
// UTC instant or UTC midnight into the wrong Chile day.
const FORBIDDEN = [
  [/toISOString\(\)\.split\(['"]T['"]\)/, 'UTC date of an instant: use getChileHoy()/fechaEnZona()'],
  [/new Date\(\s*[\w.?!]+\.(fecha|fecha_inicio|fecha_fin|ultima_cita|ultima_liquidacion_fecha)\s*\)/, 'DATE column parsed as UTC midnight: use formatFechaSolo()'],
  [/created_at\.split\(/, 'UTC date of created_at: use fechaEnZona()'],
  [/T23:59:59/, 'offset-less end of day: use chileDateRange()'],
  [/new Date\(`\$\{[^}]+\}T\$\{/, 'Chile wall time parsed in the runtime zone: use instanteDesdeHoraLocal()'],
]
function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(full)
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })
}
test('no UTC-day date handling is left in src/ and lib/', () => {
  const root = path.join(__dirname, '..')
  const found = []
  for (const file of [...sourceFiles(path.join(root, 'src')), ...sourceFiles(path.join(root, 'lib'))]) {
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
      if (/^\s*(\*|\/\/)/.test(line)) return // comments may name the patterns
      for (const [pattern, hint] of FORBIDDEN) {
        if (pattern.test(line)) found.push(`${path.relative(root, file)}:${index + 1} ${hint}`)
      }
    })
  }
  assert.deepEqual(found, [])
})
