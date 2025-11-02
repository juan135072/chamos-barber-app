-- ===================================================================
-- REEMPLAZO: Constraint Único Parcial para Citas
-- ===================================================================
-- Propósito: Reemplazar el constraint total por uno parcial
-- que solo prevenga duplicados en citas activas
-- ===================================================================

-- 1. VERIFICAR SI EXISTEN DUPLICADOS ACTIVOS ACTUALES
SELECT 
  barbero_id,
  fecha,
  hora,
  COUNT(*) as cantidad_duplicados
FROM citas
WHERE estado IN ('pendiente', 'confirmada')
GROUP BY barbero_id, fecha, hora
HAVING COUNT(*) > 1
ORDER BY cantidad_duplicados DESC;

-- Si retorna filas, hay duplicados que deben resolverse primero
-- (Pero si ya tienes el constraint total, no deberían existir)

-- ===================================================================
-- 2. ELIMINAR CONSTRAINT ANTIGUO
-- ===================================================================
ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_barbero_id_fecha_hora_key;

-- ===================================================================
-- 3. CREAR ÍNDICE PARCIAL ÚNICO
-- ===================================================================
-- Este índice asegura que solo puede haber UNA cita activa
-- por barbero, fecha y hora
-- Solo considera citas con estado 'pendiente' o 'confirmada'

CREATE UNIQUE INDEX IF NOT EXISTS unique_cita_activa_por_barbero_fecha_hora
ON citas (barbero_id, fecha, hora)
WHERE estado IN ('pendiente', 'confirmada');

-- ===================================================================
-- EXPLICACIÓN DEL CAMBIO:
-- ===================================================================
-- ANTES: UNIQUE (barbero_id, fecha, hora)
--   - Aplicaba a TODAS las filas
--   - No permitía múltiples canceladas en mismo slot ❌
--   - No permitía múltiples completadas en mismo slot ❌
--
-- DESPUÉS: UNIQUE (barbero_id, fecha, hora) WHERE estado IN (...)
--   - Solo aplica a citas ACTIVAS ✅
--   - Permite múltiples canceladas en mismo slot ✅
--   - Permite múltiples completadas en mismo slot ✅
--   - Sigue previniendo duplicados activos ✅
-- ===================================================================

-- ===================================================================
-- 4. TESTS DEL NUEVO CONSTRAINT
-- ===================================================================

-- Test 1: Intentar insertar cita duplicada ACTIVA (DEBE FALLAR)
DO $$
DECLARE
  test_barbero_id uuid;
  test_fecha date := CURRENT_DATE + interval '1 day';
  test_hora time := '10:00';
BEGIN
  -- Obtener un barbero de prueba
  SELECT id INTO test_barbero_id FROM barberos WHERE activo = true LIMIT 1;
  
  IF test_barbero_id IS NULL THEN
    RAISE NOTICE '⚠️ No hay barberos activos para probar';
    RETURN;
  END IF;
  
  -- Limpiar datos previos
  DELETE FROM citas 
  WHERE barbero_id = test_barbero_id 
    AND fecha = test_fecha 
    AND hora = test_hora
    AND cliente_nombre LIKE 'TEST_%';
  
  -- Insertar primera cita PENDIENTE (debe funcionar)
  INSERT INTO citas (
    barbero_id, fecha, hora, 
    servicio_id, cliente_nombre, cliente_telefono,
    estado
  )
  VALUES (
    test_barbero_id, test_fecha, test_hora,
    (SELECT id FROM servicios WHERE activo = true LIMIT 1),
    'TEST_Cliente_1', '+56912345678',
    'pendiente'
  );
  
  RAISE NOTICE '✅ Primera cita pendiente insertada correctamente';
  
  -- Intentar insertar segunda cita PENDIENTE en mismo slot (DEBE FALLAR)
  BEGIN
    INSERT INTO citas (
      barbero_id, fecha, hora, 
      servicio_id, cliente_nombre, cliente_telefono,
      estado
    )
    VALUES (
      test_barbero_id, test_fecha, test_hora,
      (SELECT id FROM servicios WHERE activo = true LIMIT 1),
      'TEST_Cliente_2', '+56987654321',
      'pendiente'
    );
    
    RAISE EXCEPTION '❌ ERROR: Se permitió insertar cita duplicada activa!';
    
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '✅ Test 1 PASADO: Se previno la cita duplicada activa';
  END;
  
  -- Limpiar
  DELETE FROM citas 
  WHERE barbero_id = test_barbero_id 
    AND fecha = test_fecha 
    AND hora = test_hora
    AND cliente_nombre LIKE 'TEST_%';
    
END;
$$;

-- Test 2: Verificar que SÍ permite múltiples CANCELADAS (DEBE FUNCIONAR)
DO $$
DECLARE
  test_barbero_id uuid;
  test_fecha date := CURRENT_DATE + interval '2 days';
  test_hora time := '11:00';
