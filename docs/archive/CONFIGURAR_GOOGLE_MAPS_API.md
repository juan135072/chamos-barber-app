# 🗺️ Configuración de Google Maps API - Chamos Barber

## 📋 Guía Completa para Configurar Google Maps Embed

---

## 🎯 Objetivo

Configurar correctamente la API de Google Maps para mostrar el mapa de ubicación en la página de inicio de **Chamos Barber**.

---

## 📍 Información de la Ubicación

```
Dirección: Rancagua 759
Ciudad: San Fernando
Región: O'Higgins
País: Chile
Coordenadas: -34.5885, -70.9912
```

---

## 🔧 Paso 1: Crear Proyecto en Google Cloud Console

### 1.1 Acceder a Google Cloud Console

```
URL: https://console.cloud.google.com/
```

1. Inicia sesión con tu cuenta de Google
2. Si es tu primera vez, acepta los términos de servicio

### 1.2 Crear Nuevo Proyecto

1. Clic en el **selector de proyectos** (arriba a la izquierda)
2. Clic en **"Nuevo Proyecto"** (New Project)
3. **Nombre del proyecto:** `chamos-barber-maps`
4. **Organización:** Dejar en blanco (o seleccionar si tienes una)
5. Clic en **"Crear"** (Create)
6. Esperar ~1 minuto a que se cree el proyecto

---

## 🔑 Paso 2: Habilitar Maps JavaScript API

### 2.1 Ir a la Biblioteca de APIs

```
URL: https://console.cloud.google.com/apis/library
```

O navegar manualmente:
1. Menú hamburguesa (☰) → **"APIs y servicios"** → **"Biblioteca"**

### 2.2 Buscar y Habilitar APIs

Necesitas habilitar **3 APIs**:

#### API 1: Maps Embed API

1. En el buscador, escribir: **"Maps Embed API"**
2. Clic en **"Maps Embed API"**
3. Clic en **"Habilitar"** (Enable)
4. Esperar a que se active

#### API 2: Maps JavaScript API

1. Volver a la biblioteca
2. Buscar: **"Maps JavaScript API"**
3. Clic en **"Maps JavaScript API"**
4. Clic en **"Habilitar"** (Enable)

#### API 3: Geocoding API (Opcional, pero recomendado)

1. Volver a la biblioteca
2. Buscar: **"Geocoding API"**
3. Clic en **"Geocoding API"**
4. Clic en **"Habilitar"** (Enable)

---

## 🔐 Paso 3: Crear Clave de API (API Key)

### 3.1 Ir a Credenciales

```
URL: https://console.cloud.google.com/apis/credentials
```

O navegar:
1. Menú hamburguesa (☰) → **"APIs y servicios"** → **"Credenciales"**

### 3.2 Crear Nueva Clave

1. Clic en **"+ Crear credenciales"** (Create Credentials)
2. Seleccionar **"Clave de API"** (API Key)
3. Se creará una clave, ejemplo: `AIzaSyD1234567890abcdefghijklmnopqrstuv`
4. **⚠️ NO CERRAR LA VENTANA AÚN**

---

## 🔒 Paso 4: Restringir la Clave de API (Seguridad)

### 4.1 Configurar Restricciones de Aplicación

1. En la ventana de la clave creada, clic en **"Restringir clave"** (Restrict Key)
2. O en la lista de credenciales, clic en el lápiz ✏️ de editar

### 4.2 Restricción por HTTP referrers (sitios web)

1. En **"Restricciones de aplicación"**, seleccionar:
   - ✅ **"Referencias de HTTP (sitios web)"**

2. En **"Restricciones de sitios web"**, agregar:
   ```
   https://chamosbarber.com/*
   https://www.chamosbarber.com/*
   http://localhost:3000/*
   ```

   **Explicación:**
   - `https://chamosbarber.com/*` → Producción
   - `https://www.chamosbarber.com/*` → Producción con www
   - `http://localhost:3000/*` → Desarrollo local

3. Clic en **"Agregar"** para cada dominio

### 4.3 Restricción de API

1. En **"Restricciones de API"**, seleccionar:
   - ✅ **"Restringir clave"**

2. Seleccionar las APIs que habilitamos:
   - ✅ Maps Embed API
   - ✅ Maps JavaScript API
   - ✅ Geocoding API (si la habilitaste)

3. Clic en **"Guardar"** (Save)

