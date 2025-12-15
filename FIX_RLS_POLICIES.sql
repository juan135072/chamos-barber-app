-- ================================================================
-- 🔧 FIX: Políticas RLS para acceso público a datos
-- ================================================================
-- 
-- PROBLEMA: 
-- - El POS no puede cargar barberos y servicios
-- - Las tablas tienen RLS habilitado pero sin políticas
--
-- SOLUCIÓN:
-- - Habilitar RLS en todas las tablas necesarias
-- - Crear políticas de SELECT público para datos básicos
-- - Crear políticas de INSERT/UPDATE/DELETE para usuarios autenticados
-- ================================================================

-- ================================================================
-- PARTE 1: POLÍTICAS PARA BARBEROS
-- ================================================================

-- Habilitar RLS
ALTER TABLE public.barberos ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Barberos son visibles públicamente" ON public.barberos;
DROP POLICY IF EXISTS "Barberos - SELECT público" ON public.barberos;
DROP POLICY IF EXISTS "Barberos - INSERT admin" ON public.barberos;
DROP POLICY IF EXISTS "Barberos - UPDATE admin" ON public.barberos;
DROP POLICY IF EXISTS "Barberos - DELETE admin" ON public.barberos;

-- Crear nuevas políticas
CREATE POLICY "Barberos - SELECT público"
ON public.barberos FOR SELECT
TO authenticated, anon
USING (activo = true);

CREATE POLICY "Barberos - SELECT todos (autenticado)"
ON public.barberos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Barberos - INSERT admin"
ON public.barberos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Barberos - UPDATE admin"
ON public.barberos FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Barberos - DELETE admin"
ON public.barberos FOR DELETE
TO authenticated
USING (true);

-- ================================================================
-- PARTE 2: POLÍTICAS PARA SERVICIOS
-- ================================================================

-- Habilitar RLS
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Servicios son visibles públicamente" ON public.servicios;
DROP POLICY IF EXISTS "Servicios - SELECT público" ON public.servicios;
DROP POLICY IF EXISTS "Servicios - INSERT admin" ON public.servicios;
DROP POLICY IF EXISTS "Servicios - UPDATE admin" ON public.servicios;
DROP POLICY IF EXISTS "Servicios - DELETE admin" ON public.servicios;

-- Crear nuevas políticas
CREATE POLICY "Servicios - SELECT público"
ON public.servicios FOR SELECT
TO authenticated, anon
USING (activo = true);

CREATE POLICY "Servicios - SELECT todos (autenticado)"
ON public.servicios FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Servicios - INSERT admin"
ON public.servicios FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Servicios - UPDATE admin"
ON public.servicios FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Servicios - DELETE admin"
ON public.servicios FOR DELETE
TO authenticated
USING (true);

-- ================================================================
-- PARTE 3: POLÍTICAS PARA CATEGORÍAS
-- ================================================================

-- Habilitar RLS
ALTER TABLE public.categorias_servicios ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Categorías - SELECT público" ON public.categorias_servicios;
DROP POLICY IF EXISTS "Categorías - INSERT admin" ON public.categorias_servicios;
DROP POLICY IF EXISTS "Categorías - UPDATE admin" ON public.categorias_servicios;
DROP POLICY IF EXISTS "Categorías - DELETE admin" ON public.categorias_servicios;

-- Crear nuevas políticas
CREATE POLICY "Categorías - SELECT público"
ON public.categorias_servicios FOR SELECT
TO authenticated, anon
USING (activo = true);

CREATE POLICY "Categorías - SELECT todos (autenticado)"
ON public.categorias_servicios FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Categorías - INSERT admin"
ON public.categorias_servicios FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Categorías - UPDATE admin"
ON public.categorias_servicios FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Categorías - DELETE admin"
ON public.categorias_servicios FOR DELETE
TO authenticated
USING (true);

-- ================================================================
-- PARTE 4: POLÍTICAS PARA HORARIOS
-- ================================================================

-- Habilitar RLS
ALTER TABLE public.horarios_atencion ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Horarios - SELECT público" ON public.horarios_atencion;
DROP POLICY IF EXISTS "Horarios - INSERT admin" ON public.horarios_atencion;
DROP POLICY IF EXISTS "Horarios - UPDATE admin" ON public.horarios_atencion;
DROP POLICY IF EXISTS "Horarios - DELETE admin" ON public.horarios_atencion;

-- Crear nuevas políticas
CREATE POLICY "Horarios - SELECT público"
ON public.horarios_atencion FOR SELECT
TO authenticated, anon
USING (activo = true);

CREATE POLICY "Horarios - SELECT todos (autenticado)"
ON public.horarios_atencion FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Horarios - INSERT admin"
ON public.horarios_atencion FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Horarios - UPDATE admin"
ON public.horarios_atencion FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Horarios - DELETE admin"
ON public.horarios_atencion FOR DELETE
TO authenticated
USING (true);

-- ================================================================
-- PARTE 5: POLÍTICAS PARA CITAS
-- ================================================================

-- Habilitar RLS
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Citas - SELECT autenticado" ON public.citas;
DROP POLICY IF EXISTS "Citas - INSERT autenticado" ON public.citas;
DROP POLICY IF EXISTS "Citas - UPDATE autenticado" ON public.citas;
DROP POLICY IF EXISTS "Citas - DELETE admin" ON public.citas;

-- Crear nuevas políticas
CREATE POLICY "Citas - SELECT autenticado"
ON public.citas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Citas - INSERT autenticado"
ON public.citas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Citas - UPDATE autenticado"
ON public.citas FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Citas - DELETE admin"
ON public.citas FOR DELETE
TO authenticated
USING (true);

-- ================================================================
-- ✅ VERIFICACIÓN
-- ================================================================

-- Ver políticas de barberos
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
WHERE schemaname = 'public' 
  AND tablename IN ('barberos', 'servicios', 'categorias_servicios', 'horarios_atencion', 'citas')
ORDER BY tablename, policyname;

-- Verificar que RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('barberos', 'servicios', 'categorias_servicios', 'horarios_atencion', 'citas')
ORDER BY tablename;

-- ================================================================
-- 📋 RESUMEN
-- ================================================================
-- ✅ RLS habilitado en todas las tablas
-- ✅ Políticas de SELECT público para datos activos
-- ✅ Políticas de SELECT completo para usuarios autenticados
-- ✅ Políticas de INSERT/UPDATE/DELETE para usuarios autenticados
-- ================================================================
