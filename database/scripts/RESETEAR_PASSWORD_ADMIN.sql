-- =====================================================
-- 🔐 RESETEAR CONTRASEÑA ADMIN
-- =====================================================
-- Usuario: contacto@chamosbarber.com
-- UUID: 4ce7e112-12a7-4909-b922-59fa1fdafc0b
-- Fecha: 2025-12-15
-- =====================================================

-- ⚠️ IMPORTANTE:
-- Este SQL NO puede cambiar la contraseña directamente
-- porque las contraseñas están en auth.users (tabla protegida)
-- 
-- Debes usar Supabase Dashboard para resetear la contraseña

-- ✅ PASO 1: Verificar que el usuario existe
SELECT 
  '=== VERIFICACIÓN USUARIO ===' as info,
  id,
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Email confirmado'
    ELSE '⚠️ Email NO confirmado'
  END as estado_email
FROM auth.users
WHERE email = 'contacto@chamosbarber.com';

-- ✅ PASO 2: Verificar que está en admin_users
SELECT 
  '=== VERIFICACIÓN ADMIN_USERS ===' as info,
  id,
  email,
  nombre,
  rol,
  activo,
  CASE 
    WHEN activo THEN '✅ Cuenta activa'
    ELSE '❌ Cuenta inactiva'
  END as estado
FROM admin_users
WHERE email = 'contacto@chamosbarber.com';

-- =====================================================
-- 📝 INSTRUCCIONES PARA RESETEAR CONTRASEÑA:
-- =====================================================
-- 
-- MÉTODO 1: Supabase Dashboard (RECOMENDADO)
-- ------------------------------------------
-- 1. Ve a: https://supabase.com/dashboard
-- 2. Selecciona tu proyecto
-- 3. Authentication → Users
-- 4. Busca: contacto@chamosbarber.com
-- 5. Clic en (...) → "Update User"
-- 6. Sección "Password" → Ingresa nueva contraseña
-- 7. Clic en "Update User"
-- 
-- MÉTODO 2: Enviar Email de Recuperación
-- ---------------------------------------
-- 1. Supabase Dashboard → Authentication → Users
-- 2. Busca: contacto@chamosbarber.com
-- 3. Clic en (...) → "Send Password Recovery"
-- 4. Revisa el email: contacto@chamosbarber.com
-- 5. Clic en el link del email
-- 6. Establece nueva contraseña
-- 
-- MÉTODO 3: Crear Nuevo Admin (si necesario)
-- -------------------------------------------
-- Solo si no puedes acceder al actual, crea uno nuevo:
-- 
-- Paso 1: Crear usuario en Supabase Dashboard
--   - Authentication → Users → "Add User"
--   - Email: nuevo_admin@chamosbarber.com
--   - Password: TuNuevaContraseña123!
--   - ✓ Auto Confirm User
--   - ✓ Email Confirm
--   - Copia el UUID generado
-- 
-- Paso 2: Agregar a admin_users (reemplaza el UUID)
--   INSERT INTO admin_users (id, email, nombre, rol, activo)
--   VALUES (
--     'UUID-DEL-NUEVO-USUARIO',
--     'nuevo_admin@chamosbarber.com',
--     'Nuevo Administrador',
--     'admin',
--     true
--   );
-- 
-- =====================================================

-- ✅ PASO 3 (OPCIONAL): Si el email NO está confirmado, confírmalo
-- Ejecuta esto SOLO si el Paso 1 muestra "Email NO confirmado"
-- 
-- Opción A: Desde Dashboard
--   1. Supabase Dashboard → Authentication → Users
--   2. Busca: contacto@chamosbarber.com
--   3. Clic en (...) → "Confirm Email"
-- 
-- Opción B: Con SQL (requiere permisos de superusuario)
--   UPDATE auth.users
--   SET email_confirmed_at = NOW()
--   WHERE email = 'contacto@chamosbarber.com';

-- =====================================================
-- ✅ RESULTADO ESPERADO:
-- =====================================================
-- Paso 1: Debe mostrar el usuario con su UUID
-- Paso 2: Debe mostrar "Cuenta activa ✅"
-- 
-- Después de resetear la contraseña en Dashboard:
-- 1. Ve a: https://chamosbarber.com/login
-- 2. Email: contacto@chamosbarber.com
-- 3. Password: [tu nueva contraseña]
-- 4. Deberías entrar al Admin Panel ✅
-- =====================================================
