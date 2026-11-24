BEGIN;
SET LOCAL lock_timeout='5s';
-- Objects stay owned by project_admin, like the rest of the schema.
SET LOCAL ROLE project_admin;

-- Follow-ups from the review of the liquidation migrations.

-- 1. Annulling a liquidation released its sales from any state. For a PAID one
--    that made the same sales pending again, so they could be paid twice. Only
--    an unpaid liquidation releases its sales; undoing a paid one means deleting
--    it on purpose (ON DELETE SET NULL then frees the sales).
DROP TRIGGER IF EXISTS app_liberar_ventas_anulada ON public.liquidaciones;
CREATE TRIGGER app_liberar_ventas_anulada AFTER UPDATE OF estado ON public.liquidaciones
  FOR EACH ROW WHEN (NEW.estado = 'anulada' AND OLD.estado = 'pendiente')
  EXECUTE FUNCTION public.app_liberar_ventas_liquidacion();

-- 2. The "next period" listing kept its own rule (sales dated after the last
--    liquidation, active barbers only), so it hid pending sales the rest of the
--    module shows. It follows the single rule now: not voided and no liquidation.
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
  WHERE COALESCE(fp.cantidad, 0) > 0
  ORDER BY COALESCE(fp.monto, 0) DESC;
END;
$function$;

-- 3. The numbering trigger asked the caller's session for the shop, so an insert
--    without a staff session got no shop and always the first number. It numbers
--    within the shop of the row being inserted.
CREATE OR REPLACE FUNCTION public.set_numero_liquidacion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  ultimo_numero integer;
BEGIN
  IF NEW.numero_liquidacion IS NULL OR NEW.numero_liquidacion = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_liquidacion FROM '[0-9]+') AS INTEGER)), 0)
    INTO ultimo_numero
    FROM public.liquidaciones
    WHERE comercio_id = NEW.comercio_id AND numero_liquidacion ~ '^LIQ-[0-9]+$';
    NEW.numero_liquidacion := 'LIQ-' || LPAD((ultimo_numero + 1)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. The daily key: only admin and cashier may read it through this function
--    (the API route already limits it to them), and "today" is the same local
--    day the sales use.
CREATE OR REPLACE FUNCTION public.obtener_clave_del_dia()
 RETURNS TABLE(clave character varying, fecha date, existe boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_comercio_id uuid;
  v_fecha date;
BEGIN
  v_comercio_id := public.get_my_comercio_id();
  IF v_comercio_id IS NULL OR NOT public.app_has_role(ARRAY['admin', 'cajero']) THEN
    RAISE EXCEPTION 'Solo administración o caja puede ver la clave del día';
  END IF;
  v_fecha := public.app_local_date(now(), v_comercio_id);

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

-- 5. Post-conditions of the access closure, checked on every run: REVOKE only
--    warns when it cannot act, so this is what proves anon stayed out.
RESET ROLE;
DO $$
DECLARE
  v_obj text;
BEGIN
  FOREACH v_obj IN ARRAY ARRAY['public.usuarios_con_permisos', 'public.barberos_resumen',
    'public.ventas_diarias_por_barbero', 'public.cierre_caja_diario'] LOOP
    IF has_table_privilege('anon', v_obj, 'SELECT') THEN
      RAISE EXCEPTION 'anon can still read %', v_obj;
    END IF;
  END LOOP;
  FOREACH v_obj IN ARRAY ARRAY[
    'public.crear_liquidacion(uuid, date, date)',
    'public.pagar_liquidacion(uuid, character varying, numeric, numeric, character varying, text)',
    'public.calcular_comisiones_pendientes(uuid, date, date)',
    'public.calcular_comisiones_proximo_periodo()',
    'public.obtener_clave_del_dia()',
    'public.eliminar_citas_canceladas()',
    'public.get_barber_dashboard_metrics_v2(uuid)',
    'public.aprobar_solicitud_barbero(uuid, uuid)',
    'public.barbero_marco_hoy(uuid)',
    'public.app_local_date(timestamp with time zone, uuid)'] LOOP
    IF has_function_privilege('anon', v_obj, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon can still execute %', v_obj;
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
