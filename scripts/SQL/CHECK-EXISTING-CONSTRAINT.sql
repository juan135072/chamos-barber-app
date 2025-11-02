-- ===================================================================
-- VERIFICACIÓN: Constraint Existente en Tabla Citas
-- ===================================================================
-- Propósito: Verificar si el constraint existente es suficiente
-- o si necesitamos crear el índice parcial personalizado
-- ===================================================================

-- 1. VERIFICAR CONSTRAINTS EXISTENTES
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'citas'::regclass
  AND conname LIKE '%barbero%'
ORDER BY conname;

-- 2. VERIFICAR ÍNDICES ÚNICOS EXISTENTES
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'citas'
  AND indexdef LIKE '%UNIQUE%'
  AND (indexname LIKE '%barbero%' OR indexname LIKE '%hora%')
ORDER BY indexname;

-- 3. VERIFICAR SI EL CONSTRAINT ES PARCIAL O TOTAL
SELECT 
  indexname,
  indexdef,
  CASE 
    WHEN indexdef LIKE '%WHERE%' THEN 'PARCIAL (solo ciertas condiciones)'
    ELSE 'TOTAL (todas las filas)'
  END AS tipo_indice
FROM pg_indexes
WHERE tablename = 'citas'
  AND indexdef LIKE '%UNIQUE%'
  AND (indexname LIKE '%barbero%' OR indexname LIKE '%hora%');

-- 4. PROBAR SI PERMITE MÚLTIPLES CANCELADAS
-- (Este test dirá si el constraint existente es parcial o no)
DO $$
DECLARE
  test_barbero_id uuid;
  test_fecha date := CURRENT_DATE + interval '10 days';
  test_hora time := '15:00';
  test_count integer;
BEGIN
  -- Obtener un barbero
  SELECT id INTO test_barbero_id FROM barberos WHERE activo = true LIMIT 1;
  
  IF test_barbero_id IS NULL THEN
    RAISE NOTICE '⚠️ No hay barberos activos para probar';
    RETURN;
  END IF;
  
  -- Limpiar datos previos de test
  DELETE FROM citas 
  WHERE barbero_id = test_barbero_id 
    AND fecha = test_fecha 
    AND hora = test_hora
    AND cliente_nombre LIKE 'TEST_CHECK%';
  
  -- Intentar insertar DOS citas canceladas en mismo slot
  BEGIN
    INSERT INTO citas (
      barbero_id, fecha, hora, 
      servicio_id, cliente_nombre, cliente_telefono,
      estado
    )
    VALUES (
      test_barbero_id, test_fecha, test_hora,
      (SELECT id FROM servicios WHERE activo = true LIMIT 1),
      'TEST_CHECK_CANCELADA_1', '+56900000001',
      'cancelada'
    );
    
    INSERT INTO citas (
      barbero_id, fecha, hora, 
      servicio_id, cliente_nombre, cliente_telefono,
      estado
    )
    VALUES (
      test_barbero_id, test_fecha, test_hora,
      (SELECT id FROM servicios WHERE activo = true LIMIT 1),
      'TEST_CHECK_CANCELADA_2', '+56900000002',
      'cancelada'
    );
    
    RAISE NOTICE '✅ CONSTRAINT ES PARCIAL: Permitió múltiples canceladas';
    RAISE NOTICE '   → El constraint existente YA está correcto';
    RAISE NOTICE '   → NO es necesario ejecutar add-citas-unique-constraint.sql';
    
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '⚠️ CONSTRAINT ES TOTAL: NO permitió múltiples canceladas';
      RAISE NOTICE '   → El constraint existente es demasiado estricto';
      RAISE NOTICE '   → SÍ es necesario reemplazarlo con add-citas-unique-constraint.sql';
  END;
  
  -- Limpiar datos de test
  DELETE FROM citas 
  WHERE barbero_id = test_barbero_id 
    AND fecha = test_fecha 
    AND hora = test_hora
    AND cliente_nombre LIKE 'TEST_CHECK%';
    
  RAISE NOTICE '🧹 Datos de test limpiados';
  
END;
$$;

-- ===================================================================
-- 5. RESUMEN DE INFORMACIÓN
-- ===================================================================
SELECT 
  'DIAGNÓSTICO COMPLETO' as titulo,
  (SELECT COUNT(*) FROM pg_constraint 
   WHERE conrelid = 'citas'::regclass 
   AND conname LIKE '%barbero%') as constraints_barbero,
  (SELECT COUNT(*) FROM pg_indexes 
   WHERE tablename = 'citas' 
   AND indexdef LIKE '%UNIQUE%' 
   AND indexdef LIKE '%barbero%') as indices_unicos_barbero;

-- ===================================================================
-- INTERPRETACIÓN DE RESULTADOS:
-- ===================================================================
-- 
-- Si el test dice "CONSTRAINT ES PARCIAL":
--   → Ya tienes el constraint correcto
--   → NO ejecutes add-citas-unique-constraint.sql
--   → El sistema ya previene duplicados activos
--   → Puedes crear citas canceladas duplicadas (correcto)
--
-- Si el test dice "CONSTRAINT ES TOTAL":
--   → El constraint actual es demasiado restrictivo
--   → SÍ ejecuta add-citas-unique-constraint.sql
--   → Esto reemplazará el constraint con uno parcial
--   → Mejorará la flexibilidad del sistema
-- ===================================================================
