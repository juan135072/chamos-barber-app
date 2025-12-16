# 🔔 OneSignal Integration - Chamos Barber App

## ✅ Integración Completada

OneSignal está **completamente integrado** con la app de Chamos Barber con las siguientes características:

### 📦 Configuración

- **App ID**: `63aa14ec-de8c-46b3-8949-e9fd221f8d70`
- **Variable de entorno**: `NEXT_PUBLIC_ONESIGNAL_APP_ID`
- **SDK Version**: v16 (CDN)
- **Framework**: Next.js 14

### ✨ Características Implementadas

#### 1. **Inicialización Automática**
- ✅ Se inicializa en `_app.tsx` mediante `OneSignalProvider`
- ✅ Usa la variable de entorno `NEXT_PUBLIC_ONESIGNAL_APP_ID`
- ✅ Configuración automática del SDK al cargar la app

#### 2. **Solicitud Automática de Permisos**
- ✅ **Auto-prompt habilitado**: Se muestra automáticamente 2 segundos después de cargar
- ✅ Prompt personalizado con diseño dark/gold acorde a la app
- ✅ Botones de "Permitir" y "Ahora No"
- ✅ El usuario puede aceptar o cerrar el prompt

#### 3. **Configuración de Usuario**
- ✅ **External User ID**: Se establece el `barbero_id` como identificador único
- ✅ **Tags personalizados**:
  - `barbero_id`: UUID del barbero
  - `barbero_nombre`: Nombre completo del barbero
  - `rol`: "barbero"
  - `email`: Email del usuario

#### 4. **Panel de Debug (Solo Desarrollo)**
- ✅ Botón flotante dorado en esquina inferior derecha
- ✅ Muestra estado del SDK (ready/error/loading)
- ✅ Muestra permisos de notificación (granted/denied/default)
- ✅ Muestra información de suscripción (Subscription ID, External User ID)
- ✅ Muestra tags personalizados configurados
- ✅ Botón para solicitar permisos manualmente
- ✅ Botón para enviar notificación de prueba local
- ✅ Enlaces directos al Dashboard de OneSignal

#### 5. **Service Workers**
- ✅ `OneSignalSDKWorker.js` (worker principal)
- ✅ `OneSignalSDKUpdaterWorker.js` (worker de actualización)
- ✅ `sw.js` (service worker de PWA)

### 📁 Archivos Importantes

```
/src/components/providers/OneSignalProvider.tsx    # Provider principal
/src/components/debug/OneSignalDebugPanel.tsx      # Panel de debug
/src/pages/_app.tsx                                # Integración global
/public/OneSignalSDKWorker.js                      # Worker de OneSignal
/public/OneSignalSDKUpdaterWorker.js               # Worker de actualización
/.env.local                                        # Variables de entorno (local)
/.env.example                                      # Plantilla de variables
```

### 🚀 Cómo Probar

#### En Desarrollo Local

1. **Iniciar el servidor de desarrollo**:
   ```bash
   cd /home/user/webapp && npm run dev
   ```

2. **Abrir la app en el navegador**:
   ```
   http://localhost:3000
   ```

3. **Verificar inicialización**:
   - Abre la consola del navegador (F12)
   - Deberías ver logs como:
     ```
     🔔 Inicializando OneSignal...
     📱 App ID: 63aa14ec-de8c-46b3-8949-e9fd221f8d70
     ✅ OneSignal inicializado correctamente
     🔔 Estado de permisos: default
     ```

4. **Probar prompt automático**:
   - Espera 2 segundos después de cargar la página
   - Aparecerá un popup dorado pidiendo permisos
   - Haz clic en "Permitir Notificaciones"
   - El navegador mostrará el diálogo nativo de permisos
   - Acepta los permisos

5. **Usar el Panel de Debug**:
   - Haz clic en el botón flotante dorado (esquina inferior derecha)
   - Verás el estado completo de OneSignal
   - Puedes solicitar permisos manualmente
   - Puedes enviar notificaciones de prueba locales
   - Verás tu Subscription ID y External User ID

6. **Verificar configuración de usuario** (en `/barber-app`):
   - Inicia sesión como barbero
   - Ve a `/barber-app`
   - En la consola verás:
     ```
     ✅ External User ID configurado: <barbero_uuid>
     ✅ Tags de OneSignal configurados
     ```

#### En Producción

1. **Configurar Variables de Entorno en Coolify**:
   ```bash
   NEXT_PUBLIC_ONESIGNAL_APP_ID=63aa14ec-de8c-46b3-8949-e9fd221f8d70
   ```

2. **Configurar OneSignal Dashboard**:
   - Ve a: https://app.onesignal.com/apps/63aa14ec-de8c-46b3-8949-e9fd221f8d70
   - En **Settings** > **Web Configuration**:
     - **Site URL**: `https://chamosbarber.com`
     - **Default Notification Icon**: Sube un icono (192x192px)
     - **Auto Resubscribe**: Habilitado

