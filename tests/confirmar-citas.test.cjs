// Proactive confirmation worker: the server runs in UTC, but "today" and the
// appointment time are Chile time.
require('./load-typescript.cjs')
const test = require('node:test')
const { mock } = require('node:test')
const assert = require('node:assert/strict')
const { createFakeDb, createResponse, stubModule } = require('./fake-db.cjs')

process.env.WORKER_SECRET_KEY = 'test-worker-key'
let db, sent, prompts
const hourBefore = (iso) => new Date(Date.parse(iso) - 3600000).toISOString()
let lastIncoming
// The route builds its client once at load time, so it gets a stand-in that reads the current db.
stubModule('../src/lib/supabase-server.ts', { createPagesAdminClient: () => ({ from: (table) => db.from(table) }) })
stubModule('../src/lib/redis.ts', { ChatMemory: { async getConversationWindow(phone) { return { conversationId: `conv-${phone}`, last_incoming_at: lastIncoming } } } })
stubModule('../src/lib/ai-agent.ts', { async generateChatResponse(signal, conversationId) { prompts.push(conversationId); return 'Hola|||¿Confirmas?' } })
stubModule('../src/lib/chatwoot.ts', { async sendMessageToChatwoot(conversationId, text) { sent.push([conversationId, text]) } })
const handler = require('../src/pages/api/worker/confirmar-citas.ts').default

const cita = (id, fecha, hora, extra = {}) => ({ id, fecha, hora, estado: 'pendiente', comercio_id: 'tenant', cliente_telefono: id, ...extra })

async function runAt(iso, citas) {
  mock.timers.enable({ apis: ['Date'], now: Date.parse(iso) })
  try {
    db = createFakeDb({ tables: { citas } })
    sent = []; prompts = []; lastIncoming = hourBefore(iso)
    const res = createResponse()
    await handler({ headers: { 'x-api-key': 'test-worker-key' } }, res)
    const select = db.calls.selects.find((s) => s.table === 'citas')
    return { res, window: select.filters.filter(([column]) => column === 'fecha').map(([, op, value]) => `${op} ${value}`) }
  } finally { mock.timers.reset() }
}

test('at 21:30 Chile the window is today and tomorrow in Chile, not in UTC', async () => {
  const { res, window } = await runAt('2026-11-24T00:30:00Z', [
    cita('hoy-tarde', '2026-11-23', '22:30:00'),
    cita('manana', '2026-11-24', '18:00:00'),
    cita('pasado', '2026-11-25', '10:00:00'),
    cita('sin-tenant', '2026-11-23', '22:45:00', { comercio_id: null }),
  ])
  assert.deepEqual(window, ['gte 2026-11-23', 'lte 2026-11-24'])
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.stats, { scanned: 2, triggered: 1, skipped: 1 })
  assert.deepEqual(prompts, ['conv-hoy-tarde'])
  assert.deepEqual(sent, [['conv-hoy-tarde', 'Hola'], ['conv-hoy-tarde', '¿Confirmas?']])
})

test('the 2.5 h reminder uses the Chile appointment time (summer and winter)', async () => {
  // 15:30 Chile in summer: the 18:00 cita is 2.5 h away (UTC parsing made it 0.5 h in the past).
  let run = await runAt('2026-11-23T18:30:00Z', [cita('a-las-18', '2026-11-23', '18:00:00')])
  assert.deepEqual(prompts, ['conv-a-las-18'])
  assert.equal(run.res.body.stats.triggered, 1)

  // 12:30 Chile: 5.5 h before, too early (UTC parsing fired here).
  run = await runAt('2026-11-23T15:30:00Z', [cita('a-las-18', '2026-11-23', '18:00:00')])
  assert.deepEqual(prompts, [])
  assert.equal(run.res.body.stats.triggered, 0)

  // Winter (UTC-4): 16:00 Chile is 2 h before an 18:00 cita.
  run = await runAt('2026-07-15T20:00:00Z', [cita('invierno', '2026-07-15', '18:00:00')])
  assert.deepEqual(prompts, ['conv-invierno'])
})
