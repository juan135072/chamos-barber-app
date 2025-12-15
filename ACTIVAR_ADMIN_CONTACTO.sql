-- =====================================================
-- 🔧 ACTIVAR/VERIFICAR ADMIN: contacto@chamosbarber.com
-- =====================================================
-- UUID: 4ce7e112-12a7-4909-b922-59fa1fdafc0b
-- Fecha: 2025-12-15
-- =====================================================

-- ✅ PASO 1: Verificar si ya existe
SELECT 
  '=== VERIFICACIÓN INICIAL ===' as paso,
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
WHERE au.id = '4ce7e112-12a7-4909-b922-59fa1fdafc0b'
   OR au.email = 'contacto@chamosbarber.com';

-- ✅ PASO 2: Insertar o actualizar la cuenta admin
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
  nombre = EXCLUDED.nombre,
  rol = 'admin',
  activo = true,
  updated_at = NOW();

-- ✅ PASO 3: Verificar el resultado
SELECT 
  '=== RESULTADO FINAL ===' as paso,
  au.id,
  au.email,
  au.nombre,
  au.rol,
  au.activo,
  au.created_at,
  au.updated_at,
  CASE 
    WHEN au.activo THEN '✅ Cuenta activa y lista para usar'
    ELSE '❌ ERROR: Cuenta no está activa'
  END as estado
FROM admin_users au
WHERE au.email = 'contacto@chamosbarber.com';

-- ✅ PASO 4: Verificar que exista en Supabase Auth
SELECT 
  '=== VERIFICACIÓN AUTH.USERS ===' as paso,
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at,
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL THEN '✅ Email confirmado'
    ELSE '⚠️ Email NO confirmado'
  END as estado_email
FROM auth.users u
WHERE u.id = '4ce7e112-12a7-4909-b922-59fa1fdafc0b';

-- =====================================================
-- 📋 RESULTADO ESPERADO:
-- =====================================================
-- ✅ Paso 1: Debe mostrar la cuenta si existe
-- ✅ Paso 2: INSERT o UPDATE exitoso
-- ✅ Paso 3: Debe mostrar "Cuenta activa y lista para usar"
-- ✅ Paso 4: Debe mostrar "Email confirmado"
--
-- Si el Paso 4 muestra "Email NO confirmado":
--   1. Ve a Supabase Dashboard → Authentication → Users
--   2. Busca contacto@chamosbarber.com
--   3. Clic en (...) → "Confirm Email"
-- =====================================================

-- ✅ PASO 5 (OPCIONAL): Ver todas las cuentas activas
SELECT 
  '=== TODAS LAS CUENTAS ACTIVAS ===' as info,
  au.email,
  au.nombre,
  au.rol,
  b.nombre || ' ' || b.apellido as barbero_vinculado,
  CASE 
    WHEN au.activo THEN '✅ Activa'
    ELSE '❌ Inactiva'
  END as estado
FROM admin_users au
LEFT JOIN barberos b ON b.id = au.barbero_id
WHERE au.activo = true
ORDER BY 
  CASE au.rol 
    WHEN 'admin' THEN 1
    WHEN 'barbero' THEN 2
    WHEN 'cajero' THEN 3
    ELSE 4
  END,
  au.nombre;
