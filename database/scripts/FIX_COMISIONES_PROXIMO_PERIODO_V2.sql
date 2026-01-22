-- =====================================================
-- 🔧 FIX V2: Calcular Comisiones del Próximo Período
-- =====================================================
-- Corrección definitiva con CAST explícitos
-- =====================================================

DROP FUNCTION IF EXISTS public.calcular_comisiones_proximo_periodo();

CREATE OR REPLACE FUNCTION public.calcular_comisiones_proximo_periodo()
RETURNS TABLE (
  barbero_id UUID,
  barbero_nombre TEXT,
  barbero_email VARCHAR(255),
  cantidad_ventas BIGINT,
  monto_total DECIMAL(10,2),
  porcentaje_comision DECIMAL(5,2),
  total_comision DECIMAL(10,2),
  ultima_liquidacion_numero VARCHAR(50),
  ultima_liquidacion_fecha DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH ultima_liquidacion_por_barbero AS (
    SELECT 
      l.barbero_id,
      MAX(l.fecha_fin) as ultima_fecha_liquidacion,
      MAX(l.numero_liquidacion)::VARCHAR(50) as ultimo_numero  -- CAST a VARCHAR(50)
    FROM public.liquidaciones l
    WHERE l.estado != 'anulada'
    GROUP BY l.barbero_id
  ),
  facturas_posteriores AS (
    SELECT 
      f.barbero_id,
      COUNT(*) as cantidad,
      SUM(f.total) as monto_total,
      SUM(f.comision_barbero) as comision_total
    FROM public.facturas f
    INNER JOIN ultima_liquidacion_por_barbero ul ON f.barbero_id = ul.barbero_id
    WHERE f.anulada = false
      AND f.liquidacion_id IS NULL
      AND DATE(f.created_at) > ul.ultima_fecha_liquidacion
    GROUP BY f.barbero_id
  )
  SELECT 
    b.id::UUID,
    (b.nombre || ' ' || b.apellido)::TEXT,
    b.email::VARCHAR(255),
    COALESCE(fp.cantidad, 0)::BIGINT,
    COALESCE(fp.monto_total, 0)::DECIMAL(10,2),
    b.porcentaje_comision::DECIMAL(5,2),
    COALESCE(fp.comision_total, 0)::DECIMAL(10,2),
    ul.ultimo_numero::VARCHAR(50),
    ul.ultima_fecha_liquidacion::DATE
  FROM public.barberos b
  LEFT JOIN ultima_liquidacion_por_barbero ul ON b.id = ul.barbero_id
  LEFT JOIN facturas_posteriores fp ON b.id = fp.barbero_id
  WHERE b.activo = true
    AND ul.barbero_id IS NOT NULL
    AND COALESCE(fp.cantidad, 0) > 0
  ORDER BY COALESCE(fp.monto_total, 0) DESC;
END;
$$;

COMMENT ON FUNCTION public.calcular_comisiones_proximo_periodo() IS 
'Calcula comisiones de ventas realizadas después de la última liquidación de cada barbero.';

-- =====================================================
-- ✅ PRUEBA
-- =====================================================

SELECT * FROM public.calcular_comisiones_proximo_periodo();

-- =====================================================
-- 📋 RESULTADO ESPERADO
-- =====================================================
-- | barbero_id | barbero_nombre | cantidad_ventas | monto_total | total_comision |
-- |------------|----------------|-----------------|-------------|----------------|
-- | xxx-xxx    | Carlos Pérez   | 1               | 18000.00    | 5400.00        |
-- =====================================================
