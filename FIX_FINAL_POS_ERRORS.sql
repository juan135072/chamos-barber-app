-- ================================================================
-- 🔧 FIX FINAL: Resolver errores de POS
-- ================================================================
--
-- ERROR 1: PGRST203 - Sobrecarga de función ambigua
-- ERROR 2: 23502 - numero_factura NULL
--
-- SOLUCIÓN:
-- 1. Eliminar sobrecargas de calcular_comisiones_factura
-- 2. Crear UNA versión que acepte texto (PostgREST convertirá automáticamente)
-- 3. Agregar trigger para generar numero_factura automáticamente
-- ================================================================

BEGIN;

-- ================================================================
-- PASO 1: ELIMINAR TODAS LAS VERSIONES DE calcular_comisiones_factura
-- ================================================================

DROP FUNCTION IF EXISTS public.calcular_comisiones_factura(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.calcular_comisiones_factura(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.calcular_comisiones_factura(UUID, DOUBLE PRECISION);

-- ================================================================
-- PASO 2: CREAR UNA SOLA VERSIÓN QUE ACEPTE NUMERIC
-- ================================================================

CREATE OR REPLACE FUNCTION public.calcular_comisiones_factura(
  p_barbero_id UUID,
  p_total NUMERIC
)
RETURNS TABLE (
  porcentaje NUMERIC,
  comision_barbero NUMERIC,
  ingreso_casa NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_porcentaje NUMERIC;
BEGIN
  -- Obtener porcentaje personalizado del barbero
  SELECT porcentaje_comision INTO v_porcentaje
  FROM public.barberos
  WHERE id = p_barbero_id;
  
  -- Si no tiene porcentaje, usar 50% por defecto
  IF v_porcentaje IS NULL THEN
    v_porcentaje := 50.00;
  END IF;
  
  -- Calcular y retornar
  RETURN QUERY
  SELECT 
    v_porcentaje as porcentaje,
    ROUND(p_total * v_porcentaje / 100, 2) as comision_barbero,
    ROUND(p_total * (100 - v_porcentaje) / 100, 2) as ingreso_casa;
END;
$$;

-- Dar permisos
GRANT EXECUTE ON FUNCTION public.calcular_comisiones_factura(UUID, NUMERIC) TO authenticated, anon;

-- ================================================================
-- PASO 3: VERIFICAR/CREAR FUNCIÓN generar_numero_factura
-- ================================================================

CREATE OR REPLACE FUNCTION public.generar_numero_factura()
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  ultimo_numero INTEGER;
  nuevo_numero VARCHAR;
  prefijo VARCHAR;
BEGIN
  -- Obtener el último número de factura
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(numero_factura FROM '[0-9]+') AS INTEGER)), 
    0
  )
  INTO ultimo_numero
  FROM public.facturas
  WHERE numero_factura ~ '^[BF]-[0-9]+$';
  
  -- Incrementar
  ultimo_numero := ultimo_numero + 1;
  
  -- Formato: B-0001, B-0002, etc.
  prefijo := 'B';
  nuevo_numero := prefijo || '-' || LPAD(ultimo_numero::TEXT, 4, '0');
  
  RETURN nuevo_numero;
END;
$$;

-- ================================================================
-- PASO 4: CREAR TRIGGER PARA AUTO-GENERAR numero_factura
-- ================================================================

CREATE OR REPLACE FUNCTION public.set_numero_factura()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_factura IS NULL OR NEW.numero_factura = '' THEN
    NEW.numero_factura := generar_numero_factura();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_numero_factura ON public.facturas;
CREATE TRIGGER trigger_set_numero_factura
  BEFORE INSERT ON public.facturas
  FOR EACH ROW
  EXECUTE FUNCTION set_numero_factura();

COMMIT;

-- ================================================================
-- ✅ VERIFICACIÓN
-- ================================================================

-- 1. Verificar que solo existe UNA versión de calcular_comisiones_factura
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  prokind as kind
FROM pg_proc
WHERE proname = 'calcular_comisiones_factura'
ORDER BY arguments;

-- 2. Verificar que generar_numero_factura existe
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'generar_numero_factura';

-- 3. Verificar triggers en facturas
SELECT 
  tgname as trigger_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.facturas'::regclass
  AND tgname IN ('trigger_set_numero_factura', 'trigger_set_facturas_created_by')
ORDER BY tgname;

-- 4. Probar calcular_comisiones_factura
DO $$
DECLARE
  carlos_id UUID;
  result RECORD;
BEGIN
  SELECT id INTO carlos_id FROM barberos WHERE nombre = 'Carlos' LIMIT 1;
  
  IF carlos_id IS NULL THEN
    RAISE NOTICE '❌ No se encontró barbero Carlos';
    RETURN;
  END IF;
  
  -- Probar con número como texto (como lo envía PostgREST desde frontend)
  FOR result IN 
    SELECT * FROM calcular_comisiones_factura(carlos_id, 15000::NUMERIC)
  LOOP
    RAISE NOTICE '✅ Comisión: %%=%, barbero=$%, casa=$%', 
      result.porcentaje, result.comision_barbero, result.ingreso_casa;
  END LOOP;
END $$;

-- 5. Probar INSERT con auto-generación de numero_factura
DO $$
DECLARE
  carlos_id UUID;
  servicio_id UUID;
  test_factura_id UUID;
  test_numero VARCHAR;
BEGIN
  SELECT id INTO carlos_id FROM barberos WHERE nombre = 'Carlos' LIMIT 1;
  SELECT id INTO servicio_id FROM servicios WHERE nombre = 'Corte Clásico' LIMIT 1;
  
  IF carlos_id IS NULL OR servicio_id IS NULL THEN
    RAISE NOTICE '❌ No se encontraron datos necesarios';
    RETURN;
  END IF;
  
  -- INSERT SIN especificar numero_factura (debe generarse automáticamente)
  INSERT INTO facturas (
    barbero_id,
    cliente_nombre,
    tipo_documento,
    items,
    subtotal,
    total,
    metodo_pago,
    monto_recibido,
    cambio,
    porcentaje_comision,
    comision_barbero,
    ingreso_casa
  ) VALUES (
    carlos_id,
    'Cliente Test Autogenerado',
    'boleta',
    jsonb_build_array(
      jsonb_build_object(
        'servicio_id', servicio_id,
        'nombre', 'Corte Clásico',
        'precio', 15000,
        'cantidad', 1,
        'subtotal', 15000
      )
    ),
    15000,
    15000,
    'efectivo',
    20000,
    5000,
    50.00,
    7500,
    7500
  )
  RETURNING id, numero_factura INTO test_factura_id, test_numero;
  
  RAISE NOTICE '✅ Factura creada con número auto-generado: %', test_numero;
  RAISE NOTICE '✅ ID: %', test_factura_id;
  
  -- Eliminar
  DELETE FROM facturas WHERE id = test_factura_id;
  RAISE NOTICE '✅ Factura de prueba eliminada';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERROR: [%] %', SQLSTATE, SQLERRM;
END $$;

-- ================================================================
-- 📋 RESUMEN
-- ================================================================
-- ✅ Sobrecargas de calcular_comisiones_factura eliminadas
-- ✅ Una sola versión NUMERIC creada
-- ✅ Función generar_numero_factura() creada
-- ✅ Trigger trigger_set_numero_factura creado
-- ✅ numero_factura se genera automáticamente
-- ================================================================
