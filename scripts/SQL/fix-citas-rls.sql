-- ===================================================================
-- FIX: Políticas RLS para tabla CITAS
-- ===================================================================
-- Problema: Las citas creadas desde /reservar (usuario anónimo) 
-- no son visibles en el panel de administración
-- 
-- Causa: RLS está bloqueando el acceso de lectura para usuarios autenticados
-- ===================================================================

-- 1. VERIFICAR ESTADO ACTUAL
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'citas' AND schemaname = 'public';

-- 2. VER POLÍTICAS EXISTENTES
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'citas';

-- ===================================================================
-- SOLUCIÓN: Permitir INSERT anónimo y SELECT para autenticados
-- ===================================================================

-- 3. ELIMINAR POLÍTICAS EXISTENTES (si las hay)
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON citas;
DROP POLICY IF EXISTS "Enable read access for all users" ON citas;
DROP POLICY IF EXISTS "Enable all access for service role" ON citas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer todas las citas" ON citas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear citas" ON citas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar citas" ON citas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar citas" ON citas;

-- 4. HABILITAR RLS (si no está habilitado)
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICA 1: Permitir INSERT a usuarios ANÓNIMOS (desde /reservar)
-- Esto permite crear citas sin estar autenticado
CREATE POLICY "Permitir crear citas anónimas"
ON citas
FOR INSERT
TO anon
WITH CHECK (true);

-- 6. POLÍTICA 2: Permitir INSERT a usuarios AUTENTICADOS
-- Por si algún admin crea citas desde el panel
CREATE POLICY "Permitir crear citas autenticadas"
ON citas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 7. POLÍTICA 3: Permitir SELECT a usuarios AUTENTICADOS
-- Los admins y barberos pueden leer TODAS las citas
CREATE POLICY "Permitir leer todas las citas a usuarios autenticados"
ON citas
FOR SELECT
TO authenticated
USING (true);

-- 8. POLÍTICA 4: Permitir UPDATE a usuarios AUTENTICADOS
-- Los admins y barberos pueden actualizar citas (cambiar estado, etc.)
CREATE POLICY "Permitir actualizar citas a usuarios autenticados"
ON citas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 9. POLÍTICA 5: Permitir DELETE a usuarios AUTENTICADOS
-- Los admins pueden eliminar citas
CREATE POLICY "Permitir eliminar citas a usuarios autenticados"
ON citas
FOR DELETE
TO authenticated
USING (true);

-- 10. POLÍTICA 6: Service role tiene acceso total (backup)
-- Por si acaso, el service role puede hacer todo
CREATE POLICY "Service role tiene acceso completo"
ON citas
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ===================================================================
-- VERIFICACIÓN POST-FIX
-- ===================================================================

-- 11. Verificar que las políticas se crearon correctamente
SELECT 
  policyname,
  cmd AS command,
  CASE 
    WHEN roles = '{anon}' THEN 'anon'
    WHEN roles = '{authenticated}' THEN 'authenticated'
    WHEN roles = '{service_role}' THEN 'service_role'
    ELSE roles::text
  END AS role,
  qual::text AS using_expression,
  with_check::text AS with_check_expression
FROM pg_policies 
WHERE tablename = 'citas'
ORDER BY policyname;

-- 12. Contar citas existentes (todas deberían ser visibles ahora)
SELECT COUNT(*) as total_citas FROM citas;

-- 13. Verificar citas recientes
SELECT 
  id,
  cliente_nombre,
  fecha,
  hora,
  estado,
  created_at
FROM citas 
ORDER BY created_at DESC 
LIMIT 5;

-- ===================================================================
-- RESULTADO ESPERADO:
-- ===================================================================
-- ✅ Los usuarios anónimos (sin login) pueden crear citas desde /reservar
-- ✅ Los usuarios autenticados (admin/barberos) pueden leer TODAS las citas
-- ✅ Los usuarios autenticados pueden actualizar y eliminar citas
-- ✅ Las citas aparecen inmediatamente en el panel de administración
-- ===================================================================
