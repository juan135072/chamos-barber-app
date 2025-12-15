# 🔔 Configuración de OneSignal para Barber App

## 📋 Pasos para Configurar Notificaciones Push

### **Paso 1: Crear Cuenta en OneSignal**

1. Ve a: https://onesignal.com/
2. Crea una cuenta gratuita
3. Inicia sesión

---

### **Paso 2: Crear Nueva App**

1. En el dashboard, clic en **"New App/Website"**
2. Nombre de la app: `Chamos Barber App`
3. Seleccionar: **"Web Push"**

---

### **Paso 3: Configurar Web Push**

#### A. Configuración del Sitio

1. **Site Name:** `chamosbarber.com`
2. **Site URL:** `https://chamosbarber.com`
3. **Default Icon URL:** `https://chamosbarber.com/android-chrome-192x192.png`
4. **Auto Resubscribe:** Activar (✅)
5. **Label para botón:** "Recibir Notificaciones"

#### B. Configuración de Welcome Notification

1. **Title:** "¡Bienvenido a Chamos Barber!"
2. **Message:** "Recibirás notificaciones cuando tengas nuevas citas"
3. **URL:** `https://chamosbarber.com/barber-app`

---

### **Paso 4: Obtener Credenciales**

Después de crear la app, OneSignal te dará:

1. **App ID** (ejemplo: `12345678-1234-1234-1234-123456789abc`)
2. **REST API Key** (ejemplo: `YourRestApiKeyHere`)

**⚠️ GUARDAR ESTAS CREDENCIALES**

---

### **Paso 5: Configurar en Coolify**

Agregar estas variables de entorno en Coolify:

```bash
NEXT_PUBLIC_ONESIGNAL_APP_ID=12345678-1234-1234-1234-123456789abc
ONESIGNAL_REST_API_KEY=YourRestApiKeyHere
```

**Asegurar que estén marcadas:**
- ✅ Available at Buildtime
- ✅ Available at Runtime

---

### **Paso 6: Integrar OneSignal SDK**

#### Instalar el paquete:

```bash
npm install react-onesignal
```

#### Crear archivo de configuración: `src/lib/onesignal.ts`

```typescript
import OneSignal from 'react-onesignal'

export async function initOneSignal() {
  if (typeof window === 'undefined') return

  try {
    await OneSignal.init({
      appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
      notificationClickHandlerMatch: 'origin',
      notificationClickHandlerAction: 'navigate',
      serviceWorkerParam: { scope: '/push/onesignal/' },
      serviceWorkerPath: '/OneSignalSDKWorker.js'
    })

    console.log('✅ OneSignal inicializado')

    // Solicitar permisos
    const permission = await OneSignal.Notifications.requestPermission()
    console.log('📬 Permisos de notificación:', permission)

    // Obtener Player ID (identificador único del dispositivo)
    const playerId = await OneSignal.User.PushSubscription.id
    console.log('🆔 Player ID:', playerId)

    return playerId
  } catch (error) {
    console.error('❌ Error inicializando OneSignal:', error)
  }
}

export async function setExternalUserId(userId: string) {
  try {
    await OneSignal.login(userId)
    console.log('✅ Usuario identificado en OneSignal:', userId)
  } catch (error) {
    console.error('❌ Error identificando usuario:', error)
  }
}

export async function sendNotification(
  playerIds: string[],
  heading: string,
  content: string,
  data?: any
) {
  const apiKey = process.env.ONESIGNAL_REST_API_KEY!
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        include_player_ids: playerIds,
        headings: { en: heading, es: heading },
        contents: { en: content, es: content },
        data: data || {},
        web_url: 'https://chamosbarber.com/barber-app',
        chrome_web_icon: 'https://chamosbarber.com/android-chrome-192x192.png'
      })
    })

    const result = await response.json()
    console.log('✅ Notificación enviada:', result)
    return result
  } catch (error) {
    console.error('❌ Error enviando notificación:', error)
    throw error
  }
}
```

#### Inicializar en `src/pages/barber-app/index.tsx`:

```typescript
import { useEffect } from 'react'
import { initOneSignal, setExternalUserId } from '../../lib/onesignal'

export default function BarberAppPage() {
  const { session } = useBarberAppAuth()

  useEffect(() => {
    if (session?.barberoId) {
      initOneSignal().then((playerId) => {
        if (playerId) {
          // Identificar al barbero en OneSignal
          setExternalUserId(session.barberoId)
          
          // Guardar el playerId en la base de datos (opcional)
          // para poder enviar notificaciones específicas
        }
      })
    }
  }, [session])

  // ... resto del código
}
```

---

### **Paso 7: Enviar Notificaciones desde Backend (n8n)**

#### Usando Webhook o API Call en n8n:

