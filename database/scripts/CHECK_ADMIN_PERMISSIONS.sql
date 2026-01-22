-- Script para verificar permisos y estructura de admin_users
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar estructura de admin_users
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;

-- 2. Ver todos los usuarios admin
SELECT 
  id,
  auth_user_id,
  email,
  nombre,
  apellido,
  rol,
  created_at
FROM admin_users
ORDER BY created_at DESC;

-- 3. Verificar barberos con sus cuentas de usuario
SELECT 
  b.id as barbero_id,
  b.nombre,
  b.apellido,
  b.email as barbero_email,
  au.auth_user_id,
  au.rol,
  au.email as admin_user_email,
  au.created_at as cuenta_creada
FROM barberos b
LEFT JOIN admin_users au ON b.email = au.email
WHERE au.rol = 'barbero'
ORDER BY b.nombre;

-- 4. Verificar barberos SIN cuenta de usuario
SELECT 
  b.id,
  b.nombre,
  b.apellido,
  b.email,
  b.activo
FROM barberos b
WHERE NOT EXISTS (
  SELECT 1 FROM admin_users au 
  WHERE au.email = b.email AND au.rol = 'barbero'
)
ORDER BY b.nombre;

-- 5. Verificar políticas RLS en admin_users
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
WHERE tablename = 'admin_users';
