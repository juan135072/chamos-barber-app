-- ========================================
-- Limpieza: Eliminar tabla solicitudes_barberos y dependencias
-- ========================================
-- ADVERTENCIA: Esto eliminará todos los datos de solicitudes_barberos
-- Solo ejecutar si es necesario recrear la tabla desde cero

-- Eliminar políticas RLS primero
DROP POLICY IF EXISTS "Permitir inserción pública de solicitudes" ON public.solicitudes_barberos;
DROP POLICY IF EXISTS "Admins pueden ver todas las solicitudes" ON public.solicitudes_barberos;
DROP POLICY IF EXISTS "Admins pueden actualizar solicitudes" ON public.solicitudes_barberos;

-- Eliminar trigger
DROP TRIGGER IF EXISTS trigger_update_solicitudes_barberos_updated_at ON public.solicitudes_barberos;

-- Eliminar función del trigger
DROP FUNCTION IF EXISTS public.update_solicitudes_barberos_updated_at();

-- Eliminar tabla (CASCADE eliminará también los índices)
DROP TABLE IF EXISTS public.solicitudes_barberos CASCADE;

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Tabla solicitudes_barberos eliminada';
  RAISE NOTICE '✅ Listo para ejecutar create-solicitudes-barberos-table.sql';
END $$;
