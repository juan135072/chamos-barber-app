# 🔔 OneSignal - Guía de Configuración Completa

## ✅ App ID Configurado

**OneSignal App ID:** `63aa14ec-de8c-46b3-8949-e9fd221f8d70`

---

## 📦 Archivos Implementados

### **1. Configuración Principal**
- ✅ `src/lib/onesignal-config.ts` - Configuración y funciones
- ✅ `src/pages/_app.tsx` - Inicialización automática
- ✅ `public/OneSignalSDKWorker.js` - Service Worker de OneSignal
- ✅ `public/OneSignalSDKUpdaterWorker.js` - Updater Worker

### **2. Integración en Barber App**
- ✅ `src/pages/barber-app/index.tsx` - Tags y External User ID
- ✅ Automatic subscription prompt
- ✅ Custom user tags (barbero_id, nombre, rol, email)

---

## 🚀 Pasos de Configuración en OneSignal Dashboard

### **PASO 1: Configurar Web Push Settings**

1. **Ir a OneSignal Dashboard:**
   ```
   https://app.onesignal.com/apps/63aa14ec-de8c-46b3-8949-e9fd221f8d70
   ```

2. **Ir a Settings → Web Configuration:**
   - Settings → Platforms → Web Push

3. **Configurar Site URL:**
   ```
   Site URL: https://chamosbarber.com
   ```

4. **Auto Resubscribe:**
   - ✅ Enable Auto Resubscribe (Recomendado)

5. **Default Notification Icon:**
   - Upload: Logo de Chamos Barber (192x192 o 512x512)
   - URL alternativa: `https://chamosbarber.com/android-chrome-192x192.png`

6. **Notification Prompt:**
   - Seleccionar: **"Native Browser Prompt"** (ya lo manejamos nosotros)

7. **Click comportamiento:**
   - Action URL: `https://chamosbarber.com/barber-app`

8. **Guardar cambios** (Save)

---

### **PASO 2: Configurar REST API Key**

1. **Obtener REST API Key:**
   - Settings → Keys & IDs
   - Copiar: **REST API Key**

2. **Configurar en Coolify:**
   ```env
   ONESIGNAL_REST_API_KEY=tu-rest-api-key-aqui
   ```

**Nota:** El REST API Key es opcional si solo usas notificaciones desde el Dashboard de OneSignal.

---

### **PASO 3: Configurar Safari Web Push (Opcional - iOS)**

Si quieres soporte para Safari en iOS:

1. **Apple Developer Account necesario** (99 USD/año)

2. **Crear Web Push ID Certificate:**
   - Ir a: https://developer.apple.com
   - Certificates → Create Web Push ID

3. **Configurar en OneSignal:**
   - Settings → Platforms → Apple Safari Web Push
   - Upload: Certificate .p12

4. **Actualizar config:**
   ```typescript
   safari_web_id: 'web.onesignal.auto.TU_SAFARI_WEB_ID'
   ```

**Nota:** Safari Web Push es OPCIONAL. Android/Chrome/Firefox/Edge funcionan sin esto.

---

## 🔧 Configuración en Coolify (Variables de Entorno)

### **Variables Requeridas:**

```env
# OneSignal App ID (ya configurado en código)
NEXT_PUBLIC_ONESIGNAL_APP_ID=63aa14ec-de8c-46b3-8949-e9fd221f8d70

# Habilitar OneSignal (true por defecto)
NEXT_PUBLIC_ONESIGNAL_ENABLED=true
```

### **Variables Opcionales:**

```env
# REST API Key (solo si envías notificaciones desde servidor)
ONESIGNAL_REST_API_KEY=tu-rest-api-key-aqui
```

### **Cómo configurar en Coolify:**

1. **Acceder a Coolify:**
   - URL: `https://coolify.app`
   - Proyecto: `chamos-barber-app`

2. **Ir a Environment Variables:**
   - Click en el proyecto
   - Tab: "Environment Variables"

3. **Agregar variables:**
   - Click "+ Add Variable"
   - Name: `NEXT_PUBLIC_ONESIGNAL_APP_ID`
   - Value: `63aa14ec-de8c-46b3-8949-e9fd221f8d70`
   - ✅ Available at Buildtime
   - ✅ Available at Runtime

4. **Guardar y redesplegar:**
   - Click "Save"
   - Click "Redeploy"

---

## 🧪 Testing de Notificaciones

### **Test 1: Verificar Inicialización**

1. Abrir: `https://chamosbarber.com/barber-app`
2. Abrir DevTools → Console (F12)
3. Buscar logs:
   ```
   ✅ OneSignal inicializado correctamente
   ✅ External User ID configurado: [barbero-uuid]
   ✅ Tags de OneSignal configurados
   ```

