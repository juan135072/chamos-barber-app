// Callers that used to read "no session came back" as "signed out": the
// permission hook behind the POS page and the settings save in the admin panel.
// A session check that gets no answer (a slow link that reaches the limit of
// the restore, a 503, no network) must never look like a sign-out to them.
// The real hook, the real settings tab and the real shared restore
// (src/lib/app-session.ts) run here; only fetch, React's hook primitives and
// the clock are faked.
require('./load-typescript.cjs')
const test = require('node:test')
const { mock } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const React = require('react')
const { stubModule } = require('./fake-db.cjs')
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)

global.window = {}
// In-memory token manager of the SDK, as app-session.ts reads and fills it.
let native = null
const redirects = []
const toasts = []
const token = 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.signature'
const SESSION = { user: { id: 'user-1', email: 'caja@chamos.test' }, access_token: token }
const STAFF = { id: 'user-1', email: 'caja@chamos.test', nombre: 'Caja', rol: 'cajero', activo: true }

stubModule('../src/lib/supabase.ts', {
  supabase: { _insforge: { tokenManager: { getSession: () => native, saveSession: (value) => { native = value } } } },
  tienePermiso: () => true,
  puedeAccederPOS: (usuario) => !!usuario,
  puedeAccederAdmin: (usuario) => usuario?.rol === 'admin',
  puedeAnularFacturas: () => false,
  puedeCerrarCaja: () => true,
  puedeVerReportes: () => false,
  puedeEditarConfiguracion: () => false,
  puedeAccederRuta: (usuario) => !!usuario,
  getRutaPorDefecto: () => '/pos',
})
stubModule('next/router', { useRouter: () => ({ push: (path) => redirects.push(path) }) })
const toast = { success: (message) => toasts.push(['success', message]), error: (message) => toasts.push(['error', message]) }
stubModule('react-hot-toast', Object.assign(toast, { default: toast }))
stubModule('../src/lib/supabase-helpers.ts', { chamosSupabase: { getConfiguracion: async () => [] } })

// Scripted server, on mocked time (ms).
let clock = 0
let respond = null // (request) => void: how /api/auth/session answers
let accessAnswer = null
let sessionRequests = []
let accessRequests = []
let saves = []
const json = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body })
const aborted = () => Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
global.fetch = (url, options = {}) => {
  if (url === '/api/auth/session') {
    return new Promise((resolve, reject) => {
      const request = { at: clock, aborted: false, resolve, reject }
      sessionRequests.push(request)
      options.signal?.addEventListener('abort', () => { request.aborted = true; request.onAbort?.() })
      respond(request)
    })
  }
  if (url === '/api/auth/access') {
    accessRequests.push(options.headers?.Authorization ?? null)
    return Promise.resolve(accessAnswer())
  }
  if (url === '/api/admin/configuracion') {
    saves.push({ at: clock, method: options.method, authorization: options.headers.Authorization ?? null, body: JSON.parse(options.body) })
    return Promise.resolve(json(200, { success: true }))
  }
  throw new Error(`unexpected request ${url}`)
}
// Answers after `ms`; like a real fetch, an abort rejects it.
const answersAfter = (ms, status, body) => (request) => {
  const timer = setTimeout(() => request.resolve(json(status, body)), ms)
  request.onAbort = () => { clearTimeout(timer); request.reject(aborted()) }
}
const answers = (status, body) => (request) => request.resolve(json(status, body))
const offline = (request) => request.reject(new TypeError('Failed to fetch'))

const { usePermissions } = require('../src/hooks/usePermissions.ts')
const ConfiguracionTab = require('../src/components/admin/tabs/ConfiguracionTab.tsx').default
const { checkAppSession } = require('../src/lib/app-session.ts')
const flush = () => new Promise((resolve) => setImmediate(resolve))

async function advanceTo(time) {
  await flush()
  while (clock < time) {
    clock += 250
    mock.timers.tick(250)
    await flush()
  }
}

function mountPermissions() {
  const states = []
  let cleanups = []
  let mounted = false
  const render = () => {
    let s = 0
    const effects = []
    const saved = { useState: React.useState, useEffect: React.useEffect }
    React.useState = (initial) => {
      const i = s++
      if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial
      return [states[i], (next) => { states[i] = typeof next === 'function' ? next(states[i]) : next }]
    }
    React.useEffect = (fn) => { effects.push(fn) }
    let value
    try { value = usePermissions() } finally { Object.assign(React, saved) }
    // The hook's only effect has [] deps: it runs on mount.
    if (!mounted) {
      mounted = true
      cleanups = effects.map((fn) => fn())
    }
    return value
  }
  render()
  return { render, unmount: () => cleanups.forEach((fn) => fn?.()) }
}

