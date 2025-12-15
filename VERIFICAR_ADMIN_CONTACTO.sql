-- =====================================================
-- 🔍 VERIFICAR CUENTA ADMIN: contacto@chamosbarber.com
-- =====================================================
-- UUID: 4ce7e112-12a7-4909-b922-59fa1fdafc0b

-- 1. Verificar si existe en admin_users
SELECT 
  au.id,
  au.email,
  au.nombre,
  au.rol,
  au.activo,
  CASE 
    WHEN au.activo THEN 'Cuenta activa ✅'
    ELSE 'Cuenta inactiva ❌'
  END as estado
FROM admin_users au
WHERE au.id = '4ce7e112-12a7-4909-b922-59fa1fdafc0b';

-- 2. Si NO existe, insertarlo:
INSERT INTO admin_users (id, email, nombre, rol, activo)
VALUES (
  '4ce7e112-12a7-4909-b922-59fa1fdafc0b',
  'contacto@chamosbarber.com',
  'Administrador Principal',
  'admin',
  true
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  rol = 'admin',
  activo = true;

-- 3. Verificar resultado final
SELECT 
  au.id,
  au.email,
  au.nombre,
  au.rol,
  au.activo,
  CASE 
    WHEN au.activo THEN 'Cuenta activa ✅'
    ELSE 'Cuenta inactiva ❌'
  END as estado
FROM admin_users au
WHERE au.email = 'contacto@chamosbarber.com';

-- =====================================================
-- 📝 INSTRUCCIONES:
-- =====================================================
-- 1. Copia este SQL
-- 2. Ve a Supabase Dashboard → SQL Editor
-- 3. Pega y ejecuta el script completo
-- 4. Verifica que aparezca: "Cuenta activa ✅"
-- =====================================================
