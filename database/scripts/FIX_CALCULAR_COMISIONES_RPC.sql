-- ================================================================
-- 🔧 FIX: Función RPC calcular_comisiones_factura
-- ================================================================
--
-- PROBLEMA: 
-- El POS intenta llamar a calcular_comisiones_factura() pero puede no existir
--
-- SOLUCIÓN:
-- Crear la función RPC que el frontend espera
-- ================================================================

-- Eliminar función anterior si existe
DROP FUNCTION IF EXISTS public.calcular_comisiones_factura(UUID, DECIMAL);
DROP FUNCTION IF EXISTS public.calcular_comisiones_factura(p_barbero_id UUID, p_total DECIMAL);

-- Crear función para calcular comisiones
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
  -- Obtener porcentaje de comisión del barbero
  SELECT porcentaje_comision INTO v_porcentaje
  FROM public.barberos
  WHERE id = p_barbero_id;
  
  -- Si no se encuentra el barbero, usar 50% por defecto
  IF v_porcentaje IS NULL THEN
    v_porcentaje := 50.00;
  END IF;
  
  -- Retornar cálculos
  RETURN QUERY
  SELECT 
    v_porcentaje as porcentaje,
    ROUND(p_total * v_porcentaje / 100, 2) as comision_barbero,
    ROUND(p_total * (100 - v_porcentaje) / 100, 2) as ingreso_casa;
END;
$$;

-- Dar permisos
GRANT EXECUTE ON FUNCTION public.calcular_comisiones_factura(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_comisiones_factura(UUID, DECIMAL) TO anon;

-- ================================================================
-- VERIFICACIÓN
-- ================================================================

-- Probar la función con los barberos existentes
SELECT 
  b.nombre,
  b.apellido,
  b.porcentaje_comision,
  c.*
FROM public.barberos b,
LATERAL calcular_comisiones_factura(b.id, 15000) c
WHERE b.activo = true;

-- ================================================================
-- 📋 RESUMEN
-- ================================================================
-- ✅ Función calcular_comisiones_factura() creada
-- ✅ Usa el porcentaje personalizado de cada barbero
-- ✅ Permisos otorgados a authenticated y anon
-- ================================================================
