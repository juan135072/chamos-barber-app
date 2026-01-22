-- ================================================================
-- 🔍 DIAGNÓSTICO: Ver estructura REAL de tabla facturas
-- ================================================================

-- 1️⃣ Ver TODAS las columnas de facturas
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'facturas'
ORDER BY ordinal_position;

-- 2️⃣ Ver constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.facturas'::regclass
ORDER BY contype, conname;

-- 3️⃣ Ver todos los registros existentes (si hay)
SELECT COUNT(*) as total_facturas FROM facturas;

-- 4️⃣ Si hay registros, mostrar las primeras 5
SELECT * FROM facturas LIMIT 5;