---

## 💰 Paso 5: Configurar Facturación (Requerido)

### 5.1 ¿Por Qué Necesito Facturación?

Google Maps API **requiere una cuenta de facturación**, pero ofrece:
- **$200 USD de crédito GRATIS cada mes**
- Para un sitio web con tráfico normal, **NO pagarás nada**

### 5.2 Configurar Cuenta de Facturación

```
URL: https://console.cloud.google.com/billing
```

1. Clic en **"Vincular una cuenta de facturación"** (Link a billing account)
2. Clic en **"Crear cuenta de facturación"** (Create billing account)
3. **Nombre:** `Chamos Barber Billing`
4. **País:** Chile
5. Ingresar información de tarjeta (NO se cobrará si estás dentro del uso gratuito)
6. Aceptar términos
7. Clic en **"Enviar y habilitar facturación"**

### 5.3 Verificar Crédito Gratuito

1. Ir a: https://console.cloud.google.com/billing
2. Verificar que aparezca: **"$200.00 USD de crédito mensual"**

---

## 📊 Paso 6: Verificar Uso y Cuotas

### 6.1 Monitorear Uso

```
URL: https://console.cloud.google.com/google/maps-apis/metrics
```

Aquí puedes ver:
- Número de peticiones diarias
- Costo estimado (debe ser $0 si estás dentro del límite gratuito)

### 6.2 Límites Gratuitos (Referencia)

| API | Gratis hasta | Equivalente |
|-----|-------------|-------------|
| Maps Embed API | **Ilimitado** | ∞ |
| Maps JavaScript API | 28,500 cargas/mes | ~950/día |
| Geocoding API | 40,000 peticiones/mes | ~1,333/día |

**Para Chamos Barber:** Con tráfico normal del sitio web, **NO se excederá el límite gratuito**.

---

## 🔧 Paso 7: Integrar la API Key en el Código

### 7.1 Opción A: Variable de Entorno (Recomendado)

**En Coolify:**

1. Ir a: `https://coolify.app`
2. Seleccionar proyecto: `chamos-barber-app`
3. Ir a **"Environment Variables"**
4. Agregar nueva variable:
   ```
   Nombre: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
   Valor: AIzaSyD1234567890abcdefghijklmnopqrstuv
   ✅ Available at Buildtime
   ✅ Available at Runtime
   ```
5. Guardar
6. **Redeploy** la aplicación

### 7.2 Opción B: Hardcoded (Solo para pruebas)

**⚠️ NO RECOMENDADO para producción**

Editar `src/pages/index.tsx` directamente con la API key.

---

## 🎨 Paso 8: Actualizar el Código del Mapa

### 8.1 Crear URL de Embed Personalizada

Voy a generar una URL de Google Maps Embed específica para **Rancagua 759, San Fernando, Chile**.

#### Herramienta: Google Maps Embed API URL Builder

```
URL: https://developers.google.com/maps/documentation/embed/embedding-map
```

#### URL Generada para Chamos Barber:

```html
https://www.google.com/maps/embed/v1/place
  ?key=TU_API_KEY_AQUI
  &q=Rancagua+759,San+Fernando,Chile
  &zoom=16
  &language=es
```

### 8.2 Código Actualizado para `index.tsx`

Voy a actualizar el código para usar la API key correctamente.

---

## 🧪 Paso 9: Probar la Configuración

### 9.1 Prueba Local (Opcional)

Si tienes el proyecto local:

```bash
cd /home/user/webapp
export NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyD1234567890abcdefghijklmnopqrstuv"
npm run dev
```

Acceder a: `http://localhost:3000`

### 9.2 Prueba en Producción

1. **Redeploy** en Coolify con la variable de entorno configurada
2. Acceder a: `https://chamosbarber.com`
3. Scroll hasta la sección **"Ubicación"**
4. **✅ Verificar que:**
   - El mapa carga correctamente
   - Se ve el pin en Rancagua 759
   - Se puede interactuar con el mapa (zoom, arrastrar)
   - El botón "Ver en Google Maps" funciona

---

## 🐛 Troubleshooting

### Problema 1: "This page can't load Google Maps correctly"

**Causa:** API key no válida o restricciones incorrectas

**Solución:**
1. Verificar que la API key esté correcta en Coolify
2. Verificar que `https://chamosbarber.com/*` esté en las restricciones
3. Verificar que Maps Embed API esté habilitada
4. Esperar 5 minutos (cambios pueden tardar en propagarse)

