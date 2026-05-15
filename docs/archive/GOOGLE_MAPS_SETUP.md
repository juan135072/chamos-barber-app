# 🗺️ Configuración de Google Maps

## ✅ Solución Actual: OpenStreetMap (SIN API Key)

La aplicación actualmente usa **OpenStreetMap**, que es:
- ✅ **100% Gratuito**
- ✅ **Sin necesidad de API Key**
- ✅ **Sin límites de uso**
- ✅ **Código abierto**
- ✅ **Interactivo** (zoom, pan, arrastrar)

### Ubicación actual:
- **Dirección**: Rancagua 759, San Fernando, O'Higgins, Chile
- **Coordenadas**: -34.5885, -70.9915
- **Archivo**: `src/pages/index.tsx` (líneas 111-149)

---

## 🔄 Alternativa: Google Maps Embed API (Opcional)

Si prefieres usar Google Maps oficial, aquí están los pasos:

### Paso 1: Obtener API Key de Google Maps

1. **Ir a Google Cloud Console**
   - URL: https://console.cloud.google.com/

2. **Crear o seleccionar un proyecto**
   - Nombre sugerido: "Chamos Barber Website"

3. **Habilitar APIs necesarias**
   - Ir a "APIs & Services" > "Library"
   - Buscar y habilitar:
     - ✅ **Maps Embed API** (para iframes)
     - ✅ **Maps JavaScript API** (para mapas interactivos)
     - ✅ **Geocoding API** (para convertir direcciones)

4. **Crear API Key**
   - Ir a "Credentials" > "Create Credentials" > "API Key"
   - Copiar la key generada (ej: `AIzaSyC...`)

5. **Restringir la API Key (IMPORTANTE para seguridad)**
   - Editar la API Key
   - **Application restrictions**:
     - Seleccionar "HTTP referrers (web sites)"
     - Agregar:
       - `https://chamosbarber.com/*`
       - `https://*.chamosbarber.com/*`
       - `http://localhost:3000/*` (para desarrollo)
   
   - **API restrictions**:
     - Seleccionar "Restrict key"
     - Marcar solo: "Maps Embed API", "Maps JavaScript API"

### Paso 2: Configurar en la aplicación

1. **Agregar la API Key al archivo `.env.local`:**

```bash
# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=TU_API_KEY_AQUI
```

2. **Actualizar `src/pages/index.tsx`:**

Reemplazar el iframe de OpenStreetMap por:

```tsx
<iframe
  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=Rancagua+759,San+Fernando,Chile&zoom=16`}
  width="100%"
  height="100%"
  style={{ border: 0 }}
  allowFullScreen
  loading="lazy"
  referrerPolicy="no-referrer-when-downgrade"
  title="Ubicación Chamos Barber - Rancagua 759, San Fernando"
></iframe>
```

### Paso 3: Configurar en Coolify

En Coolify, agregar la variable de entorno:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=TU_API_KEY_AQUI
```

---

## 💰 Costos de Google Maps API

Google Maps tiene un plan **gratuito generoso**:

- **$200 USD de crédito mensual gratis**
- **Maps Embed API**: 
  - Primeros 28,000 cargos/mes: **GRATIS**
  - Después: $7 USD por 1,000 cargos adicionales

Para un sitio web de barbería, el uso estará **100% dentro del límite gratuito**.

---

## 📊 Comparación: OpenStreetMap vs Google Maps

| Característica | OpenStreetMap | Google Maps |
|----------------|---------------|-------------|
| **Costo** | ✅ Gratis | ✅ Gratis hasta 28k/mes |
| **API Key** | ❌ No necesita | ✅ Requiere |
| **Configuración** | ⚡ Inmediata | ⏱️ 15 minutos |
| **Calidad de mapas** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Street View** | ❌ No | ✅ Sí |
| **Imágenes satélite** | ⚠️ Limitado | ✅ Completo |
| **Reconocimiento de marca** | 🌍 OSM | 🔵 Google |
| **Interactividad** | ✅ Sí | ✅ Sí |

---

## 🎯 Recomendación

**Para Chamos Barber:**

✅ **Mantener OpenStreetMap** porque:
1. Ya está funcionando
2. Sin costos ni configuración adicional
3. Sin límites de uso
4. Código abierto y ético
5. Suficiente calidad para el propósito

🔄 **Cambiar a Google Maps solo si**:
- Quieres integrar Street View
- Necesitas mejor calidad de imágenes
- Quieres reconocimiento visual de la marca Google
- Tienes tiempo para configurar la API Key

---

## 🐛 Troubleshooting

### Problema: "This page can't load Google Maps correctly"
**Solución**: 
- Verificar que la API Key esté activa
- Confirmar que Maps Embed API esté habilitada
- Revisar las restricciones de dominio

### Problema: "RefererNotAllowedMapError"
**Solución**:
- Agregar `https://chamosbarber.com/*` a las restricciones HTTP referrer
- Verificar que el dominio sea correcto (con/sin www)

### Problema: Mapa no carga (icono de documento roto)
**Solución**:
- Verificar conexión a internet
- Revisar la consola del navegador (F12)
- Confirmar que la URL del iframe sea correcta

---

## 📝 Notas Adicionales

- **Desarrollo local**: OpenStreetMap funciona sin configuración
- **Producción**: Ya está funcionando en https://chamosbarber.com
- **SEO**: Ambos mapas son compatibles con SEO
- **Accesibilidad**: Ambos cumplen con estándares WCAG

---

## 🔗 Enlaces Útiles

- **Google Cloud Console**: https://console.cloud.google.com/
- **Google Maps Platform**: https://developers.google.com/maps
- **OpenStreetMap**: https://www.openstreetmap.org/
- **Documentación OSM Embed**: https://wiki.openstreetmap.org/wiki/Export

---

**Última actualización**: 2025-12-15  
**Commit**: `35f8fb9` - "fix: use OpenStreetMap embed (no API key required) with Google Maps fallback"
