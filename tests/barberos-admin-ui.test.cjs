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
  const sent = respond(200, { success: true, cuenta_creada: true, email: 'ana@chamos.test', password: 'Chamosabcdefgh!1234' })
  const setters = await submit(modalProps)
  assert.equal(browser.getUser, 0, 'no browser getUser precheck')
  assert.deepEqual(browser.writes, [])
  assert.equal(sent.length, 1)
  assert.equal(sent[0].url, '/api/barberos/crear-con-cuenta')
  assert.equal(sent[0].body.crearCuenta, true)
  assert.equal(sent[0].body.adminId, undefined)
  assert.deepEqual(setters.filter(([i]) => i === CREDENCIALES).map(([, v]) => v), [{ email: 'ana@chamos.test', password: 'Chamosabcdefgh!1234' }])
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

test('the credentials modal shows the created password once and promises no email', () => {
  reset(); formValues = datos
  const credenciales = { email: 'ana@chamos.test', password: 'Chamosabcdefgh!1234' }
  const { tree } = render(BarberoModal, modalProps, { [CREDENCIALES]: credenciales })
  const shown = find(tree, (n) => n.type === CredencialesModal)
  assert.deepEqual([shown.props.email, shown.props.password], [credenciales.email, credenciales.password])
  assert.ok(!/se enviará al email/i.test(JSON.stringify(tree)))
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
