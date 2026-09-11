BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS public.app_invoice_counters (
  comercio_id uuid PRIMARY KEY REFERENCES public.comercios(id), last_number bigint NOT NULL
);
REVOKE ALL ON public.app_invoice_counters FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_invoice_counters TO project_admin;
ALTER TABLE public.app_invoice_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_admin_policy ON public.app_invoice_counters;
CREATE POLICY project_admin_policy ON public.app_invoice_counters TO project_admin USING(true) WITH CHECK(true);

CREATE OR REPLACE FUNCTION public.app_record_sale(p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_comercio uuid := (p_data->>'comercio_id')::uuid;
  v_cita uuid := NULLIF(p_data->>'cita_id','')::uuid;
  v_num bigint; v_invoice public.facturas; v_item jsonb; v_product public.productos;
  v_quantity numeric; v_session uuid;
BEGIN
  IF v_cita IS NOT NULL THEN
    PERFORM 1 FROM public.citas WHERE id=v_cita AND comercio_id=v_comercio
      AND barbero_id=(p_data->>'barbero_id')::uuid AND estado<>'cancelada' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cita no disponible'; END IF;
    IF EXISTS(SELECT 1 FROM public.facturas WHERE cita_id=v_cita AND comercio_id=v_comercio AND anulada IS NOT TRUE)
      THEN RAISE EXCEPTION 'Cita ya cobrada'; END IF;
  END IF;
  INSERT INTO public.app_invoice_counters(comercio_id,last_number)
    SELECT v_comercio,COALESCE(MAX(substring(numero_factura FROM '^B-([0-9]+)$')::bigint),0)+1
    FROM public.facturas WHERE comercio_id=v_comercio
  ON CONFLICT(comercio_id) DO UPDATE SET last_number=GREATEST(public.app_invoice_counters.last_number+1,EXCLUDED.last_number)
  RETURNING last_number INTO v_num;

  INSERT INTO public.facturas(numero_factura,comercio_id,created_by,cajero_id,barbero_id,cita_id,
    cliente_nombre,cliente_rut,tipo_documento,items,subtotal,descuento,total,metodo_pago,
    monto_recibido,cambio,porcentaje_comision,comision_barbero,ingreso_casa)
  VALUES ('B-'||lpad(v_num::text,GREATEST(4,length(v_num::text)),'0'),v_comercio,
    (p_data->>'created_by')::uuid,(p_data->>'cajero_id')::uuid,(p_data->>'barbero_id')::uuid,v_cita,
    p_data->>'cliente_nombre',p_data->>'cliente_rut',p_data->>'tipo_documento',p_data->'items',
    (p_data->>'subtotal')::numeric,(p_data->>'descuento')::numeric,(p_data->>'total')::numeric,p_data->>'metodo_pago',
    (p_data->>'monto_recibido')::numeric,(p_data->>'cambio')::numeric,(p_data->>'porcentaje_comision')::numeric,
    (p_data->>'comision_barbero')::numeric,(p_data->>'ingreso_casa')::numeric) RETURNING * INTO v_invoice;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_data->'items') WHERE value->>'producto_id' IS NOT NULL ORDER BY value->>'producto_id'
  LOOP
    v_quantity := (v_item->>'cantidad')::numeric;
    IF v_quantity<=0 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
    SELECT * INTO v_product FROM public.productos WHERE id=(v_item->>'producto_id')::uuid AND comercio_id=v_comercio AND activo IS TRUE FOR UPDATE;
    IF NOT FOUND OR v_product.stock_actual<v_quantity THEN RAISE EXCEPTION 'Stock insuficiente'; END IF;
    UPDATE public.productos SET stock_actual=stock_actual-v_quantity WHERE id=v_product.id;
    INSERT INTO public.inventario_movimientos(producto_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo,created_by,comercio_id)
      VALUES(v_product.id,'salida',v_quantity,v_product.stock_actual,v_product.stock_actual-v_quantity,
        'Venta POS - Factura '||v_invoice.numero_factura,(p_data->>'created_by')::uuid,v_comercio);
  END LOOP;
  SELECT id INTO v_session FROM public.caja_sesiones WHERE comercio_id=v_comercio
    AND usuario_id=(p_data->>'created_by')::uuid AND estado='abierta'
    ORDER BY fecha_apertura DESC LIMIT 1 FOR UPDATE;
  IF v_session IS NOT NULL THEN
    UPDATE public.caja_sesiones SET monto_final_esperado=monto_final_esperado+v_invoice.total WHERE id=v_session;
    INSERT INTO public.movimientos_caja(sesion_id,comercio_id,tipo,monto,descripcion)
      VALUES(v_session,v_comercio,'venta',v_invoice.total,'Venta '||v_invoice.metodo_pago||' - factura:'||v_invoice.id);
  END IF;
  IF v_cita IS NOT NULL THEN
    UPDATE public.citas SET estado='completada',estado_pago='pagado',metodo_pago=p_data->>'metodo_pago',
      precio_final=(p_data->>'total')::numeric,
      notas_tecnicas=CASE WHEN p_data ? 'notas_tecnicas' THEN p_data->>'notas_tecnicas' ELSE notas_tecnicas END,
      foto_resultado_url=CASE WHEN p_data ? 'foto_resultado_url' THEN p_data->>'foto_resultado_url' ELSE foto_resultado_url END
      WHERE id=v_cita AND comercio_id=v_comercio;
  END IF;
  RETURN to_jsonb(v_invoice);
END $$;
REVOKE ALL ON FUNCTION public.app_record_sale(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.app_record_sale(jsonb) TO project_admin;
NOTIFY pgrst,'reload schema';
COMMIT;
