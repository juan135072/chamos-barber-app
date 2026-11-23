// Admin barber screens: the create/edit modal and the barber list. Components
// render once with stubbed hooks; server calls go through stubbed fetch and
// chamosSupabase helpers, and browser writes to the database are recorded.
require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const { stubModule } = require('./fake-db.cjs')
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)
const React = require('react')

const browser = { writes: [], getUser: 0 }
stubModule('../src/lib/supabase.ts', {
  supabase: {
    from(table) { browser.writes.push(table); return { insert: async () => ({ error: null }), update: () => ({ eq: async () => ({ error: null }) }) } },
    auth: { async getUser() { browser.getUser++; return { data: { user: { id: 'admin' } } } } },
  },
})
let helpers = {}
stubModule('../src/lib/supabase-helpers.ts', { chamosSupabase: new Proxy({}, { get: (_, name) => helpers[name] }) })
const toasts = []
const toast = Object.assign((m) => toasts.push(['toast', m]), { success: (m) => toasts.push(['success', m]), error: (m) => toasts.push(['error', m]), loading() {}, dismiss() {} })
stubModule('react-hot-toast', Object.assign(toast, { toast, default: toast }))
let formValues = {}
stubModule('react-hook-form', {
  useForm: () => ({ register: () => ({}), handleSubmit: (fn) => () => fn(formValues), formState: { errors: {} }, reset() {}, watch: (name) => formValues[name] }),
})
stubModule('@hookform/resolvers/zod', { zodResolver: () => undefined })
let barberosHook = { barberos: [], loading: false, error: null, refetch: async () => {} }
stubModule('../src/hooks/useBarberos.ts', { useBarberos: () => barberosHook })

const { default: BarberoModal, CredencialesModal } = require('../src/components/admin/modals/BarberoModal.tsx')
const BarberosTab = require('../src/components/admin/tabs/BarberosTab.tsx').default

/** Renders a function component once. `overrides[i]` replaces the i-th useState value. */
function render(Component, props, overrides = {}) {
  const setters = []
  let index = 0
  const originalState = React.useState, originalEffect = React.useEffect, originalRef = React.useRef
  React.useState = (initial) => {
    const i = index++
    const value = i in overrides ? overrides[i] : typeof initial === 'function' ? initial() : initial
    return [value, (next) => setters.push([i, next])]
  }
  React.useEffect = () => {}
  React.useRef = (current) => ({ current })
  try { return { tree: Component(props), setters } }
  finally { React.useState = originalState; React.useEffect = originalEffect; React.useRef = originalRef }
}

function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null
  if (Array.isArray(tree)) return tree.map((child) => find(child, predicate)).find(Boolean) || null
  if (predicate(tree)) return tree
  return find(React.Children.toArray(tree.props?.children), predicate)
}

function reset() {
  browser.writes = []; browser.getUser = 0; toasts.length = 0; helpers = {}
}

function respond(status, body) {
  const sent = []
  global.fetch = async (url, options) => { sent.push({ url, body: JSON.parse(options.body) }); return { ok: status < 400, status, json: async () => body } }
  return sent
}

const datos = { nombre: 'Ana', apellido: 'Pérez', email: 'Ana@Chamos.test', telefono: '', descripcion: '', instagram: '', imagen_url: '', porcentaje_comision: 50, activo: true }
const modalProps = { isOpen: true, onClose() {}, onSuccess() {}, barbero: null }
// BarberoModal useState order: loading, crearCuenta, credenciales, especialidades, ...
const CREAR_CUENTA = 1, CREDENCIALES = 2

