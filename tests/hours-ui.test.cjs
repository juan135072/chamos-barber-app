// Public screens that state the opening hours. They read the admin panel
// configuration through one hook and one helper, so a change in the panel shows
// up with no code change. Components render once with stubbed hooks; nothing
// here reads a clock, so the results are the same under any TZ.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')
const { stubModule } = require('./fake-db.cjs')
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)
const React = require('react')

const SHOP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OTHER_SHOP = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
// The panel values on 2026-11-23: Sunday open with its own hours.
const LIVE = {
  horario_apertura: '10:30', horario_cierre: '20:00',
  horario_sabado_apertura: '10:30', horario_sabado_cierre: '20:00',
  horario_domingo_apertura: '12:00', horario_domingo_cierre: '17:00', horario_domingo_activo: 'true',
  intervalo_citas: '30',
}

let tenantState = { tenant: { id: SHOP, nombre: 'Chamos Barber' }, loading: false }
let getConfiguracion = async () => []
stubModule('../src/context/TenantContext.tsx', { useTenant: () => tenantState })
stubModule('../src/lib/supabase-helpers.ts', { chamosSupabase: { getConfiguracion: () => getConfiguracion() } })
stubModule('../src/lib/app-session.ts', { async getAppSession() { return null } })
const toast = Object.assign(() => {}, { success() {}, error() {}, loading() {}, dismiss() {} })
stubModule('react-hot-toast', Object.assign(toast, { toast, default: toast }))
stubModule('../src/components/Layout.tsx', { __esModule: true, default: function Layout() { return null } })

// The real hook is loaded first; the components below get a stub of it.
const { usePublicConfig } = require('../src/hooks/usePublicConfig.ts')
let config = null
stubModule('../src/hooks/usePublicConfig.ts', { usePublicConfig: () => config })
const Footer = require('../src/components/Footer.tsx').default
const BusinessHoursText = require('../src/components/shared/BusinessHoursText.tsx').default

/**
 * Calls a function component or hook once. `state[i]` replaces the i-th
 * useState value; setter calls and effects are collected, not run.
 */
function run(fn, props, state = {}) {
  const setters = []
  const effects = []
  let index = 0
  const original = { useState: React.useState, useEffect: React.useEffect, useMemo: React.useMemo, useRef: React.useRef }
  React.useState = (initial) => {
    const i = index++
    const value = i in state ? state[i] : typeof initial === 'function' ? initial() : initial
    return [value, (next) => setters.push([i, next])]
  }
  React.useEffect = (effect) => { effects.push(effect) }
  React.useMemo = (factory) => factory()
  React.useRef = (current) => ({ current })
  try { return { result: fn(props), setters, effects } }
  finally { Object.assign(React, original) }
}

function findAll(tree, predicate, found = []) {
  if (!tree || typeof tree !== 'object') return found
  if (Array.isArray(tree)) { tree.forEach((child) => findAll(child, predicate, found)); return found }
  if (predicate(tree)) found.push(tree)
  return findAll(React.Children.toArray(tree.props?.children), predicate, found)
}

/** Text of an element tree, without rendering the components inside it. */
function text(node) {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node !== 'object') return String(node)
  if (Array.isArray(node)) return node.map(text).join('')
  return text(node.props?.children)
}

const settled = () => new Promise((resolve) => setImmediate(resolve))
const rowsFor = (comercio_id, values) => Object.entries(values).map(([clave, valor]) => ({ clave, valor, comercio_id }))

// --- usePublicConfig -----------------------------------------------------------

test('the public configuration keeps only the rows of the current shop', () => {
  tenantState = { tenant: { id: SHOP }, loading: false }
  const rows = [
    ...rowsFor(OTHER_SHOP, { horario_apertura: '06:00', horario_domingo_activo: 'false', sitio_nombre: 'Otra' }),
    ...rowsFor(SHOP, { ...LIVE, instagram_url: null }),
    ...rowsFor(null, { horario_cierre: '23:00', tiktok_url: 'https://tiktok.com/@global' }),
  ]
  assert.deepEqual(run(usePublicConfig, undefined, { 0: rows }).result, { ...LIVE, instagram_url: '' })
})

test('without a resolved shop every public row is used, as before', () => {
  tenantState = { tenant: null, loading: false }
  const rows = [...rowsFor(SHOP, { horario_apertura: '10:30' }), ...rowsFor(null, { facebook_url: 'https://facebook.com/x' })]
  assert.deepEqual(run(usePublicConfig, undefined, { 0: rows }).result, { horario_apertura: '10:30', facebook_url: 'https://facebook.com/x' })
})

