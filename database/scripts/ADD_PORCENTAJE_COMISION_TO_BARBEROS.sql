-- =====================================================
-- 🔧 ADD porcentaje_comision COLUMN TO barberos TABLE
-- =====================================================
-- Este script agrega la columna porcentaje_comision a la tabla barberos
-- si no existe. Esta columna es necesaria para el sistema de liquidaciones
-- y para la pestaña de Comisiones en el panel de administración.
-- =====================================================

-- Agregar columna porcentaje_comision si no existe
ALTER TABLE public.barberos 
ADD COLUMN IF NOT EXISTS porcentaje_comision DECIMAL(5,2) DEFAULT 50.00;

-- Agregar comentario a la columna
COMMENT ON COLUMN public.barberos.porcentaje_comision IS 'Porcentaje de comisión que recibe el barbero (ej: 50.00 = 50%)';

-- Actualizar barberos existentes que tengan NULL
UPDATE public.barberos 
SET porcentaje_comision = 50.00 
WHERE porcentaje_comision IS NULL;

-- Agregar NOT NULL constraint después de actualizar valores NULL
ALTER TABLE public.barberos 
ALTER COLUMN porcentaje_comision SET NOT NULL;

-- Agregar constraint para validar rango (0-100)
ALTER TABLE public.barberos 
ADD CONSTRAINT check_porcentaje_comision_range 
CHECK (porcentaje_comision >= 0 AND porcentaje_comision <= 100);

-- Verificar que la columna existe
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'barberos'
  AND column_name = 'porcentaje_comision';

-- Verificar datos de barberos con porcentaje_comision
SELECT 
  id,
  nombre,
  apellido,
  email,
  porcentaje_comision,
  activo
FROM public.barberos
ORDER BY nombre;

-- =====================================================
-- ✅ RESULTADO ESPERADO
-- =====================================================
-- Deberías ver la columna porcentaje_comision con:
-- - data_type: numeric
-- - column_default: 50.00
-- - is_nullable: NO
-- 
-- Y todos los barberos deberían tener porcentaje_comision = 50.00
-- =====================================================