async function submit(props, overrides = {}) {
  const { tree, setters } = render(BarberoModal, props, overrides)
  await find(tree, (n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
  return setters
}

test('creating with an account asks the server only, and shows the credentials it created', async () => {
  reset(); formValues = datos
  const sent = respond(200, { success: true, cuenta_creada: true, email: 'ana@chamos.test', password: 'Chamosabcdefgh!1234', email_enviado: true })
  const setters = await submit(modalProps)
  assert.equal(browser.getUser, 0, 'no browser getUser precheck')
  assert.deepEqual(browser.writes, [])
  assert.equal(sent.length, 1)
  assert.equal(sent[0].url, '/api/barberos/crear-con-cuenta')
  assert.equal(sent[0].body.crearCuenta, true)
  assert.equal(sent[0].body.adminId, undefined)
  assert.deepEqual(setters.filter(([i]) => i === CREDENCIALES).map(([, v]) => v), [{ email: 'ana@chamos.test', password: 'Chamosabcdefgh!1234', emailEnviado: true }])
  assert.ok(toasts.some(([kind]) => kind === 'success'))
})

test('a failed account shows the server error and never the credentials', async () => {
  for (const [status, body, message] of [
    [409, { error: 'Ese email ya lo usa otra cuenta de acceso. Usa otro email.' }, 'Ese email ya lo usa otra cuenta de acceso. Usa otro email.'],
    [200, { success: true, cuenta_creada: false, password: 'Chamosabcdefgh!1234' }, 'No se pudo crear la cuenta de acceso'],
  ]) {
    reset(); formValues = datos
    respond(status, body)
    const setters = await submit(modalProps)
    assert.deepEqual(setters.filter(([i]) => i === CREDENCIALES), [], 'no credentials shown')
    assert.deepEqual(toasts.filter(([kind]) => kind === 'error').map(([, m]) => m), [message])
    assert.ok(!toasts.some(([kind]) => kind === 'success'))
  }
})

test('creating without an account goes through /api/barberos/create, not a browser insert', async () => {
  reset(); formValues = datos
  const created = []
  helpers.createBarbero = async (data) => { created.push(data); return { id: 'b1', ...data } }
  const sent = respond(500, {})
  await submit(modalProps, { [CREAR_CUENTA]: false })
  assert.deepEqual(browser.writes, [])
  assert.equal(sent.length, 0)
  assert.equal(created.length, 1)
  assert.deepEqual([created[0].nombre, created[0].apellido, created[0].email, created[0].slug], ['Ana', 'Pérez', 'Ana@Chamos.test', 'ana-perez'])
  assert.ok(toasts.some(([kind]) => kind === 'success'))
})

test('the credentials modal shows the created password once and claims no email it did not send', () => {
  reset(); formValues = datos
  const credenciales = { email: 'ana@chamos.test', password: 'Chamosabcdefgh!1234' }
  const { tree } = render(BarberoModal, modalProps, { [CREDENCIALES]: credenciales })
  const shown = find(tree, (n) => n.type === CredencialesModal)
  assert.deepEqual([shown.props.email, shown.props.password], [credenciales.email, credenciales.password])
  assert.equal(find(render(BarberoModal, modalProps).tree, (n) => n.type === CredencialesModal), null, 'nothing shown without credentials')

  const text = JSON.stringify(CredencialesModal({ isOpen: true, onClose() {}, titulo: 'Acceso', mensaje: 'Listo', ...credenciales }))
  assert.ok(text.includes(credenciales.password) && text.includes(credenciales.email))
  assert.ok(text.includes('no se volverá a mostrar'))
  assert.ok(!/enviado un email|panel de control/i.test(text))
})

test('the barber list shows a load error instead of "No hay barberos registrados"', () => {
  reset()
  barberosHook = { barberos: [], loading: false, error: 'permission denied for table barberos', refetch: async () => {} }
  const text = JSON.stringify(render(BarberosTab, {}).tree)
  assert.ok(!text.includes('No hay barberos registrados'))
  assert.ok(text.includes('No se pudieron cargar los barberos'))
  assert.ok(text.includes('permission denied for table barberos'))

  barberosHook = { barberos: [], loading: false, error: null, refetch: async () => {} }
  assert.ok(JSON.stringify(render(BarberosTab, {}).tree).includes('No hay barberos registrados'))
})

// --- T3 / S2: access buttons in the barber list -----------------------------

const ConfirmDialog = require('../src/components/admin/shared/ConfirmDialog.tsx').default
// BarberosTab useState order: selectedBarbero, showModal, showDeleteDialog,
// showPermanentDeleteModal, barberoToDelete, deleting, cuentas, cuentasError,
// cuentasVersion, accesoPendiente, generandoAcceso, credenciales.
const TAB = { CUENTAS: 6, CUENTAS_ERROR: 7, CUENTAS_VERSION: 8, ACCESO: 9, GENERANDO: 10, CREDENCIALES: 11 }
const conCuenta = { id: 'b-con', nombre: 'Gustavo', apellido: 'Díaz', email: 'gustavo@chamos.test', activo: true }
const sinCuenta = { id: 'b-sin', nombre: 'Franco', apellido: 'Soto', email: 'franco@chamos.test', activo: true }
const sinEmail = { id: 'b-email', nombre: 'Hingover', apellido: 'Ruiz', email: null, activo: true }
const cuentas = { 'b-con': { barbero_id: 'b-con', email: 'gustavo@chamos.test', activo: true, rol: 'barbero' } }
const lista = { barberos: [conCuenta, sinCuenta, sinEmail], loading: false, error: null, refetch: async () => {} }
const generada = { email: 'gustavo@chamos.test', password: 'Chamosabcdefgh!1234', accion: 'nueva' }

test('each barber offers "Crear acceso" or "Nueva contraseña", or asks for an email first', () => {
  reset(); barberosHook = lista
  const { tree, setters } = render(BarberosTab, {}, { [TAB.CUENTAS]: cuentas })
  // React.Children.toArray prefixes keys, e.g. '.1:$b-con'.
  const row = (id) => find(tree, (n) => n.type === 'tr' && String(n.key).endsWith('$' + id))
  const button = (id, title) => find(row(id), (n) => n.type === 'button' && n.props.title === title)
  assert.ok(button('b-con', 'Nueva contraseña'))
  assert.equal(button('b-con', 'Crear acceso'), null)
  assert.ok(button('b-sin', 'Crear acceso'))
  assert.equal(button('b-sin', 'Nueva contraseña'), null)
  assert.equal(button('b-email', 'Crear acceso') || button('b-email', 'Nueva contraseña'), null)
  assert.ok(JSON.stringify(row('b-email')).includes('Agrega un email'))
  assert.ok(!/Resetear Contraseña|Email enviado|Se envió un email/.test(JSON.stringify(tree)), 'no reset-email copy')

  button('b-con', 'Nueva contraseña').props.onClick()
  button('b-sin', 'Crear acceso').props.onClick()
  assert.deepEqual(setters.filter(([i]) => i === TAB.ACCESO).map(([, v]) => v), [{ barbero: conCuenta, accion: 'nueva' }, { barbero: sinCuenta, accion: 'crear' }])
})

test('confirming "Nueva contraseña" shows the generated password once', async () => {
  reset(); barberosHook = lista
  const calls = []
  helpers.generarCredencialesBarbero = async (...args) => { calls.push(args); return generada }
  const { tree, setters } = render(BarberosTab, {}, { [TAB.CUENTAS]: cuentas, [TAB.ACCESO]: { barbero: conCuenta, accion: 'nueva' } })
  const dialog = find(tree, (n) => n.type === ConfirmDialog && n.props.title === 'Nueva contraseña')
  assert.equal(dialog.props.isOpen, true)
  assert.match(dialog.props.message, /Gustavo Díaz/)
  assert.match(dialog.props.message, /una sola vez/)
  await dialog.props.onConfirm()
  assert.deepEqual(calls, [['b-con', 'nueva']])
  const shown = setters.filter(([i]) => i === TAB.CREDENCIALES).map(([, v]) => v)
  assert.equal(shown.length, 1)
  assert.deepEqual([shown[0].email, shown[0].password], [generada.email, generada.password])
  assert.ok(!toasts.some(([kind]) => kind === 'error'))

  const modal = find(render(BarberosTab, {}, { [TAB.CREDENCIALES]: shown[0] }).tree, (n) => n.type === CredencialesModal)
  assert.deepEqual([modal.props.email, modal.props.password], [generada.email, generada.password])
  assert.equal(find(render(BarberosTab, {}).tree, (n) => n.type === CredencialesModal), null)
})

test('a refused credential request shows the server error and no password', async () => {
  reset(); barberosHook = lista
  helpers.generarCredencialesBarbero = async () => { throw new Error('Este barbero aún no tiene acceso. Usa "Crear acceso".') }
  const { tree, setters } = render(BarberosTab, {}, { [TAB.CUENTAS]: {}, [TAB.ACCESO]: { barbero: sinCuenta, accion: 'nueva' } })
  await find(tree, (n) => n.type === ConfirmDialog && n.props.title === 'Nueva contraseña').props.onConfirm()
  assert.deepEqual(setters.filter(([i]) => i === TAB.CREDENCIALES), [])
  assert.deepEqual(toasts.filter(([kind]) => kind === 'error').map(([, m]) => m), ['Este barbero aún no tiene acceso. Usa "Crear acceso".'])
})

test('the list says when it cannot tell which barbers have access', () => {
  reset(); barberosHook = lista
  const { tree } = render(BarberosTab, {}, { [TAB.CUENTAS_ERROR]: 'No se pudieron cargar las cuentas de acceso.' })
  const text = JSON.stringify(tree)
  assert.ok(text.includes('No se pudo verificar qué barberos tienen acceso'))
  assert.equal(find(tree, (n) => n.type === 'button' && (n.props.title === 'Crear acceso' || n.props.title === 'Nueva contraseña')), null)
})

test('the credential helpers call the admin endpoints and surface their errors', async () => {
  stubModule('../lib/initSupabase.ts', { supabase: {} })
  const { chamosSupabase } = require('../lib/supabase-helpers.ts')
  const sent = []
  global.fetch = async (url, options = {}) => {
    sent.push([url, options.method || 'GET', options.body && JSON.parse(options.body)])
    if (url === '/api/barberos/cuentas') return { ok: true, status: 200, json: async () => ({ cuentas: [cuentas['b-con']] }) }
    return { ok: false, status: 409, json: async () => ({ error: 'Este barbero ya tiene acceso. Usa "Nueva contraseña".' }) }
  }
  assert.deepEqual(await chamosSupabase.getCuentasBarberos(), [cuentas['b-con']])
  await assert.rejects(chamosSupabase.generarCredencialesBarbero('b-con', 'crear'), /ya tiene acceso/)
  assert.deepEqual(sent, [['/api/barberos/cuentas', 'GET', undefined], ['/api/barberos/credenciales', 'POST', { barberoId: 'b-con', accion: 'crear' }]])
})

// --- T4 / S3: permanent delete in the list ----------------------------------

const PermanentDeleteModal = require('../src/components/admin/modals/PermanentDeleteModal.tsx').default
const BARBERO_TO_DELETE = 4

test('a partial permanent delete warns that the login account was left behind', async () => {
  for (const [result, kind] of [
    [{ success: true, partial: true, message: 'Barbero eliminado, pero no se pudo borrar su cuenta de acceso.' }, 'error'],
    [{ success: true, message: 'Barbero eliminado', cuentas_eliminadas: 1 }, 'success'],
  ]) {
    reset()
    let reloads = 0
    barberosHook = { ...lista, refetch: async () => { reloads++ } }
    helpers.permanentlyDeleteBarbero = async () => result
    const { tree } = render(BarberosTab, {}, { [BARBERO_TO_DELETE]: sinCuenta })
    await find(tree, (n) => n.type === PermanentDeleteModal).props.onConfirm()
    assert.deepEqual(toasts.map(([k]) => k), [kind])
    if (result.partial) assert.equal(toasts[0][1], result.message)
    assert.equal(reloads, 1)
  }
})

// --- T5 / S4: edits through the server -------------------------------------

test('editing a barber goes through /api/barberos/update, not a browser update', async () => {
  reset(); formValues = { ...datos, activo: false }
  const updated = []
  helpers.updateBarbero = async (...args) => { updated.push(args); return { id: 'b1' } }
  await submit({ ...modalProps, barbero: { id: 'b1', nombre: 'Ana', apellido: 'Pérez', email: 'ana@chamos.test', activo: true, especialidades: [] } })
  assert.deepEqual(browser.writes, [])
  assert.equal(updated.length, 1)
  assert.equal(updated[0][0], 'b1')
  assert.deepEqual([updated[0][1].email, updated[0][1].activo, updated[0][1].slug], ['Ana@Chamos.test', false, 'ana-perez'])
  assert.ok(toasts.some(([kind]) => kind === 'success'))
})

// --- T7: the credentials email ----------------------------------------------

test('the credentials modal says when the credentials were also emailed', async () => {
  const credenciales = { isOpen: true, onClose() {}, titulo: 'Acceso', mensaje: 'Listo', email: 'ana@chamos.test', password: 'Chamosabcdefgh!1234' }
  assert.ok(JSON.stringify(CredencialesModal({ ...credenciales, emailEnviado: true })).includes('También se envió por correo'))
  assert.ok(!JSON.stringify(CredencialesModal({ ...credenciales, emailEnviado: false })).includes('También se envió por correo'))

  reset(); barberosHook = lista
  helpers.generarCredencialesBarbero = async () => ({ ...generada, accion: 'crear', emailEnviado: true })
  const { tree, setters } = render(BarberosTab, {}, { [TAB.CUENTAS]: {}, [TAB.ACCESO]: { barbero: sinCuenta, accion: 'crear' } })
  await find(tree, (n) => n.type === ConfirmDialog && n.props.title === 'Crear acceso').props.onConfirm()
  const shown = setters.filter(([i]) => i === TAB.CREDENCIALES).map(([, v]) => v)[0]
  const modal = find(render(BarberosTab, {}, { [TAB.CREDENCIALES]: shown }).tree, (n) => n.type === CredencialesModal)
  assert.equal(modal.props.emailEnviado, true)
})

test('the credential helper reports whether the email was sent', async () => {
  const { chamosSupabase } = require('../lib/supabase-helpers.ts')
  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ success: true, accion: 'crear', email: 'ana@chamos.test', password: 'Chamosabcdefgh!1234', email_enviado: true }) })
  assert.deepEqual(await chamosSupabase.generarCredencialesBarbero('b1', 'crear'), { email: 'ana@chamos.test', password: 'Chamosabcdefgh!1234', accion: 'crear', emailEnviado: true })
})

