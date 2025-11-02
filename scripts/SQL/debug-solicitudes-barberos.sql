-- ===================================================================
-- SCRIPT DE DIAGNÓSTICO: Solicitudes de Barberos
-- ===================================================================
-- Este script verifica el estado del sistema de solicitudes
-- ===================================================================

-- 1. Verificar que la tabla existe y tiene datos
SELECT 
  'Tabla solicitudes_barberos' as check_name,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
  COUNT(*) FILTER (WHERE estado = 'aprobada') as aprobadas,
  COUNT(*) FILTER (WHERE estado = 'rechazada') as rechazadas
FROM solicitudes_barberos;

-- 2. Ver últimas solicitudes
SELECT 
  id,
  nombre,
  apellido,
  email,
  estado,
  created_at,
  barbero_id
FROM solicitudes_barberos
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar políticas RLS de solicitudes_barberos
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'solicitudes_barberos'
ORDER BY policyname;

-- 4. Verificar estructura de admin_users
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;

-- 5. Verificar usuarios en admin_users
SELECT 
  id,
  email,
  nombre,
  rol,
  barbero_id,
  activo,
  creado_en
FROM admin_users
ORDER BY creado_en DESC;

-- 6. Verificar políticas RLS de admin_users
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'admin_users'
ORDER BY policyname;

-- 7. Verificar barberos creados recientemente
SELECT 
  b.id,
  b.nombre,
  b.apellido,
  b.email,
  b.activo,
  b.created_at,
  au.email as admin_user_email,
  au.nombre as admin_user_nombre,
  au.rol as admin_user_rol
FROM barberos b
LEFT JOIN admin_users au ON au.barbero_id = b.id
ORDER BY b.created_at DESC
LIMIT 10;

-- 8. Buscar solicitudes aprobadas sin barbero_id
SELECT 
  id,
  nombre,
  apellido,
  email,
  estado,
  barbero_id,
  fecha_revision
FROM solicitudes_barberos
WHERE estado = 'aprobada' AND barbero_id IS NULL;

-- 9. Verificar triggers en solicitudes_barberos
SELECT 
  tgname as trigger_name,
  tgtype as trigger_type,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'solicitudes_barberos'::regclass
  AND tgname NOT LIKE 'RI_%'  -- Excluir triggers internos
ORDER BY tgname;

-- ===================================================================
-- RESULTADO ESPERADO:
-- ===================================================================
-- ✅ Tabla solicitudes_barberos existe y tiene registros
-- ✅ Políticas RLS están activas (anon INSERT, authenticated SELECT/UPDATE)
-- ✅ admin_users tiene columnas: nombre, telefono, avatar_url, barbero_id
-- ✅ Políticas RLS de admin_users permiten inserts autenticados
-- ✅ Barberos recientes tienen admin_users asociados
-- ===================================================================
