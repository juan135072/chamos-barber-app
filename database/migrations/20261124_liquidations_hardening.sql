BEGIN;
SET LOCAL lock_timeout='5s';
-- Objects stay owned by project_admin, like the rest of the schema.
SET LOCAL ROLE project_admin;

-- Follow-ups from the independent verification of 20261123_sales_local_dates.sql.

-- 1. A barber who left (deactivated) still has unpaid commissions: creating the
--    liquidation no longer requires the barber to be active.
-- 2. Creation takes the same lock as the POS writers (app_record_sale,
--    app_change_sale), so a sale can't be voided or corrected between reading
--    it and linking it, and it links only what it read.
-- 3. Voided sales are matched with IS NOT TRUE, like the POS does.
CREATE OR REPLACE FUNCTION public.crear_liquidacion(p_barbero_id uuid, p_fecha_inicio date, p_fecha_fin date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_comercio_id uuid;
  v_liquidacion_id uuid;
  v_total_ventas numeric(10,2);
  v_cantidad_servicios integer;
  v_total_comision numeric(10,2);
  v_porcentaje numeric(5,2);
  v_facturas_ids uuid[];
  v_enlazadas integer;
BEGIN
  v_comercio_id := public.get_my_comercio_id();
  IF NOT public.app_has_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Solo un administrador puede crear liquidaciones';
  END IF;
  IF p_fecha_fin < p_fecha_inicio THEN
    RAISE EXCEPTION 'La fecha fin debe ser posterior a la fecha inicio';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('pos:' || v_comercio_id::text, 0));
  PERFORM 1 FROM public.barberos
  WHERE id = p_barbero_id AND comercio_id = v_comercio_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barbero no encontrado o no pertenece a tu comercio';
  END IF;
  SELECT COUNT(*), COALESCE(SUM(total), 0), COALESCE(SUM(comision_barbero), 0), ARRAY_AGG(id)
  INTO v_cantidad_servicios, v_total_ventas, v_total_comision, v_facturas_ids
  FROM public.facturas
  WHERE barbero_id = p_barbero_id AND comercio_id = v_comercio_id
    AND public.app_local_date(created_at, comercio_id) BETWEEN p_fecha_inicio AND p_fecha_fin
    AND anulada IS NOT TRUE AND liquidacion_id IS NULL;
  IF v_cantidad_servicios = 0 OR v_total_ventas = 0 THEN
    RAISE EXCEPTION 'No hay ventas en el período seleccionado para liquidar';
  END IF;
  v_porcentaje := ROUND(100 * v_total_comision / v_total_ventas, 2);
  INSERT INTO public.liquidaciones (
    numero_liquidacion, barbero_id, fecha_inicio, fecha_fin, total_ventas,
    cantidad_servicios, porcentaje_comision, total_comision, facturas_ids,
    estado, comercio_id, creado_por, created_at
  ) VALUES (
    public.generar_numero_liquidacion(), p_barbero_id, p_fecha_inicio, p_fecha_fin, v_total_ventas,
    v_cantidad_servicios, v_porcentaje, v_total_comision, v_facturas_ids,
    'pendiente', v_comercio_id, auth.uid(), NOW()
  )
  RETURNING id INTO v_liquidacion_id;
  UPDATE public.facturas
  SET liquidacion_id = v_liquidacion_id, updated_at = NOW()
  WHERE id = ANY(v_facturas_ids) AND comercio_id = v_comercio_id
    AND anulada IS NOT TRUE AND liquidacion_id IS NULL;
  GET DIAGNOSTICS v_enlazadas = ROW_COUNT;
  IF v_enlazadas <> v_cantidad_servicios THEN
    RAISE EXCEPTION 'Las ventas cambiaron mientras se creaba la liquidación. Inténtalo de nuevo.';
  END IF;
  RETURN v_liquidacion_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_comisiones_pendientes(p_barbero_id uuid, p_fecha_inicio date DEFAULT NULL::date, p_fecha_fin date DEFAULT NULL::date)
 RETURNS TABLE(total_ventas bigint, monto_total_vendido numeric, porcentaje_comision numeric, total_comision numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_comercio     UUID;
  v_hoy          DATE;
  v_fecha_inicio DATE;
  v_fecha_fin    DATE;
BEGIN
  SELECT b.comercio_id INTO v_comercio FROM public.barberos b WHERE b.id = p_barbero_id;

  v_hoy          := public.app_local_date(now(), v_comercio);
  v_fecha_inicio := COALESCE(p_fecha_inicio, DATE_TRUNC('month', v_hoy)::DATE);
  v_fecha_fin    := COALESCE(p_fecha_fin, v_hoy);

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(f.total), 0),
    -- Effective percentage of the period: recorded commissions over sales.
    CASE WHEN COALESCE(SUM(f.total), 0) > 0
         THEN ROUND(100 * COALESCE(SUM(f.comision_barbero), 0) / SUM(f.total), 2)
         ELSE 0::numeric END,
    COALESCE(SUM(f.comision_barbero), 0)
  FROM public.facturas f
  WHERE f.barbero_id = p_barbero_id
    AND f.anulada IS NOT TRUE
    AND f.liquidacion_id IS NULL
    AND public.app_local_date(f.created_at, f.comercio_id) >= v_fecha_inicio
    AND public.app_local_date(f.created_at, f.comercio_id) <= v_fecha_fin;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_comisiones_proximo_periodo()
 RETURNS TABLE(barbero_id uuid, barbero_nombre text, barbero_email character varying, cantidad_ventas bigint, monto_total numeric, porcentaje_comision numeric, total_comision numeric, ultima_liquidacion_numero character varying, ultima_liquidacion_fecha date)
 LANGUAGE plpgsql
 STABLE
