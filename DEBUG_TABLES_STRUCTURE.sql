-- ================================================================
-- 🔍 DIAGNÓSTICO: Verificar estructura de tablas
-- ================================================================

-- Ver estructura de tabla barberos
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'barberos'
ORDER BY ordinal_position;

-- Ver estructura de tabla servicios
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'servicios'
ORDER BY ordinal_position;

-- Intentar consultar barberos
SELECT 
  id,
  nombre,
  apellido,
  email,
  activo
FROM barberos
WHERE activo = true
ORDER BY nombre;

-- Intentar consultar servicios
SELECT 
  id,
  nombre,
  precio,
  activo
FROM servicios
WHERE activo = true
ORDER BY nombre;

-- Ver todas las políticas de barberos
SELECT 
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'barberos';

-- Ver todas las políticas de servicios
SELECT 
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'servicios';
