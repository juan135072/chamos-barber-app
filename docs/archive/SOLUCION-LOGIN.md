# 🔧 Solución: Error "Failed to fetch" en Login

## ❌ Problema Identificado

El error "Failed to fetch" en la página de login indica que las **variables de entorno no están configuradas en Coolify**.

---

## ✅ Solución: Configurar Variables de Entorno en Coolify

### Paso 1: Acceder a Coolify Dashboard

1. Ve a tu dashboard de Coolify
2. Busca el proyecto: **chamos-barber-app**
3. Click en el proyecto

### Paso 2: Agregar Variables de Entorno

En la sección de **Environment Variables**, agrega las siguientes:

```env
NEXT_PUBLIC_SUPABASE_URL=http://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMwNTQ4ODAwLCJleHAiOjE4ODgzMTQ4MDB9.c1l1XwuzQYiS9tDOZqwJsQx5g3q6N0w0ZQMz4KZLfhY
```

### Paso 3: Re-deploy

1. Guarda los cambios
2. Haz re-deploy del proyecto
3. Espera ~3-5 minutos

---

## 🔍 Cómo Encontrar la Configuración en Coolify

### Opción A: Desde el Dashboard
```
Dashboard → Projects → chamos-barber-app → Settings → Environment Variables
```

### Opción B: Desde el Deployment
```
Dashboard → Deployments → chamos-barber-app → Configuration → Environment
```

---

## 📋 Variables de Entorno Necesarias

### Mínimas (Requeridas):
```env
NEXT_PUBLIC_SUPABASE_URL=http://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMwNTQ4ODAwLCJleHAiOjE4ODgzMTQ4MDB9.c1l1XwuzQYiS9tDOZqwJsQx5g3q6N0w0ZQMz4KZLfhY
```

### Opcionales (Para Admin):
```env
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MzA1NDg4MDAsImV4cCI6MTg4ODMxNDgwMH0.RvVjNbxX_kVP4V-7EchcKy5FQ0XQx9h5pFrNnFhfK8E
SUPABASE_JWT_SECRET=2O3K1P4dP4SxFjWBXye61DojrD3JVKo3
```

---

## 🧪 Verificar que Funcionó

### Después del re-deploy:

1. **Visita**: https://chamosbarber.com/login
2. **Ingresa**:
   - Email: `admin@chamosbarber.com`
   - Contraseña: `ChamosAdmin2024!`
3. **Click**: "Sign in"
4. **Resultado esperado**: Redirección a `/admin`

---

## 🛠️ Solución Alternativa (Si no tienes acceso a Coolify)

Si no puedes acceder a Coolify, puedes:

### Opción 1: Crear archivo .env en el servidor
```bash
# SSH al servidor
ssh user@tu-servidor.com

# Navegar al directorio del proyecto
cd /ruta/al/proyecto

# Crear archivo .env
cat > .env.production << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=http://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMwNTQ4ODAwLCJleHAiOjE4ODgzMTQ4MDB9.c1l1XwuzQYiS9tDOZqwJsQx5g3q6N0w0ZQMz4KZLfhY
EOF

# Reiniciar el contenedor
docker restart <container-id>
```

### Opción 2: Build-time Variables
Agregar variables en tiempo de build en Coolify:
```
Settings → Build → Build Arguments
```

---

## 🔒 Seguridad: Variables Públicas vs Privadas

### Variables NEXT_PUBLIC_* (Públicas)
- ✅ Se pueden exponer en el frontend
- ✅ Son seguras para el navegador
- ✅ Ejemplo: `NEXT_PUBLIC_SUPABASE_URL`

### Variables sin NEXT_PUBLIC_* (Privadas)
- ❌ NO se exponen en el frontend
- ✅ Solo disponibles en el servidor
- ✅ Ejemplo: `SUPABASE_SERVICE_ROLE_KEY`

---

## 📊 Checklist de Verificación

Antes de intentar login nuevamente:

- [ ] Variables agregadas en Coolify
- [ ] Re-deploy ejecutado
- [ ] Build completado sin errores
- [ ] Sitio accesible en https://chamosbarber.com
- [ ] Página /login carga correctamente
- [ ] Console del navegador sin errores

---

## 🐛 Debugging Adicional

### Ver errores en la consola del navegador:

1. Abre DevTools (F12)
2. Ve a la pestaña "Console"
3. Intenta hacer login
4. Busca errores en rojo

### Errores Comunes:

#### "Failed to fetch"
- ❌ Variables de entorno faltantes
- ❌ CORS bloqueando requests
- ❌ Supabase no accesible

#### "Invalid login credentials"
- ❌ Email o contraseña incorrectos
- ✅ Verifica: `admin@chamosbarber.com` / `ChamosAdmin2024!`

#### "Network error"
- ❌ Supabase caído
- ❌ Firewall bloqueando
- ❌ URL incorrecta

---

## 📞 Contacto de Soporte

Si después de configurar las variables el problema persiste:

1. Verifica logs de Coolify
2. Revisa logs del contenedor Docker
3. Comprueba que Supabase esté online: http://supabase.chamosbarber.com/health

---

## ✅ Una vez resuelto

Después de que el login funcione:

1. ✅ Accede al dashboard de admin
2. ✅ Verifica que se carguen los barberos
3. ✅ Verifica que se carguen los servicios
4. ✅ Prueba crear un nuevo barbero
5. ✅ Prueba editar un servicio

---

**Última Actualización**: 2025-11-02  
**Estado**: Pendiente de configuración en Coolify
