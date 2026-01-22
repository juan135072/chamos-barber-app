# 🚨 Solución Inmediata: Error "Bad Gateway" en Reservas

## ⚡ ACCIÓN REQUERIDA AHORA

### 1️⃣ Esperar Rebuild de Coolify (5 minutos)

**¿Qué está pasando?**
- Acabo de hacer push de cambios que mejoran el logging y manejo de errores
- Coolify está reconstruyendo la aplicación automáticamente
- **Commits:**
  - `6d8a989` - Mejora de logging y manejo de errores
  - `97b6dbe` - Documentación de troubleshooting

**Tiempo estimado:** 5-10 minutos

---

### 2️⃣ Hard Refresh en tu Navegador

**Después de 5 minutos, hacer:**

**Windows/Linux:**
```
Ctrl + Shift + R
```

**Mac:**
```
Cmd + Shift + R
```

**Alternativa:**
- Abrir modo incógnito
- Ir a: `https://chamosbarber.com/reservar`

---

### 3️⃣ Intentar Crear una Cita

**Acción:**
1. Completar el formulario de reserva
2. **Abrir la Consola del Navegador** (F12)
3. Ir a la pestaña "Console"
4. Intentar crear la cita

**¿Qué deberías ver en la consola?**

✅ **Si funciona:**
```
📤 Enviando solicitud de cita...
📥 Respuesta recibida: 201 Created
📋 Resultado: { success: true, ... }
```

❌ **Si hay error con más información:**
```
📤 Enviando solicitud de cita...
📥 Respuesta recibida: 502 Bad Gateway
❌ Respuesta no es JSON: text/html
Error: Error del servidor: 502 Bad Gateway. 
La respuesta no es JSON. Esto puede indicar 
un problema con el servidor o la configuración de Coolify.
```

---

### 4️⃣ Revisar Logs de Coolify

**Acción:** Ir al panel de Coolify y ver los logs en tiempo real

**Dónde encontrar logs:**
1. Panel de Coolify
2. Seleccionar aplicación "Chamos Barber"
3. Click en "Logs"
4. Ver últimas 100 líneas

**¿Qué buscar?**

✅ **Si funciona correctamente, verás:**
```
🔵 [crear-cita] Request received: POST
✅ [crear-cita] Supabase client created
🔵 [crear-cita] Request data: {...}
🔍 [crear-cita] Checking pending appointments for: +56912345678
✅ [crear-cita] Pending appointments: 2
💾 [crear-cita] Inserting appointment...
✅ [crear-cita] Appointment created successfully: abc-123
```

❌ **Si hay problema, verás uno de estos:**
```
❌ [crear-cita] NEXT_PUBLIC_SUPABASE_URL not found
❌ [crear-cita] SUPABASE_SERVICE_ROLE_KEY not found
❌ [crear-cita] Error inserting appointment: ...
```

---

## 🔍 DIAGNÓSTICO: ¿Cuál es mi problema?

### Escenario A: Variables de Entorno Faltantes

**Síntoma en logs:**
```
❌ [crear-cita] SUPABASE_SERVICE_ROLE_KEY not found
```

