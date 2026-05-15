# 🚀 Guía Completa de Deploy en Nuevo Servidor

**Fecha**: 5 de Diciembre, 2025  
**Situación**: Migración a nuevo servidor con nueva instancia de Supabase  
**Dominio**: chamosbarber.com

---

## 📋 Información del Nuevo Servidor

### URLs y Dominios
- **App Principal**: https://chamosbarber.com
- **Panel Coolify**: https://coolify.chamosbarber.com
- **Supabase Dashboard**: https://supabase.chamosbarber.com
- **Supabase API**: https://api.chamosbarber.com:8000

### Credenciales de Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://api.chamosbarber.com:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NDg4ODI0MCwiZXhwIjo0OTIwNTYxODQwLCJyb2xlIjoiYW5vbiJ9.zlojOyYTcLcnwzqMbD8tGdg-sLbtjgGHLAdDBTo30Wc
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NDg4ODI0MCwiZXhwIjo0OTIwNTYxODQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.cGGgN-wojxxeH_SAP7zAz1RjL04QXNm0vRXskYUbZ9I
```

---

## 🗂️ Fase 1: Configurar Base de Datos Supabase

### Paso 1.1: Acceder a Supabase

1. Abre tu navegador y ve a: `https://supabase.chamosbarber.com`
2. Haz login con tus credenciales de Coolify/Supabase
3. Una vez dentro, ve al **SQL Editor** (icono de base de datos en el menú lateral)

### Paso 1.2: Ejecutar Script de Inicialización

1. En el SQL Editor, haz clic en **"+ New query"**
2. Abre el archivo: `INICIALIZACION_COMPLETA_BD.sql`
3. **Selecciona TODO el contenido** (Ctrl+A)
4. **Copia** (Ctrl+C)
5. **Pega** en el SQL Editor de Supabase (Ctrl+V)
6. Haz clic en el botón **"RUN"** ▶️ (esquina superior derecha)
7. **Espera 30-60 segundos** mientras se ejecuta

**✅ Resultado Esperado:**
Deberías ver una tabla al final con:
```
✅ INICIALIZACIÓN COMPLETA - Verificando tablas creadas...

tablename                | columnas
------------------------|----------
admin_users             | 8
barberos                | 12
categorias_servicios    | 5
citas                   | 11
configuracion_sitio     | 14
enlaces_sociales        | 6
horarios_atencion       | 6
horarios_bloqueados     | 5
notas_clientes          | 9
servicios               | 8
solicitudes_barbero     | 11

🎉 ¡BASE DE DATOS INICIALIZADA CORRECTAMENTE!
```

**❌ Si hay errores:**
- Lee el mensaje de error
- Verifica que no hayan tablas creadas previamente
- Si es necesario, ejecuta el script en partes

---

### Paso 1.3: Configurar Storage y Usuario Admin

1. En el SQL Editor, abre **otra query nueva**
2. Abre el archivo: `CREAR_ADMIN_Y_STORAGE.sql`
3. **Copia TODO el contenido**
4. **Pega** en el SQL Editor
5. Haz clic en **"RUN"** ▶️

**✅ Resultado Esperado:**
```
✅ Storage configurado correctamente
⚠️ RECUERDA: Debes crear el usuario en Authentication primero
```

---

### Paso 1.4: Crear Usuario Administrador en Supabase Auth

#### Opción A: Desde el Panel de Supabase (Recomendado)

1. Ve a **Authentication** → **Users** en el menú lateral de Supabase
2. Haz clic en **"Add user"** o **"Invite user"**
3. Completa el formulario:
   - **Email**: `admin@chamosbarber.com`
   - **Password**: (Crea una contraseña segura, por ejemplo: `ChamosAdmin2025!`)
   - **Auto Confirm User**: ✅ Marcado (importante!)
4. Haz clic en **"Create user"** o **"Send invitation"**
5. **IMPORTANTE**: Copia el **UUID** del usuario creado (lo necesitarás en el siguiente paso)

#### Opción B: Usando SQL (Alternativa)

Si no puedes acceder al panel de Authentication, puedes crear el usuario con SQL:

