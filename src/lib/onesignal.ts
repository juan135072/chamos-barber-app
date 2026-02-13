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
        console.warn('⚠️ [OneSignal] ONESIGNAL_REST_API_KEY no configurado. Configúralo en las variables de entorno del servidor.')
        return { success: false, error: 'API Key missing', userMessage: 'Las notificaciones push no están configuradas en el servidor.' }
    }

    if (ONESIGNAL_REST_API_KEY === 'tu-rest-api-key-aqui') {
        console.warn('⚠️ [OneSignal] ONESIGNAL_REST_API_KEY tiene el valor placeholder. Reemplázalo con la clave real.')
        return { success: false, error: 'API Key is placeholder', userMessage: 'Las notificaciones push no están configuradas correctamente.' }
    }

    try {
        const cleanBarberId = barberId.trim()
        if (process.env.NODE_ENV === 'development') console.log(`🔔 [OneSignal] Preparando notificación para barbero: ${cleanBarberId}`)

        const payload: any = {
            app_id: ONESIGNAL_APP_ID,
            name: `Reserva: ${cleanBarberId.substring(0, 8)} - ${new Date().toLocaleTimeString()}`,

            // MÉTODO MODERNO (SDK v16+): Targeting por alias de external_id
            include_aliases: {
                external_id: [cleanBarberId]
            },

            // MÉTODO LEGACY (Añadido de nuevo como respaldo mientras se soluciona el estado de suscripción)
            include_external_user_ids: [cleanBarberId],

            target_channel: "push",
            headings: { en: title, es: title },
            contents: { en: message, es: message },
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

        if (process.env.NODE_ENV === 'development') console.log('✅ [OneSignal] Notificación enviada:', data)
        return { success: true, data }
    } catch (error) {
        console.error('❌ [OneSignal Service] Error de red o ejecución:', error)
        return { success: false, error: String(error) }
    }
}
