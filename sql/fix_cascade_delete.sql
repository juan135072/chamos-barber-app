-- ============================================
-- ARREGLAR CASCADE DELETE EN BARBEROS
-- ============================================
-- Este script cambia todas las foreign keys con CASCADE DELETE
-- a NO ACTION o RESTRICT para prevenir eliminaciones accidentales
-- ============================================

-- ⚠️ IMPORTANTE: Ejecuta primero check_foreign_keys.sql para ver
-- qué foreign keys existen antes de hacer cambios

-- Ejemplo de cómo cambiar una foreign key de CASCADE a NO ACTION:
-- (Ajusta según las foreign keys que encuentres en tu base de datos)

-- 1. Si existe una FK en 'citas' que referencia 'barberos' con CASCADE:
DO $$ 
BEGIN
    -- Verificar si existe la constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'citas_barbero_id_fkey'
        AND table_name = 'citas'
    ) THEN
        -- Eliminar la constraint existente
        ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_barbero_id_fkey;
        
        -- Recrear sin CASCADE DELETE
        ALTER TABLE citas 
        ADD CONSTRAINT citas_barbero_id_fkey 
        FOREIGN KEY (barbero_id) 
        REFERENCES barberos(id) 
        ON DELETE NO ACTION 
        ON UPDATE NO ACTION;
        
        RAISE NOTICE 'FK citas_barbero_id_fkey actualizada a NO ACTION';
    END IF;
END $$;

-- 2. Si existe una FK en 'admin_users' que referencia 'barberos':
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'admin_users_barbero_id_fkey'
        AND table_name = 'admin_users'
    ) THEN
        ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_barbero_id_fkey;
        
        -- Para admin_users, podemos usar CASCADE porque queremos que se elimine
        -- cuando se elimina el barbero (relación 1:1)
        ALTER TABLE admin_users 
        ADD CONSTRAINT admin_users_barbero_id_fkey 
        FOREIGN KEY (barbero_id) 
        REFERENCES barberos(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'FK admin_users_barbero_id_fkey mantenida con CASCADE';
    END IF;
END $$;

-- 3. Verificar todas las FKs después de los cambios
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'barberos';
