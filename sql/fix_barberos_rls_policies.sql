-- ============================================
-- FIX: Políticas RLS para tabla barberos
-- ============================================
-- Problema: UPDATE bloqueado por RLS al desactivar barbero
-- Solución: Crear políticas permisivas para operaciones de admin
-- ============================================

-- 1. Eliminar políticas existentes si causan conflictos
DROP POLICY IF EXISTS "Barberos son visibles públicamente" ON barberos;
DROP POLICY IF EXISTS "Admins pueden insertar barberos" ON barberos;
DROP POLICY IF EXISTS "Admins pueden actualizar barberos" ON barberos;
DROP POLICY IF EXISTS "Admins pueden eliminar barberos" ON barberos;
DROP POLICY IF EXISTS "Public read access" ON barberos;
DROP POLICY IF EXISTS "Admin full access" ON barberos;

-- 2. Política de LECTURA pública (SELECT)
-- Cualquiera puede ver los barberos
CREATE POLICY "barberos_select_public"
ON barberos FOR SELECT
TO public
USING (true);

-- 3. Política de INSERCIÓN para admins (INSERT)
-- Solo usuarios autenticados pueden insertar
CREATE POLICY "barberos_insert_authenticated"
ON barberos FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Política de ACTUALIZACIÓN para admins (UPDATE)
-- Solo usuarios autenticados pueden actualizar
-- IMPORTANTE: Esta política permite soft delete (marcar como inactivo)
CREATE POLICY "barberos_update_authenticated"
ON barberos FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Política de ELIMINACIÓN para admins (DELETE)
-- Solo usuarios autenticados pueden eliminar
CREATE POLICY "barberos_delete_authenticated"
ON barberos FOR DELETE
TO authenticated
USING (true);

-- 6. Verificar que RLS está habilitado
ALTER TABLE barberos ENABLE ROW LEVEL SECURITY;

-- 7. Verificación: Mostrar políticas actuales
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'barberos'
ORDER BY policyname;
