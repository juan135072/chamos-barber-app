-- ================================================================
-- 🔍 VERIFICACIÓN: Estructura de Liquidaciones
-- ================================================================

-- 1️⃣ Ver si la tabla liquidaciones existe
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'liquidaciones';

-- 2️⃣ Ver estructura de liquidaciones (si existe)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'liquidaciones'
ORDER BY ordinal_position;

-- 3️⃣ Ver funciones relacionadas con liquidaciones
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname LIKE '%liquidacion%' OR proname LIKE '%comision%'
ORDER BY proname;

-- 4️⃣ Ver vista barberos_resumen (si existe)
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'barberos_resumen';

-- 5️⃣ Probar calcular comisiones pendientes
DO $$
DECLARE
  carlos_id UUID;
  miguel_id UUID;
BEGIN
  SELECT id INTO carlos_id FROM barberos WHERE nombre = 'Carlos' LIMIT 1;
  SELECT id INTO miguel_id FROM barberos WHERE nombre = 'Miguel' LIMIT 1;
  
  RAISE NOTICE 'Carlos ID: %', carlos_id;
  RAISE NOTICE 'Miguel ID: %', miguel_id;
  
  -- Ver si hay facturas
  RAISE NOTICE 'Total facturas: %', (SELECT COUNT(*) FROM facturas);
  RAISE NOTICE 'Facturas de Carlos: %', (SELECT COUNT(*) FROM facturas WHERE barbero_id = carlos_id);
END $$;
