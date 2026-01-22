-- ================================================================
-- 🧹 LIMPIAR: Eliminar políticas RLS duplicadas en facturas
-- ================================================================

BEGIN;

-- Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Facturas - DELETE admin" ON public.facturas;
DROP POLICY IF EXISTS "Facturas - INSERT autenticado" ON public.facturas;
DROP POLICY IF EXISTS "Facturas - SELECT autenticado" ON public.facturas;
DROP POLICY IF EXISTS "Facturas - UPDATE autenticado" ON public.facturas;

DROP POLICY IF EXISTS "facturas_delete_admin" ON public.facturas;
DROP POLICY IF EXISTS "facturas_insert_authenticated" ON public.facturas;
DROP POLICY IF EXISTS "facturas_select_all" ON public.facturas;
DROP POLICY IF EXISTS "facturas_update_authenticated" ON public.facturas;

-- Recrear políticas limpias y consistentes

-- SELECT: Todos los autenticados pueden ver todas las facturas
CREATE POLICY "facturas_select_policy" 
ON public.facturas 
FOR SELECT 
TO authenticated 
USING (true);

-- INSERT: Todos los autenticados pueden crear facturas
CREATE POLICY "facturas_insert_policy" 
ON public.facturas 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- UPDATE: Todos los autenticados pueden actualizar
CREATE POLICY "facturas_update_policy" 
ON public.facturas 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- DELETE: Solo admins pueden eliminar
CREATE POLICY "facturas_delete_policy" 
ON public.facturas 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid() 
    AND admin_users.rol = 'admin'
  )
);

COMMIT;

-- ================================================================
-- ✅ VERIFICACIÓN
-- ================================================================

-- Ver políticas RLS de facturas (debe haber solo 4)
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'facturas'
ORDER BY cmd, policyname;

-- Contar políticas (debe ser exactamente 4)
SELECT 
  COUNT(*) as total_policies,
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'facturas';

-- ================================================================
-- 📋 RESUMEN
-- ================================================================
-- ✅ Políticas duplicadas eliminadas
-- ✅ 4 políticas limpias creadas:
--    - facturas_select_policy  (SELECT)
--    - facturas_insert_policy  (INSERT)
--    - facturas_update_policy  (UPDATE)
--    - facturas_delete_policy  (DELETE - solo admin)
-- ================================================================
