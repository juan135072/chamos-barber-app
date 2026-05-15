# 🐳 Guía de Configuración de Coolify

**Objetivo:** Configurar variables de entorno en Coolify para el proyecto chamos-barber-app

---

## 📋 Variables de Entorno Requeridas

### **Variables Obligatorias (CRÍTICAS)**

```bash
# Variable #1: URL de Supabase
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com

# Variable #2: Clave Anónima (Cliente)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoiYW5vbiJ9.cE6BYGcPB6HC4vacIQB-Zabf4EKfVJ7x7ViZ4CIASJA

# Variable #3: Clave de Service Role (Backend) ⚠️ CRÍTICA
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0
```

### **Variables Opcionales (Recomendadas)**

```bash
# Configuración de producción
NODE_ENV=production
PORT=3000

# JWT Secret (para verificación de tokens)
SUPABASE_JWT_SECRET=2O3K1P4dP4SxFjWBXye61DojrD3JVKo3
```

---

## 🎯 Paso a Paso: Configurar en Coolify

### **Método 1: Interfaz Web de Coolify**

#### **Paso 1: Acceder al Proyecto**

1. Abre Coolify en tu navegador
2. Login con tus credenciales
3. Click en "Projects" o "Proyectos"
4. Busca y selecciona: **"chamos-barber-app"**

#### **Paso 2: Navegar a Variables de Entorno**

Dependiendo de tu versión de Coolify, busca:
- "Environment Variables"
- "Environment"
- "Secrets"
- "Configuration" → "Environment"

#### **Paso 3: Agregar Variables**

Para cada variable, haz lo siguiente:

1. **Click en "Add Variable"** o "Nueva Variable"

2. **Agregar Variable #1:**
   ```
   Key/Name:    NEXT_PUBLIC_SUPABASE_URL
   Value/Valor: https://supabase.chamosbarber.com
   Type/Tipo:   Plain Text (no encrypted)
   ```

3. **Agregar Variable #2:**
   ```
   Key/Name:    NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value/Valor: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoiYW5vbiJ9.cE6BYGcPB6HC4vacIQB-Zabf4EKfVJ7x7ViZ4CIASJA
   Type/Tipo:   Plain Text
   ```

4. **⚠️ Agregar Variable #3 (CRÍTICA):**
   ```
   Key/Name:    SUPABASE_SERVICE_ROLE_KEY
   Value/Valor: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0
   Type/Tipo:   Secret (encrypted) ← IMPORTANTE: Usar "Secret" si está disponible
   ```

#### **Paso 4: Guardar Cambios**

1. Click en "Save" o "Guardar"
2. Espera confirmación de que las variables fueron guardadas

#### **Paso 5: Forzar Rebuild**

1. Busca botón "Redeploy" o "Deploy Again"
2. O busca "Clear Cache" → "Rebuild"
3. Click en el botón de deploy

---

### **Método 2: Docker Compose / Docker Environment**

Si Coolify usa Docker Compose, puedes editar el `docker-compose.yml`:

```yaml
services:
  chamos-barber-app:
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoiYW5vbiJ9.cE6BYGcPB6HC4vacIQB-Zabf4EKfVJ7x7ViZ4CIASJA
      - SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0
      - NODE_ENV=production
      - PORT=3000
```

---

### **Método 3: CLI de Coolify (Avanzado)**

Si tienes acceso SSH al servidor:

```bash
# Conectar al servidor de Coolify
ssh user@tu-servidor-coolify

# Usar CLI de Coolify para agregar variables
coolify env set NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com --project chamos-barber-app
coolify env set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoiYW5vbiJ9.cE6BYGcPB6HC4vacIQB-Zabf4EKfVJ7x7ViZ4CIASJA --project chamos-barber-app
coolify env set SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0 --project chamos-barber-app --secret

# Redeploy
coolify deploy chamos-barber-app
```

---

## 🔍 Verificación de Variables

### **Opción 1: Verificar en la Interfaz de Coolify**

1. Ve a tu proyecto en Coolify
2. Ve a "Environment Variables"
3. Verifica que veas:
   ```
   ✓ NEXT_PUBLIC_SUPABASE_URL        (visible)
   ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY   (visible)
   ✓ SUPABASE_SERVICE_ROLE_KEY       (hidden/secret)
   ```

### **Opción 2: Verificar en Build Logs**

1. Ve a "Deployment Logs" o "Build Logs"
2. Busca líneas como:
   ```
   ✓ Environment variables loaded
   ✓ NEXT_PUBLIC_SUPABASE_URL is set
   ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY is set
   ✓ SUPABASE_SERVICE_ROLE_KEY is set
   ```

### **Opción 3: Verificar en el Contenedor (SSH)**

Si tienes acceso SSH:

```bash
# Conectar al servidor
ssh user@tu-servidor-coolify

# Listar contenedores
docker ps | grep chamos

# Inspeccionar variables de entorno del contenedor
docker exec <container-id> env | grep SUPABASE

# Deberías ver:
# NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0...
# SUPABASE_SERVICE_ROLE_KEY=eyJ0...
```

---

## 🚨 Solución de Problemas

### **Problema 1: Variables no se aplican después de guardar**