**Endpoint:** `POST https://onesignal.com/api/v1/notifications`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Basic YOUR_REST_API_KEY"
}
```

**Body:**
```json
{
  "app_id": "YOUR_APP_ID",
  "filters": [
    {
      "field": "tag",
      "key": "barbero_id",
      "relation": "=",
      "value": "BARBERO_UUID_HERE"
    }
  ],
  "headings": {
    "en": "Nueva Cita Agendada",
    "es": "Nueva Cita Agendada"
  },
  "contents": {
    "en": "Cliente: Juan Pérez - Hora: 15:00",
    "es": "Cliente: Juan Pérez - Hora: 15:00"
  },
  "data": {
    "cita_id": "CITA_UUID",
    "action": "nueva_cita"
  },
  "web_url": "https://chamosbarber.com/barber-app",
  "chrome_web_icon": "https://chamosbarber.com/android-chrome-192x192.png"
}
```

---

### **Paso 8: Configurar Tags en OneSignal**

Cuando un barbero inicie sesión, asignarle tags:

```typescript
import OneSignal from 'react-onesignal'

// En useEffect después de autenticación
OneSignal.User.addTags({
  barbero_id: session.barberoId,
  barbero_nombre: session.barbero.nombre,
  rol: 'barbero'
})
```

---

### **Paso 9: Probar Notificaciones**

#### Prueba Manual desde OneSignal Dashboard:

1. Ve al dashboard de OneSignal
2. Clic en **"Messages"** → **"Push"** → **"New Push"**
3. **Audience:** "Test Users" o "Particular Segments"
4. **Title:** "Prueba de Notificación"
5. **Message:** "Esta es una notificación de prueba"
6. **Launch URL:** `https://chamosbarber.com/barber-app`
7. **Send**

#### Prueba desde Código:

```typescript
import { sendNotification } from '../../lib/onesignal'

// Enviar notificación de prueba
await sendNotification(
  ['PLAYER_ID_DEL_BARBERO'],
  'Nueva Cita',
  'Tienes una nueva cita con Juan Pérez a las 15:00',
  {
    cita_id: 'uuid-de-la-cita',
    cliente: 'Juan Pérez',
    hora: '15:00'
  }
)
```

---

## 🔄 Integración con Supabase Realtime

Para enviar notificaciones automáticamente cuando se crea una cita:

### Opción 1: Trigger en Supabase + Webhook a n8n

```sql
CREATE OR REPLACE FUNCTION notify_nueva_cita()
RETURNS TRIGGER AS $$
BEGIN
  -- Llamar webhook de n8n que envía notificación OneSignal
  PERFORM net.http_post(
    url := 'https://tu-n8n.com/webhook/nueva-cita',
    body := jsonb_build_object(
      'barbero_id', NEW.barbero_id,
      'cita_id', NEW.id,
      'cliente_nombre', NEW.cliente_nombre,
      'fecha_hora', NEW.fecha_hora
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_nueva_cita
  AFTER INSERT ON public.citas
  FOR EACH ROW
  EXECUTE FUNCTION notify_nueva_cita();
```

### Opción 2: Desde el Frontend (cuando admin crea cita)

```typescript
// Después de crear la cita exitosamente
const { data: cita } = await supabase
  .from('citas')
  .insert({...})
  .select()
  .single()

// Enviar notificación al barbero
await sendNotification(
  [barberoPlayerId], // Obtener de la BD
  'Nueva Cita Agendada',
  `${cita.cliente_nombre} - ${formatHora(cita.fecha_hora)}`,
  {
    cita_id: cita.id,
    action: 'nueva_cita'
  }
)
```

---

## 📊 Eventos a Notificar

1. **Nueva Cita Creada**
   - Título: "Nueva Cita Agendada"
   - Mensaje: "Cliente: [Nombre] - Hora: [HH:MM]"

2. **Cita Cancelada**
   - Título: "Cita Cancelada"
   - Mensaje: "La cita con [Nombre] a las [HH:MM] fue cancelada"

3. **Recordatorio (30 min antes)**
   - Título: "Próxima Cita en 30 Minutos"
   - Mensaje: "Cliente: [Nombre] - Hora: [HH:MM]"

4. **Cita Completada (opcional)**
   - Título: "Cita Completada"
   - Mensaje: "Se completó la cita con [Nombre]"

---

## 🎯 Próximos Pasos

1. ✅ Registrar cuenta en OneSignal
2. ✅ Obtener App ID y REST API Key
3. ✅ Agregar variables de entorno en Coolify
4. ✅ Instalar `react-onesignal`
5. ✅ Crear archivo `src/lib/onesignal.ts`
6. ✅ Inicializar OneSignal en Barber App
7. ✅ Configurar tags para barberos
8. ✅ Integrar con n8n para notificaciones automáticas
9. ✅ Probar notificaciones

---

## 🆘 Troubleshooting

### Problema: No se reciben notificaciones

**Soluciones:**
1. Verificar que el sitio use HTTPS
2. Verificar permisos del navegador
3. Verificar que OneSignal esté inicializado
4. Revisar consola del navegador (F12)
5. Verificar Player ID del usuario en OneSignal dashboard

### Problema: Error de CORS

**Solución:** OneSignal maneja CORS automáticamente. Si hay error, verificar que la URL del sitio sea correcta en la configuración.

---

**Documentación Oficial:** https://documentation.onesignal.com/docs/web-push-quickstart

**Dashboard OneSignal:** https://app.onesignal.com/

---

**Estado:** 📝 Documentación completa - Pendiente implementación