test('the public configuration is unknown (null) while it or the shop is still loading', () => {
  tenantState = { tenant: { id: SHOP }, loading: false }
  assert.equal(run(usePublicConfig).result, null)
  tenantState = { tenant: null, loading: true }
  assert.equal(run(usePublicConfig, undefined, { 0: rowsFor(SHOP, LIVE) }).result, null)
})

test('the hook reads the configuration once per mount and stores the rows', async () => {
  tenantState = { tenant: { id: SHOP }, loading: false }
  const rows = rowsFor(SHOP, LIVE)
  let reads = 0
  getConfiguracion = async () => { reads++; return rows }
  const { effects, setters } = run(usePublicConfig)
  assert.equal(effects.length, 1)
  effects[0]()
  await settled()
  assert.equal(reads, 1)
  assert.deepEqual(setters, [[0, rows]])
})

test('a failed read leaves the configuration unknown', async (t) => {
  t.mock.method(console, 'error', () => {})
  for (const failing of [async () => { throw new Error('offline') }, async () => null]) {
    getConfiguracion = failing
    const { effects, setters } = run(usePublicConfig)
    effects[0]()
    await settled()
    assert.deepEqual(setters.filter(([, value]) => value !== null), [], 'no rows are stored')
  }
})

test('an answer that arrives after the component is gone is ignored', async () => {
  let answer
  getConfiguracion = () => new Promise((resolve) => { answer = resolve })
  const { effects, setters } = run(usePublicConfig)
  const cleanup = effects[0]()
  cleanup()
  answer(rowsFor(SHOP, LIVE))
  await settled()
  assert.deepEqual(setters, [])
})

// --- Footer ----------------------------------------------------------------------

const DAY_LABELS = ['Lun — Vie', 'Sábado', 'Domingo']
/** [label, value] of the three rows under "Horarios del Estudio". */
function footerHours() {
  const { result } = run(Footer, {})
  return findAll(result, (node) => node.type === 'li')
    .map((li) => React.Children.toArray(li.props.children).map(text))
    .filter(([label]) => DAY_LABELS.includes(label))
}
const footerLinks = () => findAll(run(Footer, {}).result, (node) => node.type === 'a' && node.props.title).map((a) => [a.props.title, a.props.href])

test('the footer shows the hours configured in the panel', () => {
  config = LIVE
  assert.deepEqual(footerHours(), [['Lun — Vie', '10:30 — 20:00'], ['Sábado', '10:30 — 20:00'], ['Domingo', '12:00 — 17:00']])
})

test('a change in the panel changes the footer with no code change', () => {
  config = { ...LIVE, horario_cierre: '21:00', horario_sabado_apertura: '', horario_domingo_activo: 'false' }
  assert.deepEqual(footerHours(), [['Lun — Vie', '10:30 — 21:00'], ['Sábado', '10:30 — 20:00'], ['Domingo', 'Cerrado']])
  config = { horario_apertura: '09:00', horario_cierre: '18:30', horario_domingo_activo: 'true' }
  assert.deepEqual(footerHours(), [['Lun — Vie', '09:00 — 18:30'], ['Sábado', '09:00 — 18:30'], ['Domingo', '09:00 — 18:30']])
})

test('while the hours are unknown the footer shows a dash, never "Cerrado"', () => {
  config = null
  assert.deepEqual(footerHours(), [['Lun — Vie', '—'], ['Sábado', '—'], ['Domingo', '—']])
  const page = text(run(Footer, {}).result)
  assert.doesNotMatch(page, /cerrado|cargando/i)
})

test('the footer social links still come from the configuration', () => {
  config = { ...LIVE, facebook_url: 'https://facebook.com/panel', instagram_url: 'https://instagram.com/panel', tiktok_url: 'https://tiktok.com/@panel' }
  assert.deepEqual(footerLinks(), [['Facebook', 'https://facebook.com/panel'], ['Instagram', 'https://instagram.com/panel'], ['TikTok', 'https://tiktok.com/@panel']])
  // Not configured or still unknown: the built-in Facebook and Instagram links, and no TikTok.
  const builtIn = [['Facebook', 'https://web.facebook.com/people/Chamos-Barberia/61553216854694/'], ['Instagram', 'https://www.instagram.com/chamosbarber_shop/?hl=es-la']]
  for (const value of [LIVE, { ...LIVE, facebook_url: '', tiktok_url: '' }, null]) {
    config = value
    assert.deepEqual(footerLinks(), builtIn)
  }
})

