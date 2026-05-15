-- =====================================================
-- 🔧 FIX: FUNCIÓN crear_liquidacion
-- =====================================================
-- Corrige el error: column "monto_total_vendido" does not exist
-- La columna correcta es "total_ventas" no "monto_total_vendido"
-- =====================================================

-- Eliminar la función existente si hay problemas
DROP FUNCTION IF EXISTS public.crear_liquidacion(UUID, DATE, DATE);

-- Recrear la función crear_liquidacion corregida
CREATE OR REPLACE FUNCTION public.crear_liquidacion(
  p_barbero_id UUID,
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_liquidacion_id UUID;
  v_numero_liquidacion VARCHAR(50);
  v_total_ventas DECIMAL(10,2);
  v_cantidad_servicios INTEGER;
  v_porcentaje_comision DECIMAL(5,2);
  v_total_comision DECIMAL(10,2);
  v_facturas_ids UUID[];
BEGIN
  -- Validar fechas
  IF p_fecha_fin < p_fecha_inicio THEN
    RAISE EXCEPTION 'La fecha fin debe ser posterior a la fecha inicio';
  END IF;

  -- Verificar que el barbero existe y está activo
  IF NOT EXISTS (
    SELECT 1 FROM public.barberos 
    WHERE id = p_barbero_id AND activo = true
  ) THEN
    RAISE EXCEPTION 'Barbero no encontrado o inactivo';
  END IF;

  -- Obtener el porcentaje de comisión del barbero
  SELECT porcentaje_comision INTO v_porcentaje_comision
  FROM public.barberos
  WHERE id = p_barbero_id;

  -- Calcular totales desde facturas
  SELECT 
    COALESCE(COUNT(*), 0),
    COALESCE(SUM(total), 0),
    ARRAY_AGG(id)
  INTO 
    v_cantidad_servicios,
    v_total_ventas,
    v_facturas_ids
  FROM public.facturas
  WHERE barbero_id = p_barbero_id
    AND fecha::DATE BETWEEN p_fecha_inicio AND p_fecha_fin
    AND estado = 'pagada'
    AND comision_pagada = false;

  -- Si no hay facturas, no crear liquidación
  IF v_cantidad_servicios = 0 OR v_total_ventas = 0 THEN
    RAISE EXCEPTION 'No hay ventas en el período seleccionado para liquidar';
  END IF;

  -- Calcular comisión
  v_total_comision := (v_total_ventas * v_porcentaje_comision / 100);

  -- Generar número de liquidación correlativo
  SELECT COALESCE(
    'LIQ-' || LPAD((COUNT(*) + 1)::TEXT, 6, '0'),
    'LIQ-000001'
  ) INTO v_numero_liquidacion
  FROM public.liquidaciones;

  -- Crear la liquidación
  INSERT INTO public.liquidaciones (
    numero_liquidacion,
    barbero_id,
    fecha_inicio,
    fecha_fin,
    total_ventas,
    cantidad_servicios,
    porcentaje_comision,
    total_comision,
    facturas_ids,
    estado,
    created_at
  ) VALUES (
    v_numero_liquidacion,
    p_barbero_id,
    p_fecha_inicio,
    p_fecha_fin,
    v_total_ventas,
    v_cantidad_servicios,
    v_porcentaje_comision,
    v_total_comision,
    v_facturas_ids,
    'pendiente',
    NOW()
  )
  RETURNING id INTO v_liquidacion_id;

  -- Marcar facturas como incluidas en liquidación
  UPDATE public.facturas
  SET 
    liquidacion_id = v_liquidacion_id,
    updated_at = NOW()
  WHERE id = ANY(v_facturas_ids);

  -- Log de éxito
  RAISE NOTICE 'Liquidación creada: % para barbero % con % facturas y comisión total $%', 
    v_numero_liquidacion, p_barbero_id, v_cantidad_servicios, v_total_comision;

  RETURN v_liquidacion_id;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION public.crear_liquidacion IS 
'Crea una nueva liquidación para un barbero en un período específico. 
Calcula automáticamente totales y comisiones desde las facturas pagadas.
Retorna el UUID de la liquidación creada.
CORREGIDO: Usa total_ventas en lugar de monto_total_vendido';

-- Verificar que la función existe
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'crear_liquidacion';

-- =====================================================
-- ✅ FUNCIÓN CORREGIDA
-- =====================================================
-- IMPORTANTE: Ejecutar este script en Supabase SQL Editor
-- Ir a: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- Pegar este contenido y ejecutar
-- =====================================================