AS $function$
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
    WHERE f.anulada IS NOT TRUE
      AND f.liquidacion_id IS NULL
      AND public.app_local_date(f.created_at, f.comercio_id) > ul.ultima_fecha
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
$function$;

-- 4. Paying compared the amounts with !=, so a null amount skipped the check
--    and marked the liquidation paid. Null and negative amounts are refused.
CREATE OR REPLACE FUNCTION public.pagar_liquidacion(p_liquidacion_id uuid, p_metodo_pago character varying, p_monto_efectivo numeric DEFAULT 0, p_monto_transferencia numeric DEFAULT 0, p_numero_transferencia character varying DEFAULT NULL::character varying, p_notas text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_comercio_id uuid;
  v_total_comision numeric;
  v_total_pago numeric;
BEGIN
  v_comercio_id := public.get_my_comercio_id();
  IF NOT public.app_has_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Solo un administrador puede pagar liquidaciones';
  END IF;
  IF p_monto_efectivo IS NULL OR p_monto_transferencia IS NULL
     OR p_monto_efectivo < 0 OR p_monto_transferencia < 0 THEN
    RAISE EXCEPTION 'Los montos del pago no son válidos';
  END IF;
  SELECT total_comision INTO v_total_comision
  FROM public.liquidaciones
  WHERE id = p_liquidacion_id AND comercio_id = v_comercio_id AND estado = 'pendiente'
  FOR UPDATE;
  IF v_total_comision IS NULL THEN
    RAISE EXCEPTION 'Liquidación no encontrada o ya pagada';
  END IF;
  v_total_pago := p_monto_efectivo + p_monto_transferencia;
  IF v_total_pago IS DISTINCT FROM v_total_comision THEN
    RAISE EXCEPTION 'El monto (%) no coincide con la comisión (%)', v_total_pago, v_total_comision;
  END IF;
  UPDATE public.liquidaciones SET
    estado = 'pagada', metodo_pago = p_metodo_pago,
    monto_efectivo = p_monto_efectivo, monto_transferencia = p_monto_transferencia,
    referencia_transferencia = p_numero_transferencia, fecha_pago = NOW(),
    notas = COALESCE(NULLIF(btrim(p_notas), ''), notas),
    pagado_por = auth.uid(), updated_at = NOW()
  WHERE id = p_liquidacion_id AND comercio_id = v_comercio_id;
  RETURN true;
END;
$function$;

-- 5. The numbering trigger ran with the owner's rights and the caller's search_path.
CREATE OR REPLACE FUNCTION public.set_numero_liquidacion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.numero_liquidacion IS NULL OR NEW.numero_liquidacion = '' THEN
    NEW.numero_liquidacion := public.generar_numero_liquidacion();
  END IF;
  RETURN NEW;
END;
$function$;

-- 6. A sale is pending while it has no liquidation, so the sales of an annulled
--    liquidation must be released, or they could never be liquidated again.
--    Deleting a liquidation already releases them (ON DELETE SET NULL).
CREATE OR REPLACE FUNCTION public.app_liberar_ventas_liquidacion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
BEGIN
  UPDATE public.facturas SET liquidacion_id = NULL, updated_at = now()
  WHERE liquidacion_id = NEW.id;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.app_liberar_ventas_liquidacion() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS app_liberar_ventas_anulada ON public.liquidaciones;
CREATE TRIGGER app_liberar_ventas_anulada AFTER UPDATE OF estado ON public.liquidaciones
  FOR EACH ROW WHEN (NEW.estado = 'anulada' AND OLD.estado IS DISTINCT FROM 'anulada')
  EXECUTE FUNCTION public.app_liberar_ventas_liquidacion();

-- Views: the same IS NOT TRUE test for voided sales.
CREATE OR REPLACE VIEW public.ventas_diarias_por_barbero WITH (security_invoker = true) AS
 SELECT b.id AS barbero_id,
    (b.nombre::text || ' '::text) || b.apellido::text AS barbero_nombre,
    public.app_local_date(f.created_at, f.comercio_id) AS fecha,
    count(f.id) AS total_ventas,
    COALESCE(sum(f.total), 0::numeric) AS total_ingresos,
    COALESCE(sum(f.comision_barbero), 0::numeric) AS total_comision,
    COALESCE(sum(f.ingreso_casa), 0::numeric) AS total_casa,
    COALESCE(avg(f.porcentaje_comision), 0::numeric) AS porcentaje_promedio
   FROM public.barberos b
     JOIN public.facturas f ON b.id = f.barbero_id
  WHERE f.anulada IS NOT TRUE
  GROUP BY b.id, b.nombre, b.apellido, (public.app_local_date(f.created_at, f.comercio_id));

CREATE OR REPLACE VIEW public.cierre_caja_diario WITH (security_invoker = true) AS
 SELECT public.app_local_date(f.created_at, f.comercio_id) AS fecha,
    f.metodo_pago,
    count(f.id) AS cantidad_transacciones,
    COALESCE(sum(f.total), 0::numeric) AS total_cobrado,
    COALESCE(sum(f.comision_barbero), 0::numeric) AS total_comisiones,
    COALESCE(sum(f.ingreso_casa), 0::numeric) AS ingreso_neto_casa
   FROM public.facturas f
  WHERE f.anulada IS NOT TRUE
  GROUP BY (public.app_local_date(f.created_at, f.comercio_id)), f.metodo_pago;

CREATE OR REPLACE VIEW public.barberos_resumen WITH (security_invoker = true) AS
 SELECT b.id,
    b.nombre,
    b.apellido,
    b.email,
    b.telefono,
    b.activo,
    b.porcentaje_comision,
    COALESCE(v.total_ventas, 0::bigint) AS total_ventas,
    COALESCE(v.total_vendido, 0::numeric) AS total_vendido,
    COALESCE(v.comisiones_generadas, 0::numeric) AS comisiones_generadas,
    COALESCE(v.comisiones_pendientes, 0::numeric) AS comisiones_pendientes,
    COALESCE(p.comisiones_pagadas, 0::numeric) AS comisiones_pagadas,
    p.ultima_liquidacion
   FROM public.barberos b
     LEFT JOIN LATERAL ( SELECT count(*) AS total_ventas,
            sum(f.total) AS total_vendido,
            sum(f.comision_barbero) AS comisiones_generadas,
            sum(f.comision_barbero) FILTER (WHERE f.liquidacion_id IS NULL) AS comisiones_pendientes
           FROM public.facturas f
          WHERE f.barbero_id = b.id AND f.anulada IS NOT TRUE) v ON true
     LEFT JOIN LATERAL ( SELECT sum(l.total_comision) FILTER (WHERE l.estado::text = 'pagada'::text) AS comisiones_pagadas,
            max(l.fecha_pago) AS ultima_liquidacion
           FROM public.liquidaciones l
          WHERE l.barbero_id = b.id) p ON true;

NOTIFY pgrst, 'reload schema';
COMMIT;
