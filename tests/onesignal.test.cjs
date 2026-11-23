require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { barberPushUrl, buildBarberPushPayload, classifyPushResponse, sendNotificationToBarber } = require('../src/lib/onesignal.ts')

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

test('the payload uses one targeting method and an absolute url', () => {
  const payload = buildBarberPushPayload('app', barberId, 'Nueva Reserva', 'Hola')
  assert.deepEqual(payload.include_aliases, { external_id: [barberId] })
  assert.equal(payload.target_channel, 'push')
  assert.equal('include_external_user_ids' in payload, false)
  assert.equal(barberPushUrl(undefined), 'https://chamosbarber.com/barbero-panel')
  assert.equal(barberPushUrl(''), 'https://chamosbarber.com/barbero-panel')
  assert.equal(barberPushUrl('/'), 'https://chamosbarber.com/barbero-panel')
  assert.equal(barberPushUrl('https://staging.chamosbarber.test/'), 'https://staging.chamosbarber.test/barbero-panel')
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
    assert.match(result.reason, /sin respuesta de OneSignal en 20 ms/)
    assert.ok(Date.now() - started < 1000)
    assert.equal(warnings.length, 1)
  })
})
