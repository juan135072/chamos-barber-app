-- ================================================================
-- 🔧 FIX: Renombrar columnas en tabla servicios
-- ================================================================
-- 
-- PROBLEMA:
-- - El código busca servicios.duracion_minutos pero existe servicios.duracion
-- - El código busca servicios.categoria pero existe servicios.categoria_id
--
-- SOLUCIÓN:
-- - Renombrar duracion → duracion_minutos
-- - Agregar columna categoria (texto) basada en categoria_id
-- ================================================================

-- ================================================================
-- PARTE 1: RENOMBRAR duracion → duracion_minutos
-- ================================================================

ALTER TABLE public.servicios 
RENAME COLUMN duracion TO duracion_minutos;

-- ================================================================
-- PARTE 2: AGREGAR COLUMNA categoria (texto)
-- ================================================================

-- Agregar columna categoria si no existe
ALTER TABLE public.servicios 
ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);

-- Poblar categoria basándose en categoria_id
UPDATE public.servicios s
SET categoria = cs.nombre
FROM public.categorias_servicios cs
WHERE s.categoria_id = cs.id
  AND s.categoria IS NULL;

-- ================================================================
-- PARTE 3: VERIFICAR TABLA servicios
-- ================================================================

-- Ver estructura completa de servicios
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'servicios'
ORDER BY ordinal_position;

-- Ver datos de servicios
SELECT 
  id,
  nombre,
  duracion_minutos,
  precio,
  categoria,
  categoria_id,
  activo
FROM servicios
WHERE activo = true
ORDER BY categoria, nombre;

-- ================================================================
-- 📋 RESUMEN
-- ================================================================
-- ✅ Columna duracion renombrada a duracion_minutos
-- ✅ Columna categoria agregada con valores de categorias_servicios
-- ================================================================
