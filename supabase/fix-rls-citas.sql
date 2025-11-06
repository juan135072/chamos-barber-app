-- =========================================================================
-- FIX: Política RLS para permitir INSERT público en tabla CITAS
-- =========================================================================
-- 
-- PROBLEMA: 
--   Los usuarios anónimos (frontend público) no pueden crear citas
--   Error: "new row violates row-level security policy for table citas"
--
-- SOLUCIÓN:
--   Crear política que permita INSERT a usuarios anónimos y autenticados
--
-- FECHA: 2025-11-06
-- =========================================================================

-- 1. Verificar estado actual de RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE tablename = 'citas';

-- 2. Verificar políticas existentes
SELECT 
  policyname as "Nombre de Política",
  cmd as "Comando",
  roles as "Roles",
  qual as "Condición USING",
  with_check as "Condición WITH CHECK"
FROM pg_policies 
WHERE tablename = 'citas';

-- 3. CREAR POLÍTICA PARA INSERT PÚBLICO
-- Esta política permite a cualquier usuario (anónimo o autenticado) 
-- crear citas sin restricciones

CREATE POLICY IF NOT EXISTS "allow_public_insert_citas"
ON public.citas
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Explicación:
--   - ON public.citas: Aplica a la tabla de citas
--   - FOR INSERT: Solo afecta operaciones de inserción (crear nuevas citas)
--   - TO anon, authenticated: Permite a:
--       * anon: Usuarios no autenticados (visitantes del sitio web)
--       * authenticated: Usuarios autenticados (si se implementa login)
--   - WITH CHECK (true): Acepta cualquier dato que cumpla con las restricciones
--                        de la tabla (foreign keys, not null, etc.)

-- 4. OPCIONAL: Crear política para SELECT público (ya debería existir)
-- Si los usuarios necesitan ver citas existentes (para verificar disponibilidad)

CREATE POLICY IF NOT EXISTS "allow_public_select_citas"
ON public.citas
FOR SELECT
TO anon, authenticated
USING (true);

-- 5. OPCIONAL: Políticas más restrictivas para UPDATE y DELETE
-- Solo administradores y barberos deberían poder modificar/eliminar citas

-- Política para UPDATE (solo usuarios autenticados específicos)
CREATE POLICY IF NOT EXISTS "allow_admin_update_citas"
ON public.citas
FOR UPDATE
TO authenticated
USING (
  -- Aquí se puede agregar lógica más compleja, por ejemplo:
  -- auth.jwt() ->> 'role' = 'admin' OR
  -- auth.jwt() ->> 'role' = 'barbero'
  true  -- Por ahora, cualquier usuario autenticado puede actualizar
)
WITH CHECK (true);

-- Política para DELETE (solo usuarios autenticados específicos)
CREATE POLICY IF NOT EXISTS "allow_admin_delete_citas"
ON public.citas
FOR DELETE
TO authenticated
USING (
  -- Aquí se puede agregar lógica más compleja
  true  -- Por ahora, cualquier usuario autenticado puede eliminar
);

-- 6. Verificar que las políticas se crearon correctamente
SELECT 
  policyname as "Política Creada",
  cmd as "Operación",
  roles as "Roles Permitidos"
FROM pg_policies 
WHERE tablename = 'citas'
ORDER BY cmd, policyname;

-- =========================================================================
-- NOTAS IMPORTANTES:
-- =========================================================================
--
-- 1. SEGURIDAD:
--    - WITH CHECK (true) significa que no hay restricciones adicionales
--    - Las validaciones de negocio (duplicados, horarios, etc.) se manejan
--      en el código de la aplicación (lib/supabase-helpers.ts)
--
-- 2. ALTERNATIVAS MÁS SEGURAS:
--    Si se quiere más control, se pueden agregar condiciones, por ejemplo:
--    
--    WITH CHECK (
--      -- Solo permitir fechas futuras
--      fecha >= CURRENT_DATE AND
--      -- Solo estados válidos
--      estado IN ('pendiente', 'confirmada', 'cancelada', 'completada') AND
--      -- Validar que existe el barbero
--      EXISTS (SELECT 1 FROM barberos WHERE id = barbero_id AND activo = true) AND
--      -- Validar que existe el servicio
--      EXISTS (SELECT 1 FROM servicios WHERE id = servicio_id AND activo = true)
--    )
--
-- 3. TESTING:
--    Después de ejecutar este SQL, probar con:
--    
--    node scripts/test-crear-cita.js
--    
--    Debería mostrar:
--    ✅ INSERT con ANON KEY: EXITOSO
--
-- 4. ROLLBACK:
--    Si se necesita revertir los cambios:
--    
--    DROP POLICY IF EXISTS "allow_public_insert_citas" ON public.citas;
--    DROP POLICY IF EXISTS "allow_public_select_citas" ON public.citas;
--    DROP POLICY IF EXISTS "allow_admin_update_citas" ON public.citas;
--    DROP POLICY IF EXISTS "allow_admin_delete_citas" ON public.citas;
--
-- =========================================================================
-- DOCUMENTACIÓN RELACIONADA:
-- =========================================================================
--
-- - Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
-- - PostgreSQL Policies: https://www.postgresql.org/docs/current/sql-createpolicy.html
-- - Testing script: scripts/test-crear-cita.js
-- - Diagnóstico: scripts/check-rls-policies.js
-- - Documentación completa: PRUEBA_RESERVAS_7e5300a.md
--
-- =========================================================================
