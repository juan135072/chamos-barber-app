-- Script para crear cuentas de usuario para barberos existentes
-- Ejecutar DESPUÉS de crear los usuarios en Supabase Auth Dashboard

-- PASO 1: Primero debes crear los usuarios en Supabase Auth Dashboard
-- Ve a: Dashboard → Authentication → Users → "Add user"
-- 
-- Crear estos 3 usuarios:
-- 1. Email: carlos@chamosbarber.com, Password: ChamosBarbero2024!, Auto Confirm: ✅
-- 2. Email: luis@chamosbarber.com, Password: ChamosBarbero2024!, Auto Confirm: ✅
-- 3. Email: miguel@chamosbarber.com, Password: ChamosBarbero2024!, Auto Confirm: ✅

-- PASO 2: Después de crear los usuarios en Auth, ejecutar este SQL:

-- Insertar entradas en admin_users usando los IDs de auth.users
INSERT INTO admin_users (id, email, nombre, rol, barbero_id, activo)
SELECT 
  au.id as id,                                    -- ID del usuario en auth.users
  b.email,                                         -- Email del barbero
  b.nombre || ' ' || b.apellido as nombre,        -- Nombre completo
  'barbero' as rol,                                -- Rol = barbero
  b.id as barbero_id,                             -- FK a barberos
  true as activo                                   -- Activo = true
FROM barberos b
INNER JOIN auth.users au ON au.email = b.email   -- Join con auth.users por email
WHERE b.email IN (
  'carlos@chamosbarber.com',
  'luis@chamosbarber.com',
  'miguel@chamosbarber.com'
)
ON CONFLICT (id) DO UPDATE 
SET 
  barbero_id = EXCLUDED.barbero_id,
  rol = 'barbero',
  activo = true;

-- PASO 3: Verificar que se crearon correctamente
SELECT 
  au.id as auth_user_id,
  au.email as admin_email,
  au.nombre as admin_nombre,
  au.rol,
  au.barbero_id,
  b.nombre as barbero_nombre,
  b.apellido as barbero_apellido,
  b.email as barbero_email,
  au.created_at as cuenta_creada
FROM admin_users au
INNER JOIN barberos b ON b.id = au.barbero_id
WHERE au.rol = 'barbero'
ORDER BY b.nombre;

-- Deberías ver 3 filas con todos los datos completos

-- CREDENCIALES GENERADAS:
-- 
-- Carlos Pérez:
--   Email: carlos@chamosbarber.com
--   Password: ChamosBarbero2024!
--   Login: https://chamosbarber.com/login
--
-- Luis González:
--   Email: luis@chamosbarber.com
--   Password: ChamosBarbero2024!
--   Login: https://chamosbarber.com/login
--
-- Miguel Rodríguez:
--   Email: miguel@chamosbarber.com
--   Password: ChamosBarbero2024!
--   Login: https://chamosbarber.com/login
--
-- IMPORTANTE: Después de crear las cuentas, puedes usar el botón de Reset Password (🔑)
-- desde el panel admin para generar contraseñas más seguras y personalizadas.
