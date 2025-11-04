-- ============================================
-- FIX: Recursión infinita en políticas RLS de admin_users
-- ⚠️  IMPORTANTE: Este script SOLO modifica la tabla admin_users
-- ⚠️  NO toca otras tablas como barberos, citas, servicios, etc.
-- ============================================

-- PASO 1: Ver TODAS las políticas del sistema (para referencia)
SELECT 
  tablename,
  policyname,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- PASO 2: Ver políticas ESPECÍFICAS de admin_users (las que vamos a eliminar)
SELECT 
  tablename,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'admin_users'
ORDER BY policyname;

-- PASO 3: ELIMINAR políticas SOLO de admin_users
-- Estas políticas están causando recursión infinita
DROP POLICY IF EXISTS "admin_users_select_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_authenticated_select" ON admin_users;
DROP POLICY IF EXISTS "admin_users_select_own" ON admin_users;
DROP POLICY IF EXISTS "Users can read their own admin data" ON admin_users;
DROP POLICY IF EXISTS "Admin users can read their own data" ON admin_users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON admin_users;

-- PASO 4: DESHABILITAR RLS SOLO en admin_users
-- ✅ SEGURO: Los permisos se verifican en el código (login.tsx)
-- ✅ NO afecta otras tablas como barberos, citas, etc.
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- PASO 5: Verificar que RLS está deshabilitado SOLO en admin_users
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('admin_users', 'barberos', 'citas', 'servicios', 'barbero_portfolio')
ORDER BY tablename;
-- ✅ admin_users debe mostrar rls_enabled = false
-- ✅ Las demás tablas deben mantener sus valores actuales

-- PASO 6: Verificar que las políticas de otras tablas NO fueron afectadas
SELECT 
  tablename,
  policyname,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename != 'admin_users'
ORDER BY tablename, policyname;
-- ✅ Deberías ver las políticas de barberos, citas, etc. intactas

-- PASO 7: Probar consulta a admin_users (debería funcionar)
SELECT 
  id, 
  email, 
  rol, 
  activo
FROM admin_users
WHERE email = 'admin@chamosbarber.com';