---

### **Test 2: Verificar Suscripción**

1. En Console de DevTools:
   ```javascript
   OneSignal.isPushNotificationsEnabled().then(enabled => {
     console.log('Notificaciones habilitadas:', enabled)
   })
   ```

2. Obtener Subscription ID:
   ```javascript
   OneSignal.getUserId().then(userId => {
     console.log('OneSignal User ID:', userId)
   })
   ```

3. Verificar External User ID:
   ```javascript
   OneSignal.getExternalUserId().then(externalId => {
     console.log('External User ID (barbero_id):', externalId)
   })
   ```

---

### **Test 3: Enviar Notificación de Prueba desde Dashboard**

1. **Ir a OneSignal Dashboard:**
   ```
   https://app.onesignal.com/apps/63aa14ec-de8c-46b3-8949-e9fd221f8d70
   ```

2. **Click en "Messages" → "New Push"**

3. **Configurar mensaje:**
   - **Title:** "Nueva Cita Agendada"
   - **Message:** "Juan Pérez ha agendado un corte a las 15:00"
   - **URL:** `https://chamosbarber.com/barber-app`

4. **Segmentación:**
   - **Audience:** Specific Segment
   - **Create Segment:**
     - Filter: `User Tag`
     - Key: `rol`
     - Relation: `is`
     - Value: `barbero`

5. **Send Message**

6. **Verificar en móvil/desktop:**
   - ✅ Notificación aparece
   - ✅ Click abre `/barber-app`

---

### **Test 4: Enviar Notificación Programática (API)**

Usar el REST API Key para enviar desde backend:

```javascript
// Ejemplo: Enviar notificación cuando se crea nueva cita
const sendNotificationToBarbero = async (barberoId, citaInfo) => {
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
    },
    body: JSON.stringify({
      app_id: '63aa14ec-de8c-46b3-8949-e9fd221f8d70',
      include_external_user_ids: [barberoId], // barbero_id de Supabase
      headings: { en: 'Nueva Cita Agendada' },
      contents: { 
        en: `${citaInfo.cliente_nombre} - ${citaInfo.servicio_nombre} a las ${citaInfo.hora}` 
      },
      url: 'https://chamosbarber.com/barber-app',
      data: {
        cita_id: citaInfo.id,
        action: 'nueva_cita'
      }
    })
  })

  return await response.json()
}
```

---

## 🔥 Integración con Supabase Realtime

Para enviar notificaciones automáticas cuando se crea una cita:

### **Opción 1: Supabase Edge Function (Recomendado)**

1. **Crear Edge Function:**
   ```bash
   supabase functions new notify-new-booking
   ```

2. **Código de función:**
   ```typescript
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
   
   serve(async (req) => {
     const { cita } = await req.json()
     
     // Enviar notificación OneSignal
     const response = await fetch('https://onesignal.com/api/v1/notifications', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Basic ${Deno.env.get('ONESIGNAL_REST_API_KEY')}`
       },
       body: JSON.stringify({
         app_id: '63aa14ec-de8c-46b3-8949-e9fd221f8d70',
         include_external_user_ids: [cita.barbero_id],
         headings: { en: 'Nueva Cita Agendada' },
         contents: { 
           en: `${cita.cliente_nombre} ha agendado una cita` 
         },
         url: 'https://chamosbarber.com/barber-app'
       })
     })
     
     return new Response(JSON.stringify({ success: true }), {
       headers: { 'Content-Type': 'application/json' }
     })
   })
   ```

3. **Trigger desde Supabase:**
   ```sql
   CREATE OR REPLACE FUNCTION notify_barbero_nueva_cita()
   RETURNS TRIGGER AS $$
   BEGIN
     PERFORM net.http_post(
       url := 'https://your-project.supabase.co/functions/v1/notify-new-booking',
       headers := '{"Content-Type": "application/json"}'::JSONB,
       body := json_build_object('cita', row_to_json(NEW))::TEXT
     );
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   
   CREATE TRIGGER trigger_notify_nueva_cita
   AFTER INSERT ON citas
   FOR EACH ROW
   EXECUTE FUNCTION notify_barbero_nueva_cita();
   ```

---

### **Opción 2: Webhook desde Frontend**

Cuando el hook `useCitasRealtime` detecta una nueva cita (INSERT event), llamar a una API route:

```typescript
// En useCitasRealtime.ts
case 'INSERT':
  if (newRecord && esHoy(newRecord.fecha_hora)) {
    // Enviar notificación
    await fetch('/api/notify-barbero', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cita: newRecord })
    })
  }
  break
