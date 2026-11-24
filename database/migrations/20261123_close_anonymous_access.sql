BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL ROLE project_admin;

-- These views ran with the owner's rights and were granted to anon, so the
-- public key embedded in the site was enough to read staff emails and phones,
-- each barber's commissions and the shop's daily sales. They now obey the
-- row-level security of the tables they read, and anon has no access to them.
ALTER VIEW public.usuarios_con_permisos SET (security_invoker = true);
ALTER VIEW public.barberos_resumen SET (security_invoker = true);
ALTER VIEW public.ventas_diarias_por_barbero SET (security_invoker = true);
ALTER VIEW public.cierre_caja_diario SET (security_invoker = true);
REVOKE ALL ON public.usuarios_con_permisos, public.barberos_resumen,
  public.ventas_diarias_por_barbero, public.cierre_caja_diario FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.usuarios_con_permisos, public.barberos_resumen,
  public.ventas_diarias_por_barbero, public.cierre_caja_diario FROM authenticated;

-- A backup copy that was readable by everyone, without row-level security.
ALTER TABLE public.comercios_bak_20261018 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.comercios_bak_20261018 FROM anon, authenticated;

-- Functions that run with the owner's rights and never check who calls them.
-- Only the server uses these three, with the project key.
REVOKE ALL ON FUNCTION public.get_barber_dashboard_metrics_v2(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.barbero_marco_hoy(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aprobar_solicitud_barbero(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_barber_dashboard_metrics_v2(uuid),
  public.barbero_marco_hoy(uuid), public.aprobar_solicitud_barbero(uuid, uuid) TO project_admin;

-- Staff functions: logged-in staff only. Each one checks the shop or the role itself.
REVOKE ALL ON FUNCTION public.calcular_comisiones_pendientes(uuid, date, date),
  public.calcular_comisiones_proximo_periodo(),
  public.crear_liquidacion(uuid, date, date),
  public.pagar_liquidacion(uuid, character varying, numeric, numeric, character varying, text),
  public.generar_numero_liquidacion(),
  public.obtener_clave_del_dia(),
  public.generate_slug(text, text),
  public.generate_slug(text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calcular_comisiones_pendientes(uuid, date, date),
  public.calcular_comisiones_proximo_periodo(),
  public.crear_liquidacion(uuid, date, date),
  public.pagar_liquidacion(uuid, character varying, numeric, numeric, character varying, text),
  public.generar_numero_liquidacion(),
  public.obtener_clave_del_dia(),
  public.generate_slug(text, text),
  public.generate_slug(text, text, uuid) TO authenticated, project_admin;

-- Anyone could call this and delete the cancelled appointments of every shop.
-- It now requires an admin and only touches the admin's own shop.
CREATE OR REPLACE FUNCTION public.eliminar_citas_canceladas()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_comercio_id uuid;
  v_filas_borradas integer;
BEGIN
  v_comercio_id := public.get_my_comercio_id();
  IF v_comercio_id IS NULL OR NOT public.app_has_role(ARRAY['admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo un administrador puede eliminar citas canceladas');
  END IF;

  UPDATE public.facturas
  SET cita_id = NULL
  WHERE comercio_id = v_comercio_id
    AND cita_id IN (SELECT id FROM public.citas WHERE estado = 'cancelada' AND comercio_id = v_comercio_id);

  DELETE FROM public.citas WHERE estado = 'cancelada' AND comercio_id = v_comercio_id;
  GET DIAGNOSTICS v_filas_borradas = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'count',   v_filas_borradas,
    'message', 'Se eliminaron ' || v_filas_borradas || ' citas canceladas.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
REVOKE ALL ON FUNCTION public.eliminar_citas_canceladas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eliminar_citas_canceladas() TO authenticated, project_admin;

RESET ROLE;
-- Created by an earlier migration under the database superuser.
ALTER FUNCTION public.app_normalize_email() OWNER TO project_admin;

NOTIFY pgrst, 'reload schema';
COMMIT;
