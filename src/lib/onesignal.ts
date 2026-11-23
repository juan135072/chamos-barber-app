/**
 * =====================================================
 * 🔔 ONESIGNAL API SERVICE
 * =====================================================
 * Utilidad para enviar notificaciones push a través de la API REST de OneSignal.
 * Referencia: https://documentation.onesignal.com/reference/create-message
 *
 * OneSignal responde 200 incluso cuando no envía nada ("Message Not Sent":
 * id vacío + errors). Solo un id no vacío significa que OneSignal aceptó y creó
 * el mensaje; no prueba que haya llegado a un dispositivo (eso lo dicen los
 * contadores del mensaje en el panel o en la API "View message").
 */

const ONESIGNAL_API_URL = 'https://api.onesignal.com/notifications'
const DEFAULT_APP_ID = '63aa14ec-de8c-46b3-8949-e9fd221f8d70'
const DEFAULT_SITE_URL = 'https://chamosbarber.com'
// Pantalla a la que /chamos-acceso lleva al barbero después de iniciar sesión.
const BARBER_LANDING_PATH = '/barbero-panel'
export const PUSH_TIMEOUT_MS = 5000

export interface PushResult {
    success: boolean
    id?: string
    status?: number
    reason?: string
    error?: string
    userMessage?: string
    /** Enviado, pero OneSignal omitió algunas suscripciones del barbero. */
    partial?: boolean
}

export interface PushClassification {
    delivered: boolean
    id?: string
    reason?: string
    partial?: boolean
}

/** URL absoluta https que abre el push; una relativa no sirve fuera del sitio. */
export function barberPushUrl(siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
    const base = (siteUrl || '').trim().replace(/\/+$/, '')
    return `${/^https:\/\/[^/]/i.test(base) ? base : DEFAULT_SITE_URL}${BARBER_LANDING_PATH}`
}

export function buildBarberPushPayload(appId: string, barberId: string, title: string, message: string, siteUrl?: string) {
    return {
        app_id: appId,
        name: `Reserva: ${barberId.substring(0, 8)} - ${new Date().toLocaleTimeString()}`,
        // Un solo método de segmentación por mensaje: alias external_id (= barberos.id).
        include_aliases: {
            external_id: [barberId]
        },
        target_channel: 'push',
        headings: { en: title, es: title },
        contents: { en: message, es: message },
        url: barberPushUrl(siteUrl)
    }
}

/** Resume `errors` (lista de textos u objeto por tipo de identificador) sin volcar ids. */
function describeErrors(errors: unknown): string {
    if (!errors) return ''
    if (Array.isArray(errors)) return errors.map(String).join('; ')
    if (typeof errors !== 'object') return String(errors)

    return Object.entries(errors as Record<string, unknown>).map(([key, value]) => {
        if (Array.isArray(value)) return `${key} x${value.length}`
        if (value && typeof value === 'object') {
            // invalid_aliases: { external_id: [...] } = suscripciones desuscritas por alias
            const counts = Object.entries(value).map(([label, ids]) => `${label} x${Array.isArray(ids) ? ids.length : 1}`)
            return `${key} (${counts.join(', ')})`
        }
        return `${key}: ${String(value)}`
    }).join('; ')
}

export function classifyPushResponse(status: number, body: any): PushClassification {
    const id = typeof body?.id === 'string' ? body.id.trim() : ''
    // `warnings` acompaña a un envío aceptado (p. ej. suscripciones desuscritas).
    const reason = [describeErrors(body?.errors), describeErrors(body?.warnings)].filter(Boolean).join('; ')

    if (status < 200 || status >= 300) {
        return { delivered: false, reason: `HTTP ${status}${reason ? `: ${reason}` : ''}` }
    }
    if (!id) {
        return { delivered: false, reason: reason || 'OneSignal no devolvió id de mensaje' }
    }
    // Con id OneSignal aceptó el mensaje; errors/warnings listan lo que omitió.
    return reason ? { delivered: true, id, reason, partial: true } : { delivered: true, id }
}

export async function sendNotificationToBarber(
    barberId: string,
    title: string,
    message: string,
    { timeoutMs = PUSH_TIMEOUT_MS }: { timeoutMs?: number } = {}
): Promise<PushResult> {
    const apiKey = process.env.ONESIGNAL_REST_API_KEY?.trim()

    // Diagnóstico inicial
    if (!apiKey) {
        console.warn('⚠️ [OneSignal] ONESIGNAL_REST_API_KEY no configurado. Configúralo en las variables de entorno del servidor.')
        return { success: false, error: 'API Key missing', userMessage: 'Las notificaciones push no están configuradas en el servidor.' }
    }

    if (apiKey === 'tu-rest-api-key-aqui') {
        console.warn('⚠️ [OneSignal] ONESIGNAL_REST_API_KEY tiene el valor placeholder. Reemplázalo con la clave real.')
        return { success: false, error: 'API Key is placeholder', userMessage: 'Las notificaciones push no están configuradas correctamente.' }
    }

    const cleanBarberId = String(barberId || '').trim()
    if (!cleanBarberId) {
        return { success: false, error: 'Missing barbero id', reason: 'barbero sin id' }
    }

    const notDelivered = (reason: string, status?: number): PushResult => {
        // Se registra también en producción: es la única pista de un push que no llegó.
        console.warn(`⚠️ [OneSignal] Push no entregado al barbero ${cleanBarberId}: ${reason}`)
        return { success: false, status, reason, error: reason }
    }

    const unconfirmed = (status?: number): PushResult => {
        // Sin respuesta OneSignal puede seguir procesando el pedido: el push quizá sí sale.
        const reason = `sin respuesta de OneSignal en ${timeoutMs} ms (resultado desconocido)`
        console.warn(`⚠️ [OneSignal] Push sin confirmar para el barbero ${cleanBarberId}: ${reason}`)
        return { success: false, status, reason, error: reason }
    }

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || DEFAULT_APP_ID
    const payload = buildBarberPushPayload(appId, cleanBarberId, title, message)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
        if (process.env.NODE_ENV === 'development') console.log(`🔔 [OneSignal] Preparando notificación para barbero: ${cleanBarberId}`)

        const response = await fetch(ONESIGNAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Key ${apiKey}`
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        })

        const body = await response.json().catch(() => null)
        // El corte pudo llegar con la respuesta ya recibida, mientras se leía el cuerpo.
        if (body === null && controller.signal.aborted) return unconfirmed(response.status)
        const result = classifyPushResponse(response.status, body)

        if (!result.delivered) return notDelivered(result.reason || 'sin detalle', response.status)

        if (result.partial) {
            console.warn(`⚠️ [OneSignal] Push ${result.id} enviado al barbero ${cleanBarberId}, pero se omitieron suscripciones: ${result.reason}`)
        } else if (process.env.NODE_ENV === 'development') {
            console.log('✅ [OneSignal] Notificación enviada:', result.id)
        }
        return { success: true, id: result.id, status: response.status, partial: result.partial }
    } catch (error: any) {
        if (controller.signal.aborted) return unconfirmed()
        return notDelivered(`error de red: ${error?.message || String(error)}`)
    } finally {
        clearTimeout(timer)
    }
}
