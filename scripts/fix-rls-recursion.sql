-- ============================================
-- FIX: Recursión infinita en políticas RLS de admin_users
-- ============================================

-- 1. Ver políticas actuales
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'admin_users';

-- 2. ELIMINAR TODAS las políticas existentes de admin_users
DROP POLICY IF EXISTS "admin_users_select_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_authenticated_select" ON admin_users;
DROP POLICY IF EXISTS "admin_users_select_own" ON admin_users;
DROP POLICY IF EXISTS "Users can read their own admin data" ON admin_users;
DROP POLICY IF EXISTS "Admin users can read their own data" ON admin_users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON admin_users;

-- 3. DESHABILITAR RLS temporalmente para admin_users
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- 4. RECREAR políticas SIN recursión
-- La clave es NO usar subqueries ni EXISTS que referencien a admin_users

-- Política simple: Los usuarios autenticados pueden leer su propio registro
-- usando SOLO auth.uid() sin ninguna subquery
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users_simple_select"
ON admin_users FOR SELECT
TO authenticated
USING (id = auth.uid());

-- NO necesitamos verificar 'activo' en RLS porque lo verificamos en el código
-- Esto evita cualquier recursión

-- 5. Verificar políticas finales
SELECT 
  policyname, 
  cmd, 
  permissive,
  roles::text[],
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'admin_users';

-- 6. Probar que funciona
SELECT 
  id, 
  email, 
  rol, 
  activo
FROM admin_users
WHERE id = 'fdf8d449-a8fb-440f-b445-40209f396bb6';