/** What the POS page does with the hook: redirect only once loading ended without a user. */
function protect(hook) {
  const state = hook.render()
  state.protegerRuta('/pos')
  return state
}

const CONFIG = {
  sitio_nombre: 'Chamos Barber', horario_apertura: '10:30', horario_cierre: '20:00',
  horario_sabado_apertura: '10:30', horario_sabado_cierre: '20:00',
  horario_domingo_apertura: '12:00', horario_domingo_cierre: '17:00', horario_domingo_activo: 'true',
  intervalo_citas: '30', sitio_timezone: 'America/Santiago',
}

/** Renders the loaded settings tab once and clicks "Guardar Cambios". */
function clickSave() {
  // useState order: loading, saving, config
  const state = [false, false, CONFIG]
  let index = 0
  const saved = { useState: React.useState, useEffect: React.useEffect }
  React.useState = (initial) => { const i = index++; return [i in state ? state[i] : initial, () => {}] }
  React.useEffect = () => {}
  let tree
  try { tree = ConfiguracionTab({}) } finally { Object.assign(React, saved) }
  const find = (node) => {
    if (!node || typeof node !== 'object') return null
    if (node.type === 'button' && node.props.onClick?.name === 'handleSave') return node
    return React.Children.toArray(node.props?.children).map(find).find(Boolean) || null
  }
  return find(tree).props.onClick()
}

function scenario(run) {
  return async () => {
    // The shared restore keeps its limit between checks: start every scenario from a definitive answer.
    native = null
    respond = answers(200, { session: null })
    assert.deepEqual(await checkAppSession(), { status: 'signed-out' })

    clock = 0
    sessionRequests = []
    accessRequests = []
    saves = []
    redirects.length = 0
    toasts.length = 0
    accessAnswer = () => json(200, { user: STAFF, accessSource: 'direct' })
    mock.timers.enable({ apis: ['setTimeout'] })
    const real = { warn: console.warn, error: console.error }
    const logged = []
    console.warn = (...args) => logged.push(args)
    console.error = (...args) => logged.push(args)
    const hooks = []
    try {
      await run({ logged, mount: () => { const hook = mountPermissions(); hooks.push(hook); return hook } })
    } finally {
      hooks.forEach((hook) => hook.unmount())
      // Let a restore that is still in flight reach its limit: its state is shared by the whole module.
      respond = answers(200, { session: null })
      for (let i = 0; i < 4; i++) { mock.timers.tick(100000); await flush() }
      mock.timers.reset()
      Object.assign(console, real)
    }
  }
}

// --- usePermissions (the POS page redirects when it ends loading without a user) ---

test('a session restore that needs 30 s keeps the POS loading and then loads the user, with no redirect', scenario(async ({ mount }) => {
  respond = answersAfter(30000, 200, { session: SESSION })
  const hook = mount()
  // The first request reaches its 20 s limit; the retry 3 s later gets 40 s and is answered at 53 s.
  for (const time of [19000, 21000, 30000, 52000]) {
    await advanceTo(time)
    const state = protect(hook)
    assert.equal(state.cargando, true, `still loading at ${time} ms`)
    assert.equal(state.usuario, null)
    assert.deepEqual(redirects, [], `no redirect at ${time} ms`)
  }
  await advanceTo(54000)
  const state = protect(hook)
  assert.equal(state.cargando, false)
  assert.deepEqual(state.usuario, STAFF)
  assert.equal(state.puedeAccederPOS(), true)
  assert.deepEqual(redirects, [])
  assert.deepEqual(sessionRequests.map((request) => [request.at, request.aborted]), [[0, true], [23000, false]])
  assert.deepEqual(accessRequests, [`Bearer ${token}`])
}))

test('a server that cannot be reached is not a sign-out: the hook keeps loading and retries at 3, 6, 12, 24 and 30 s', scenario(async ({ mount }) => {
  respond = answers(503, { error: 'No se pudo verificar la sesión' })
  const hook = mount()
  await advanceTo(22000)
  assert.deepEqual(sessionRequests.map((request) => request.at), [0, 3000, 9000, 21000])
  assert.equal(protect(hook).cargando, true)
  assert.deepEqual(redirects, [])

  respond = offline
  await advanceTo(46000)
  assert.deepEqual(sessionRequests.map((request) => request.at), [0, 3000, 9000, 21000, 45000])
  assert.equal(protect(hook).cargando, true)
  assert.deepEqual([redirects, accessRequests], [[], []])

  // The server is back: the next retry loads the user.
  respond = answers(200, { session: SESSION })
  await advanceTo(76000)
  assert.deepEqual(sessionRequests.map((request) => request.at), [0, 3000, 9000, 21000, 45000, 75000])
  const state = protect(hook)
  assert.deepEqual([state.cargando, state.usuario], [false, STAFF])
  assert.deepEqual(redirects, [])
  // Nothing else is scheduled once the user is loaded.
  await advanceTo(300000)
  assert.equal(sessionRequests.length, 6)
}))