```sql
-- SOLO SI NO PUEDES USAR EL PANEL DE AUTHENTICATION
-- Reemplaza 'tu-password-segura' con tu contraseña

-- Insertar usuario en auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), -- Se generará automáticamente
  'authenticated',
  'authenticated',
  'admin@chamosbarber.com',
  crypt('tu-password-segura', gen_salt('bf')), -- Reemplaza 'tu-password-segura'
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) RETURNING id;
```

---

### Paso 1.5: Vincular Usuario Admin con Tabla admin_users

1. Una vez que tengas el **UUID del usuario** creado en el paso anterior
2. Abre una **nueva query** en el SQL Editor
3. Ejecuta este comando **reemplazando** `'UUID_AQUI'` con el UUID real:

```sql
INSERT INTO public.admin_users (
  id,
  email,
  nombre,
  telefono,
  rol,
  activo,
  barbero_id
) VALUES (
  'UUID_AQUI', -- ⚠️ REEMPLAZA ESTO con el UUID del usuario de auth.users
  'admin@chamosbarber.com',
  'Administrador Principal',
  '+56912345678',
  'admin',
  true,
  NULL
) ON CONFLICT (id) DO UPDATE SET
  rol = 'admin',
  activo = true;
```

4. Haz clic en **"RUN"** ▶️

**✅ Resultado Esperado:**
```
INSERT 0 1
```

**Verificar que se creó correctamente:**
```sql
SELECT id, email, nombre, rol, activo 
FROM public.admin_users 
WHERE email = 'admin@chamosbarber.com';
```

Deberías ver:
```
id                                  | email                    | nombre                | rol   | activo
------------------------------------|--------------------------|----------------------|-------|--------
[tu-uuid]                           | admin@chamosbarber.com   | Administrador...     | admin | true
```

---

### Paso 1.6: Verificar que Todo Está Correcto

Ejecuta esta query de verificación:

```sql
-- Verificar tablas creadas
SELECT 'Tablas' AS tipo, COUNT(*) AS cantidad
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'barberos', 'categorias_servicios', 'servicios', 'citas', 
    'admin_users', 'horarios_atencion', 'notas_clientes'
  )

UNION ALL

-- Verificar Storage
SELECT 'Storage Buckets' AS tipo, COUNT(*) AS cantidad
FROM storage.buckets
WHERE id = 'barberos-fotos'

UNION ALL

-- Verificar Usuario Admin
SELECT 'Usuarios Admin' AS tipo, COUNT(*) AS cantidad
FROM public.admin_users
WHERE rol = 'admin'

UNION ALL

-- Verificar Servicios
SELECT 'Servicios' AS tipo, COUNT(*) AS cantidad
FROM public.servicios

UNION ALL

-- Verificar Categorías
SELECT 'Categorías' AS tipo, COUNT(*) AS cantidad
FROM public.categorias_servicios;
```

**✅ Resultado Esperado:**
```
tipo              | cantidad
------------------|----------
Tablas            | 11
Storage Buckets   | 1
Usuarios Admin    | 1
Servicios         | 4
Categorías        | 4
```

---

## 📦 Fase 2: Actualizar Código y Deploy

### Paso 2.1: Verificar Cambios Locales

Los siguientes archivos ya han sido actualizados:

✅ `.env.local` - Credenciales actualizadas
✅ `next.config.js` - Dominio de Supabase añadido
✅ `INICIALIZACION_COMPLETA_BD.sql` - Script creado
✅ `CREAR_ADMIN_Y_STORAGE.sql` - Script creado
✅ `GUIA_DEPLOY_NUEVO_SERVIDOR.md` - Esta guía

### Paso 2.2: Commit y Push de Cambios

**NO HAGAS COMMIT DE .env.local** (contiene credenciales sensibles)

```bash
# Verificar estado
git status

# Agregar archivos SQL y guías
git add INICIALIZACION_COMPLETA_BD.sql
git add CREAR_ADMIN_Y_STORAGE.sql
git add GUIA_DEPLOY_NUEVO_SERVIDOR.md
git add next.config.js

# Commit
git commit -m "feat: configuración para nuevo servidor con Supabase en Coolify

- Añadida URL de Supabase API a next.config.js
- Creados scripts SQL de inicialización completa
- Añadida guía de deploy paso a paso
- Configuración para chamosbarber.com"

# Push
git push origin main
```

