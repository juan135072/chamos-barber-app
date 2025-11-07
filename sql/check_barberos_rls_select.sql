-- ============================================
-- VERIFICAR POLÍTICAS RLS DE SELECT EN BARBEROS
-- ============================================

-- 1. Ver todas las políticas de SELECT en barberos
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual AS "USING (condición de filtro)"
FROM pg_policies 
WHERE tablename = 'barberos'
AND cmd = 'SELECT'
ORDER BY policyname;

-- 2. Verificar si RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity AS "RLS Habilitado"
FROM pg_tables
WHERE tablename = 'barberos';

-- 3. Contar barberos por estado (sin RLS - como superuser)
SELECT 
    activo,
    COUNT(*) as cantidad,
    string_agg(nombre || ' ' || apellido, ', ') as barberos
FROM barberos
GROUP BY activo
ORDER BY activo DESC;

-- 4. Ver TODOS los barberos con su estado
SELECT 
    id,
    nombre,
    apellido,
    activo,
    created_at
FROM barberos
ORDER BY created_at DESC;
