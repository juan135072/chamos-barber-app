#!/usr/bin/env node
/**
 * End-to-end check of the barbers' push notifications (OneSignal).
 *
 * Read-only by default. Run it where the production env vars exist (the site
 * container), e.g.:
 *   node scripts/verificar-notificaciones.mjs
 *   node scripts/verificar-notificaciones.mjs --enviar=Gustavo   # sends ONE test push
 *
 * Needs: NEXT_PUBLIC_ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY, INSFORGE_API_KEY and
 * INSFORGE_INTERNAL_URL or NEXT_PUBLIC_INSFORGE_BASE_URL. Never prints keys.
 * Exit code 0 when every check passes, 1 otherwise.
 */

const SITE = (process.env.VERIFY_SITE_URL || 'https://chamosbarber.com').replace(/\/+$/, '')
const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '63aa14ec-de8c-46b3-8949-e9fd221f8d70'
const OS_KEY = (process.env.ONESIGNAL_REST_API_KEY || '').trim()
const DB_URL = (process.env.INSFORGE_INTERNAL_URL || process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || '').replace(/\/+$/, '')
const DB_KEY = process.env.INSFORGE_API_KEY || ''
const OS_API = 'https://api.onesignal.com'
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=')
  return [k, v.join('=') || true]
}))

const results = []
function report(ok, area, check, detail = '') {
  results.push({ ok, area, check, detail })
  const mark = ok === true ? '✅' : ok === 'warn' ? '⚠️ ' : '❌'
  console.log(`${mark} [${area}] ${check}${detail ? ` — ${detail}` : ''}`)
}

async function get(url, init = {}) {
  const res = await fetch(url, { redirect: 'manual', ...init, headers: { 'User-Agent': UA, ...(init.headers || {}) } })
  return res
}

async function osGet(path) {
  const res = await fetch(`${OS_API}${path}`, { headers: { Authorization: `Key ${OS_KEY}`, Accept: 'application/json' } })
  let body = null
  try { body = await res.json() } catch { /* empty */ }
  return { status: res.status, body }
}

