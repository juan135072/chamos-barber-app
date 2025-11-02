-- ============================================
-- SCRIPT: Asociar Usuarios Auth con Barberos
-- ============================================
-- Ejecuta este script DESPUÉS de crear los usuarios en Supabase Auth
-- Para asociar cuentas de barberos con sus perfiles
-- ============================================

-- ====================
-- INSTRUCCIONES PREVIAS:
-- ====================
-- 1. Ve a Supabase → Authentication → Users
-- 2. Haz clic en "Add user" → "Create new user"
-- 3. Crea estos 4 usuarios:
--
--    Email: carlos@chamosbarber.com
--    Password: Temporal123! (el barbero la cambiará)
--    Auto Confirm User: ✅ Sí
--
--    Email: miguel@chamosbarber.com
--    Password: Temporal123!
--    Auto Confirm User: ✅ Sí
--
--    Email: luis@chamosbarber.com
--    Password: Temporal123!
--    Auto Confirm User: ✅ Sí
--
--    Email: jorge@chamosbarber.com
--    Password: Temporal123!
--    Auto Confirm User: ✅ Sí
--
-- 4. Después ejecuta este script
-- ====================

DO $$
DECLARE
  -- IDs de barberos
  carlos_barbero_id UUID;
  miguel_barbero_id UUID;
  luis_barbero_id UUID;
  jorge_barbero_id UUID;
  
  -- IDs de auth.users
  carlos_auth_id UUID;
  miguel_auth_id UUID;
  luis_auth_id UUID;
  jorge_auth_id UUID;
  
  usuarios_creados INTEGER := 0;
