require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { validateSettings } = require('../src/lib/settings-validation.ts')
const config = { horario_apertura:'10:30', horario_cierre:'20:00', horario_sabado_apertura:'10:30', horario_sabado_cierre:'20:00', horario_domingo_apertura:'10:30', horario_domingo_cierre:'20:00', horario_domingo_activo:'true', intervalo_citas:'30', sitio_timezone:'America/Santiago' }
test('owner can open and close Sundays independently', () => {
  assert.equal(validateSettings(config),null)
  assert.equal(validateSettings({...config,horario_domingo_activo:'false'}),null)
})
test('rejects invalid or inverted hours, interval, timezone and foreign settings', () => {
  for (const change of [{horario_domingo_cierre:'09:00'},{horario_apertura:'25:00'},{intervalo_citas:'0'},{sitio_timezone:'Invalid/Zone'},{comercio_id:'another-tenant'}]) assert.ok(validateSettings({...config,...change}))
})
