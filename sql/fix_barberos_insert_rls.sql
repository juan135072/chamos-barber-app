-- ============================================
-- ARREGLAR POLÍTICA RLS INSERT EN BARBEROS
-- ============================================

-- 1. Ver las políticas actuales de INSERT
SELECT 
    policyname,
    cmd,
    qual AS "USING",
    with_check AS "WITH CHECK (condición de inserción)"
FROM pg_policies 
WHERE tablename = 'barberos'
AND cmd = 'INSERT';

-- 2. ELIMINAR todas las políticas restrictivas de INSERT
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'barberos' 
        AND cmd = 'INSERT'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON barberos';
        RAISE NOTICE 'Política INSERT eliminada: %', pol.policyname;
    END LOOP;
END $$;

-- 3. CREAR política permisiva para INSERT
-- Permite a usuarios autenticados crear barberos
CREATE POLICY "barberos_insert_authenticated"
ON barberos FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. También permitir a usuarios públicos (si usas anon key desde admin)
CREATE POLICY "barberos_insert_public"
ON barberos FOR INSERT
TO public
WITH CHECK (true);

-- 5. Verificar que se crearon correctamente
SELECT 
    policyname,
    cmd,
    roles,
    with_check AS "WITH CHECK"
FROM pg_policies 
WHERE tablename = 'barberos'
AND cmd = 'INSERT'
ORDER BY policyname;

-- 6. Ver TODAS las políticas de barberos (resumen)
SELECT 
    cmd AS "Comando",
    policyname AS "Nombre Política",
    roles AS "Roles",
    CASE 
        WHEN cmd = 'SELECT' THEN qual::text
        ELSE with_check::text
    END AS "Condición"
FROM pg_policies 
WHERE tablename = 'barberos'
ORDER BY cmd, policyname;
