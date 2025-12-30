/**
 * =====================================================
 * 🔔 ONESIGNAL API SERVICE
 * =====================================================
 * Utilidad para enviar notificaciones push a través de la API REST de OneSignal.
 */

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '63aa14ec-de8c-46b3-8949-e9fd221f8d70'
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY

export async function sendNotificationToBarber(barberId: string, title: string, message: string) {
    // Diagnóstico inicial
    if (!ONESIGNAL_REST_API_KEY) {
        console.error('❌ [OneSignal Service] ONESIGNAL_REST_API_KEY no configurado en el servidor (Check environment variables)')
        return { success: false, error: 'API Key missing' }
    }

    if (ONESIGNAL_REST_API_KEY === 'tu-rest-api-key-aqui') {
        console.error('⚠️ [OneSignal Service] ONESIGNAL_REST_API_KEY tiene el valor por defecto (placeholder)')
        return { success: false, error: 'API Key is placeholder' }
    }

    try {
        console.log(`🔔 [OneSignal Service] Preparando notificación para barbero: ${barberId}`)

        const payload = {
            app_id: ONESIGNAL_APP_ID,
            // Identificador interno para el dashboard de OneSignal (Crucial para depurar)
            name: `Reserva: ${barberId.substring(0, 8)} - ${new Date().toLocaleTimeString()}`,
            include_aliases: {
                external_id: [barberId]
            },
            target_channel: "push",
            headings: { en: title, es: title },
            contents: { en: message, es: message },
            // Opcional: Redirigir al panel de citas al hacer clic
            url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/barbero-panel`
        }

        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY.trim()}`
            },
            body: JSON.stringify(payload)
        })

        const data = await response.json()

        if (!response.ok) {
            const errorMsg = data.errors ? data.errors[0] : `Error HTTP ${response.status}`
            console.error(`❌ [OneSignal Service] Fallo en la API (${response.status}):`, errorMsg)
            return {
                success: false,
                error: errorMsg,
                status: response.status,
                details: data
            }
        }

        console.log('✅ [OneSignal Service] Notificación enviada exitosamente:', data)
        return { success: true, data }
    } catch (error) {
        console.error('❌ [OneSignal Service] Error de red o ejecución:', error)
        return { success: false, error: String(error) }
    }
}
