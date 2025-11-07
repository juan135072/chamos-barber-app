-- ============================================
-- VERIFICAR FOREIGN KEYS Y CASCADE DELETE
-- ============================================
-- Este script verifica si hay foreign keys con CASCADE DELETE
-- que podrían estar causando eliminaciones en cascada
-- ============================================

-- 1. Verificar todas las foreign keys de la tabla barberos
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
      AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name = 'barberos' OR ccu.table_name = 'barberos')
ORDER BY tc.table_name, tc.constraint_name;

-- 2. Verificar específicamente las foreign keys que apuntan A barberos
-- Estas son las que podrían causar problemas con CASCADE DELETE
SELECT
    tc.table_name AS tabla_que_referencia,
    kcu.column_name AS columna_fk,
    ccu.table_name AS tabla_referenciada,
    ccu.column_name AS columna_referenciada,
    rc.delete_rule AS regla_delete,
    rc.update_rule AS regla_update
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'barberos'
ORDER BY tc.table_name;

-- 3. Mostrar información de la tabla barberos
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'barberos'
ORDER BY ordinal_position;
