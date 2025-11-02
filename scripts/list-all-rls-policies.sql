-- ============================================
-- LISTAR TODAS LAS POLÍTICAS RLS
-- ============================================

-- Ver políticas de TODAS las tablas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text[] as roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Ver específicamente las de admin_users
SELECT 
  tablename,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'admin_users'
ORDER BY policyname;

-- Ver específicamente las de barberos (para los slugs)
SELECT 
  tablename,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'barberos'
ORDER BY policyname;

-- Ver qué tablas tienen RLS habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
