-- Migration: Fix commission consistency
-- Date: 2025-12-28

-- 1. Standardize calcular_comisiones_factura to use barberos.porcentaje_comision directly
CREATE OR REPLACE FUNCTION public.calcular_comisiones_factura(
  p_barbero_id UUID,
  p_total DECIMAL
)
RETURNS TABLE (
  porcentaje DECIMAL(5,2),
  comision_barbero DECIMAL(10,2),
  ingreso_casa DECIMAL(10,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_porcentaje DECIMAL(5,2);
BEGIN
  -- Obtener porcentaje de comisión directamente de la tabla barberos
  SELECT COALESCE(porcentaje_comision, 50.00) INTO v_porcentaje
  FROM public.barberos
  WHERE id = p_barbero_id;

  -- Retornar cálculos
  RETURN QUERY
  SELECT
    v_porcentaje as porcentaje,
    ROUND(p_total * v_porcentaje / 100, 2) as comision_barbero,
    ROUND(p_total * (100 - v_porcentaje) / 100, 2) as ingreso_casa;
END;
$$;

-- 2. Update calcular_comisiones_pendientes to use the same source of truth
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
    AND NOT EXISTS (
      SELECT 1 FROM public.liquidaciones l
      WHERE f.id = ANY(l.facturas_ids)
        AND l.estado != 'anulada'
    )
    AND (p_fecha_inicio IS NULL OR DATE(f.created_at) >= p_fecha_inicio)
    AND (p_fecha_fin IS NULL OR DATE(f.created_at) <= p_fecha_fin)
  GROUP BY b.porcentaje_comision;
END;
$$;

-- 3. Optional: Drop redundant table if it's not being used by anything else
-- DROP TABLE IF EXISTS public.configuracion_comisiones;
