-- ===================================================================
-- CONSTRAINT: Prevenir Citas Duplicadas
-- ===================================================================
-- Propósito: Asegurar que no puedan existir dos citas activas
-- para el mismo barbero, fecha y hora
-- ===================================================================

-- 1. VERIFICAR SI YA EXISTEN DUPLICADOS
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

-- ===================================================================
-- 2. ELIMINAR CONSTRAINT SI EXISTE (para recrearlo)
-- ===================================================================
ALTER TABLE citas DROP CONSTRAINT IF EXISTS unique_cita_activa_por_barbero_fecha_hora;

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
-- EXPLICACIÓN DEL ÍNDICE:
-- ===================================================================
-- - Es PARCIAL: Solo aplica WHERE estado IN ('pendiente', 'confirmada')
-- - Permite múltiples citas 'canceladas' para el mismo slot
-- - Permite múltiples citas 'completadas' para el mismo slot
-- - PREVIENE duplicados de citas activas
-- - Se aplica a nivel de base de datos (más seguro que solo frontend)
-- ===================================================================

-- ===================================================================
-- 4. TESTS DEL CONSTRAINT
-- ===================================================================

-- Test 1: Intentar insertar cita duplicada (DEBE FALLAR)
DO $$
DECLARE
  test_barbero_id uuid;
  test_fecha date := CURRENT_DATE + interval '1 day';
  test_hora time := '10:00';
BEGIN
  -- Obtener un barbero de prueba
  SELECT id INTO test_barbero_id FROM barberos WHERE activo = true LIMIT 1;
  
  -- Insertar primera cita (debe funcionar)
  INSERT INTO citas (
    barbero_id, fecha, hora, 
    servicio_id, cliente_nombre, cliente_telefono,
    estado
  )
  VALUES (
    test_barbero_id, test_fecha, test_hora,
    (SELECT id FROM servicios WHERE activo = true LIMIT 1),
    'Test Cliente 1', '+56912345678',
    'pendiente'
  );
  
  RAISE NOTICE 'Primera cita insertada correctamente';
  
  -- Intentar insertar segunda cita en mismo slot (DEBE FALLAR)
  BEGIN
    INSERT INTO citas (
      barbero_id, fecha, hora, 
      servicio_id, cliente_nombre, cliente_telefono,
      estado
    )
    VALUES (
      test_barbero_id, test_fecha, test_hora,
      (SELECT id FROM servicios WHERE activo = true LIMIT 1),
      'Test Cliente 2', '+56987654321',
      'pendiente'
    );
    
    RAISE EXCEPTION 'ERROR: Se permitió insertar cita duplicada!';
    
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'Correcto: Se previno la cita duplicada ✅';
  END;
  
  -- Limpiar datos de prueba
  DELETE FROM citas 
  WHERE barbero_id = test_barbero_id 
    AND fecha = test_fecha 
    AND hora = test_hora
    AND cliente_nombre LIKE 'Test Cliente%';
    
  RAISE NOTICE 'Datos de prueba limpiados';
END;
$$;

-- Test 2: Verificar que sí permite múltiples canceladas
DO $$
DECLARE
  test_barbero_id uuid;
  test_fecha date := CURRENT_DATE + interval '2 days';
  test_hora time := '11:00';
BEGIN
  SELECT id INTO test_barbero_id FROM barberos WHERE activo = true LIMIT 1;
  
  -- Insertar primera cita cancelada
  INSERT INTO citas (
    barbero_id, fecha, hora, 
    servicio_id, cliente_nombre, cliente_telefono,
    estado
  )
  VALUES (
    test_barbero_id, test_fecha, test_hora,
    (SELECT id FROM servicios WHERE activo = true LIMIT 1),
    'Test Cancelado 1', '+56912345678',
    'cancelada'
  );
  
  -- Insertar segunda cita cancelada en mismo slot (DEBE FUNCIONAR)
  INSERT INTO citas (
    barbero_id, fecha, hora, 
    servicio_id, cliente_nombre, cliente_telefono,
    estado
  )
  VALUES (
    test_barbero_id, test_fecha, test_hora,
    (SELECT id FROM servicios WHERE activo = true LIMIT 1),
    'Test Cancelado 2', '+56987654321',
    'cancelada'
  );
  
  RAISE NOTICE 'Correcto: Permitió múltiples citas canceladas ✅';
  
  -- Limpiar
  DELETE FROM citas 
  WHERE barbero_id = test_barbero_id 
    AND fecha = test_fecha 
    AND hora = test_hora
    AND cliente_nombre LIKE 'Test Cancelado%';
    
END;
$$;

-- ===================================================================
-- 5. VERIFICACIÓN FINAL
-- ===================================================================

-- Ver información del índice creado
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'citas'
  AND indexname = 'unique_cita_activa_por_barbero_fecha_hora';

-- Ver estadísticas del índice
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as veces_usado,
  idx_tup_read as filas_leidas,
  idx_tup_fetch as filas_obtenidas
FROM pg_stat_user_indexes
WHERE indexname = 'unique_cita_activa_por_barbero_fecha_hora';

-- ===================================================================
-- RESULTADO ESPERADO:
-- ===================================================================
-- ✅ Índice único creado correctamente
-- ✅ Previene inserciones duplicadas de citas activas
-- ✅ Permite múltiples citas canceladas en el mismo slot
-- ✅ Mejora performance de búsquedas por barbero/fecha/hora
-- ===================================================================

-- ===================================================================
-- NOTA PARA FRONTEND:
-- ===================================================================
-- Cuando el frontend intente insertar una cita duplicada, recibirá:
-- Error code: 23505 (unique_violation)
-- Error message: duplicate key value violates unique constraint
-- 
-- El código debe capturar este error y mostrar mensaje amigable al usuario
-- ===================================================================