// ---------------------------------------------------------------- 1. Site
async function checkSite() {
  const panel = await get(`${SITE}/barbero-panel`)
  report(panel.status === 200, 'sitio', 'Panel de barberos responde', `HTTP ${panel.status}`)
  const html = panel.status === 200 ? await panel.text() : ''
  const chunks = [...new Set(html.match(/\/_next\/static\/[^"']+\.js/g) || [])]
  let bundle = ''
  for (const c of chunks) {
    const r = await get(`${SITE}${c}`)
    if (r.ok) bundle += await r.text()
  }
  report(bundle.includes('OneSignalDeferred'), 'sitio', 'Versión nueva de la app publicada', 'carga de OneSignal en una sola vez')
  report(!bundle.includes('repairSubscription'), 'sitio', 'Sin la "reparación" vieja de la campana')
  const safariInBundle = /web\.onesignal\.auto\.[0-9a-f-]{36}/.exec(bundle)?.[0] || null

  const worker = await get(`${SITE}/OneSignalSDKWorker.js`)
  const workerText = worker.ok ? await worker.text() : ''
  report(worker.status === 200 && /OneSignalSDK\.sw\.js/.test(workerText), 'sitio', 'Service worker de OneSignal', `HTTP ${worker.status}`)

  const manifest = await get(`${SITE}/manifest.json`)
  let display = null
  try { display = manifest.ok ? (await manifest.json()).display : null } catch { /* ignore */ }
  report(manifest.status === 200 && display === 'standalone', 'sitio', 'Manifest de app instalable', `display=${display}`)

  const www = await get(SITE.replace('https://', 'https://www.') + '/barbero-panel')
  const location = www.headers.get('location') || ''
  report([301, 308].includes(www.status) && location.startsWith(`${SITE}/`), 'sitio', 'www redirige al dominio principal', `HTTP ${www.status} → ${location || '-'}`)
  return { safariInBundle }
}

// ---------------------------------------------------------------- 2. OneSignal config
async function checkOneSignalConfig({ safariInBundle }) {
  const res = await get(`${OS_API}/sync/${APP_ID}/web?callback=x`)
  const text = await res.text()
  const kind = /"integration":\{"kind":"([a-z]+)"/.exec(text)?.[1] || /"kind":"([a-z]+)"/.exec(text)?.[1] || null
  const origin = /"origin":"([^"]+)"/.exec(text)?.[1] || null
  const safari = /"safari_web_id":"([^"]+)"/.exec(text)?.[1] || null
  report(kind === 'custom', 'onesignal', 'Integración "Custom code"', `kind=${kind}`)
  report(origin === SITE, 'onesignal', 'Dominio permitido', `${origin}`)
  report(Boolean(safari) && safari === safariInBundle, 'onesignal', 'Identificador de Safari en el código',
    safariInBundle ? (safari === safariInBundle ? 'coincide' : 'NO coincide con el panel') : 'falta en el código publicado (Safari en Mac)')
  if (!OS_KEY) {
    report(false, 'onesignal', 'Clave del servidor', 'ONESIGNAL_REST_API_KEY no está definida')
    return false
  }
  const probe = await osGet(`/notifications?app_id=${APP_ID}&limit=1`)
  report(probe.status === 200, 'onesignal', 'Clave del servidor acepta consultas', `HTTP ${probe.status}`)
  return probe.status === 200
}

// ---------------------------------------------------------------- 3. Barbers
async function listBarbers() {
  if (!DB_URL || !DB_KEY) return []
  const res = await fetch(`${DB_URL}/api/database/records/barberos?select=id,nombre,apellido&activo=eq.true&order=nombre`, {
    headers: { Authorization: `Bearer ${DB_KEY}` },
  })
  const rows = await res.json().catch(() => [])
  return Array.isArray(rows) ? rows : []
}

async function checkBarbers(barbers) {
  if (!barbers.length) {
    report(false, 'barberos', 'Lista de barberos', 'no se pudo leer (faltan INSFORGE_API_KEY / URL)')
    return
  }
  for (const b of barbers) {
    const name = `${b.nombre} ${b.apellido || ''}`.replace(/\s+/g, ' ').trim()
    const { status, body } = await osGet(`/apps/${APP_ID}/users/by/external_id/${encodeURIComponent(b.id)}`)
    if (status === 404) {
      report(false, 'barberos', name, 'ningún celular vinculado (tiene que abrir la app y aceptar las notificaciones)')
      continue
    }
    if (status !== 200) {
      report(false, 'barberos', name, `OneSignal respondió HTTP ${status}`)
      continue
    }
    const subs = (body.subscriptions || []).filter((s) => /Push$/.test(s.type))
    const active = subs.filter((s) => s.enabled && Number(s.notification_types) > 0)
    const kinds = active.map((s) => `${s.type.replace('Push', '')}${s.device_model ? ` ${s.device_model}` : ''}`)
    const lastActive = body.properties?.last_active ? new Date(body.properties.last_active * 1000).toISOString().slice(0, 10) : '?'
    report(active.length > 0 ? true : false, 'barberos', name,
      active.length ? `${active.length} activo(s): ${kinds.join(', ')} · última actividad ${lastActive}` : `${subs.length} suscripción(es), ninguna activa`)
  }
}

// ---------------------------------------------------------------- 4. Recent deliveries
async function checkRecentDeliveries() {
  const { status, body } = await osGet(`/notifications?app_id=${APP_ID}&limit=50&kind=1`)
  if (status !== 200) return report(false, 'envíos', 'Historial de avisos', `HTTP ${status}`)
  const weekAgo = Date.now() / 1000 - 7 * 86400
  const recent = (body.notifications || []).filter((n) => (n.queued_at || 0) >= weekAgo)
  const sum = (k) => recent.reduce((acc, n) => acc + (Number(n[k]) || 0), 0)
  const failed = sum('failed') + sum('errored')
  report(failed === 0 ? true : 'warn', 'envíos', 'Avisos de los últimos 7 días',
    `${recent.length} enviados · entregados ${sum('successful')} · fallidos ${failed} · abiertos ${sum('converted')}`)
}

// ---------------------------------------------------------------- 5. Optional test push
async function sendTestPush(barbers, target) {
  const wanted = String(target).toLowerCase()
  const barber = barbers.find((b) => b.id === target || b.nombre.toLowerCase().trim() === wanted)
  if (!barber) return report(false, 'prueba', 'Barbero para la prueba', `no encontrado: ${target}`)
  const res = await fetch(`${OS_API}/notifications`, {
    method: 'POST',
    headers: { Authorization: `Key ${OS_KEY}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      app_id: APP_ID,
      name: `Prueba de notificaciones: ${barber.id.slice(0, 8)}`,
      include_aliases: { external_id: [barber.id] },
      target_channel: 'push',
      headings: { en: 'Prueba de Chamos Barber', es: 'Prueba de Chamos Barber' },
      contents: { en: 'Si ves esto, tus notificaciones funcionan ✅', es: 'Si ves esto, tus notificaciones funcionan ✅' },
      url: `${SITE}/barbero-panel`,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.id) {
    return report(false, 'prueba', `Envío a ${barber.nombre.trim()}`, `no salió: ${JSON.stringify(body.errors || body).slice(0, 160)}`)
  }
  let stats = null
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const { body: n } = await osGet(`/notifications/${body.id}?app_id=${APP_ID}`)
    stats = n
    if (n && Number(n.remaining) === 0) break
  }
  const ok = Number(stats?.successful) > 0
  report(ok, 'prueba', `Envío a ${barber.nombre.trim()}`,
    `entregados ${stats?.successful ?? '?'} · fallidos ${(Number(stats?.failed) || 0) + (Number(stats?.errored) || 0)} · pendientes ${stats?.remaining ?? '?'}`)
}

// ---------------------------------------------------------------- main
const site = await checkSite()
const osOk = await checkOneSignalConfig(site)
const barbers = await listBarbers()
if (osOk) {
  await checkBarbers(barbers)
  await checkRecentDeliveries()
  if (args.enviar) await sendTestPush(barbers, args.enviar)
}
const failures = results.filter((r) => r.ok === false).length
const warnings = results.filter((r) => r.ok === 'warn').length
console.log(`\nResultado: ${results.length - failures - warnings} bien · ${warnings} avisos · ${failures} problemas`)
process.exit(failures ? 1 : 0)
