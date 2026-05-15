# Solución: Problema de Acceso al Panel de Administración

## 🔍 Problema Reportado

El usuario no podía acceder al panel de administración después del login:
- La página de login se actualizaba pero no redirigía al panel admin
- Error: "No tienes permisos para acceder"

## 🔎 Diagnóstico

### 1. Verificación de Usuario Admin
- **Usuario en auth.users**: ✅ Existe
  - ID: `fdf8d449-a8fb-440f-b445-40209f396bb6`
  - Email: `admin@chamosbarber.com`
  - Email confirmado: ✅
  - Último login: 2025-11-02 16:30:10

- **Usuario en admin_users**: ✅ Existe y sincronizado
  - ID: `fdf8d449-a8fb-440f-b445-40209f396bb6`
  - Email: `admin@chamosbarber.com`
  - Rol: `admin`
  - Activo: `true`

### 2. Problema Identificado

El código de `login.tsx` tenía un bug:

```typescript
// ❌ ANTES: Buscaba por email
const { data: adminUser, error } = await supabase
  .from('admin_users')
  .select('*')
  .eq('email', session.user.email)  // Problema potencial con RLS
  .eq('activo', true)
  .single()
```

**Problema**: Las políticas RLS (Row Level Security) de `admin_users` permiten a los usuarios autenticados leer SOLO su propio registro usando `auth.uid()`, pero la consulta usaba `email` en lugar de `id`.

## ✅ Soluciones Aplicadas

### 1. Actualizar Contraseña del Admin

```bash
# Contraseña restaurada a la original del usuario
Email: admin@chamosbarber.com
Password: ChamosAdmin2024!
```

### 2. Sincronizar Usuario en admin_users

```sql
-- Verificar y actualizar registro en admin_users
UPDATE admin_users 
SET email = 'admin@chamosbarber.com',
    rol = 'admin',
    activo = true
WHERE id = 'fdf8d449-a8fb-440f-b445-40209f396bb6';
```

### 3. Corregir Código de Login

```typescript
// ✅ DESPUÉS: Busca por ID (compatible con RLS)
const { data: adminUser, error } = await supabase
  .from('admin_users')
  .select('*')
  .eq('id', session.user.id)  // Usa ID en lugar de email
  .eq('activo', true)
  .single()
```

### 4. Agregar Logging Detallado

```typescript
console.log('🔍 Verificando acceso para:', session.user.email)
console.log('🆔 User ID:', session.user.id)
console.log('📊 Resultado de consulta:', { adminUser, error })
console.log('✅ Usuario encontrado:', adminUser.email, 'Rol:', adminUser.rol)
console.log('➡️ Redirigiendo a /admin')
```

## 📋 Políticas RLS de admin_users

La política actual permite a usuarios autenticados leer su propio registro:

```sql
CREATE POLICY "admin_users_select_own"
ON admin_users FOR SELECT
TO authenticated
USING (id = auth.uid() AND activo = true);
```

Esta política requiere que la consulta use `id = auth.uid()`, no `email`.

## 🚀 Deployment

### Cambios Comiteados:
```
commit ecd5e10
fix(auth): mejorar diagnóstico de login y usar ID en lugar de email

- Cambiar búsqueda de admin_users de email a ID (más preciso)
- Agregar logging detallado para debugging
- Mejorar mensajes de error con información específica
- Actualizar contraseña admin a ChamosAdmin2024!
```

### Push a Producción:
```bash
git push origin master  # ✅ Completado
```

**Coolify detectará automáticamente el cambio y hará deploy en ~2-3 minutos**

## 🧪 Cómo Probar

### Opción 1: En Desarrollo (Sandbox)
```
URL: https://3002-ipv83x9w638fd3sxre87s-8f57ffe2.sandbox.novita.ai/login
```

### Opción 2: En Producción (Después del deploy de Coolify)
```
URL: https://chamosbarber.com/login
```

### Credenciales de Prueba:

**Admin:**
- Email: `admin@chamosbarber.com`
- Password: `ChamosAdmin2024!`
- Debe redirigir a: `/admin`

**Barberos:**
- Email: `carlos@chamosbarber.com`
- Password: `Temporal123!`
- Debe redirigir a: `/barbero-panel`

## 📊 Verificación en Consola del Navegador

Al hacer login, deberías ver en la consola:
```
🔍 Verificando acceso para: admin@chamosbarber.com
🆔 User ID: fdf8d449-a8fb-440f-b445-40209f396bb6
📊 Resultado de consulta: { adminUser: {...}, error: null }
✅ Usuario encontrado: admin@chamosbarber.com Rol: admin
➡️ Redirigiendo a /admin
```

## 🔧 Scripts Creados

1. **`scripts/fix-admin-password.sh`**
   - Actualiza contraseña del admin via Supabase Admin API

2. **`scripts/fix-admin-access.sql`**
   - Verifica y sincroniza usuario admin en admin_users

3. **`scripts/fix-admin-users-rls.sql`**
   - Documenta y corrige políticas RLS de admin_users

## ✅ Estado Final

- ✅ Contraseña admin actualizada a `ChamosAdmin2024!`
- ✅ Usuario sincronizado en `admin_users`
- ✅ Código de login corregido (usa ID en lugar de email)
- ✅ Logging detallado agregado para debugging
- ✅ Cambios comiteados y pusheados a master
- ✅ Deploy automático en proceso via Coolify

## 🎯 Próximos Pasos

1. **Esperar 2-3 minutos** para que Coolify complete el deploy
2. **Probar login** en producción: https://chamosbarber.com/login
3. **Verificar redirección** al panel de administración
4. **Revisar consola del navegador** si hay problemas

---

**Fecha de Solución**: 2025-11-02  
**Autor**: Claude (AI Assistant)  
**Commit**: ecd5e10
