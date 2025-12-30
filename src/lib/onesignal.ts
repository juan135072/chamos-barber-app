/**
 * =====================================================
 * 🔔 ONESIGNAL API SERVICE
 * =====================================================
 * Utilidad para enviar notificaciones push a través de la API REST de OneSignal.
 */

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '63aa14ec-de8c-46b3-8949-e9fd221f8d70'
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY

export async function sendNotificationToBarber(barberId: string, title: string, message: string) {
    if (!ONESIGNAL_REST_API_KEY) {
        console.error('❌ [OneSignal Service] ONESIGNAL_REST_API_KEY no configurado')
        return { success: false, error: 'API Key missing' }
    }

    try {
        console.log(`🔔 [OneSignal Service] Enviando notificación a barbero: ${barberId}`)

        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                include_aliases: {
                    external_id: [barberId]
                },
                target_channel: "push",
                headings: { en: title, es: title },
                contents: { en: message, es: message },
                // Opcional: Redirigir al panel de citas al hacer clic
                url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/barbero-panel`
            })
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.errors ? data.errors[0] : 'Error en la petición a OneSignal')
        }

        console.log('✅ [OneSignal Service] Notificación enviada:', data)
        return { success: true, data }
    } catch (error) {
        console.error('❌ [OneSignal Service] Error al enviar notificación:', error)
        return { success: false, error }
    }
}