// --- Correction batch and verifier probes (UI) --------------------------------

const Modal = require('../src/components/admin/shared/Modal.tsx').default

test('PROBE P1: a refused "Crear acceso" reloads the account state', async () => {
  reset(); barberosHook = { barberos: [sinCuenta], loading: false, error: null, refetch: async () => {} }
  helpers.generarCredencialesBarbero = async () => { throw new Error('Este barbero ya tiene acceso. Usa "Nueva contraseña".') }
  const { tree, setters } = render(BarberosTab, {}, { [TAB.CUENTAS]: {}, [TAB.ACCESO]: { barbero: sinCuenta, accion: 'crear' } })
  await find(tree, (n) => n.type === ConfirmDialog && n.props.title === 'Crear acceso').props.onConfirm()
  assert.ok(toasts.some(([k, m]) => k === 'error' && /Nueva contraseña/.test(m)))
  assert.ok(setters.some(([i]) => i === TAB.CUENTAS_VERSION), 'cuentas reloaded after a 409')
  assert.deepEqual(setters.filter(([i]) => i === TAB.CREDENCIALES), [])
})

test('PROBE P2: a deactivated barber is not offered "Crear acceso" and is told to activate it first', () => {
  reset()
  const inactivo = { ...sinCuenta, activo: false }
  barberosHook = { barberos: [inactivo], loading: false, error: null, refetch: async () => {} }
  const { tree } = render(BarberosTab, {}, { [TAB.CUENTAS]: {} })
  assert.equal(find(tree, (n) => n.type === 'button' && n.props.title === 'Crear acceso'), null)
  assert.match(JSON.stringify(tree), /Activa al barbero para crear su acceso/)
})