**Solución:**
1. Ir a Coolify → Application → Environment Variables
2. Verificar que existan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Si faltan, agregar:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
   SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0
   ```
4. Click en "Save"
5. Hacer "Force Rebuild"
6. Esperar 5 minutos
7. Probar nuevamente

---

### Escenario B: Supabase No Responde

**Síntoma en logs:**
```
❌ [crear-cita] Error inserting appointment: Connection timeout
```

**Verificación:**
```bash
curl -I https://supabase.chamosbarber.com
```

**Si falla:**
1. Verificar que Supabase esté corriendo:
   ```bash
   ssh root@<servidor-supabase>
   docker ps | grep supabase
   ```
2. Reiniciar Supabase si es necesario:
   ```bash
   docker restart supabase-studio supabase-auth supabase-rest
   ```

---

### Escenario C: Timeout de API

**Síntoma:** Logs muestran que la petición se queda colgada

**Solución:**
1. Ir a Coolify → Settings → Advanced
2. Aumentar `proxy_read_timeout` a 60 segundos
3. Guardar y hacer rebuild

---

### Escenario D: Cache No Invalidado

**Síntoma:** Error persiste pero logs no muestran nada

**Solución:**
1. **Limpiar cache del navegador:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Settings → Privacy → Clear Data
   - Safari: Develop → Empty Caches

2. **Rebuild completo en Coolify:**
   - Settings → "Force Rebuild"
   - Esperar 5 minutos

3. **Limpiar cache de Docker (última opción):**
   ```bash
   ssh root@<servidor-coolify>
   docker system prune -af
   ```

---

## 📊 INFORMACIÓN PARA COMPARTIR

Si el problema persiste, **compartir esta información:**

### 1. Logs de la Consola del Navegador
```
Screenshot o copiar texto completo de la pestaña Console (F12)
```

### 2. Logs de Coolify
```
Últimas 50-100 líneas que incluyan [crear-cita]
```

### 3. Variables de Entorno (SIN valores sensibles)
```
¿Están presentes estas variables?
- NEXT_PUBLIC_SUPABASE_URL: ✅ / ❌
- SUPABASE_SERVICE_ROLE_KEY: ✅ / ❌
```

### 4. Respuesta de curl
```bash
curl -I https://chamosbarber.com/api/crear-cita
```

---

## 🎯 CHECKLIST DE VERIFICACIÓN

Marca cada uno a medida que lo completes:

- [ ] Esperé 5-10 minutos después del push
- [ ] Hice hard refresh (Ctrl+Shift+R)
- [ ] Abrí la consola del navegador (F12)
- [ ] Intenté crear una cita
- [ ] Revisé los logs de la consola
- [ ] Revisé los logs de Coolify
- [ ] Verifiqué variables de entorno en Coolify
- [ ] Probé con modo incógnito

---

## 📞 SIGUIENTE PASO

### Si Todo Funciona ✅
¡Perfecto! Los cambios implementados resolvieron el problema:
- ✅ Logging mejorado para futuras investigaciones
- ✅ Manejo de errores más robusto
- ✅ Mensajes de error claros para el usuario

### Si Aún Falla ❌
**Compartir:**
1. Screenshot de consola del navegador
2. Logs de Coolify (últimas 100 líneas)
3. Respuesta a checklist de verificación
4. Mensaje de error exacto que ves

**Documentos de referencia:**
- `TROUBLESHOOTING_BAD_GATEWAY.md` - Guía completa
- `DEPLOYMENT_VERIFICATION.md` - Troubleshooting general
- `CONFIGURACION_SUPABASE.md` - Configuración de BD

---

## 🔧 MEJORAS IMPLEMENTADAS

### Commit: 6d8a989

**Cambios en `src/pages/api/crear-cita.ts`:**
- ✅ Verificación de variables de entorno al inicio
- ✅ Logging en cada paso del proceso
- ✅ Mensajes de error más descriptivos
- ✅ Manejo de excepciones mejorado

**Cambios en `src/pages/reservar.tsx`:**
- ✅ Verificación de Content-Type en respuesta
- ✅ Detección de respuestas no-JSON (Bad Gateway)
- ✅ Logging de requests y responses
- ✅ Mensajes de error más informativos

**Cambios en documentación:**
- ✅ `TROUBLESHOOTING_BAD_GATEWAY.md` - Guía detallada
- ✅ `SOLUCION_INMEDIATA_BAD_GATEWAY.md` - Este documento

---

## ⏱️ TIMELINE ESPERADO

```
Ahora (0 min)   → Push completado ✅
+2 min          → Coolify detecta cambios
+3 min          → Coolify inicia rebuild
+5 min          → Build completado
+6 min          → Deploy completado ✅
+7 min          → Hard refresh y probar
+8 min          → Verificar logs
+10 min         → ¡Debería funcionar! 🎉
```

---

## 📝 NOTAS IMPORTANTES

1. **No hacer cambios adicionales** mientras Coolify está reconstruyendo
2. **Esperar los 5-10 minutos completos** antes de probar
3. **Usar modo incógnito** si el hard refresh no funciona
4. **Revisar logs SIEMPRE** para entender qué está pasando

---

**Fecha:** 2025-11-06  
**Commit:** 97b6dbe  
**Versión:** 2025-11-06-v3  
**Autor:** GenSpark AI Developer

---

## 🚀 PRÓXIMA ACCIÓN

**AHORA:** Esperar 5-10 minutos → Hard Refresh → Probar → Compartir resultado

✅ **Funciona:** ¡Celebrar! 🎉  
❌ **No funciona:** Compartir logs y screenshots