BEGIN
  -- ====================
  -- Obtener IDs de barberos
  -- ====================
  SELECT id INTO carlos_barbero_id FROM barberos WHERE slug = 'carlos-ramirez' LIMIT 1;
  SELECT id INTO miguel_barbero_id FROM barberos WHERE slug = 'miguel-torres' LIMIT 1;
  SELECT id INTO luis_barbero_id FROM barberos WHERE slug = 'luis-mendoza' LIMIT 1;
  SELECT id INTO jorge_barbero_id FROM barberos WHERE slug = 'jorge-silva' LIMIT 1;
  
  -- Verificar que existen
  IF carlos_barbero_id IS NULL OR miguel_barbero_id IS NULL OR 
     luis_barbero_id IS NULL OR jorge_barbero_id IS NULL THEN
    RAISE EXCEPTION 'No se encontraron todos los barberos. Ejecuta primero add-slug-and-portfolio.sql';
  END IF;
  
  -- ====================
  -- Obtener IDs de auth.users
  -- ====================
  SELECT id INTO carlos_auth_id FROM auth.users WHERE email = 'carlos@chamosbarber.com' LIMIT 1;
  SELECT id INTO miguel_auth_id FROM auth.users WHERE email = 'miguel@chamosbarber.com' LIMIT 1;
  SELECT id INTO luis_auth_id FROM auth.users WHERE email = 'luis@chamosbarber.com' LIMIT 1;
  SELECT id INTO jorge_auth_id FROM auth.users WHERE email = 'jorge@chamosbarber.com' LIMIT 1;
  
  -- ====================
  -- Asociar Carlos Ramírez
  -- ====================
  IF carlos_auth_id IS NOT NULL THEN
    -- Insertar en admin_users
    INSERT INTO admin_users (id, email, rol, barbero_id, activo)
    VALUES (carlos_auth_id, 'carlos@chamosbarber.com', 'barbero', carlos_barbero_id, true)
    ON CONFLICT (email) DO UPDATE
    SET barbero_id = carlos_barbero_id, rol = 'barbero', activo = true, actualizado_en = NOW();
    
    -- Actualizar barberos con user_id
    UPDATE barberos SET user_id = carlos_auth_id WHERE id = carlos_barbero_id;
    
    usuarios_creados := usuarios_creados + 1;
    RAISE NOTICE '✅ Carlos Ramírez asociado: carlos@chamosbarber.com';
  ELSE
    RAISE NOTICE '❌ No se encontró usuario: carlos@chamosbarber.com';
  END IF;
  
  -- ====================
  -- Asociar Miguel Torres
  -- ====================
  IF miguel_auth_id IS NOT NULL THEN
    INSERT INTO admin_users (id, email, rol, barbero_id, activo)
    VALUES (miguel_auth_id, 'miguel@chamosbarber.com', 'barbero', miguel_barbero_id, true)
    ON CONFLICT (email) DO UPDATE
    SET barbero_id = miguel_barbero_id, rol = 'barbero', activo = true, actualizado_en = NOW();
    
    UPDATE barberos SET user_id = miguel_auth_id WHERE id = miguel_barbero_id;
    
    usuarios_creados := usuarios_creados + 1;
    RAISE NOTICE '✅ Miguel Torres asociado: miguel@chamosbarber.com';
  ELSE
    RAISE NOTICE '❌ No se encontró usuario: miguel@chamosbarber.com';
  END IF;
  
  -- ====================
  -- Asociar Luis Mendoza
  -- ====================
  IF luis_auth_id IS NOT NULL THEN
    INSERT INTO admin_users (id, email, rol, barbero_id, activo)
    VALUES (luis_auth_id, 'luis@chamosbarber.com', 'barbero', luis_barbero_id, true)
    ON CONFLICT (email) DO UPDATE
    SET barbero_id = luis_barbero_id, rol = 'barbero', activo = true, actualizado_en = NOW();
    
    UPDATE barberos SET user_id = luis_auth_id WHERE id = luis_barbero_id;
    
    usuarios_creados := usuarios_creados + 1;
    RAISE NOTICE '✅ Luis Mendoza asociado: luis@chamosbarber.com';
  ELSE
    RAISE NOTICE '❌ No se encontró usuario: luis@chamosbarber.com';
  END IF;
  
  -- ====================
  -- Asociar Jorge Silva
  -- ====================
  IF jorge_auth_id IS NOT NULL THEN
    INSERT INTO admin_users (id, email, rol, barbero_id, activo)
    VALUES (jorge_auth_id, 'jorge@chamosbarber.com', 'barbero', jorge_barbero_id, true)
    ON CONFLICT (email) DO UPDATE
    SET barbero_id = jorge_barbero_id, rol = 'barbero', activo = true, actualizado_en = NOW();
    
    UPDATE barberos SET user_id = jorge_auth_id WHERE id = jorge_barbero_id;
    
    usuarios_creados := usuarios_creados + 1;
    RAISE NOTICE '✅ Jorge Silva asociado: jorge@chamosbarber.com';
  ELSE
    RAISE NOTICE '❌ No se encontró usuario: jorge@chamosbarber.com';
  END IF;
  
  -- ====================
  -- Resumen
  -- ====================
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '  RESUMEN DE ASOCIACIÓN';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'Usuarios asociados: % de 4', usuarios_creados;
  
  IF usuarios_creados = 4 THEN
    RAISE NOTICE '✅ ¡Todos los barberos fueron asociados!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Credenciales de acceso:';
    RAISE NOTICE '   carlos@chamosbarber.com / Temporal123!';
    RAISE NOTICE '   miguel@chamosbarber.com / Temporal123!';
    RAISE NOTICE '   luis@chamosbarber.com / Temporal123!';
    RAISE NOTICE '   jorge@chamosbarber.com / Temporal123!';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANTE: Los barberos deben cambiar';
    RAISE NOTICE '   su contraseña en el primer inicio de sesión';
  ELSIF usuarios_creados > 0 THEN
    RAISE NOTICE '⚠️ Solo % usuario(s) fueron asociados', usuarios_creados;
    RAISE NOTICE '   Verifica que hayas creado todos los usuarios en Auth';
  ELSE
    RAISE NOTICE '❌ No se asoció ningún usuario';
    RAISE NOTICE '   Asegúrate de crear los usuarios en:';
    RAISE NOTICE '   Supabase → Authentication → Users';
  END IF;
  RAISE NOTICE '════════════════════════════════════════';
  
END $$;

-- ====================
-- VERIFICACIÓN FINAL
-- ====================

SELECT 
  au.email,
  au.rol,
  b.nombre || ' ' || b.apellido as barbero_nombre,
  b.slug as barbero_slug,
  au.activo,
  au.creado_en
FROM admin_users au
LEFT JOIN barberos b ON au.barbero_id = b.id
WHERE au.rol = 'barbero'
ORDER BY b.nombre;

-- ====================
-- RESULTADO ESPERADO:
-- ====================
--  email                    | rol     | barbero_nombre  | barbero_slug    | activo | creado_en
-- --------------------------|---------|-----------------|-----------------|--------|------------
--  carlos@chamosbarber.com  | barbero | Carlos Ramírez  | carlos-ramirez  | true   | ...
--  jorge@chamosbarber.com   | barbero | Jorge Silva     | jorge-silva     | true   | ...
--  luis@chamosbarber.com    | barbero | Luis Mendoza    | luis-mendoza    | true   | ...
--  miguel@chamosbarber.com  | barbero | Miguel Torres   | miguel-torres   | true   | ...
-- ====================
