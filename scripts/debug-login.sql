-- ============================================
-- DEBUG: Verificar Login de Admin
-- ============================================

-- 1. Ver todos los usuarios en auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email LIKE '%admin%'
ORDER BY created_at DESC;

-- 2. Ver todos los usuarios en admin_users
SELECT 
  id,
  email,
  rol,
  activo,
  barbero_id,
  creado_en
FROM admin_users
ORDER BY creado_en DESC;

-- 3. Verificar si admin@chamosbarber.com existe en ambas tablas
SELECT 
  'auth.users' as tabla,
  id,
  email
FROM auth.users
WHERE email = 'admin@chamosbarber.com'
UNION ALL
SELECT 
  'admin_users' as tabla,
  id,
  email
FROM admin_users
WHERE email = 'admin@chamosbarber.com';

-- 4. Verificar relación entre auth.users y admin_users
SELECT 
  au_auth.id as auth_id,
  au_auth.email as auth_email,
  au_admin.id as admin_id,
  au_admin.email as admin_email,
  au_admin.rol,
  au_admin.activo,
  CASE 
    WHEN au_auth.id = au_admin.id THEN '✓ IDs coinciden'
    ELSE '✗ IDs NO coinciden'
  END as estado_ids,
  CASE 
    WHEN au_auth.email = au_admin.email THEN '✓ Emails coinciden'
    ELSE '✗ Emails NO coinciden'
  END as estado_emails
FROM auth.users au_auth
LEFT JOIN admin_users au_admin ON au_auth.email = au_admin.email
WHERE au_auth.email = 'admin@chamosbarber.com';

-- 5. Si no existe en admin_users, crearlo
DO $$
DECLARE
  admin_auth_id UUID;
BEGIN
  -- Buscar ID en auth.users
  SELECT id INTO admin_auth_id
  FROM auth.users
  WHERE email = 'admin@chamosbarber.com'
  LIMIT 1;

  IF admin_auth_id IS NOT NULL THEN
    -- Insertar en admin_users si no existe
    INSERT INTO admin_users (id, email, rol, activo, creado_en)
    VALUES (admin_auth_id, 'admin@chamosbarber.com', 'admin', true, NOW())
    ON CONFLICT (id) DO UPDATE
    SET 
      email = 'admin@chamosbarber.com',
      rol = 'admin',
      activo = true,
      actualizado_en = NOW();
    
    RAISE NOTICE '✅ Usuario admin sincronizado correctamente';
  ELSE
    RAISE NOTICE '❌ No se encontró usuario admin@chamosbarber.com en auth.users';
    RAISE NOTICE '   Debes crear el usuario primero en Authentication → Users';
  END IF;
END $$;

-- 6. Verificación final
SELECT 
  au_admin.id,
  au_admin.email,
  au_admin.rol,
  au_admin.activo,
  au_admin.barbero_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.users au_auth 
      WHERE au_auth.id = au_admin.id
    ) THEN '✓ Existe en auth.users'
    ELSE '✗ NO existe en auth.users'
  END as estado_auth
FROM admin_users au_admin
WHERE au_admin.email = 'admin@chamosbarber.com';

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- ✅ Usuario existe en auth.users
-- ✅ Usuario existe en admin_users
-- ✅ IDs coinciden entre ambas tablas
-- ✅ rol = 'admin'
-- ✅ activo = true
-- ============================================