---

## 🚀 Fase 3: Configurar y Deployar en Coolify

### Paso 3.1: Acceder a Coolify

1. Abre: `https://coolify.chamosbarber.com`
2. Haz login con tus credenciales
3. Ve a tu proyecto **Chamos Barber App**

### Paso 3.2: Configurar Variables de Entorno

1. En el proyecto, ve a la pestaña **"Environment Variables"** o **"Settings"** → **"Environment"**
2. Haz clic en **"Add Variable"** o edita las existentes
3. Añade/actualiza las siguientes variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://api.chamosbarber.com:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NDg4ODI0MCwiZXhwIjo0OTIwNTYxODQwLCJyb2xlIjoiYW5vbiJ9.zlojOyYTcLcnwzqMbD8tGdg-sLbtjgGHLAdDBTo30Wc
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NDg4ODI0MCwiZXhwIjo0OTIwNTYxODQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.cGGgN-wojxxeH_SAP7zAz1RjL04QXNm0vRXskYUbZ9I

# App
NEXT_PUBLIC_APP_URL=https://chamosbarber.com

# NextAuth
NEXTAUTH_URL=https://chamosbarber.com
NEXTAUTH_SECRET=chamos-barber-secret-key-production-2025

# Node (Opcional)
NODE_ENV=production
```

4. **Guarda** los cambios

### Paso 3.3: Configurar Build Settings (si es necesario)

Si Coolify te permite configurar build settings, verifica:

- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Port**: `3000`
- **Node Version**: `18` o `20`

### Paso 3.4: Hacer Deploy

1. Ve a la pestaña **"Deployments"**
2. Haz clic en **"Deploy"** o **"Redeploy"**
3. Espera a que el build termine (puede tardar 3-5 minutos)
4. Observa los logs en tiempo real para detectar errores

**✅ Indicadores de Éxito:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
✓ Starting server...
```

**❌ Si hay errores:**
- Lee los logs cuidadosamente
- Verifica que las variables de entorno estén correctas
- Verifica que el dominio de Supabase sea accesible
- Reinicia el deploy

---

## 🧪 Fase 4: Verificación y Testing

### Paso 4.1: Verificar que la App Está Corriendo

1. Abre tu navegador
2. Ve a: `https://chamosbarber.com`
3. La página debe cargar correctamente

**✅ Página Cargada:**
- Deberías ver el home de Chamos Barber
- El navbar debe ser visible
- No debe haber errores en la consola del navegador (F12)

### Paso 4.2: Probar Login de Admin

1. Ve a: `https://chamosbarber.com/admin`
2. Deberías ser redirigido a `/login`
3. Ingresa:
   - **Email**: `admin@chamosbarber.com`
   - **Password**: (la que creaste en Paso 1.4)
4. Haz clic en **"Iniciar Sesión"**

**✅ Login Exitoso:**
- Deberías ser redirigido a `/admin`
- Ver el panel de administración con 6+ tabs
- Ver tu nombre en el header

**❌ Si falla el login:**
```sql
-- Verificar que el usuario existe
SELECT id, email, rol, activo FROM public.admin_users WHERE email = 'admin@chamosbarber.com';

-- Verificar que el usuario está en auth.users
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'admin@chamosbarber.com';
```

### Paso 4.3: Probar Funcionalidades Básicas

#### Test 1: Crear un Barbero

1. En el panel admin, ve al tab **"Barberos"**
2. Haz clic en **"Agregar Barbero"**
3. Completa el formulario:
   - Nombre: Carlos
   - Apellido: Pérez
   - Teléfono: +56987654321
   - Email: carlos@chamosbarber.com
   - Instagram: @carlosbarber
   - Descripción: Barbero profesional
4. Haz clic en **"Guardar"**

**✅ Éxito:** El barbero aparece en la lista

#### Test 2: Subir Foto de Barbero

1. Haz clic en el barbero creado
2. En el modal de edición, arrastra una foto al área de upload
3. Deberías ver un preview de la imagen
4. Haz clic en **"Guardar"**

