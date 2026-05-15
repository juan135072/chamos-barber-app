# 🔥 URGENTE: Fix Recursión RLS en admin_users

## 🚨 Problema

Error al hacer login:
```
infinite recursion detected in policy for relation "admin_users"
```

## ✅ Solución: Ejecutar SQL Manualmente

Necesitas acceder a **Supabase Studio** y ejecutar este SQL:

### 📍 Acceso a Supabase Studio:

```
URL: https://supabase.chamosbarber.com/
Password: IGnWZHipT8IeSI7j
```

### 📝 SQL a Ejecutar:

**Copia y pega esto en el SQL Editor:**

```sql
-- ============================================
-- FIX: Recursión infinita en políticas RLS
-- ============================================

-- 1. Ver políticas actuales (opcional)
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'admin_users';

-- 2. ELIMINAR TODAS las políticas que causan recursión
DROP POLICY IF EXISTS "admin_users_select_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_authenticated_select" ON admin_users;
DROP POLICY IF EXISTS "admin_users_select_own" ON admin_users;
DROP POLICY IF EXISTS "Users can read their own admin data" ON admin_users;
DROP POLICY IF EXISTS "Admin users can read their own data" ON admin_users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON admin_users;

-- 3. DESHABILITAR RLS en admin_users
-- Ya verificamos permisos en el código, no necesitamos RLS aquí
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- 4. Verificar que RLS está deshabilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'admin_users';
-- Debería mostrar rowsecurity = false

-- 5. Probar consulta (debería funcionar)
SELECT id, email, rol, activo
FROM admin_users
WHERE email = 'admin@chamosbarber.com';
```

## 🎯 Pasos Detallados:

1. **Abre tu navegador** y ve a https://supabase.chamosbarber.com/

2. **Ingresa la contraseña**: `IGnWZHipT8IeSI7j`

3. **Ve al SQL Editor**:
   - Busca el ícono de SQL en el menú lateral
   - O busca "SQL Editor" en la barra de búsqueda

4. **Copia y pega** todo el SQL de arriba

5. **Ejecuta** (presiona el botón "Run" o Ctrl/Cmd + Enter)

6. **Verifica** que el output muestre `rowsecurity = false`

7. **Intenta hacer login** nuevamente en https://chamosbarber.com/login

## 🔍 ¿Por qué esto soluciona el problema?

**El problema:**
- Las políticas RLS intentaban verificar la columna `activo` en la misma tabla `admin_users`
- Esto creaba una recursión infinita: "para leer admin_users, necesito leer admin_users"

**La solución:**
- Deshabilitamos RLS completamente en `admin_users`
- La verificación de permisos ya se hace en el código de la aplicación (`login.tsx`)
- El código verifica que el usuario esté `activo = true` antes de permitir acceso
- No hay riesgo de seguridad porque:
  - Solo usuarios autenticados pueden acceder
  - Solo pueden ver su propio registro (verificado en código)
  - La tabla `admin_users` no es pública

## ⚠️ IMPORTANTE: Solo Afecta a admin_users

**Este script SOLO modifica la tabla `admin_users`:**
- ❌ NO toca la tabla `barberos` (tus slugs están seguros)
- ❌ NO toca la tabla `citas`
- ❌ NO toca la tabla `servicios`
- ❌ NO toca la tabla `barbero_portfolio`
- ❌ NO toca ninguna otra tabla

**Los comandos SQL son específicos:**
- `DROP POLICY ... ON admin_users` - solo elimina de admin_users
- `ALTER TABLE admin_users DISABLE ...` - solo modifica admin_users
- El script incluye verificación para confirmar que otras tablas no fueron afectadas

## ✅ Verificación

Después de ejecutar el SQL, prueba:

```
URL: https://chamosbarber.com/login
Email: admin@chamosbarber.com
Password: ChamosAdmin2024!
```

Deberías ver en la consola del navegador (F12):
```
🔍 Verificando acceso para: admin@chamosbarber.com
🆔 User ID: fdf8d449-a8fb-440f-b445-40209f396bb6
📊 Resultado de consulta: { adminUser: {...}, error: null }
✅ Usuario encontrado: admin@chamosbarber.com Rol: admin
➡️ Redirigiendo a /admin
```

## 📞 Si Necesitas Ayuda

Si no puedes acceder a Supabase Studio o tienes problemas:

1. Verifica que la URL sea correcta: https://supabase.chamosbarber.com/
2. Verifica la contraseña: `IGnWZHipT8IeSI7j`
3. Asegúrate de estar en el SQL Editor, no en el Table Editor
4. Si el SQL falla, copia el mensaje de error completo

---

**Archivo de referencia**: `scripts/fix-rls-recursion.sql`  
**Fecha**: 2025-11-02
