require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { barberPushUrl, buildBarberPushPayload, classifyPushResponse, sendNotificationToBarber } = require('../src/lib/onesignal.ts')

// The click url must not depend on the shell or CI running the tests.
delete process.env.NEXT_PUBLIC_SITE_URL

const barberId = '6f1c2d3e-0000-4000-8000-000000000001'
const fakeKey = 'test-only-key'

// Never reaches OneSignal: every test replaces fetch and records the request.
async function withFetch(respond, run) {
  const requests = []
  const warnings = []
  const realFetch = global.fetch
  const realWarn = console.warn
  const realKey = process.env.ONESIGNAL_REST_API_KEY
  global.fetch = async (url, init) => { requests.push({ url, init }); return respond(init) }
  console.warn = (...args) => warnings.push(args.join(' '))
  process.env.ONESIGNAL_REST_API_KEY = fakeKey
  try {
    return await run(requests, warnings)
  } finally {
    global.fetch = realFetch
    console.warn = realWarn
    if (realKey === undefined) delete process.env.ONESIGNAL_REST_API_KEY
    else process.env.ONESIGNAL_REST_API_KEY = realKey
  }
}

const reply = (status, body) => () => ({ status, ok: status >= 200 && status < 300, json: async () => body })

test('only a non-empty notification id counts as delivered', () => {
  assert.deepEqual(classifyPushResponse(200, { id: 'b98881cc-1e94-4366-bbd9-db8f3429292b', external_id: null }), { delivered: true, id: 'b98881cc-1e94-4366-bbd9-db8f3429292b' })
  assert.deepEqual(classifyPushResponse(200, { id: '', errors: ['All included players are not subscribed'] }), { delivered: false, reason: 'All included players are not subscribed' })
  assert.equal(classifyPushResponse(200, {}).delivered, false)
  assert.equal(classifyPushResponse(200, null).delivered, false)
  assert.deepEqual(classifyPushResponse(400, { errors: ['Please include a case-sensitive header of Authorization'] }), { delivered: false, reason: 'HTTP 400: Please include a case-sensitive header of Authorization' })
  assert.deepEqual(classifyPushResponse(403, null), { delivered: false, reason: 'HTTP 403' })
})

test('an id with invalid_aliases is a partial send that keeps the reason', () => {
  const result = classifyPushResponse(200, { id: 'msg-1', errors: { invalid_aliases: { external_id: [barberId, barberId] } } })
  assert.deepEqual(result, { delivered: true, id: 'msg-1', reason: 'invalid_aliases (external_id x2)', partial: true })
})

test('warnings on an accepted send also make it partial', () => {
  assert.deepEqual(classifyPushResponse(200, { id: 'm1', warnings: { invalid_external_user_ids: 'abc' } }), { delivered: true, id: 'm1', reason: 'invalid_external_user_ids: abc', partial: true })
  assert.deepEqual(classifyPushResponse(200, { id: 'm1', warnings: ['x unsubscribed'] }), { delivered: true, id: 'm1', reason: 'x unsubscribed', partial: true })
})

test('the payload uses one targeting method and an absolute url', () => {
  const payload = buildBarberPushPayload('app', barberId, 'Nueva Reserva', 'Hola')
  assert.deepEqual(payload.include_aliases, { external_id: [barberId] })
  assert.equal(payload.target_channel, 'push')
  assert.equal('include_external_user_ids' in payload, false)
  assert.equal(barberPushUrl(undefined), 'https://chamosbarber.com/barbero-panel')
  assert.equal(barberPushUrl(''), 'https://chamosbarber.com/barbero-panel')
  assert.equal(barberPushUrl('/'), 'https://chamosbarber.com/barbero-panel')
  assert.equal(barberPushUrl('https://staging.chamosbarber.test/'), 'https://staging.chamosbarber.test/barbero-panel')
  // OneSignal expects https launch urls.
  assert.equal(barberPushUrl('http://localhost:3000'), 'https://chamosbarber.com/barbero-panel')
})

test('sends to the current endpoint with Key auth and reports the message id', async () => {
  await withFetch(reply(200, { id: 'msg-1' }), async (requests, warnings) => {
    const result = await sendNotificationToBarber(` ${barberId} `, 'Nueva Reserva ✂️', 'Hola')
    assert.deepEqual(result, { success: true, id: 'msg-1', status: 200, partial: undefined })
    assert.equal(requests[0].url, 'https://api.onesignal.com/notifications')
    assert.equal(requests[0].init.headers.Authorization, `Key ${fakeKey}`)
    const body = JSON.parse(requests[0].init.body)
    assert.deepEqual(body.include_aliases, { external_id: [barberId] })
    assert.equal(body.url.startsWith('https://'), true)
    assert.deepEqual(warnings, [])
  })
})

test('a 200 without id is logged as not delivered, with the barber and reason but no key', async () => {
  await withFetch(reply(200, { id: '', errors: ['All included players are not subscribed'] }), async (_requests, warnings) => {
    const result = await sendNotificationToBarber(barberId, 'Nueva Reserva ✂️', 'Hola')
    assert.equal(result.success, false)
    assert.equal(result.reason, 'All included players are not subscribed')
    assert.equal(warnings.length, 1)
    assert.match(warnings[0], new RegExp(barberId))
    assert.match(warnings[0], /All included players are not subscribed/)
    assert.equal(warnings[0].includes(fakeKey), false)
  })
})

test('a hanging OneSignal request is aborted after the timeout', async () => {
  const hang = (init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('aborted')))
  })
  await withFetch(hang, async (_requests, warnings) => {
    const started = Date.now()
    const result = await sendNotificationToBarber(barberId, 'Nueva Reserva ✂️', 'Hola', { timeoutMs: 20 })
    assert.equal(result.success, false)
    assert.match(result.reason, /sin respuesta de OneSignal en 20 ms \(resultado desconocido\)/)
    assert.ok(Date.now() - started < 1000)
    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /sin confirmar/)
  })
})

test('a timeout while reading the body is reported as unknown, not as a missing id', async () => {
  const slowBody = (init) => ({
    status: 200,
    ok: true,
    json: () => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))),
  })
  await withFetch(slowBody, async (_requests, warnings) => {
    const result = await sendNotificationToBarber(barberId, 'Nueva Reserva ✂️', 'Hola', { timeoutMs: 20 })
    assert.equal(result.success, false)
    assert.match(result.reason, /resultado desconocido/)
    assert.equal(warnings.length, 1)
    assert.doesNotMatch(warnings[0], /no devolvió id/)
  })
})

test('a partial send and an HTTP error are both logged in production', async () => {
  await withFetch(reply(200, { id: 'msg-2', errors: { invalid_aliases: { external_id: [barberId] } } }), async (_requests, warnings) => {
    const result = await sendNotificationToBarber(barberId, 'Nueva Reserva ✂️', 'Hola')
    assert.deepEqual(result, { success: true, id: 'msg-2', status: 200, partial: true })
    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /se omitieron suscripciones: invalid_aliases \(external_id x1\)/)
  })
  await withFetch(reply(403, { errors: ['Access denied'] }), async (_requests, warnings) => {
    const result = await sendNotificationToBarber(barberId, 'Nueva Reserva ✂️', 'Hola')
    assert.equal(result.success, false)
    assert.equal(result.reason, 'HTTP 403: Access denied')
    assert.equal(warnings.length, 1)
    assert.equal(warnings[0].includes(fakeKey), false)
  })
})