test('PROBE P2: the create modal does not create an account for an inactive barber', async () => {
  reset(); formValues = { ...datos, activo: false }
  const created = []
  helpers.createBarbero = async (data) => { created.push(data); return { id: 'b1', ...data } }
  const sent = respond(200, { success: true, cuenta_creada: true, email: 'ana@chamos.test', password: 'Chamosabcdefgh!1234' })
  const { tree } = render(BarberoModal, modalProps)
  const checkbox = find(tree, (n) => n.type === 'input' && n.props.type === 'checkbox' && 'checked' in n.props)
  assert.equal(checkbox.props.disabled, true, 'the account checkbox is disabled for an inactive barber')
  assert.match(JSON.stringify(tree), /Un barbero inactivo no puede tener acceso/)
  await find(tree, (n) => n.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.deepEqual([sent.length, created.length], [0, 1])
})

test('PROBE P3: a create that left the barber saved refreshes the list', async () => {
  reset(); formValues = { nombre: 'Ana', apellido: 'Pérez', email: 'ana@chamos.test', telefono: '', descripcion: '', instagram: '', imagen_url: '', porcentaje_comision: 50, activo: true }
  respond(500, { error: 'No se pudo crear la cuenta de acceso. Intenta de nuevo. El barbero quedó guardado sin acceso; revísalo en la lista.', barbero_guardado: true })
  let refreshed = 0
  await submit({ ...modalProps, onSuccess() { refreshed++ } })
  assert.ok(toasts.some(([k, m]) => k === 'error' && /revísalo en la lista/.test(m)))
  assert.equal(refreshed, 1, 'list refreshed so the saved barber is visible')

  reset()
  respond(409, { error: 'Ese correo ya tiene una cuenta de acceso creada antes. Pide al administrador del sistema que la libere o usa otro correo.' })
  refreshed = 0
  await submit({ ...modalProps, onSuccess() { refreshed++ } })
  assert.equal(refreshed, 0, 'nothing to refresh when nothing was saved')
})

test('PROBE P4: a non-barber account linked to a barber is not offered "Nueva contraseña"', () => {
  reset()
  const dueno = { id: 'b-dueno', nombre: 'Dueño', apellido: 'X', email: 'dueno@chamos.test', activo: true }
  barberosHook = { barberos: [dueno], loading: false, error: null, refetch: async () => {} }
  const { tree } = render(BarberosTab, {}, { [TAB.CUENTAS]: { 'b-dueno': { barbero_id: 'b-dueno', email: 'dueno@chamos.test', activo: true, rol: 'admin' } } })
  assert.equal(find(tree, (n) => n.type === 'button' && n.props.title === 'Nueva contraseña'), null)
  assert.equal(find(tree, (n) => n.type === 'button' && n.props.title === 'Crear acceso'), null)
})

test('the account map keeps the barber login when a barber also has a non-barber one', async () => {
  reset(); barberosHook = lista
  const map = []
  helpers.getCuentasBarberos = async () => [
    { barbero_id: 'b-con', email: 'gustavo@chamos.test', activo: true, rol: 'barbero' },
    { barbero_id: 'b-con', email: 'dueno@chamos.test', activo: true, rol: 'admin' },
  ]
  const effects = []
  const originalState = React.useState, originalEffect = React.useEffect
  let index = 0
  React.useState = (initial) => { const i = index++; return [typeof initial === 'function' ? initial() : initial, (next) => { if (i === TAB.CUENTAS) map.push(next) }] }
  React.useEffect = (fn) => { effects.push(fn) }
  try { BarberosTab({}) } finally { React.useState = originalState; React.useEffect = originalEffect }
  effects.forEach((fn) => fn())
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(map[0]['b-con'].rol, 'barbero')
})

test('PROBE P5: the create modal cannot be dismissed while saving', () => {
  reset()
  let closed = 0
  const onClose = () => { closed++ }
  const { tree } = render(BarberoModal, { ...modalProps, onClose }, { 0: true })
  const modal = find(tree, (n) => n.type === Modal)
  assert.notEqual(modal.props.onClose, onClose, 'dismiss guarded while loading')
  modal.props.onClose()
  assert.equal(closed, 0)
  find(render(BarberoModal, { ...modalProps, onClose }).tree, (n) => n.type === Modal).props.onClose()
  assert.equal(closed, 1, 'closes normally when idle')
})

test('the access dialog cannot be dismissed while the request is in flight', () => {
  reset(); barberosHook = lista
  const pendiente = { barbero: sinCuenta, accion: 'crear' }
  let { tree, setters } = render(BarberosTab, {}, { [TAB.CUENTAS]: {}, [TAB.ACCESO]: pendiente, [TAB.GENERANDO]: true })
  find(tree, (n) => n.type === ConfirmDialog && n.props.title === 'Crear acceso').props.onClose()
  assert.deepEqual(setters.filter(([i]) => i === TAB.ACCESO), [])
  ;({ tree, setters } = render(BarberosTab, {}, { [TAB.CUENTAS]: {}, [TAB.ACCESO]: pendiente }))
  find(tree, (n) => n.type === ConfirmDialog && n.props.title === 'Crear acceso').props.onClose()
  assert.deepEqual(setters.filter(([i]) => i === TAB.ACCESO).map(([, v]) => v), [null])
})

function copyButtons(tree) {
  const found = []
  ;(function walk(n) {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) return n.forEach(walk)
    if (n.type === 'button' && /fa-copy/.test(JSON.stringify(n.props.children))) found.push(n)
    walk(React.Children.toArray(n.props?.children))
  })(tree)
  return found
}

