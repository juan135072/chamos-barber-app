-- ===================================================================
-- 🚨 URGENTE: Permitir INSERT anónimo en tabla CITAS
-- ===================================================================
-- 
-- PROBLEMA DETECTADO:
-- Error 42501: "new row violates row-level security policy for table 'citas'"
-- 
-- CAUSA:
-- Las políticas RLS no permiten a usuarios anónimos (sin login) 
-- crear citas desde la página /reservar
--
-- SOLUCIÓN:
-- Habilitar política INSERT para rol 'anon'
-- ===================================================================

-- 1. DIAGNÓSTICO: Ver estado actual de RLS
SELECT 
  tablename, 
  rowsecurity as "RLS Habilitado"
FROM pg_tables 
WHERE tablename = 'citas' AND schemaname = 'public';

-- 2. DIAGNÓSTICO: Ver políticas actuales
SELECT 
  policyname as "Nombre Política",
  cmd as "Comando",
  roles::text as "Roles",
  qual::text as "USING",
  with_check::text as "WITH CHECK"
FROM pg_policies 
WHERE tablename = 'citas'
ORDER BY cmd, policyname;

-- ===================================================================
-- FIX: Habilitar RLS y crear políticas correctas
-- ===================================================================

-- 3. Habilitar RLS en la tabla (si no está habilitado)
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

-- 4. LIMPIAR políticas existentes que puedan causar conflicto
DROP POLICY IF EXISTS "Permitir crear citas anónimas" ON citas;
DROP POLICY IF EXISTS "Permitir crear citas autenticadas" ON citas;
DROP POLICY IF EXISTS "Permitir leer todas las citas a usuarios autenticados" ON citas;
DROP POLICY IF EXISTS "Permitir actualizar citas a usuarios autenticados" ON citas;
DROP POLICY IF EXISTS "Permitir eliminar citas a usuarios autenticados" ON citas;
DROP POLICY IF EXISTS "Service role tiene acceso completo" ON citas;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON citas;
DROP POLICY IF EXISTS "Enable read access for all users" ON citas;
DROP POLICY IF EXISTS "Enable all access for service role" ON citas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer todas las citas" ON citas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear citas" ON citas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar citas" ON citas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar citas" ON citas;

-- ===================================================================
-- POLÍTICAS NUEVAS (Orden correcto)
-- ===================================================================

-- 5. 🔓 POLÍTICA CRÍTICA: Permitir INSERT a usuarios ANÓNIMOS
-- Esta es la política que falta y causa el error 42501
CREATE POLICY "anon_insert_citas"
ON citas
FOR INSERT
TO anon
WITH CHECK (true);

-- 6. 🔓 Permitir INSERT a usuarios AUTENTICADOS
CREATE POLICY "authenticated_insert_citas"
ON citas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 7. 🔍 Permitir SELECT solo a usuarios AUTENTICADOS
-- Los usuarios anónimos NO pueden leer citas (por privacidad)
-- Solo admins y barberos autenticados pueden ver las citas
CREATE POLICY "authenticated_select_citas"
ON citas
FOR SELECT
TO authenticated
USING (true);

-- 8. ✏️ Permitir UPDATE a usuarios AUTENTICADOS
CREATE POLICY "authenticated_update_citas"
ON citas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 9. 🗑️ Permitir DELETE a usuarios AUTENTICADOS
CREATE POLICY "authenticated_delete_citas"
ON citas
FOR DELETE
TO authenticated
USING (true);

-- 10. 🔧 Service role: Acceso completo (backup para operaciones del sistema)
CREATE POLICY "service_role_all_citas"
ON citas
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ===================================================================
-- VERIFICACIÓN POST-FIX
-- ===================================================================

-- 11. Confirmar que políticas se crearon correctamente
SELECT 
  '✅ POLÍTICAS CREADAS' as status,
  policyname,
  cmd,
  CASE 
    WHEN roles::text = '{anon}' THEN '🔓 anon (usuarios sin login)'
    WHEN roles::text = '{authenticated}' THEN '🔐 authenticated (usuarios con login)'
    WHEN roles::text = '{service_role}' THEN '🔧 service_role (sistema)'
    ELSE roles::text
  END as rol_permitido
FROM pg_policies 
WHERE tablename = 'citas'
ORDER BY 
  CASE cmd 
    WHEN 'INSERT' THEN 1
    WHEN 'SELECT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    WHEN 'ALL' THEN 5
  END,
  policyname;

-- 12. Test rápido: Contar citas existentes
SELECT 
  '✅ CITAS TOTALES' as info,
  COUNT(*) as cantidad 
FROM citas;

-- ===================================================================
-- RESULTADO ESPERADO DESPUÉS DE EJECUTAR ESTE SCRIPT:
-- ===================================================================
-- 
-- ✅ 6 políticas creadas:
--    1. anon_insert_citas (INSERT para anon) ← LA MÁS IMPORTANTE
--    2. authenticated_insert_citas (INSERT para authenticated)
--    3. authenticated_select_citas (SELECT para authenticated)
--    4. authenticated_update_citas (UPDATE para authenticated)
--    5. authenticated_delete_citas (DELETE para authenticated)
--    6. service_role_all_citas (ALL para service_role)
--
-- ✅ Los usuarios anónimos PUEDEN crear citas desde /reservar
-- ✅ Los usuarios autenticados PUEDEN leer, actualizar y eliminar citas
-- ✅ El error 42501 desaparecerá
-- ✅ Las reservas desde la web funcionarán correctamente
--
-- ===================================================================
-- INSTRUCCIONES DE EJECUCIÓN:
-- ===================================================================
-- 
-- 1. Ir a: https://supabase.chamosbarber.com/
-- 2. Login con credenciales de administrador
-- 3. Ir a: SQL Editor (menú lateral izquierdo)
-- 4. Click en "New query"
-- 5. Copiar y pegar TODO este archivo
-- 6. Click en "RUN" (botón verde)
-- 7. Verificar que aparezcan las 6 políticas en los resultados
-- 8. Probar reserva en: https://your-app.com/reservar
--
-- ===================================================================
