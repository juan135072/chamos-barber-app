BEGIN;
SET LOCAL lock_timeout='5s';
-- Objects stay owned by project_admin, like the rest of the schema.
SET LOCAL ROLE project_admin;

-- Sales keep their instant (timestamptz) and the database session runs in GMT, so
-- created_at::date was the UTC day: a sale charged after 20:00 (winter) or 21:00
-- (summer) in Chile counted for the next day in daily totals and liquidation
-- periods. Everything below uses the shop's local calendar day instead.
CREATE OR REPLACE FUNCTION public.app_local_date(p_ts timestamptz, p_comercio uuid) RETURNS date
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT (p_ts AT TIME ZONE COALESCE(
    (SELECT NULLIF(c.timezone, '') FROM public.comercios c WHERE c.id = p_comercio),
    'America/Santiago'))::date;
$$;
REVOKE ALL ON FUNCTION public.app_local_date(timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_local_date(timestamptz, uuid) TO authenticated, project_admin;

CREATE OR REPLACE FUNCTION public.calcular_comisiones_pendientes(p_barbero_id uuid, p_fecha_inicio date DEFAULT NULL::date, p_fecha_fin date DEFAULT NULL::date)
 RETURNS TABLE(total_ventas bigint, monto_total_vendido numeric, porcentaje_comision numeric, total_comision numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_porcentaje   NUMERIC;
  v_comercio     UUID;
  v_hoy          DATE;
  v_fecha_inicio DATE;
  v_fecha_fin    DATE;
BEGIN
  SELECT b.porcentaje_comision, b.comercio_id
  INTO   v_porcentaje, v_comercio
  FROM   public.barberos b
  WHERE  b.id = p_barbero_id;

  IF v_porcentaje IS NULL THEN
    v_porcentaje := 50.00;
  END IF;

  v_hoy          := public.app_local_date(now(), v_comercio);
  v_fecha_inicio := COALESCE(p_fecha_inicio, DATE_TRUNC('month', v_hoy)::DATE);
  v_fecha_fin    := COALESCE(p_fecha_fin, v_hoy);

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(f.total), 0),
    v_porcentaje,
    COALESCE(SUM(f.comision_barbero), 0)
  FROM public.facturas f
  WHERE f.barbero_id = p_barbero_id
    AND public.app_local_date(f.created_at, f.comercio_id) >= v_fecha_inicio
    AND public.app_local_date(f.created_at, f.comercio_id) <= v_fecha_fin
    AND f.anulada = false
    AND NOT EXISTS (
      SELECT 1
      FROM   public.liquidaciones l
      WHERE  l.barbero_id = p_barbero_id
        AND  l.estado = 'pagada'
        AND  public.app_local_date(f.created_at, f.comercio_id) >= l.fecha_inicio
        AND  public.app_local_date(f.created_at, f.comercio_id) <= l.fecha_fin
    );
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
    WHERE f.anulada = false
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

CREATE OR REPLACE FUNCTION public.crear_liquidacion(p_barbero_id uuid, p_fecha_inicio date, p_fecha_fin date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_comercio_id uuid;
  v_liquidacion_id uuid;
  v_numero_liquidacion varchar(50);
  v_total_ventas decimal(10,2);
  v_cantidad_servicios integer;
  v_porcentaje_comision decimal(5,2);
  v_total_comision decimal(10,2);
  v_facturas_ids uuid[];
BEGIN
  v_comercio_id := public.get_my_comercio_id();
  -- Runs with the owner's rights, so it enforces the same rule as the table policy.
  IF NOT public.app_has_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Solo un administrador puede crear liquidaciones';
  END IF;
  IF p_fecha_fin < p_fecha_inicio THEN
    RAISE EXCEPTION 'La fecha fin debe ser posterior a la fecha inicio';
  END IF;
  SELECT porcentaje_comision INTO v_porcentaje_comision
  FROM public.barberos
  WHERE id = p_barbero_id AND comercio_id = v_comercio_id AND activo = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barbero no encontrado, inactivo o no pertenece a tu comercio';
  END IF;
  SELECT COALESCE(COUNT(*), 0), COALESCE(SUM(total), 0), ARRAY_AGG(id)
  INTO v_cantidad_servicios, v_total_ventas, v_facturas_ids
  FROM public.facturas
  WHERE barbero_id = p_barbero_id AND comercio_id = v_comercio_id
    AND public.app_local_date(created_at, comercio_id) BETWEEN p_fecha_inicio AND p_fecha_fin
    AND anulada = false AND liquidacion_id IS NULL;
  IF v_cantidad_servicios = 0 OR v_total_ventas = 0 THEN
    RAISE EXCEPTION 'No hay ventas en el período seleccionado para liquidar';
  END IF;
  v_total_comision := (v_total_ventas * v_porcentaje_comision / 100);
  SELECT 'LIQ-' || LPAD((COUNT(*) + 1)::TEXT, 6, '0')
  INTO v_numero_liquidacion
  FROM public.liquidaciones WHERE comercio_id = v_comercio_id;
  INSERT INTO public.liquidaciones (
    numero_liquidacion, barbero_id, fecha_inicio, fecha_fin, total_ventas,
    cantidad_servicios, porcentaje_comision, total_comision, facturas_ids,
    estado, comercio_id, created_at
  ) VALUES (
    v_numero_liquidacion, p_barbero_id, p_fecha_inicio, p_fecha_fin, v_total_ventas,
    v_cantidad_servicios, v_porcentaje_comision, v_total_comision, v_facturas_ids,
    'pendiente', v_comercio_id, NOW()
  )
  RETURNING id INTO v_liquidacion_id;
  UPDATE public.facturas
  SET liquidacion_id = v_liquidacion_id, updated_at = NOW()
  WHERE id = ANY(v_facturas_ids) AND comercio_id = v_comercio_id;
  RETURN v_liquidacion_id;
END;
$function$;

-- These functions run with an empty search_path, so their unqualified call to
-- get_my_comercio_id() failed at runtime ("function get_my_comercio_id() does not
-- exist"): creating, numbering and paying a liquidation were all broken.
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
  SELECT total_comision INTO v_total_comision
  FROM public.liquidaciones
  WHERE id = p_liquidacion_id AND comercio_id = v_comercio_id AND estado = 'pendiente';
  IF v_total_comision IS NULL THEN
    RAISE EXCEPTION 'Liquidación no encontrada o ya pagada';
  END IF;
  v_total_pago := p_monto_efectivo + p_monto_transferencia;
  IF v_total_pago != v_total_comision THEN
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

CREATE OR REPLACE FUNCTION public.generar_numero_liquidacion()
 RETURNS character varying
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_comercio_id uuid;
  ultimo_numero integer;
BEGIN
  v_comercio_id := public.get_my_comercio_id();
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_liquidacion FROM '[0-9]+') AS INTEGER)), 0)
  INTO ultimo_numero
  FROM public.liquidaciones
  WHERE comercio_id = v_comercio_id AND numero_liquidacion ~ '^LIQ-[0-9]+$';
  RETURN 'LIQ-' || LPAD((ultimo_numero + 1)::TEXT, 6, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_numero_liquidacion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.numero_liquidacion IS NULL OR NEW.numero_liquidacion = '' THEN
    NEW.numero_liquidacion := public.generar_numero_liquidacion();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_slug(p_nombre text, p_apellido text, p_comercio_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := LOWER(REGEXP_REPLACE(p_nombre || '-' || p_apellido, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);
  final_slug := base_slug;

  IF p_comercio_id IS NULL THEN
    p_comercio_id := public.get_my_comercio_id();
  END IF;

  WHILE EXISTS (
    SELECT 1 FROM public.barberos
    WHERE slug = final_slug AND comercio_id = p_comercio_id
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$function$;

CREATE OR REPLACE FUNCTION public.obtener_clave_del_dia()
 RETURNS TABLE(clave character varying, fecha date, existe boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_comercio_id uuid;
  v_timezone text;
  v_fecha date;
BEGIN
  v_comercio_id := public.get_my_comercio_id();
  SELECT COALESCE(timezone, 'UTC') INTO v_timezone FROM public.comercios WHERE id = v_comercio_id;
  v_fecha := (now() AT TIME ZONE v_timezone)::date;

  RETURN QUERY
  SELECT cd.clave, cd.fecha, true
  FROM public.claves_diarias cd
  WHERE cd.fecha = v_fecha AND cd.activa = true AND cd.comercio_id = v_comercio_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::VARCHAR, v_fecha, false;
  END IF;
END;
$function$;

-- Leftover overloads that write columns the table does not have (monto_total_vendido,
-- creada_por, numero_transferencia, pagada_por), so they could never run. They also made
-- the calls from the panel ambiguous for the API ("could not choose the best candidate").
DROP FUNCTION IF EXISTS public.crear_liquidacion(uuid, date, date, uuid);
DROP FUNCTION IF EXISTS public.pagar_liquidacion(uuid, character varying, numeric, numeric, character varying, text, uuid);

-- Daily views by local day. security_invoker makes them obey the row-level security of
-- facturas, barberos and liquidaciones: before, the public anon key was enough to read
-- the daily sales of the shop and the commissions of each barber through them.
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
  WHERE f.anulada = false
  GROUP BY b.id, b.nombre, b.apellido, (public.app_local_date(f.created_at, f.comercio_id));

CREATE OR REPLACE VIEW public.cierre_caja_diario WITH (security_invoker = true) AS
 SELECT public.app_local_date(f.created_at, f.comercio_id) AS fecha,
    f.metodo_pago,
    count(f.id) AS cantidad_transacciones,
    COALESCE(sum(f.total), 0::numeric) AS total_cobrado,
    COALESCE(sum(f.comision_barbero), 0::numeric) AS total_comisiones,
    COALESCE(sum(f.ingreso_casa), 0::numeric) AS ingreso_neto_casa
   FROM public.facturas f
  WHERE f.anulada = false
  GROUP BY (public.app_local_date(f.created_at, f.comercio_id)), f.metodo_pago;

-- The old definition joined facturas and liquidaciones side by side, so every total was
-- multiplied by the number of rows on the other side (a barber with 4 liquidations showed
-- 4 times the real sales). Each side is aggregated on its own now.
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
            sum(f.comision_barbero) FILTER (WHERE NOT (EXISTS ( SELECT 1
                   FROM public.liquidaciones l
                  WHERE l.barbero_id = b.id AND l.estado::text = 'pagada'::text
                    AND public.app_local_date(f.created_at, f.comercio_id) >= l.fecha_inicio
                    AND public.app_local_date(f.created_at, f.comercio_id) <= l.fecha_fin))) AS comisiones_pendientes
           FROM public.facturas f
          WHERE f.barbero_id = b.id AND f.anulada = false) v ON true
     LEFT JOIN LATERAL ( SELECT sum(l.total_comision) FILTER (WHERE l.estado::text = 'pagada'::text) AS comisiones_pagadas,
            max(l.fecha_pago) AS ultima_liquidacion
           FROM public.liquidaciones l
          WHERE l.barbero_id = b.id) p ON true;

-- Staff list with permissions: only the server reads it, with the project key.
ALTER VIEW public.usuarios_con_permisos SET (security_invoker = true);

REVOKE ALL ON public.ventas_diarias_por_barbero, public.cierre_caja_diario, public.barberos_resumen, public.usuarios_con_permisos FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.ventas_diarias_por_barbero, public.cierre_caja_diario, public.barberos_resumen, public.usuarios_con_permisos FROM authenticated;

-- A backup copy that was readable by everyone, without row-level security.
ALTER TABLE public.comercios_bak_20261018 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.comercios_bak_20261018 FROM anon, authenticated;

RESET ROLE;
-- Created by an earlier migration under the database superuser.
ALTER FUNCTION public.app_normalize_email() OWNER TO project_admin;
COMMIT;