**✅ Éxito:** La foto se guarda y se muestra en la tarjeta del barbero

**❌ Si falla:**
- Verifica que el bucket `barberos-fotos` existe en Storage
- Verifica las políticas RLS del Storage

#### Test 3: Crear una Reserva (Como Cliente)

1. Cierra sesión del admin
2. Ve a: `https://chamosbarber.com/reservar`
3. Selecciona:
   - Barbero: Carlos Pérez
   - Servicio: Corte Clásico
   - Fecha: Mañana
   - Hora: Cualquier hora disponible
4. Completa los datos del cliente:
   - Nombre: Juan
   - Email: juan@test.com
   - Teléfono: +56912345678
5. Haz clic en **"Reservar Cita"**

**✅ Éxito:**
- Mensaje de confirmación
- Cita creada en la base de datos

**Verificar en la BD:**
```sql
SELECT * FROM public.citas ORDER BY created_at DESC LIMIT 5;
```

---

## 🎉 Fase 5: Finalización y Documentación

### ✅ Checklist Final

- [ ] Base de datos inicializada con todas las tablas
- [ ] Storage configurado con bucket `barberos-fotos`
- [ ] Usuario administrador creado y funcional
- [ ] Variables de entorno configuradas en Coolify
- [ ] Deploy exitoso sin errores
- [ ] App accesible en https://chamosbarber.com
- [ ] Login de admin funciona
- [ ] Crear barberos funciona
- [ ] Upload de fotos funciona
- [ ] Sistema de reservas funciona

### 📋 Credenciales para Guardar

**Usuario Administrador:**
```
Email: admin@chamosbarber.com
Password: [TU_PASSWORD_AQUI]
URL: https://chamosbarber.com/admin
```

**Supabase:**
```
Dashboard: https://supabase.chamosbarber.com
API: https://api.chamosbarber.com:8000
Anon Key: eyJ0eXAiOiJKV1QiLCJhbGc...
Service Role Key: eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Coolify:**
```
Panel: https://coolify.chamosbarber.com
Proyecto: chamos-barber-app
Branch: main
```

### 📚 Documentos de Referencia

- `INDICE_DOCUMENTACION.md` - Índice completo de toda la documentación
- `DOCUMENTACION_ESTADO_V1.6_SEGURIDAD_COMPLETA.md` - Estado actual del sistema
- `README.md` - Información general del proyecto
- `GUIA_DEPLOY_NUEVO_SERVIDOR.md` - Esta guía

---

## 🐛 Troubleshooting

### Problema: "Error de conexión a Supabase"

**Solución:**
1. Verifica que Supabase esté corriendo en Coolify
2. Prueba acceder a: `https://api.chamosbarber.com:8000`
3. Verifica que las keys en Coolify sean las correctas

### Problema: "Error 500 en el login"

**Solución:**
```sql
-- Verifica que el usuario existe en ambas tablas
SELECT 'auth.users' as tabla, COUNT(*) FROM auth.users WHERE email = 'admin@chamosbarber.com'
UNION ALL
SELECT 'admin_users' as tabla, COUNT(*) FROM public.admin_users WHERE email = 'admin@chamosbarber.com';
```

Ambos deben retornar 1.

### Problema: "No se pueden subir fotos"

**Solución:**
```sql
-- Verificar bucket
SELECT * FROM storage.buckets WHERE id = 'barberos-fotos';

-- Verificar políticas
SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
```

Si el bucket no existe, ejecuta nuevamente el script `CREAR_ADMIN_Y_STORAGE.sql`.

---

## 🎊 ¡FELICIDADES!

Si llegaste hasta aquí y todo funciona, **¡tu app está completamente operativa en el nuevo servidor!** 🚀

**Próximos pasos opcionales:**
1. Crear más barberos y configurar sus horarios
2. Agregar servicios personalizados
3. Configurar notificaciones por WhatsApp (n8n + Twilio)
4. Implementar sistema POS (si lo necesitas)

---

**Última actualización**: 5 de Diciembre, 2025  
**Autor**: Sistema de recuperación Chamos Barber  
**Versión**: 1.0