// --- /consultar ------------------------------------------------------------------

test('BusinessHoursText prints the hours configured in the panel', () => {
  config = LIVE
  assert.equal(text(run(BusinessHoursText, {}).result), 'Horario de atención: Lunes a viernes 10:30 - 20:00 | Sábado 10:30 - 20:00 | Domingo 12:00 - 17:00')
  config = { ...LIVE, horario_cierre: '21:00', horario_domingo_activo: 'false' }
  assert.equal(text(run(BusinessHoursText, {}).result), 'Horario de atención: Lunes a viernes 10:30 - 21:00 | Sábado 10:30 - 20:00 | Domingo cerrado')
})

test('BusinessHoursText shows a dash while the hours are unknown, never "cerrado"', () => {
  config = null
  assert.equal(text(run(BusinessHoursText, {}).result), 'Horario de atención: —')
})

test('the help block of /consultar prints the hours through BusinessHoursText', () => {
  config = LIVE
  const ConsultarPage = require('../src/pages/consultar.tsx').default
  // The help block shows once a search found bookings; a finished one keeps the test independent of today.
  const cita = { id: 'c1', servicio_nombre: 'Corte', barbero_nombre: 'Carlos', fecha: '2020-01-06', hora: '11:00:00', estado: 'completada', precio: 10000 }
  // useState order: telefono, citas, totalCitas, citasPendientes, loading, searched
  const { result } = run(ConsultarPage, {}, { 1: [cita], 5: true })
  const help = findAll(result, (node) => node.type === 'p' && findAll(node, (child) => child.type === BusinessHoursText).length > 0)
  assert.equal(help.length, 1, 'one paragraph renders <BusinessHoursText />')
  assert.doesNotMatch(text(result), /\d{1,2}:\d{2} - \d{1,2}:\d{2}|Domingo Cerrado/, 'the page itself states no hours')
})

// Guard: a written-out range ("10:00 - 20:30", "10:30 a 20:00", "9:00 — 18:00")
// is a copy of the hours that goes stale when the owner edits the panel.
test('no page or public component hardcodes an hours range', () => {
  const RANGE = /\b\d{1,2}:\d{2}\s*(?:-|–|—|a|hasta)\s*\d{1,2}:\d{2}\b/
  const root = path.join(__dirname, '..')
  const sourceFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })
  const found = []
  for (const file of [...sourceFiles(path.join(root, 'src/pages')), ...sourceFiles(path.join(root, 'src/components'))]) {
    const name = path.relative(root, file).split(path.sep).join('/')
    if (name.startsWith('src/components/admin/')) continue
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
      if (/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(line)) return // comments may give examples
      if (RANGE.test(line)) found.push(`${name}:${index + 1} use the hours helper (src/lib/business-hours.ts)`)
    })
  }
  assert.deepEqual(found, [])
})

// --- Admin settings tab (its default values now come from the helper) ---------------

test('the settings tab still pre-fills Saturday and Sunday from the weekday hours or the defaults', async () => {
  const ConfiguracionTab = require('../src/components/admin/tabs/ConfiguracionTab.tsx').default
  // useState order: loading, saving, config
  const loaded = async (values) => {
    getConfiguracion = async () => rowsFor(SHOP, values)
    const { effects, setters } = run(ConfiguracionTab, {})
    effects.forEach((effect) => effect())
    await settled()
    return setters.find(([i]) => i === 2)[1]
  }
  assert.deepEqual(await loaded({ horario_apertura: '09:00', horario_cierre: '19:00', horario_sabado_cierre: '14:00' }), {
    horario_apertura: '09:00', horario_cierre: '19:00',
    horario_sabado_apertura: '09:00', horario_sabado_cierre: '14:00',
    horario_domingo_apertura: '09:00', horario_domingo_cierre: '19:00', horario_domingo_activo: 'false',
  })
  assert.deepEqual(await loaded({}), {
    horario_sabado_apertura: '10:30', horario_sabado_cierre: '20:00',
    horario_domingo_apertura: '10:30', horario_domingo_cierre: '20:00', horario_domingo_activo: 'false',
  })
})
