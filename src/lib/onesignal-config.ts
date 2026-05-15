// ================================================================
// 📱 ONE SIGNAL - Configuración de Push Notifications
// Configurado para Chamos Barber
// ================================================================

export const ONE_SIGNAL_CONFIG = {
  appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '63aa14ec-de8c-46b3-8949-e9fd221f8d70',
  restApiKey: process.env.ONESIGNAL_REST_API_KEY || '',
  enabled: process.env.NEXT_PUBLIC_ONESIGNAL_ENABLED !== 'false' // Habilitado por defecto
}

// ================================================================
// FUNCIONES DE UTILIDAD PARA ONESIGNAL
// ================================================================

/**
 * Inicializar OneSignal usando el Web SDK directo
 * Se llama automáticamente desde _app.tsx
 */
export const initOneSignal = () => {
  if (!ONE_SIGNAL_CONFIG.enabled) {
    console.log('⚠️ OneSignal no está habilitado en este entorno')
    return
  }

  if (typeof window === 'undefined') {
    console.log('⚠️ OneSignal solo funciona en el navegador')
    return
  }

  try {
    // Cargar el SDK de OneSignal desde CDN
    if (!(window as any).OneSignal) {
      const script = document.createElement('script')
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
      script.async = true
      script.defer = true
      document.head.appendChild(script)

      script.onload = () => {
        initOneSignalSDK()
      }
    } else {
      initOneSignalSDK()
    }
  } catch (error) {
    console.error('❌ Error al cargar OneSignal:', error)
  }
}

/**
 * Inicializar el SDK de OneSignal
 */
const initOneSignalSDK = () => {
  if (typeof window === 'undefined') return

  const OneSignal = (window as any).OneSignal || []

  OneSignal.push(() => {
    OneSignal.init({
      appId: ONE_SIGNAL_CONFIG.appId,
      safari_web_id: 'web.onesignal.auto.YOUR_SAFARI_WEB_ID', // Actualizar si tienes Safari Web ID
      notifyButton: {
        enable: false // Usamos nuestro propio UI
      },
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
      autoResubscribe: true,
      persistNotification: false,
      welcomeNotification: {
        disable: true // Deshabilitamos el mensaje de bienvenida por defecto
      }
    })

    console.log('✅ OneSignal inicializado correctamente')

    // Eventos de OneSignal
    OneSignal.on('subscriptionChange', (isSubscribed: boolean) => {
      console.log('🔔 Cambio de suscripción:', isSubscribed)
    })

    OneSignal.on('notificationDisplay', (event: any) => {
      console.log('📬 Notificación mostrada:', event)
    })

    OneSignal.on('notificationDismiss', (event: any) => {
      console.log('❌ Notificación descartada:', event)
    })
  })
}

/**
 * Solicitar permisos de notificación
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!ONE_SIGNAL_CONFIG.enabled) {
    console.log('⚠️ OneSignal no está habilitado')
    return false
  }

  try {
    // @ts-ignore - OneSignal se cargará dinámicamente en producción
    const OneSignal = (await import('react-onesignal')).default
    await OneSignal.showNativePrompt()
    const permission = await OneSignal.getNotificationPermission()
    console.log('🔔 Permiso de notificaciones:', permission)
    return permission === 'granted'
  } catch (error) {
    console.error('❌ Error al solicitar permisos:', error)
    return false
  }
}

/**
 * Enviar tag a OneSignal (ej: barbero_id)
 */
export const setUserTag = async (key: string, value: string) => {
  if (!ONE_SIGNAL_CONFIG.enabled) return

  try {
    // @ts-ignore - OneSignal se cargará dinámicamente en producción
    const OneSignal = (await import('react-onesignal')).default
    await OneSignal.sendTag(key, value)
    console.log(`✅ Tag enviado: ${key} = ${value}`)
  } catch (error) {
    console.error('❌ Error al enviar tag:', error)
  }
}

/**
 * Enviar notificación desde servidor (usar en API routes)
 */
export const sendPushNotification = async (
  userIds: string[],
  title: string,
  message: string,
  data?: Record<string, any>
) => {
  if (!ONE_SIGNAL_CONFIG.enabled) {
    console.log('⚠️ OneSignal no está habilitado')
    return
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONE_SIGNAL_CONFIG.restApiKey}`
      },
      body: JSON.stringify({
        app_id: ONE_SIGNAL_CONFIG.appId,
        include_player_ids: userIds,
        headings: { en: title },
        contents: { en: message },
        data: data || {}
      })
    })

    const result = await response.json()
    console.log('✅ Notificación enviada:', result)
    return result
  } catch (error) {
    console.error('❌ Error al enviar notificación:', error)
  }
}

// ================================================================
// FALLBACK: WEB PUSH API NATIVA (sin OneSignal)
// ================================================================

/**
 * Solicitar permisos usando Web Push API nativa
 */
export const requestNativeNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.error('❌ Este navegador no soporta notificaciones')
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    console.log('🔔 Permiso nativo:', permission)
    return permission === 'granted'
  } catch (error) {
    console.error('❌ Error al solicitar permisos nativos:', error)
    return false
  }
}

/**
 * Mostrar notificación local (sin servidor)
 */
export const showLocalNotification = (title: string, body: string, data?: any) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.log('⚠️ Permisos de notificación no concedidos')
    return
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      tag: 'barber-app-local',
      requireInteraction: false,
      data
    })

    notification.onclick = () => {
      window.focus()
      if (data?.url) {
        window.location.href = data.url
      }
      notification.close()
    }

    console.log('✅ Notificación local mostrada')
  } catch (error) {
    console.error('❌ Error al mostrar notificación local:', error)
  }
}

// ================================================================
// INSTRUCCIONES DE CONFIGURACIÓN
// ================================================================

/*
📱 CONFIGURACIÓN DE ONESIGNAL EN PRODUCCIÓN

1️⃣ Registro en OneSignal:
   - Ir a: https://onesignal.com
   - Crear cuenta gratuita
   - Crear nuevo proyecto "Web Push"
   - Seleccionar "Website Push"

2️⃣ Configuración de sitio web:
   - Site Name: "Chamos Barber"
   - Site URL: "https://chamosbarber.com"
   - Auto Resubscribe: Habilitado
   - Default Notification Icon: Subir logo

3️⃣ Obtener credenciales:
   - App ID: Copiar desde Settings > Keys & IDs
   - REST API Key: Copiar desde Settings > Keys & IDs

4️⃣ Configurar en Coolify (Variables de entorno):
   NEXT_PUBLIC_ONESIGNAL_APP_ID=abc123-def456-ghi789
   ONESIGNAL_REST_API_KEY=YourRestApiKey123
   NEXT_PUBLIC_ONESIGNAL_ENABLED=true

5️⃣ Desplegar archivos de OneSignal:
   - Descargar OneSignalSDKWorker.js desde OneSignal Dashboard
   - Colocar en /public/OneSignalSDKWorker.js

6️⃣ Configurar Supabase Realtime para enviar notificaciones:
   - Crear función SQL que llame a API de OneSignal
   - Trigger en INSERT de tabla 'citas'

7️⃣ Testing:
   - Usar OneSignal Dashboard > Messages > New Push
   - Enviar mensaje de prueba
   - Verificar recepción en dispositivos suscritos

📝 ALTERNATIVA SIN ONESIGNAL:
   - Usar Web Push API nativa (ya incluida arriba)
   - Configurar VAPID keys propias
   - Implementar servidor de push notifications propio
*/