BEGIN
  SELECT id INTO test_barbero_id FROM barberos WHERE activo = true LIMIT 1;
  
  IF test_barbero_id IS NULL THEN
    RAISE NOTICE '⚠️ No hay barberos activos para probar';
    RETURN;
  END IF;
  
  -- Limpiar datos previos
  DELETE FROM citas 
  WHERE barbero_id = test_barbero_id 
    AND fecha = test_fecha 
    AND hora = test_hora
    AND cliente_nombre LIKE 'TEST_%';
  
  -- Insertar primera cita CANCELADA
  INSERT INTO citas (
    barbero_id, fecha, hora, 
    servicio_id, cliente_nombre, cliente_telefono,
    estado
  )
  VALUES (
    test_barbero_id, test_fecha, test_hora,
    (SELECT id FROM servicios WHERE activo = true LIMIT 1),
    'TEST_Cancelado_1', '+56912345678',
    'cancelada'
  );
  
  -- Insertar segunda cita CANCELADA en mismo slot (DEBE FUNCIONAR)
  INSERT INTO citas (
    barbero_id, fecha, hora, 
    servicio_id, cliente_nombre, cliente_telefono,
    estado
  )
  VALUES (
    test_barbero_id, test_fecha, test_hora,
    (SELECT id FROM servicios WHERE activo = true LIMIT 1),
    'TEST_Cancelado_2', '+56987654321',
    'cancelada'
  );
  
  RAISE NOTICE '✅ Test 2 PASADO: Permitió múltiples citas canceladas en mismo slot';
  
  -- Limpiar
  DELETE FROM citas 
  WHERE barbero_id = test_barbero_id 
    AND fecha = test_fecha 
    AND hora = test_hora
    AND cliente_nombre LIKE 'TEST_%';
    
END;
$$;

-- Test 3: Verificar que SÍ permite múltiples COMPLETADAS (DEBE FUNCIONAR)
DO $$
DECLARE
  test_barbero_id uuid;
  test_fecha date := CURRENT_DATE - interval '5 days'; -- Fecha pasada
  test_hora time := '14:00';
BEGIN
  SELECT id INTO test_barbero_id FROM barberos WHERE activo = true LIMIT 1;
  
  IF test_barbero_id IS NULL THEN
    RAISE NOTICE '⚠️ No hay barberos activos para probar';
    RETURN;
  END IF;
  
  -- Limpiar datos previos
  DELETE FROM citas 
  WHERE barbero_id = test_barbero_id 
    AND fecha = test_fecha 
    AND hora = test_hora
    AND cliente_nombre LIKE 'TEST_%';
  
  -- Insertar primera cita COMPLETADA
  INSERT INTO citas (
    barbero_id, fecha, hora, 
    servicio_id, cliente_nombre, cliente_telefono,
    estado
  )
  VALUES (
    test_barbero_id, test_fecha, test_hora,
    (SELECT id FROM servicios WHERE activo = true LIMIT 1),
    'TEST_Completado_1', '+56912345678',
    'completada'
  );
  
  -- Insertar segunda cita COMPLETADA en mismo slot (DEBE FUNCIONAR)
  INSERT INTO citas (
    barbero_id, fecha, hora, 
    servicio_id, cliente_nombre, cliente_telefono,
    estado
  )
  VALUES (
    test_barbero_id, test_fecha, test_hora,
    (SELECT id FROM servicios WHERE activo = true LIMIT 1),
    'TEST_Completado_2', '+56987654321',
    'completada'
  );
  
  RAISE NOTICE '✅ Test 3 PASADO: Permitió múltiples citas completadas en mismo slot';
  
  -- Limpiar
  DELETE FROM citas 
  WHERE barbero_id = test_barbero_id 
    AND fecha = test_fecha 
    AND hora = test_hora
    AND cliente_nombre LIKE 'TEST_%';
    
END;
$$;

-- ===================================================================
-- 5. VERIFICACIÓN FINAL
-- ===================================================================

-- Ver información del nuevo índice
SELECT 
  i.indexname,
  i.indexdef
FROM pg_indexes i
WHERE i.schemaname = 'public'
  AND i.tablename = 'citas'
  AND i.indexname = 'unique_cita_activa_por_barbero_fecha_hora';

-- Verificar que el constraint antiguo fue eliminado
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.citas'::regclass
  AND conname = 'citas_barbero_id_fecha_hora_key';
-- Debería retornar 0 filas

-- Resumen final
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public'
      AND tablename = 'citas'
      AND indexname = 'unique_cita_activa_por_barbero_fecha_hora'
  ) THEN
    RAISE NOTICE '✅ ÉXITO: Índice parcial único creado correctamente';
  ELSE
    RAISE NOTICE '❌ ERROR: No se pudo crear el índice parcial';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.citas'::regclass
      AND conname = 'citas_barbero_id_fecha_hora_key'
  ) THEN
    RAISE NOTICE '✅ ÉXITO: Constraint antiguo eliminado correctamente';
  ELSE
    RAISE NOTICE '⚠️ ADVERTENCIA: Constraint antiguo aún existe';
  END IF;
END;
$$;

-- ===================================================================
-- RESULTADO ESPERADO:
-- ===================================================================
-- ✅ Constraint antiguo eliminado
-- ✅ Nuevo índice parcial creado
-- ✅ Test 1: Previene duplicados activos ✅
-- ✅ Test 2: Permite múltiples canceladas ✅
-- ✅ Test 3: Permite múltiples completadas ✅
-- ✅ Sistema más flexible y correcto ✅
-- ===================================================================