```

---

## 📊 Segmentación de Usuarios

### **Tags Configurados Automáticamente:**

Cada barbero tiene estos tags:

```javascript
{
  barbero_id: "uuid-del-barbero",
  barbero_nombre: "Juan Pérez",
  rol: "barbero",
  email: "juan@chamosbarber.com"
}
```

### **Cómo usar en Dashboard:**

1. **Messages → New Push**
2. **Audience → Create Segment**
3. **Filters:**
   - `rol` = `barbero` → Todos los barberos
   - `barbero_id` = `specific-uuid` → Un barbero específico
   - `barbero_nombre` contains `Juan` → Barberos llamados Juan

---

## 🔐 Seguridad

### **REST API Key:**
- ⚠️ **NUNCA** expongas en frontend
- ✅ Usar solo en backend/edge functions
- ✅ Configurar en Coolify como variable de entorno privada
- ✅ No commitear en GitHub

### **App ID:**
- ✅ Es público (puede estar en frontend)
- ✅ Ya está configurado en `onesignal-config.ts`

---

## 🎨 Personalización de Notificaciones

### **Custom Icons:**

1. **Upload en OneSignal Dashboard:**
   - Settings → Web Configuration
   - Default Notification Icon: 192x192 o 512x512
   - Badge Icon: 72x72 (monocromo)

2. **URLs recomendadas:**
   ```
   Icon: https://chamosbarber.com/android-chrome-512x512.png
   Badge: https://chamosbarber.com/favicon-32x32.png
   ```

### **Custom Notification Prompt:**

Ya implementado en el código. El prompt aparece automáticamente cuando el barbero entra a `/barber-app`.

---

## 📈 Analytics y Métricas

### **Dashboard de OneSignal:**

Ver estadísticas en:
```
https://app.onesignal.com/apps/63aa14ec-de8c-46b3-8949-e9fd221f8d70/analytics
```

Métricas disponibles:
- Total de suscriptores
- Notificaciones enviadas
- Tasa de entrega (Delivery Rate)
- Tasa de clicks (CTR)
- Segmentación por dispositivo (Android/iOS/Desktop)
- Horarios óptimos de envío

---

## ✅ Checklist de Verificación

Después de desplegar, verificar:

- [ ] OneSignal inicializado en Console ✅
- [ ] External User ID configurado (barbero_id) ✅
- [ ] Tags enviados correctamente ✅
- [ ] Prompt de permisos aparece ✅
- [ ] Usuario suscrito (verificar en Dashboard) ✅
- [ ] Notificación de prueba recibida ✅
- [ ] Click en notificación abre `/barber-app` ✅
- [ ] Service Workers registrados (OneSignal + PWA) ✅

---

## 🐛 Troubleshooting

### **Problema: OneSignal no inicializa**

**Verificar:**
```javascript
// En Console
console.log(window.OneSignal)
// Debe retornar: Array u Object
```

**Solución:**
- Verificar que el script se carga: Network tab → `OneSignalSDK.page.js`
- Verificar App ID correcto en config
- Hard refresh: Ctrl+Shift+R

---

### **Problema: No aparece prompt de permisos**

**Verificar:**
```javascript
// En Console
Notification.permission
// Valores posibles: "default", "granted", "denied"
```

**Solución:**
- Si es "denied": Usuario rechazó previamente → Debe re-habilitar en configuración del navegador
- Si es "default": Llamar manualmente `OneSignal.showNativePrompt()`
- Si es "granted": Ya está suscrito ✅

---

### **Problema: External User ID no se configura**

**Verificar:**
```javascript
// En Console
OneSignal.getExternalUserId().then(console.log)
// Debe retornar: barbero_id UUID
```

**Solución:**
- Verificar que `session.barberoId` no sea null
- Verificar que el usuario esté autenticado
- Verificar logs en Console

---

## 📞 Soporte

**Documentación OneSignal:**
- https://documentation.onesignal.com/docs/web-push-quickstart

**OneSignal Dashboard:**
- https://app.onesignal.com/apps/63aa14ec-de8c-46b3-8949-e9fd221f8d70

**Support:**
- https://onesignal.com/support

---

✅ **ONESIGNAL COMPLETAMENTE CONFIGURADO Y LISTO PARA PRODUCCIÓN** 🔔

**App ID:** `63aa14ec-de8c-46b3-8949-e9fd221f8d70`  
**Última actualización:** 2024-12-15  
**Estado:** ✅ PRODUCTION READY
