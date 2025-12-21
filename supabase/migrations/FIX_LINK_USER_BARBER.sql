-- ================================================================
-- SCRIPT: VINCULAR USUARIO ADMIN CON BARBERO
-- ================================================================
-- Este script asegura que tu usuario de login (admin_users) esté 
-- vinculado correctamente al perfil del barbero que tiene las citas.

DO $$
DECLARE
    v_barbero_id UUID;
    v_user_email TEXT := 'carlos@chamosbarber.com';
BEGIN
    -- 1. Obtener ID del barbero (el que tiene las citas creadas)
    SELECT id INTO v_barbero_id
    FROM barberos
    WHERE email ILIKE v_user_email
    LIMIT 1;

    IF v_barbero_id IS NULL THEN
        RAISE EXCEPTION '❌ No se encontró el perfil de barbero para %', v_user_email;
    END IF;

    -- 2. Actualizar el usuario administrador para apuntar a este barbero
    UPDATE admin_users
    SET barbero_id = v_barbero_id
    WHERE email ILIKE v_user_email;

    IF FOUND THEN
        RAISE NOTICE '✅ Usuario vinculado exitosamente al barbero ID %', v_barbero_id;
    ELSE
        RAISE NOTICE '⚠️ No se encontró usuario en admin_users con email %. ¿Estás seguro que ese es tu email de login?', v_user_email;
    END IF;
    
END $$;
