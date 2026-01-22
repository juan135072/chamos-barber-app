-- ================================================================
-- 🔧 FIX: Sobrecarga de función calcular_comisiones_factura
-- ================================================================
--
-- PROBLEMA: 
-- La función solo acepta DECIMAL pero el código pasa INTEGER
--
-- SOLUCIÓN:
-- Crear versiones de la función para INTEGER y NUMERIC
-- ================================================================

-- VERSIÓN 1: Acepta NUMERIC/DECIMAL
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
AS $$
DECLARE
  v_porcentaje NUMERIC;
BEGIN
  SELECT porcentaje_comision INTO v_porcentaje
  FROM public.barberos
  WHERE id = p_barbero_id;
  
  IF v_porcentaje IS NULL THEN
    v_porcentaje := 50.00;
  END IF;
  
  RETURN QUERY
  SELECT 
    v_porcentaje as porcentaje,
    ROUND(p_total * v_porcentaje / 100, 2) as comision_barbero,
    ROUND(p_total * (100 - v_porcentaje) / 100, 2) as ingreso_casa;
END;
$$;

-- VERSIÓN 2: Acepta INTEGER (convierte a NUMERIC)
CREATE OR REPLACE FUNCTION public.calcular_comisiones_factura(
  p_barbero_id UUID,
  p_total INTEGER
)
RETURNS TABLE (
  porcentaje NUMERIC,
  comision_barbero NUMERIC,
  ingreso_casa NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM calcular_comisiones_factura(p_barbero_id, p_total::NUMERIC);
END;
$$;

-- VERSIÓN 3: Acepta DOUBLE PRECISION
CREATE OR REPLACE FUNCTION public.calcular_comisiones_factura(
  p_barbero_id UUID,
  p_total DOUBLE PRECISION
)
RETURNS TABLE (
  porcentaje NUMERIC,
  comision_barbero NUMERIC,
  ingreso_casa NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM calcular_comisiones_factura(p_barbero_id, p_total::NUMERIC);
END;
$$;

-- Dar permisos a todas las versiones
GRANT EXECUTE ON FUNCTION public.calcular_comisiones_factura(UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.calcular_comisiones_factura(UUID, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.calcular_comisiones_factura(UUID, DOUBLE PRECISION) TO authenticated, anon;

-- ================================================================
-- ✅ VERIFICACIÓN
-- ================================================================

-- Probar con INTEGER
SELECT 'Test con INTEGER' as test, * FROM calcular_comisiones_factura(
  (SELECT id FROM barberos WHERE nombre = 'Carlos' LIMIT 1),
  15000
);

-- Probar con NUMERIC
SELECT 'Test con NUMERIC' as test, * FROM calcular_comisiones_factura(
  (SELECT id FROM barberos WHERE nombre = 'Carlos' LIMIT 1),
  15000.00
);

-- Probar con DOUBLE PRECISION
SELECT 'Test con DOUBLE' as test, * FROM calcular_comisiones_factura(
  (SELECT id FROM barberos WHERE nombre = 'Carlos' LIMIT 1),
  15000.0::DOUBLE PRECISION
);

-- Ver todas las versiones de la función
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'calcular_comisiones_factura'
ORDER BY arguments;

-- ================================================================
-- 📋 RESUMEN
-- ================================================================
-- ✅ 3 versiones de calcular_comisiones_factura() creadas
-- ✅ Acepta: INTEGER, NUMERIC, DOUBLE PRECISION
-- ✅ Permisos otorgados a authenticated y anon
-- ✅ Todas las versiones usan el % personalizado del barbero
-- ================================================================
