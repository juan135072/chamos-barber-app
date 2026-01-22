-- ================================================================
-- 🔧 MIGRACIÓN: Cambiar fecha_hora → fecha + hora (separadas)
-- ================================================================
-- 
-- PROBLEMA: 
-- - La tabla citas usa fecha_hora (TIMESTAMP)
-- - El código usa fecha (DATE) y hora (TIME) separadas
--
-- SOLUCIÓN:
-- - Migrar datos existentes
-- - Modificar estructura de la tabla
-- - Actualizar constraints
--
-- ⚠️ IMPORTANTE: Ejecutar ANTES de insertar datos de prueba
-- ================================================================

BEGIN;

-- PASO 1: Agregar nuevas columnas temporales
ALTER TABLE public.citas 
ADD COLUMN IF NOT EXISTS fecha DATE,
ADD COLUMN IF NOT EXISTS hora TIME;

-- PASO 2: Migrar datos existentes (si hay alguno)
-- Extraer fecha y hora de fecha_hora
UPDATE public.citas
SET 
  fecha = fecha_hora::DATE,
  hora = fecha_hora::TIME
WHERE fecha IS NULL OR hora IS NULL;

-- PASO 3: Hacer las nuevas columnas NOT NULL
-- (Primero verificar que todos los registros tengan datos)
DO $$
BEGIN
  -- Solo hacer NOT NULL si no hay valores nulos
  IF NOT EXISTS (SELECT 1 FROM public.citas WHERE fecha IS NULL OR hora IS NULL) THEN
    ALTER TABLE public.citas ALTER COLUMN fecha SET NOT NULL;
    ALTER TABLE public.citas ALTER COLUMN hora SET NOT NULL;
  END IF;
END $$;

-- PASO 4: Eliminar constraint único viejo
ALTER TABLE public.citas 
DROP CONSTRAINT IF EXISTS citas_barbero_id_fecha_hora_key;

-- PASO 5: Agregar nuevo constraint único
ALTER TABLE public.citas 
ADD CONSTRAINT citas_barbero_id_fecha_hora_unique 
UNIQUE (barbero_id, fecha, hora);

-- PASO 6: Eliminar columna vieja fecha_hora
ALTER TABLE public.citas 
DROP COLUMN IF EXISTS fecha_hora;

-- PASO 7: Eliminar columna duracion (no se usa en el código)
ALTER TABLE public.citas 
DROP COLUMN IF EXISTS duracion;

-- PASO 8: Hacer cliente_email opcional (NULL permitido)
ALTER TABLE public.citas 
ALTER COLUMN cliente_email DROP NOT NULL;

COMMIT;

-- ================================================================
-- ✅ VERIFICACIÓN
-- ================================================================
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'citas'
ORDER BY ordinal_position;

-- Verificar constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.citas'::regclass;

-- ================================================================
-- 📋 RESUMEN DE CAMBIOS
-- ================================================================
-- ✅ fecha_hora (TIMESTAMP) → fecha (DATE) + hora (TIME)
-- ✅ Constraint único actualizado
-- ✅ cliente_email ahora es opcional
-- ✅ Columna duracion eliminada (no usada)
-- ================================================================
