-- Verificar usuario admin actual
SELECT 
  au.id,
  au.email, 
  au.rol,
  au.activo,
  u.email as auth_email,
  u.email_confirmed_at,
  u.created_at
FROM auth.users u
LEFT JOIN admin_users au ON u.id = au.id
WHERE u.email = 'admin@chamosbarber.com';

-- Si no existe, crear el usuario admin
DO $$
DECLARE
  admin_auth_id UUID;
BEGIN
  -- Buscar si existe en auth.users
  SELECT id INTO admin_auth_id
  FROM auth.users
  WHERE email = 'admin@chamosbarber.com'
  LIMIT 1;

  IF admin_auth_id IS NULL THEN
    RAISE NOTICE 'Usuario admin NO existe en auth.users';
  ELSE
    RAISE NOTICE 'Usuario admin existe con ID: %', admin_auth_id;
    
    -- Asegurar que existe en admin_users
    INSERT INTO admin_users (id, email, rol, activo, creado_en)
    VALUES (admin_auth_id, 'admin@chamosbarber.com', 'admin', true, NOW())
    ON CONFLICT (id) DO UPDATE
    SET email = 'admin@chamosbarber.com', 
        rol = 'admin', 
        activo = true;
    
    RAISE NOTICE 'Usuario admin sincronizado en admin_users';
  END IF;
END $$;

-- Verificar resultado final
SELECT 
  au.id,
  au.email, 
  au.rol,
  au.activo
FROM admin_users au
WHERE au.email = 'admin@chamosbarber.com';