test('a definitive "signed out" still ends loading and sends the user to the login', scenario(async ({ mount }) => {
  for (const answer of [answers(200, { session: null }), answers(401, { error: 'Unauthorized' })]) {
    redirects.length = 0
    respond = answer
    const hook = mount()
    await advanceTo(clock + 250)
    const state = protect(hook)
    assert.deepEqual([state.cargando, state.usuario], [false, null])
    assert.deepEqual(redirects, ['/chamos-acceso'])
    assert.deepEqual(accessRequests, [], 'no access check without a session')
  }
}))

test('a restored session loads the user at once, as before', scenario(async ({ mount }) => {
  respond = answers(200, { session: SESSION })
  const hook = mount()
  assert.equal(hook.render().cargando, true)
  await advanceTo(250)
  const state = protect(hook)
  assert.deepEqual([state.cargando, state.usuario, state.esCajero, state.estaActivo], [false, STAFF, true, true])
  assert.deepEqual(redirects, [])
  assert.deepEqual(accessRequests, [`Bearer ${token}`])
  assert.equal(sessionRequests.length, 1)
}))

test('an access check that fails after the session was restored still ends loading without a user', scenario(async ({ mount, logged }) => {
  respond = answers(200, { session: SESSION })
  accessAnswer = () => json(403, { code: 'ACCESS_INACTIVE', message: 'La cuenta está desactivada.' })
  const hook = mount()
  await advanceTo(250)
  const state = protect(hook)
  assert.deepEqual([state.cargando, state.usuario], [false, null])
  assert.deepEqual(redirects, ['/chamos-acceso'])
  assert.ok(JSON.stringify(logged).includes('ACCESS_INACTIVE'), 'the failed access check is logged')
}))

test('leaving the screen stops the retries', scenario(async ({ mount }) => {
  respond = answers(503, { error: 'No se pudo verificar la sesión' })
  const hook = mount()
  await advanceTo(4000)
  assert.equal(sessionRequests.length, 2)
  hook.unmount()
  await advanceTo(120000)
  assert.equal(sessionRequests.length, 2)
  assert.deepEqual(redirects, [])
}))

// --- Settings save (ConfiguracionTab) ---

test('saving the settings when the session check gets no answer still saves, and never asks to log in again', scenario(async () => {
  // A restore that needs 30 s is given up on at its 20 s limit.
  respond = answersAfter(30000, 200, { session: SESSION })
  let saving = clickSave()
  await advanceTo(21000)
  await saving
  // The request goes out with the session cookies; the server decides.
  assert.deepEqual(saves.map(({ at, method, authorization }) => [at, method, authorization]), [[20000, 'PUT', null]])
  assert.deepEqual([saves[0].body.sitio_nombre, saves[0].body.horario_cierre, saves[0].body.sitio_timezone], ['Chamos Barber', '20:00', 'America/Santiago'])
  assert.deepEqual(toasts, [['success', 'Configuración guardada exitosamente']])

  // The same when the server answers 503, or there is no answer at all.
  for (const answer of [answers(503, { error: 'No se pudo verificar la sesión' }), offline]) {
    saves = []
    toasts.length = 0
    respond = answer
    saving = clickSave()
    await advanceTo(clock + 250)
    await saving
    assert.deepEqual(saves.map(({ method, authorization }) => [method, authorization]), [['PUT', null]])
    assert.deepEqual(toasts, [['success', 'Configuración guardada exitosamente']])
  }
}))

test('a definitive "signed out" still asks to log in again and sends nothing', scenario(async () => {
  respond = answers(200, { session: null })
  const saving = clickSave()
  await advanceTo(250)
  await saving
  assert.deepEqual(saves, [])
  assert.deepEqual(toasts, [['error', 'Inicia sesión nuevamente']])
}))

test('with a restored session the save sends its bearer, as before', scenario(async () => {
  respond = answers(200, { session: SESSION })
  const saving = clickSave()
  await advanceTo(250)
  await saving
  assert.deepEqual(saves.map(({ method, authorization }) => [method, authorization]), [['PUT', `Bearer ${token}`]])
  assert.deepEqual(toasts, [['success', 'Configuración guardada exitosamente']])
}))