### Problema 2: "Google Maps API error: RefererNotAllowedMapError"

**Causa:** El dominio no está en la lista de referrers permitidos

**Solución:**
1. Ir a: https://console.cloud.google.com/apis/credentials
2. Editar la API key
3. Agregar: `https://chamosbarber.com/*`
4. Guardar
5. Esperar 5 minutos

### Problema 3: "Billing account not found"

**Causa:** No se configuró la cuenta de facturación

**Solución:**
1. Ir a: https://console.cloud.google.com/billing
2. Vincular una cuenta de facturación al proyecto
3. Esperar 5-10 minutos

### Problema 4: Mapa en blanco (sin errores)

**Causa:** Variable de entorno no configurada o no cargada

**Solución:**
1. Verificar en Coolify que la variable existe
2. Verificar que está marcada como "Available at Runtime"
3. Hacer un **Redeploy completo** (no solo restart)
4. Verificar en el código que se está leyendo: `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

---

## 📝 Checklist de Configuración

Marca cada paso al completarlo:

- [ ] Crear proyecto en Google Cloud Console
- [ ] Habilitar Maps Embed API
- [ ] Habilitar Maps JavaScript API
- [ ] Crear API Key
- [ ] Configurar restricciones HTTP referrers
- [ ] Agregar dominios permitidos
- [ ] Restringir APIs
- [ ] Configurar cuenta de facturación
- [ ] Verificar crédito gratuito de $200 USD
- [ ] Agregar variable `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en Coolify
- [ ] Actualizar código de `index.tsx`
- [ ] Redeploy en Coolify
- [ ] Probar en producción

---

## 🔗 Enlaces Útiles

| Recurso | URL |
|---------|-----|
| **Google Cloud Console** | https://console.cloud.google.com/ |
| **APIs y Servicios** | https://console.cloud.google.com/apis/ |
| **Credenciales** | https://console.cloud.google.com/apis/credentials |
| **Facturación** | https://console.cloud.google.com/billing |
| **Métricas de Uso** | https://console.cloud.google.com/google/maps-apis/metrics |
| **Documentación Maps Embed** | https://developers.google.com/maps/documentation/embed |
| **Precios de Google Maps** | https://mapsplatform.google.com/pricing/ |

---

## 💡 Alternativa SIN API Key (Temporal)

Si prefieres una solución rápida sin configurar la API:

### Opción 1: Google Maps Simple Embed (Público)

Usar el iframe público de Google Maps (sin API):

```html
<iframe
  src="https://maps.google.com/maps?q=Rancagua+759,San+Fernando,Chile&t=&z=16&ie=UTF8&iwloc=&output=embed"
  width="100%"
  height="400"
  frameBorder="0"
  style={{ border: 0 }}
  allowFullScreen
  loading="lazy"
></iframe>
```

**Ventajas:** No requiere API key, funciona inmediatamente
**Desventajas:** Menos personalización, puede tener limitaciones

### Opción 2: OpenStreetMap (Gratuito, Sin API)

```html
<iframe
  width="100%"
  height="400"
  frameBorder="0"
  scrolling="no"
  marginHeight="0"
  marginWidth="0"
  src="https://www.openstreetmap.org/export/embed.html?bbox=-70.9930,-34.5895,-70.9894,-34.5875&layer=mapnik&marker=-34.5885,-70.9912"
  style={{ border: 0 }}
></iframe>
```

---

## 🎯 Decisión Recomendada

| Opción | Configuración | Funcionalidad | Recomendación |
|--------|---------------|---------------|---------------|
| **Google Maps API** | ~15 min | ⭐⭐⭐⭐⭐ Completa | ✅ **Mejor para producción** |
| **Google Maps Simple** | ~1 min | ⭐⭐⭐ Limitada | ✅ Rápida para testear |
| **OpenStreetMap** | ~1 min | ⭐⭐⭐ Básica | ⚠️ Puede tener problemas de carga |

---

## 📞 Soporte

Si tienes problemas:
1. Verificar consola del navegador (F12) para errores
2. Revisar panel de Google Cloud Console para alertas
3. Consultar documentación oficial: https://developers.google.com/maps/documentation

---

**Última actualización:** 2024-12-15  
**Versión:** 1.0  
**Estado:** 📝 Guía Completa Lista
