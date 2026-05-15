# Troubleshooting: "Bad Gateway" Error en Creación de Citas

## Problema Reportado

**Error:** `Unexpected token 'B', "Bad Gateway" is not valid JSON`

**Ubicación:** Al intentar crear una cita en la página `/reservar`

**Fecha:** 2025-11-06

---

## ¿Qué es un "Bad Gateway"?

Un error **"Bad Gateway" (502)** ocurre cuando:

1. **El servidor proxy (Coolify/Nginx) no puede comunicarse con el servidor de aplicación (Next.js)**
2. **La API route está fallando antes de poder responder**
3. **El servidor de aplicación está sobrecargado o no responde a tiempo**
4. **Hay un error en las variables de entorno**

---

## Soluciones Implementadas

### ✅ 1. Logging Mejorado en API

**Archivo:** `src/pages/api/crear-cita.ts`

**Cambios:**
```typescript
// Verificar variables de entorno
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ [crear-cita] NEXT_PUBLIC_SUPABASE_URL not found')
  return res.status(500).json({ error: 'Configuración de Supabase no encontrada' })
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ [crear-cita] SUPABASE_SERVICE_ROLE_KEY not found')
  return res.status(500).json({ error: 'Clave de servicio de Supabase no encontrada' })
}

// Logging en cada paso
console.log('🔵 [crear-cita] Request received')
console.log('🔍 [crear-cita] Checking pending appointments')
console.log('💾 [crear-cita] Inserting appointment')
console.log('✅ [crear-cita] Appointment created successfully')
```

**Beneficios:**
- Permite identificar exactamente dónde falla el proceso
- Verifica que las variables de entorno estén presentes
- Facilita debugging en logs de Coolify

---

### ✅ 2. Manejo de Errores No-JSON en Frontend

**Archivo:** `src/pages/reservar.tsx`

**Cambios:**
```typescript
// Verificar si la respuesta es JSON válido
const contentType = response.headers.get('content-type')
if (!contentType || !contentType.includes('application/json')) {
  console.error('❌ Respuesta no es JSON:', contentType)
  throw new Error(`Error del servidor: ${response.status} ${response.statusText}. 
    La respuesta no es JSON. Esto puede indicar un problema con el servidor 
    o la configuración de Coolify.`)
}
```

**Beneficios:**
- Detecta cuando Coolify/Nginx devuelve HTML en vez de JSON
- Proporciona mensaje de error más claro al usuario
- Ayuda a diagnosticar problemas de configuración

---

### ✅ 3. Cache-Busting

**Archivos Modificados:**
- `src/pages/api/crear-cita.ts` - Version: 2025-11-06-v3
- `src/pages/reservar.tsx` - Version: 2025-11-06-v3

**Comentarios agregados:**
```typescript
// Build Version: 2025-11-06-v3 - Enhanced logging and error handling
```

**Beneficios:**
- Fuerza a Coolify a reconocer cambios en los archivos
- Invalida cache del navegador
- Asegura que se despliegue la nueva versión

---

## Pasos de Diagnóstico

### 1. Verificar Variables de Entorno en Coolify

**Acción:** Ir al panel de Coolify → Aplicación → Environment Variables

**Verificar que existan:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Si faltan:** Agregar las variables y hacer rebuild completo.

---

### 2. Revisar Logs de Coolify

**Dónde:** Panel de Coolify → Aplicación → Logs

**Buscar:**
```
❌ [crear-cita] NEXT_PUBLIC_SUPABASE_URL not found
❌ [crear-cita] SUPABASE_SERVICE_ROLE_KEY not found
❌ [crear-cita] Error inserting appointment
```

**Si aparece:** Indica problema con variables de entorno o conexión a Supabase.

---

### 3. Verificar Conectividad a Supabase

**Desde el servidor de Coolify, ejecutar:**
```bash
curl -I https://supabase.chamosbarber.com
```

**Respuesta esperada:**
```
HTTP/2 200
content-type: text/html
```

**Si falla:** Problema de red o DNS en el servidor.

---

### 4. Probar API Directamente

**Con curl:**
```bash
curl -X POST https://chamosbarber.com/api/crear-cita \
  -H "Content-Type: application/json" \
  -d '{
    "servicio_id": "TEST",
    "barbero_id": "TEST",
    "fecha": "2025-11-07",
    "hora": "10:00",
    "cliente_nombre": "Test User",
    "cliente_telefono": "+56912345678",
    "estado": "pendiente"
  }'
```

**Respuesta esperada (error de validación, pero JSON válido):**
```json
{
  "error": "El barbero seleccionado no está disponible",
  "code": "BARBERO_NO_DISPONIBLE"
}
```

**Si devuelve HTML o Bad Gateway:** Problema con Coolify/Nginx, no con la aplicación.

---

## Soluciones Según Causa

### Causa 1: Variables de Entorno Faltantes

**Síntoma:** Logs muestran "not found" para variables

**Solución:**
1. Ir a Coolify → Environment Variables
2. Agregar las variables faltantes:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
   SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
   ```
3. Hacer rebuild completo
4. Esperar 5 minutos
5. Probar nuevamente

---

### Causa 2: Timeout de API

**Síntoma:** La solicitud tarda mucho y luego devuelve Bad Gateway

**Solución:**
1. Aumentar timeout en Coolify:
   - Ir a Settings → Advanced
   - Aumentar `proxy_read_timeout` a 60s
2. Optimizar queries de Supabase:
   - Agregar índices en `citas.cliente_telefono`
   - Agregar índices en `citas.barbero_id, citas.fecha, citas.hora`

```sql
-- Ejecutar en Supabase SQL Editor
CREATE INDEX IF NOT EXISTS idx_citas_cliente_telefono 
  ON citas(cliente_telefono);