test('PROBE P6: the copy buttons report a failed copy and confirm only a real one', async () => {
  const credenciales = { isOpen: true, onClose() {}, titulo: 't', mensaje: 'm', email: 'a@b.test', password: 'Chamosabcdefgh!1234' }
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  try {
    for (const [writeText, expected] of [
      [() => Promise.reject(new Error('denied')), [['error'], ['error']]],
      [async () => {}, [['success', 'Email copiado'], ['success', 'Contraseña copiada']]],
    ]) {
      Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText } }, configurable: true })
      const buttons = copyButtons(CredencialesModal(credenciales))
      assert.equal(buttons.length, 2)
      const got = []
      for (const button of buttons) {
        reset()
        await button.props.onClick()
        got.push(toasts.map(([k, m]) => (k === 'error' ? k : [k, m])).flat())
      }
      assert.deepEqual(got, expected)
    }
  } finally {
    if (saved) Object.defineProperty(globalThis, 'navigator', saved)
  }
})

test('the account checkbox says the password is also emailed', () => {
  reset(); formValues = datos
  assert.match(JSON.stringify(render(BarberoModal, modalProps).tree), /también se enviará al email del barbero/)
})

test('the credential helper rejects a success response without a password', async () => {
  const { chamosSupabase } = require('../lib/supabase-helpers.ts')
  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ success: true, accion: 'nueva', email: 'ana@chamos.test' }) })
  await assert.rejects(chamosSupabase.generarCredencialesBarbero('b1', 'nueva'), /No se pudieron generar las credenciales/)
})