3. **Verificar en Producción**:
   - Abre `https://chamosbarber.com`
   - Sigue los mismos pasos que en desarrollo local
   - El panel de debug NO aparecerá en producción (solo en desarrollo)

4. **Enviar Notificación de Prueba**:
   - Ve al Dashboard: https://app.onesignal.com/apps/63aa14ec-de8c-46b3-8949-e9fd221f8d70/notifications/new
   - Selecciona "Send to Subscribed Users"
   - O filtra por tags: `barbero_id` = `<uuid_del_barbero>`
   - Escribe el mensaje y envía
   - La notificación llegará al dispositivo del barbero

### 🔍 Debugging

#### Ver Estado en Consola

```javascript
// Verificar si OneSignal está cargado
console.log(window.OneSignal)

// Ver permisos
OneSignal.Notifications.permission.then(p => console.log('Permisos:', p))

// Ver si está suscrito
OneSignal.User.PushSubscription.optedIn.then(s => console.log('Suscrito:', s))

// Ver Subscription ID
OneSignal.User.PushSubscription.id.then(id => console.log('Subscription ID:', id))

// Ver External User ID
OneSignal.User.externalId.then(id => console.log('External User ID:', id))

// Ver tags
OneSignal.User.getTags().then(tags => console.log('Tags:', tags))
```

#### Verificar Service Workers

```javascript
// Ver service workers activos
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => console.log('SW Scope:', reg.scope))
})
```

### 📊 Dashboard de OneSignal

**URL**: https://app.onesignal.com/apps/63aa14ec-de8c-46b3-8949-e9fd221f8d70

**Funciones principales**:

1. **Messages** > **New Push**: Enviar notificaciones
2. **Audience** > **All Users**: Ver usuarios suscritos
3. **Audience** > **Segments**: Crear segmentos por tags
4. **Settings** > **Web Configuration**: Configuración web
5. **Analytics**: Ver estadísticas de entregas y clicks

### 🎯 Segmentación de Usuarios

Los barberos están segmentados automáticamente con:

```javascript
{
  barbero_id: "<uuid>",           // Identificador único del barbero
  barbero_nombre: "Juan Pérez",   // Nombre completo
  rol: "barbero",                 // Rol del usuario
  email: "juan@example.com"       // Email
}
```

**Para enviar notificaciones a un barbero específico**:

1. Ve al Dashboard de OneSignal
2. New Push > Audience > Segments
3. Selecciona "User Tag" filter
4. Tag: `barbero_id` = `<uuid_del_barbero>`
5. Envía la notificación

### 📝 Notas Importantes

1. **HTTPS requerido**: OneSignal requiere HTTPS en producción
2. **Service Workers**: Deben estar en la raíz del dominio (`/`)
3. **Permisos persistentes**: Una vez concedidos, los permisos persisten
4. **Prompt bloqueado**: Si el usuario rechaza, debe permitir manualmente desde configuración del navegador
5. **Testing**: En desarrollo local, usa `localhost` (no `127.0.0.1`)

### 🆘 Solución de Problemas

#### OneSignal no se inicializa

- Verifica que `NEXT_PUBLIC_ONESIGNAL_APP_ID` esté configurado
- Revisa la consola del navegador para errores
- Asegúrate de que el script se cargue desde CDN

#### No aparece el prompt de permisos

- Verifica que `autoPrompt={true}` en `_app.tsx`
- Revisa si los permisos ya fueron concedidos o denegados anteriormente
- Limpia el almacenamiento del navegador y recarga

#### No llegan notificaciones

- Verifica que el usuario esté suscrito
- Revisa el Dashboard de OneSignal > Audience
- Asegúrate de que el dispositivo esté online
- Verifica que los permisos estén concedidos

#### Service Worker no se registra

- Verifica que los archivos estén en `/public/`
- Revisa la consola para errores de registro
- Asegúrate de usar HTTPS (o localhost en desarrollo)

### ✅ Checklist de Verificación

- [x] OneSignal SDK cargado desde CDN
- [x] `NEXT_PUBLIC_ONESIGNAL_APP_ID` configurado
- [x] `OneSignalProvider` en `_app.tsx`
- [x] Auto-prompt habilitado y funcionando
- [x] Permisos se solicitan automáticamente
- [x] External User ID configurado (barbero_id)
- [x] Tags personalizados configurados
- [x] Service Workers creados y registrados
- [x] Panel de debug implementado (desarrollo)
- [x] Documentación completa

### 🎉 ¡Listo para Producción!

La integración de OneSignal está **100% completa** y lista para usar en producción.

**Próximos pasos**:

1. Configurar variables de entorno en Coolify
2. Configurar el Dashboard de OneSignal (Site URL, Icon)
3. Desplegar a producción
4. Probar notificaciones con un barbero real
5. Monitorear entregas en el Dashboard

---

**Documentación oficial**: https://documentation.onesignal.com/docs/web-push-quickstart
