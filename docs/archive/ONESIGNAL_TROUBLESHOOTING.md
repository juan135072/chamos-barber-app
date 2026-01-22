# 🔧 OneSignal Troubleshooting

## ❓ "Me pide instalar la app, no me pregunta por notificaciones"

### Problema
El navegador muestra el prompt de instalación de PWA en lugar del prompt de notificaciones de OneSignal.

### Causa
Hay dos service workers compitiendo:
1. `sw.js` - Service Worker de PWA general
2. `OneSignalSDKWorker.js` - Service Worker de OneSignal

El navegador registra `sw.js` primero y bloquea el registro de OneSignal.

### ✅ Solución Aplicada (Commit `[HASH]`)

**1. Desregistrar `sw.js` en `_app.tsx`**
```typescript
// Antes:
navigator.serviceWorker.register('/sw.js')

// Ahora:
// Limpia sw.js para evitar conflictos con OneSignal
navigator.serviceWorker.getRegistrations().then((registrations) => {
  registrations.forEach((registration) => {
    if (registration.active?.scriptURL.includes('/sw.js')) {
      registration.unregister()
    }
  })
})
```

**2. Corrección del path del Service Worker de OneSignal**
```typescript
// Antes:
serviceWorkerPath: 'OneSignalSDKWorker.js'

// Ahora:
serviceWorkerPath: '/OneSignalSDKWorker.js'
```

---

## 🧪 Cómo Verificar que Funciona

### Paso 1: Limpiar el caché del navegador
1. Abre DevTools (F12)
2. Application → Storage → Clear site data
3. Marca todo y haz clic en "Clear site data"
4. Cierra y vuelve a abrir el navegador

### Paso 2: Verificar service workers activos
1. Abre DevTools (F12)
2. Application → Service Workers
3. Deberías ver solo **OneSignalSDKWorker.js** activo
4. Si ves `sw.js`, desregístralo manualmente

### Paso 3: Verificar el prompt de OneSignal
1. Abre `https://chamosbarber.com`
2. Espera **2 segundos**
3. Deberías ver el **popup dorado** de OneSignal
4. NO deberías ver el prompt de "Instalar app"

---

## 🔍 Debugging Avanzado

### Ver service workers activos (Consola)
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => {
    console.log('SW:', reg.active?.scriptURL)
    console.log('Scope:', reg.scope)
  })
})
```

**Output esperado:**
```
SW: https://chamosbarber.com/OneSignalSDKWorker.js
Scope: https://chamosbarber.com/
```

### Desregistrar todos los service workers (Emergencia)
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => {
    console.log('Desregistrando:', reg.active?.scriptURL)
    reg.unregister()
  })
  console.log('✅ Todos los SW desregistrados. Recarga la página.')
})
```

### Verificar OneSignal está inicializado
```javascript
console.log('OneSignal:', window.OneSignal)
OneSignal.Notifications.permission.then(p => console.log('Permisos:', p))
```

---

## 🚨 Problemas Comunes

### 1. ❌ Sigue apareciendo el prompt de instalación

**Causa**: El caché del navegador tiene `sw.js` registrado

**Solución**:
1. Application → Clear site data
2. Desregistra manualmente `sw.js` en Application → Service Workers
3. Recarga con Ctrl+Shift+R (hard reload)

### 2. ❌ No aparece ningún prompt

**Causa**: Los permisos ya fueron concedidos o denegados anteriormente

**Solución**:
1. Chrome: Configuración → Privacidad y seguridad → Configuración del sitio → chamosbarber.com
2. Encuentra "Notificaciones"
3. Cambia a "Preguntar (predeterminado)"
4. Recarga la página

### 3. ❌ OneSignal no se inicializa

**Causa**: El SDK no se cargó correctamente

**Solución**:
```javascript
// En consola:
console.log('OneSignalDeferred:', window.OneSignalDeferred)
console.log('OneSignal:', window.OneSignal)
```

Si ambos son `undefined`:
- Verifica que el script de CDN se esté cargando
- Revisa Network tab en DevTools
- Busca `OneSignalSDK.page.js`

### 4. ❌ "Service Worker registration failed"

**Causa**: El archivo `OneSignalSDKWorker.js` no existe o tiene error

**Solución**:
```bash
# Verificar que existe
curl https://chamosbarber.com/OneSignalSDKWorker.js

# Debería retornar:
# importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js');
```

---

## 📋 Checklist de Verificación

Después del deployment, verifica:

- [ ] `sw.js` NO está registrado
- [ ] `OneSignalSDKWorker.js` SÍ está registrado
- [ ] El popup dorado aparece después de 2 segundos
- [ ] El navegador NO pide instalar la app
- [ ] Se puede aceptar/rechazar notificaciones
- [ ] En consola: `✅ OneSignal inicializado correctamente`
- [ ] Application → Service Workers muestra solo OneSignal

---

## 🎯 Comportamiento Esperado

### Primera Visita
```
1. Usuario abre chamosbarber.com
2. OneSignal se inicializa (1-2s)
3. Aparece popup dorado (2s después)
4. Usuario hace clic en "Permitir Notificaciones"
5. Navegador muestra diálogo nativo
6. Usuario acepta
7. ✅ Suscrito a notificaciones
```

### Visitas Posteriores
```
1. Usuario abre chamosbarber.com
2. OneSignal detecta permisos ya concedidos
3. NO muestra popup (ya está suscrito)
4. Listo para recibir notificaciones
```

---

## 🔗 Links Útiles

- **Dashboard OneSignal**: https://app.onesignal.com/apps/63aa14ec-de8c-46b3-8949-e9fd221f8d70
- **Service Workers (Chrome)**: chrome://serviceworker-internals/
- **Permisos del Sitio (Chrome)**: chrome://settings/content/siteDetails?site=https://chamosbarber.com

---

## 📞 Soporte

Si después de seguir todos estos pasos OneSignal no funciona:

1. Limpia completamente el caché
2. Prueba en modo incógnito
3. Prueba en otro navegador
4. Verifica que `NEXT_PUBLIC_ONESIGNAL_APP_ID` esté configurado en Coolify
5. Revisa logs en OneSignal Dashboard

---

**Última actualización**: Diciembre 2024
