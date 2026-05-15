# 🔑 Solución: Claves de Supabase Incorrectas en Coolify

**Fecha:** 2025-11-06  
**Problema:** Error RLS causado por usar claves de Supabase Cloud en vez de self-hosted VPS  
**Gravedad:** 🔴 CRÍTICO - Impide crear reservas

---

## 🎯 Diagnóstico

### **Problema Identificado**

Coolify está configurado con las claves de **Supabase Cloud (antigua)** en vez de las claves de **Supabase Self-Hosted (actual)**.

### **Evidencia**

**Clave en Coolify (incorrecta):**
```
Decodificado: {"ref": "kdpahtfticmgkmzbyiqs", ...}
                     ↑
              Supabase Cloud ID
```

**Clave correcta (self-hosted):**
```
Decodificado: {"iss": "supabase", "role": "service_role", ...}
                     ↑
              Sin "ref" = Self-hosted
```

**URL de la aplicación:** `https://supabase.chamosbarber.com` (VPS)  
**URL en las claves incorrectas:** `kdpahtfticmgkmzbyiqs.supabase.co` (Cloud)

**Resultado:** Mismatch de credenciales → Error de autenticación → Fallback a ANON_KEY → Error RLS

---

## ✅ SOLUCIÓN

### **Paso 1: Production Environment Variables**

Ve a Coolify → Proyecto "chamos-barber-app" → Production → Environment Variables

**Cambio necesario:**

```diff
- SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcGFodGZ0aWNtZ2ttemJ5aXFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU3MzMzMywiZXhwIjoyMDQ2MTQ5MzMzfQ.xGDCp4zRYWjj4uG3vqQJ-_1MxHe30T0uRIQsKVqzaLM

+ SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0
```

**Variables completas correctas para Production:**
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoiYW5vbiJ9.cE6BYGcPB6HC4vacIQB-Zabf4EKfVJ7x7ViZ4CIASJA
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
NIXPACKS_NODE_VERSION=20
PORT=3000
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0
```

### **Paso 2: Preview Deployments Environment Variables**

Ve a Coolify → Proyecto "chamos-barber-app" → Preview → Environment Variables

**Cambios necesarios (múltiples):**

```diff
- NEXT_PUBLIC_SUPABASE_URL=http://supabase.chamosbarber.com
+ NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
       ↑
   Cambiar http a https

- SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcGFodGZ0aWNtZ2ttemJ5aXFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU3MzMzMywiZXhwIjoyMDQ2MTQ5MzMzfQ.xGDCp4zRYWjj4uG3vqQJ-_1MxHe30T0uRIQsKVqzaL
                                                                                                                                                                                                                                                  ↑
                                                                                                                                                                                                                                        Truncado!
+ SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0
```

**Variables completas correctas para Preview:**
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoiYW5vbiJ9.cE6BYGcPB6HC4vacIQB-Zabf4EKfVJ7x7ViZ4CIASJA
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
NIXPACKS_NODE_VERSION=20
PORT=3000
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0
```

### **Paso 3: Guardar y Redesplegar**

1. **Guardar cambios** en Coolify
2. **Redeploy** (o esperar auto-deploy si está configurado)
3. **Esperar 3-5 minutos** al build
4. **Probar** la aplicación

---

## 🔍 Cómo Verificar que Funcionó

### **Test 1: Crear una Cita**

1. Abre `https://tu-dominio.com/reservar`
2. Completa el formulario:
   - Servicio: Corte Clásico
   - Barbero: Cualquiera activo
   - Fecha: Mañana
   - Hora: Cualquier horario disponible
   - Cliente: Datos de prueba
3. Click en **"Reservar"**

**✅ Resultado esperado:**
```
¡Cita reservada exitosamente! Te contactaremos pronto para confirmar.
```

**❌ Si sigue fallando:**
```
Error de base de datos: new row violates row-level security policy for table "citas"
```
→ Las claves no se aplicaron correctamente. Ver sección de troubleshooting.

### **Test 2: Verificar en Supabase**

1. Abre Supabase Studio: `https://supabase.chamosbarber.com/`
2. Login con las credenciales
3. Ve a Table Editor → `citas`
4. Deberías ver la nueva cita con:
   - Estado: `pendiente`
   - Todos los datos del cliente
   - Timestamps correctos

---

## 🚨 Troubleshooting

### **Problema 1: Los cambios no se aplican**

**Síntoma:** Después de guardar y redesplegar, sigue el error RLS.

**Posibles causas:**
1. Variables no se guardaron correctamente
2. Build usó cache viejo
3. Coolify no reinició el contenedor

**Solución:**
```bash
# Opción A: Limpiar cache en Coolify
1. Click en "Clear Cache"
2. Click en "Redeploy"

# Opción B: Forzar desde git
git commit --allow-empty -m "chore: Force rebuild with correct keys"
git push origin master
```

### **Problema 2: Preview sigue fallando**

**Síntoma:** Production funciona pero Preview sigue con error RLS.

**Causa:** Las variables de Preview no se actualizaron o siguen con `http://`.

**Solución:**
1. Verifica que `NEXT_PUBLIC_SUPABASE_URL` sea `https://` (no `http://`)
2. Verifica que `SUPABASE_SERVICE_ROLE_KEY` sea la clave completa (no truncada)
3. Guarda y redespliega Preview específicamente

### **Problema 3: Error "Invalid JWT"**

**Síntoma:** Error en logs: `Invalid JWT` o `JWT verification failed`.

**Causa:** La clave no coincide con el `SUPABASE_JWT_SECRET` de tu VPS.

