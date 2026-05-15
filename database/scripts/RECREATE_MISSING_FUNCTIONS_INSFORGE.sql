-- ================================================================
-- Recreate missing PostgreSQL functions in InsForge
-- All 6 functions were lost during Supabase -> InsForge migration
-- Run once against the InsForge Postgres instance
-- ================================================================

-- 1. calcular_comisiones_factura
-- 2. calcular_comisiones_pendientes
-- 3. calcular_comisiones_proximo_periodo
-- 4. crear_liquidacion
-- 5. pagar_liquidacion
-- 6. get_barber_dashboard_metrics_v2 (reconstructed from TypeScript types)
-- ================================================================

BEGIN;

-- ================================================================
-- 1. calcular_comisiones_factura
-- Used by: CobrarForm.tsx (src + caja) to preview commission split
-- Params: barbero UUID + sale total
-- Returns: table(porcentaje, comision_barbero, ingreso_casa)
-- ================================================================

DROP FUNCTION IF EXISTS public.calcular_comisiones_factura(UUID, DECIMAL);

CREATE OR REPLACE FUNCTION public.calcular_comisiones_factura(
  p_barbero_id UUID,
  p_total      DECIMAL
)
RETURNS TABLE (
  porcentaje       DECIMAL(5,2),
  comision_barbero DECIMAL(10,2),
  ingreso_casa     DECIMAL(10,2)
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_porcentaje DECIMAL(5,2);
BEGIN
  SELECT COALESCE(porcentaje_comision, 50.00)
  INTO   v_porcentaje
  FROM   public.barberos
  WHERE  id = p_barbero_id;

  IF v_porcentaje IS NULL THEN
    v_porcentaje := 50.00;
  END IF;

  RETURN QUERY
  SELECT
    v_porcentaje,
    ROUND(p_total * v_porcentaje / 100, 2),
    ROUND(p_total * (100 - v_porcentaje) / 100, 2);
END;
$$;

GRANT EXECUTE ON FUNCTION public.calcular_comisiones_factura(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_comisiones_factura(UUID, DECIMAL) TO anon;

-- ================================================================
-- 2. calcular_comisiones_pendientes
-- Used by: supabase-liquidaciones.ts to compute unpaid commissions
-- Returns: table(total_ventas, monto_total_vendido, porcentaje_comision, total_comision)
-- ================================================================

DROP FUNCTION IF EXISTS public.calcular_comisiones_pendientes(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION public.calcular_comisiones_pendientes(
  p_barbero_id   UUID,
  p_fecha_inicio DATE DEFAULT NULL,
  p_fecha_fin    DATE DEFAULT NULL
)
RETURNS TABLE (
  total_ventas       BIGINT,
  monto_total_vendido NUMERIC,
  porcentaje_comision NUMERIC,
  total_comision     NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_porcentaje   NUMERIC;
  v_fecha_inicio DATE;
  v_fecha_fin    DATE;
BEGIN
  SELECT porcentaje_comision
  INTO   v_porcentaje
  FROM   public.barberos
  WHERE  id = p_barbero_id;

  IF v_porcentaje IS NULL THEN
    v_porcentaje := 50.00;
  END IF;

  v_fecha_inicio := COALESCE(p_fecha_inicio, DATE_TRUNC('month', CURRENT_DATE)::DATE);
  v_fecha_fin    := COALESCE(p_fecha_fin, CURRENT_DATE);

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(f.total), 0),
    v_porcentaje,
    COALESCE(SUM(f.comision_barbero), 0)
  FROM public.facturas f
  WHERE f.barbero_id = p_barbero_id
    AND f.created_at::DATE >= v_fecha_inicio
    AND f.created_at::DATE <= v_fecha_fin
    AND f.anulada = false
    AND NOT EXISTS (
      SELECT 1
      FROM   public.liquidaciones l
      WHERE  l.barbero_id = p_barbero_id
        AND  l.estado = 'pagada'
        AND  f.created_at::DATE >= l.fecha_inicio
        AND  f.created_at::DATE <= l.fecha_fin
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calcular_comisiones_pendientes(UUID, DATE, DATE) TO authenticated;

-- ================================================================
-- 3. calcular_comisiones_proximo_periodo
-- Used by: supabase-liquidaciones.ts for admin panel overview
-- Returns: per-barber rows of pending commissions after last settlement
-- ================================================================

DROP FUNCTION IF EXISTS public.calcular_comisiones_proximo_periodo();

CREATE OR REPLACE FUNCTION public.calcular_comisiones_proximo_periodo()
RETURNS TABLE (
  barbero_id               UUID,
  barbero_nombre           TEXT,
  barbero_email            VARCHAR(255),
  cantidad_ventas          BIGINT,
  monto_total              DECIMAL(10,2),
  porcentaje_comision      DECIMAL(5,2),
  total_comision           DECIMAL(10,2),
  ultima_liquidacion_numero VARCHAR(50),
  ultima_liquidacion_fecha DATE
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH ultima_liq AS (
    SELECT
      l.barbero_id,
      MAX(l.fecha_fin)            AS ultima_fecha,
      MAX(l.numero_liquidacion)::VARCHAR(50) AS ultimo_numero
    FROM public.liquidaciones l
    WHERE l.estado != 'anulada'
    GROUP BY l.barbero_id
  ),
  facturas_post AS (
    SELECT
      f.barbero_id,
      COUNT(*)         AS cantidad,
      SUM(f.total)     AS monto,
      SUM(f.comision_barbero) AS comision
    FROM public.facturas f
    JOIN ultima_liq ul ON f.barbero_id = ul.barbero_id
    WHERE f.anulada = false
      AND f.liquidacion_id IS NULL
      AND DATE(f.created_at) > ul.ultima_fecha
    GROUP BY f.barbero_id
  )
  SELECT
    b.id::UUID,
    (b.nombre || ' ' || b.apellido)::TEXT,
    b.email::VARCHAR(255),
    COALESCE(fp.cantidad, 0)::BIGINT,
    COALESCE(fp.monto, 0)::DECIMAL(10,2),
    b.porcentaje_comision::DECIMAL(5,2),
    COALESCE(fp.comision, 0)::DECIMAL(10,2),
    ul.ultimo_numero::VARCHAR(50),
    ul.ultima_fecha::DATE
  FROM public.barberos b
  JOIN ultima_liq ul ON b.id = ul.barbero_id
  LEFT JOIN facturas_post fp ON b.id = fp.barbero_id
  WHERE b.activo = true
    AND COALESCE(fp.cantidad, 0) > 0
  ORDER BY COALESCE(fp.monto, 0) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calcular_comisiones_proximo_periodo() TO authenticated;

-- ================================================================
-- 4. crear_liquidacion
-- Used by: supabase-liquidaciones.ts to create a new settlement
-- Returns: UUID of the created liquidacion
-- ================================================================

DROP FUNCTION IF EXISTS public.crear_liquidacion(UUID, DATE, DATE, UUID);

CREATE OR REPLACE FUNCTION public.crear_liquidacion(
  p_barbero_id   UUID,
  p_fecha_inicio DATE,
  p_fecha_fin    DATE,
  p_created_by   UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id         UUID;
  v_comisiones RECORD;
BEGIN
  SELECT * INTO v_comisiones
  FROM calcular_comisiones_pendientes(p_barbero_id, p_fecha_inicio, p_fecha_fin);

  IF v_comisiones.total_ventas = 0 THEN
    RAISE EXCEPTION 'No hay ventas pendientes de liquidar en este período';
  END IF;

  INSERT INTO public.liquidaciones (
    barbero_id, fecha_inicio, fecha_fin,
    total_ventas, monto_total_vendido,
    porcentaje_comision, total_comision,
    estado, creada_por
  ) VALUES (
    p_barbero_id, p_fecha_inicio, p_fecha_fin,
    v_comisiones.total_ventas, v_comisiones.monto_total_vendido,
    v_comisiones.porcentaje_comision, v_comisiones.total_comision,
    'pendiente', COALESCE(p_created_by, auth.uid())
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_liquidacion(UUID, DATE, DATE, UUID) TO authenticated;

-- ================================================================
-- 5. pagar_liquidacion
-- Used by: supabase-liquidaciones.ts to mark a settlement as paid
-- Returns: BOOLEAN (true on success)
-- ================================================================

DROP FUNCTION IF EXISTS public.pagar_liquidacion(UUID, VARCHAR, NUMERIC, NUMERIC, VARCHAR, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.pagar_liquidacion(
  p_liquidacion_id       UUID,
  p_metodo_pago          VARCHAR,
  p_monto_efectivo       NUMERIC DEFAULT 0,
  p_monto_transferencia  NUMERIC DEFAULT 0,
  p_numero_transferencia VARCHAR DEFAULT NULL,
  p_notas                TEXT    DEFAULT NULL,
  p_pagada_por           UUID    DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_comision NUMERIC;
BEGIN
  SELECT total_comision
  INTO   v_total_comision
  FROM   public.liquidaciones
  WHERE  id = p_liquidacion_id AND estado = 'pendiente';

  IF v_total_comision IS NULL THEN
    RAISE EXCEPTION 'Liquidación no encontrada o ya pagada';
  END IF;

  IF (p_monto_efectivo + p_monto_transferencia) != v_total_comision THEN
    RAISE EXCEPTION 'El monto del pago (%) no coincide con la comisión (%)',
      (p_monto_efectivo + p_monto_transferencia), v_total_comision;
  END IF;

  UPDATE public.liquidaciones
  SET
    estado               = 'pagada',
    metodo_pago          = p_metodo_pago,
    monto_efectivo       = p_monto_efectivo,
    monto_transferencia  = p_monto_transferencia,
    numero_transferencia = p_numero_transferencia,
    fecha_pago           = NOW(),
    notas                = p_notas,
    pagada_por           = COALESCE(p_pagada_por, auth.uid()),
    updated_at           = NOW()
  WHERE id = p_liquidacion_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pagar_liquidacion(UUID, VARCHAR, NUMERIC, NUMERIC, VARCHAR, TEXT, UUID) TO authenticated;

-- ================================================================
-- 6. get_barber_dashboard_metrics_v2
-- Used by: /api/barbero/metricas.ts and useMetricasDiarias.ts
-- Reconstructed from TypeScript MetricasDiarias interface
-- Returns: JSONB { hoy, semana, mes }
-- Note: citas table uses separate fecha (DATE) + hora (TIME) columns
-- ================================================================

DROP FUNCTION IF EXISTS public.get_barber_dashboard_metrics_v2(UUID);

CREATE OR REPLACE FUNCTION public.get_barber_dashboard_metrics_v2(
  p_barbero_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_tz               TEXT := 'America/Santiago';
  v_today            DATE;
  v_week_start       DATE;
  v_month_start      DATE;
  v_hoy_ganancia     NUMERIC(10,2);
  v_hoy_total_citas  BIGINT;
  v_hoy_completadas  BIGINT;
  v_hoy_pendientes   BIGINT;
  v_semana_ganancia  NUMERIC(10,2);
  v_mes_ganancia     NUMERIC(10,2);
  v_mes_servicios    BIGINT;
BEGIN
  v_today       := (NOW() AT TIME ZONE v_tz)::DATE;
  v_week_start  := DATE_TRUNC('week',  v_today)::DATE;
  v_month_start := DATE_TRUNC('month', v_today)::DATE;

  -- Citas stats for today (citas.fecha is DATE column)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE estado = 'completada'),
    COUNT(*) FILTER (WHERE estado IN ('pendiente', 'confirmada'))
  INTO v_hoy_total_citas, v_hoy_completadas, v_hoy_pendientes
  FROM public.citas
  WHERE barbero_id = p_barbero_id
    AND fecha = v_today;

  -- Today's earnings: facturas linked to this barbero directly or via their citas
  SELECT COALESCE(SUM(f.comision_barbero), 0)
  INTO   v_hoy_ganancia
  FROM   public.facturas f
  LEFT JOIN public.citas c ON f.cita_id = c.id
  WHERE  f.anulada = false
    AND  (f.barbero_id = p_barbero_id OR c.barbero_id = p_barbero_id)
    AND  (f.created_at AT TIME ZONE v_tz)::DATE = v_today;

  -- This week's earnings
  SELECT COALESCE(SUM(f.comision_barbero), 0)
  INTO   v_semana_ganancia
  FROM   public.facturas f
  LEFT JOIN public.citas c ON f.cita_id = c.id
  WHERE  f.anulada = false
    AND  (f.barbero_id = p_barbero_id OR c.barbero_id = p_barbero_id)
    AND  (f.created_at AT TIME ZONE v_tz)::DATE BETWEEN v_week_start AND v_today;

  -- This month's earnings and service count
  SELECT
    COALESCE(SUM(f.comision_barbero), 0),
    COUNT(f.id)
  INTO v_mes_ganancia, v_mes_servicios
  FROM   public.facturas f
  LEFT JOIN public.citas c ON f.cita_id = c.id
  WHERE  f.anulada = false
    AND  (f.barbero_id = p_barbero_id OR c.barbero_id = p_barbero_id)
    AND  (f.created_at AT TIME ZONE v_tz)::DATE BETWEEN v_month_start AND v_today;

  RETURN jsonb_build_object(
    'hoy', jsonb_build_object(
      'ganancia',    v_hoy_ganancia,
      'total_citas', v_hoy_total_citas,
      'completadas', v_hoy_completadas,
      'pendientes',  v_hoy_pendientes
    ),
    'semana', jsonb_build_object(
      'ganancia', v_semana_ganancia
    ),
    'mes', jsonb_build_object(
      'ganancia',       v_mes_ganancia,
      'total_servicios', v_mes_servicios
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_barber_dashboard_metrics_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_barber_dashboard_metrics_v2(UUID) TO anon;

COMMIT;

-- ================================================================
-- Verification: confirm all 6 functions exist after running
-- ================================================================
SELECT
  proname                              AS function_name,
  pg_get_function_arguments(oid)       AS arguments,
  pg_get_function_result(oid)          AS returns
FROM pg_proc
WHERE proname IN (
  'calcular_comisiones_factura',
  'calcular_comisiones_pendientes',
  'calcular_comisiones_proximo_periodo',
  'crear_liquidacion',
  'pagar_liquidacion',
  'get_barber_dashboard_metrics_v2'
)
ORDER BY proname;