**Solución:**
1. Forzar rebuild completo:
   - Click en "Clear Cache"
   - Click en "Rebuild"
2. O hacer un commit vacío para forzar redeploy:
   ```bash
   git commit --allow-empty -m "chore: Force Coolify rebuild"
   git push origin master
   ```

### **Problema 2: Build falla con "SUPABASE_SERVICE_ROLE_KEY is not defined"**

**Causa:** La variable no está siendo pasada al proceso de build.

**Solución:**
1. Verifica que el nombre sea exactamente: `SUPABASE_SERVICE_ROLE_KEY`
2. No uses espacios ni caracteres especiales en el nombre
3. Asegúrate de hacer rebuild después de agregar la variable

### **Problema 3: Error RLS persiste después de configurar variables**

**Causa:** Build cacheado o contenedor viejo.

**Solución:**
```bash
# En Coolify:
1. Stop Application
2. Clear Cache
3. Clear Volumes (si está disponible)
4. Rebuild & Deploy

# O desde CLI:
docker stop <container-id>
docker rm <container-id>
docker volume prune
coolify deploy chamos-barber-app --force
```

### **Problema 4: Coolify no tiene opción para variables de entorno**

**Solución Alternativa:**
Crear archivo `.env.production` en el repositorio:

```bash
# ⚠️ CUIDADO: Esto expone secrets en el repositorio
# Solo usar si Coolify no tiene otra opción

# En tu máquina local:
cd /home/user/webapp

cat > .env.production << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoiYW5vbiJ9.cE6BYGcPB6HC4vacIQB-Zabf4EKfVJ7x7ViZ4CIASJA
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0
NODE_ENV=production
PORT=3000
EOF

# ⚠️ IMPORTANTE: Agregar a .gitignore si no está
echo ".env.production" >> .gitignore

# Commit y push
git add .env.production .gitignore
git commit -m "feat: Add production environment file for Coolify"
git push origin master
```

---

## 📊 Checklist de Configuración

Antes de dar por terminada la configuración:

- [ ] Variables agregadas en Coolify
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Variables guardadas correctamente
- [ ] Build iniciado después de guardar variables
- [ ] Build completado sin errores
- [ ] Aplicación desplegada correctamente
- [ ] Variables visibles en logs de build
- [ ] Aplicación accesible en navegador
- [ ] **Prueba real:** Crear una cita exitosamente
- [ ] No hay errores RLS en la consola del navegador

---

## 🎓 Información Adicional

### **¿Por qué necesitamos estas variables?**

1. **`NEXT_PUBLIC_SUPABASE_URL`**
   - URL de tu instancia de Supabase
   - Usada por el cliente para conectarse
   - Prefijo `NEXT_PUBLIC_` = expuesta al cliente

2. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   - Clave anónima para operaciones del cliente
   - Respeta políticas RLS
   - Segura para exponer al público

3. **`SUPABASE_SERVICE_ROLE_KEY`** ⚠️
   - Clave administrativa
   - Bypassa RLS
   - **NUNCA debe exponerse al cliente**
   - Solo usada en API routes del backend

### **¿Cómo funcionan las variables NEXT_PUBLIC_?**

Next.js tiene dos tipos de variables de entorno:

1. **Variables privadas (sin prefijo):**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
   - Solo disponibles en el servidor
   - No se incluyen en el bundle del cliente
   - Seguras para secrets

2. **Variables públicas (con NEXT_PUBLIC_):**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   ```
   - Disponibles en cliente y servidor
   - Se incluyen en el bundle del cliente
   - Cualquiera puede verlas en el navegador

### **Seguridad de las Variables**

| Variable | Tipo | ¿Expuesta? | ¿Segura públicamente? |
|----------|------|------------|----------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | ✅ Sí | ✅ Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública | ✅ Sí | ✅ Sí (respeta RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Privada | ❌ No | ❌ NO exponer |

---

## 📞 Recursos de Coolify

### **Documentación Oficial**

- Sitio web: https://coolify.io
- Docs: https://coolify.io/docs
- GitHub: https://github.com/coollabsio/coolify
- Discord: https://discord.gg/coolify

### **Guías Relacionadas**

- Environment Variables: https://coolify.io/docs/knowledge-base/environment-variables
- Deployment: https://coolify.io/docs/knowledge-base/deployments
- Next.js: https://coolify.io/docs/knowledge-base/frameworks/nextjs

---

## ✅ Confirmación Final

Después de completar todos los pasos:

1. **Verificar en navegador:**
   - Abre: `https://tu-dominio.com/reservar`
   - Completa el formulario de reserva
   - Click en "Reservar"

2. **Resultado esperado:**
   ```
   ✅ ¡Cita reservada exitosamente! Te contactaremos pronto para confirmar.
   ```

3. **Verificar en Supabase:**
   - Abre Supabase Studio
   - Ve a la tabla `citas`
   - Deberías ver la nueva cita creada

Si ves el mensaje de éxito y la cita aparece en Supabase:

🎉 **¡Configuración completada exitosamente!**

---

**Última actualización:** 2025-11-06  
**Versión de Coolify:** Compatible con v3.x y v4.x  
**Soporte:** Ver `SOLUCION_ERROR_RLS.md` para troubleshooting adicional
