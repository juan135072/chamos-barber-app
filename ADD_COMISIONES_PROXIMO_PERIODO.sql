-- =====================================================
-- 📊 FUNCIÓN: Calcular Comisiones del Próximo Período
-- =====================================================
-- Esta función calcula las comisiones de ventas que se hicieron
-- DESPUÉS de crear la última liquidación.
-- Útil para mostrar "Comisiones del Próximo Período" en el panel.
-- =====================================================

CREATE OR REPLACE FUNCTION public.calcular_comisiones_proximo_periodo()
RETURNS TABLE (
  barbero_id UUID,
  barbero_nombre TEXT,
  barbero_email TEXT,
  cantidad_ventas BIGINT,
  monto_total DECIMAL(10,2),
  porcentaje_comision DECIMAL(5,2),
  total_comision DECIMAL(10,2),
  ultima_liquidacion_numero TEXT,
  ultima_liquidacion_fecha DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH ultima_liquidacion_por_barbero AS (
    -- Obtener la última liquidación de cada barbero
    SELECT 
      l.barbero_id,
      MAX(l.fecha_fin) as ultima_fecha_liquidacion,
      MAX(l.numero_liquidacion) as ultimo_numero
    FROM public.liquidaciones l
    WHERE l.estado != 'anulada'
    GROUP BY l.barbero_id
  ),
  facturas_posteriores AS (
    -- Obtener facturas creadas DESPUÉS de la última liquidación
    SELECT 
      f.barbero_id,
      COUNT(*) as cantidad,
      SUM(f.total) as monto_total,
      SUM(f.comision_barbero) as comision_total,
      AVG(f.porcentaje_comision) as porcentaje_promedio
    FROM public.facturas f
    INNER JOIN ultima_liquidacion_por_barbero ul ON f.barbero_id = ul.barbero_id
    WHERE f.anulada = false
      AND f.liquidacion_id IS NULL
      AND DATE(f.created_at) > ul.ultima_fecha_liquidacion
    GROUP BY f.barbero_id
  )
  SELECT 
    b.id as barbero_id,
    (b.nombre || ' ' || b.apellido) as barbero_nombre,
    b.email as barbero_email,
    COALESCE(fp.cantidad, 0) as cantidad_ventas,
    COALESCE(fp.monto_total, 0) as monto_total,
    b.porcentaje_comision as porcentaje_comision,
    COALESCE(fp.comision_total, 0) as total_comision,
    ul.ultimo_numero as ultima_liquidacion_numero,
    ul.ultima_fecha_liquidacion as ultima_liquidacion_fecha
  FROM public.barberos b
  LEFT JOIN ultima_liquidacion_por_barbero ul ON b.id = ul.barbero_id
  LEFT JOIN facturas_posteriores fp ON b.id = fp.barbero_id
  WHERE b.activo = true
    AND ul.barbero_id IS NOT NULL -- Solo barberos con al menos una liquidación
    AND COALESCE(fp.cantidad, 0) > 0 -- Solo barberos con ventas posteriores
  ORDER BY fp.monto_total DESC;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION public.calcular_comisiones_proximo_periodo() IS 
'Calcula comisiones de ventas realizadas después de la última liquidación de cada barbero. 
Útil para mostrar "Comisiones del Próximo Período" en el panel de administración.';

-- =====================================================
-- ✅ PRUEBA DE LA FUNCIÓN
-- =====================================================

-- Ejecutar la función para ver resultados
SELECT * FROM public.calcular_comisiones_proximo_periodo();

-- =====================================================
-- 📋 RESULTADO ESPERADO
-- =====================================================
-- Deberías ver algo como:
-- 
-- | barbero_id | barbero_nombre | cantidad_ventas | monto_total | total_comision | ultima_liquidacion_numero |
-- |------------|----------------|-----------------|-------------|----------------|---------------------------|
-- | xxx-xxx    | Carlos Pérez   | 1               | 18000.00    | 5400.00        | LIQ-000001                |
-- 
-- Si no hay ventas posteriores a liquidaciones, retorna 0 filas (correcto).
-- =====================================================