CREATE INDEX IF NOT EXISTS idx_citas_barbero_fecha_hora 
  ON citas(barbero_id, fecha, hora);
```

---

### Causa 3: Problema de Conexión a Supabase

**Síntoma:** Logs muestran errores de red al conectar a Supabase

**Solución:**
1. Verificar que Supabase esté corriendo:
   ```bash
   ssh root@<tu-servidor-supabase>
   docker ps | grep supabase
   ```
2. Verificar DNS:
   ```bash
   nslookup supabase.chamosbarber.com
   ```
3. Verificar firewall:
   ```bash
   ufw status
   # Asegurar que puertos 80, 443 están abiertos
   ```

---

### Causa 4: Cache de Coolify/Nginx

**Síntoma:** Cambios en código no se reflejan, o error persiste después de fix

**Solución:**
1. **Hard Refresh en navegador:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Rebuild completo en Coolify:**
   - Panel Coolify → Application → Settings
   - Click en "Force Rebuild"
   - Esperar 5 minutos

3. **Limpiar cache de Docker:**
   ```bash
   ssh root@<tu-servidor-coolify>
   docker system prune -af
   ```

---

## Verificación Post-Fix

### 1. Verificar Logs Mejorados

**Acción:** Intentar crear cita y revisar logs de Coolify

**Deberías ver:**
```
🔵 [crear-cita] Request received: POST
✅ [crear-cita] Supabase client created
🔵 [crear-cita] Request data: { servicio_id: "...", ... }
🔍 [crear-cita] Checking pending appointments for: +56912345678
✅ [crear-cita] Pending appointments: 2
💾 [crear-cita] Inserting appointment...
✅ [crear-cita] Appointment created successfully: abc-123-def
```

**Si ves esto:** API está funcionando correctamente.

---

### 2. Verificar Mensaje de Error en Frontend

**Acción:** Intentar crear cita con datos inválidos

**Si hay problema de servidor, deberías ver:**
```
Error: Error del servidor: 502 Bad Gateway. 
La respuesta no es JSON. Esto puede indicar un problema 
con el servidor o la configuración de Coolify.
```

**Si ves esto:** El nuevo manejo de errores está funcionando.

---

### 3. Probar Creación de Cita Real

**Acción:** Completar el formulario con datos válidos

**Pasos:**
1. Ir a `https://chamosbarber.com/reservar`
2. Seleccionar servicio
3. Seleccionar barbero
4. Seleccionar fecha y hora disponible
5. Ingresar datos personales
6. Confirmar

**Resultado esperado:**
```
¡Cita reservada exitosamente! Te contactaremos pronto para confirmar.
```

---

## Monitoreo Continuo

### Agregar Alertas en Coolify

1. **Alert en fallas de deploy:**
   - Coolify → Settings → Notifications
   - Agregar webhook o email

2. **Monitoring de logs:**
   ```bash
   # SSH al servidor
   ssh root@<tu-servidor>
   
   # Ver logs en tiempo real
   docker logs -f <container-name> | grep crear-cita
   ```

3. **Health check endpoint:**
   - Crear `/api/health` para verificar estado
   - Configurar monitoreo externo (UptimeRobot, etc.)

---

## Comandos Útiles para Debugging

### Ver Logs de Coolify
```bash
ssh root@<tu-servidor>
docker logs -f <container-name> --tail 100
```

### Ver Variables de Entorno en Container
```bash
docker exec <container-name> env | grep SUPABASE
```

### Probar Conexión a Supabase desde Container
```bash
docker exec -it <container-name> sh
curl -I https://supabase.chamosbarber.com
exit
```

### Ver Estado de Nginx
```bash
docker logs -f coolify-proxy --tail 50
```

---

## Contacto y Soporte

Si el problema persiste después de seguir estos pasos:

1. **Recopilar información:**
   - Logs de Coolify (últimas 100 líneas)
   - Logs del navegador (Console)
   - Screenshot del error
   - Variables de entorno (sin valores sensibles)

2. **Crear issue en GitHub:**
   - Ir a https://github.com/juan135072/chamos-barber-app/issues
   - Incluir toda la información recopilada
   - Mencionar commit: `6d8a989`

3. **Consultar documentación:**
   - `MEJORAS_UX_CONSULTAR_CITAS.md` - Features implementadas
   - `DEPLOYMENT_VERIFICATION.md` - Troubleshooting general
   - `CONFIGURACION_SUPABASE.md` - Configuración de BD

---

## Historial de Cambios

### Version 2025-11-06-v3
- ✅ Agregado logging detallado en API
- ✅ Verificación de variables de entorno
- ✅ Manejo de respuestas no-JSON en frontend
- ✅ Mensajes de error más descriptivos
- ✅ Cache-busting para forzar despliegue

### Commits Relacionados
- `6d8a989` - fix: Improve error handling and logging for appointment creation
- `0809596` - fix: Force cache invalidation for consultar page
- `c715511` - docs: Add deployment verification guide

---

## Resumen Ejecutivo

**Problema:** Error "Bad Gateway" al crear citas

**Causa Probable:** 
1. Variables de entorno no configuradas en Coolify
2. Timeout de conexión a Supabase
3. Cache de Coolify no invalidado

**Solución Implementada:**
1. ✅ Logging comprehensivo en API
2. ✅ Verificación de variables de entorno
3. ✅ Manejo de errores no-JSON
4. ✅ Cache-busting

**Próximos Pasos:**
1. Esperar rebuild de Coolify (5 minutos)
2. Hard refresh en navegador
3. Probar creación de cita
4. Revisar logs para confirmar funcionamiento

---

**Fecha de Creación:** 2025-11-06  
**Versión:** 1.0  
**Autor:** GenSpark AI Developer  
**Commit:** 6d8a989
