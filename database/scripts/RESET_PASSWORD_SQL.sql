-- =====================================================
-- 🔐 RESETEAR CONTRASEÑA ADMIN CON SQL
-- =====================================================
-- Usuario: contacto@chamosbarber.com
-- UUID: 4ce7e112-12a7-4909-b922-59fa1fdafc0b
-- =====================================================

-- ⚠️ IMPORTANTE: Ejecutar en Supabase Dashboard → SQL Editor

-- 1. Crear función temporal para resetear password
CREATE OR REPLACE FUNCTION temp_reset_admin_password()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid := '4ce7e112-12a7-4909-b922-59fa1fdafc0b';
  new_password text := 'ChamosAdmin2024!'; -- ⚠️ CAMBIA ESTA CONTRASEÑA
  result json;
BEGIN
  -- Actualizar la contraseña
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = user_id;
  
  IF FOUND THEN
    result := json_build_object(
      'success', true,
      'message', 'Contraseña actualizada exitosamente',
      'email', 'contacto@chamosbarber.com',
      'password', new_password
    );
  ELSE
    result := json_build_object(
      'success', false,
      'message', 'Usuario no encontrado'
    );
  END IF;
  
  RETURN result;
END;
$$;

-- 2. Ejecutar la función
SELECT temp_reset_admin_password();

-- 3. Eliminar la función (seguridad)
DROP FUNCTION IF EXISTS temp_reset_admin_password();

-- =====================================================
-- ✅ RESULTADO ESPERADO:
-- =====================================================
-- Deberías ver un JSON como este:
-- {
--   "success": true,
--   "message": "Contraseña actualizada exitosamente",
--   "email": "contacto@chamosbarber.com",
--   "password": "ChamosAdmin2024!"
-- }
--
-- Después de ver el éxito:
-- 1. Ve a: https://chamosbarber.com/login
-- 2. Email: contacto@chamosbarber.com
-- 3. Password: ChamosAdmin2024! (o la que pusiste)
-- 4. ¡Listo! ✅
-- =====================================================

-- ⚠️ NOTA IMPORTANTE:
-- Si quieres cambiar la contraseña a otra diferente,
-- modifica la línea 13:
--   new_password text := 'TU_NUEVA_CONTRASEÑA_AQUI';
-- =====================================================
