-- =====================================================
-- 🔧 FIX: calcular_comisiones_pendientes
-- =====================================================
-- Corrige la función para usar f.liquidacion_id IS NULL
-- en lugar de l.facturas_ids
-- =====================================================

DROP FUNCTION IF EXISTS public.calcular_comisiones_pendientes(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION public.calcular_comisiones_pendientes(
  p_barbero_id UUID,
  p_fecha_inicio DATE DEFAULT NULL,
  p_fecha_fin DATE DEFAULT NULL
)
RETURNS TABLE (
  total_ventas DECIMAL(10,2),
  cantidad_servicios BIGINT,
  porcentaje_comision DECIMAL(5,2),
  total_comision DECIMAL(10,2),
  facturas_ids UUID[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(f.total), 0)::DECIMAL(10,2) as total_ventas,
    COUNT(f.id) as cantidad_servicios,
    b.porcentaje_comision,
    COALESCE(SUM(f.comision_barbero), 0)::DECIMAL(10,2) as total_comision,
    ARRAY_AGG(f.id) as facturas_ids
  FROM public.facturas f
  JOIN public.barberos b ON f.barbero_id = b.id
  WHERE f.barbero_id = p_barbero_id
    AND f.anulada = false
    AND f.liquidacion_id IS NULL  -- ✅ CORREGIDO: usar liquidacion_id en lugar de facturas_ids
    AND (p_fecha_inicio IS NULL OR DATE(f.created_at) >= p_fecha_inicio)
    AND (p_fecha_fin IS NULL OR DATE(f.created_at) <= p_fecha_fin)
  GROUP BY b.porcentaje_comision;
END;
$$;

COMMENT ON FUNCTION public.calcular_comisiones_pendientes(UUID, DATE, DATE) IS 
'Calcula comisiones pendientes de un barbero en un período específico.
Usa f.liquidacion_id IS NULL para detectar facturas sin liquidar.';

-- =====================================================
-- ✅ VERIFICACIÓN
-- =====================================================

-- Test 1: Carlos sin fechas (todas las pendientes)
SELECT 
  'Sin fechas' as test,
  total_ventas,
  cantidad_servicios,
  total_comision
FROM public.calcular_comisiones_pendientes(
  'ddee5407-2b69-4275-96c4-09e9203783b5'::UUID,
  NULL,
  NULL
);

-- Test 2: Carlos en diciembre 2025
SELECT 
  'Diciembre 2025' as test,
  total_ventas,
  cantidad_servicios,
  total_comision
FROM public.calcular_comisiones_pendientes(
  'ddee5407-2b69-4275-96c4-09e9203783b5'::UUID,
  '2025-12-01'::DATE,
  '2025-12-31'::DATE
);

-- Test 3: Carlos rango específico de B-0003
SELECT 
  'Día específico' as test,
  total_ventas,
  cantidad_servicios,
  total_comision
FROM public.calcular_comisiones_pendientes(
  'ddee5407-2b69-4275-96c4-09e9203783b5'::UUID,
  '2025-12-15'::DATE,
  '2025-12-15'::DATE
);

-- =====================================================
-- 📋 RESULTADO ESPERADO
-- =====================================================
-- Para todos los tests de Carlos:
-- | total_ventas | cantidad_servicios | total_comision |
-- |--------------|-------------------|----------------|
-- | 18000.00     | 1                 | 5400.00        |
--
-- Porque B-0003 es la única factura con liquidacion_id IS NULL
-- =====================================================