**Solución:**
1. Verifica que estás usando la clave de self-hosted (sin `"ref"` en el payload)
2. Si el problema persiste, regenera las claves en tu Supabase self-hosted:
   ```bash
   # En tu VPS:
   cd /ruta/a/supabase
   docker compose down
   # Regenerar JWT secret si es necesario
   # Actualizar .env con nuevo JWT_SECRET
   docker compose up -d
   ```

### **Problema 4: Coolify no muestra las variables**

**Síntoma:** Las variables desaparecen después de guardar.

**Causa:** Bug de Coolify o permisos.

**Solución alternativa:** Usar archivo `.env.production` en el repositorio:

```bash
# ⚠️ SOLO si Coolify no funciona
cd /home/user/webapp

cat > .env.production << 'EOF'
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoiYW5vbiJ9.cE6BYGcPB6HC4vacIQB-Zabf4EKfVJ7x7ViZ4CIASJA
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0
NODE_ENV=production
PORT=3000
EOF

git add .env.production
git commit -m "feat: Add production env file with correct Supabase keys"
git push origin master
```

---

## 📊 Comparación de Claves

### **Clave INCORRECTA (Supabase Cloud)**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcGFodGZ0aWNtZ2ttemJ5aXFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU3MzMzMywiZXhwIjoyMDQ2MTQ5MzMzfQ.xGDCp4zRYWjj4uG3vqQJ-_1MxHe30T0uRIQsKVqzaLM

Decodificado:
{
  "iss": "supabase",
  "ref": "kdpahtfticmgkmzbyiqs",  ← Supabase Cloud
  "role": "service_role",
  "iat": 1730573333,
  "exp": 2046149333
}
```

### **Clave CORRECTA (Self-Hosted VPS)**

```
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0

Decodificado:
{
  "typ": "JWT",
  "alg": "HS256",
  "iss": "supabase",
  "iat": 1761267780,
  "exp": 4916941380,
  "role": "service_role"
}
```

**Diferencia clave:** Sin campo `"ref"` = Self-hosted genérico ✅

---

## 🎓 Lecciones Aprendidas

### **¿Cómo pasó esto?**

Probablemente:
1. Inicialmente configuraste la app con Supabase Cloud
2. Luego migraste a self-hosted en VPS
3. Las variables en Coolify nunca se actualizaron
4. El `.env.local` sí se actualizó → Funciona en desarrollo
5. Coolify usa las viejas → Falla en producción

### **¿Cómo prevenir esto?**

1. **Documentar las credenciales:**
   - Mantener un archivo `.env.example` con placeholders
   - Documentar qué instancia de Supabase se usa

2. **Verificar variables después de migraciones:**
   - Checklist de variables de entorno
   - Comparar desarrollo vs producción

3. **Automatizar sincronización:**
   - Script que valide que las claves coincidan
   - CI/CD que verifique las variables antes de deploy

---

## ✅ Checklist Final

Marca cada ítem al completarlo:

### **Configuración**
- [ ] **Production:** Actualizar `SUPABASE_SERVICE_ROLE_KEY` con clave self-hosted
- [ ] **Preview:** Actualizar `SUPABASE_SERVICE_ROLE_KEY` con clave self-hosted
- [ ] **Preview:** Cambiar `NEXT_PUBLIC_SUPABASE_URL` de `http://` a `https://`
- [ ] Guardar cambios en Coolify

### **Despliegue**
- [ ] Click en "Redeploy" para Production
- [ ] Click en "Redeploy" para Preview (si aplica)
- [ ] Esperar build completo (3-5 min)
- [ ] Verificar logs: "✓ Compiled successfully"

### **Verificación**
- [ ] Probar crear cita en Production
- [ ] Verificar mensaje de éxito
- [ ] Verificar cita en Supabase
- [ ] Probar crear cita en Preview (si aplica)
- [ ] No hay errores RLS en consola

### **Documentación**
- [ ] Guardar las claves correctas en gestor de contraseñas
- [ ] Actualizar documentación del proyecto
- [ ] Marcar este incidente como resuelto

---

## 🎉 Confirmación de Éxito

**Has resuelto el problema cuando veas:**

```
✅ Usuario crea una cita en el formulario
✅ Mensaje: "¡Cita reservada exitosamente! Te contactaremos pronto para confirmar."
✅ Cita aparece en Supabase con estado "pendiente"
✅ No hay errores en consola del navegador
✅ Logs de Coolify sin errores de autenticación
```

---

**Fecha de resolución:** _Pendiente_  
**Tiempo estimado:** 5-10 minutos  
**Commit actual:** 8ad6d42  
**Branch:** master

**Estado:** 🟡 Esperando aplicación de cambios en Coolify

---

## 📞 Soporte Adicional

Si después de aplicar estos cambios el error persiste:

1. **Revisar logs de Coolify:**
   - Busca errores de autenticación JWT
   - Busca errores de conexión a Supabase

2. **Revisar logs de Supabase:**
   - Ve a tu VPS: `docker logs supabase-kong`
   - Busca requests fallidos de autenticación

3. **Verificar conectividad:**
   ```bash
   # Desde el contenedor de Coolify
   curl -I https://supabase.chamosbarber.com
   # Debe responder 200 OK
   ```

4. **Último recurso:**
   - Contactar soporte de Coolify
   - Verificar firewall/DNS del VPS
   - Regenerar todas las claves en Supabase

---

**Última actualización:** 2025-11-06 21:30 UTC  
**Autor:** Claude AI  
**Prioridad:** 🔴 CRÍTICA
