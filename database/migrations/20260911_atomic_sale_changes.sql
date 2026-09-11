BEGIN;
SET LOCAL lock_timeout='5s';
-- This shared trigger was attached to tables without an updated_at column,
-- causing valid cash movement updates to fail at runtime.
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
  IF to_jsonb(NEW) ? 'updated_at' THEN
    NEW:=jsonb_populate_record(NEW,jsonb_build_object('updated_at',now()));
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.app_change_sale(p_comercio uuid,p_invoice uuid,p_actor uuid,p_action text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE f public.facturas; item jsonb; product public.productos; movement public.movimientos_caja; new_total numeric; qty integer;
BEGIN
  SELECT * INTO f FROM public.facturas WHERE id=p_invoice AND comercio_id=p_comercio FOR UPDATE;
  IF NOT FOUND OR f.anulada IS TRUE THEN RAISE EXCEPTION 'Factura no disponible'; END IF;
  IF f.cierre_caja_id IS NOT NULL OR f.liquidacion_id IS NOT NULL THEN RAISE EXCEPTION 'La factura pertenece a un cierre o liquidación'; END IF;
  IF p_action NOT IN ('cancel','correct') THEN RAISE EXCEPTION 'Operación inválida'; END IF;
  new_total:=CASE WHEN p_action='cancel' THEN 0 ELSE (p_data->>'total')::numeric END;
  IF new_total IS NULL OR new_total<0 THEN RAISE EXCEPTION 'Monto inválido'; END IF;
  -- Lock related cash sessions and change the running total atomically.
  FOR movement IN SELECT * FROM public.movimientos_caja WHERE comercio_id=p_comercio
    AND tipo='venta' AND descripcion LIKE '%factura:'||f.id::text||'%' ORDER BY sesion_id FOR UPDATE
  LOOP
    PERFORM 1 FROM public.caja_sesiones WHERE id=movement.sesion_id AND estado='abierta' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'La sesión de caja ya está cerrada'; END IF;
    UPDATE public.caja_sesiones SET monto_final_esperado=monto_final_esperado+new_total-movement.monto WHERE id=movement.sesion_id;
    UPDATE public.movimientos_caja SET monto=new_total,
      descripcion=CASE WHEN p_action='cancel' THEN 'Venta anulada' ELSE 'Venta '||(p_data->>'metodo_pago') END||' - factura:'||f.id
      WHERE id=movement.id;
  END LOOP;
  IF p_action='cancel' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(f.items,'[]'::jsonb)) WHERE value->>'producto_id' IS NOT NULL ORDER BY value->>'producto_id'
    LOOP
      qty:=(item->>'cantidad')::integer;
      SELECT * INTO product FROM public.productos WHERE id=(item->>'producto_id')::uuid AND comercio_id=p_comercio FOR UPDATE;
      IF NOT FOUND OR qty IS NULL OR qty<1 THEN RAISE EXCEPTION 'Producto de la venta no disponible'; END IF;
      UPDATE public.productos SET stock_actual=stock_actual+qty WHERE id=product.id;
      INSERT INTO public.inventario_movimientos(producto_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo,referencia_id,created_by,comercio_id)
        VALUES(product.id,'entrada',qty,product.stock_actual,product.stock_actual+qty,'Anulación POS',f.id::text,p_actor,p_comercio);
    END LOOP;
    UPDATE public.facturas SET anulada=true,fecha_anulacion=now(),anulada_por=p_actor,motivo_anulacion=p_data->>'motivo',updated_at=now(),updated_by=p_actor WHERE id=f.id;
    UPDATE public.citas SET estado_pago='pendiente',updated_at=now() WHERE id=f.cita_id AND comercio_id=p_comercio;
  ELSE
    UPDATE public.facturas SET barbero_id=(p_data->>'barbero_id')::uuid,porcentaje_comision=(p_data->>'porcentaje_comision')::numeric,
      comision_barbero=(p_data->>'comision_barbero')::numeric,ingreso_casa=(p_data->>'ingreso_casa')::numeric,
      total=new_total,subtotal=(p_data->>'subtotal')::numeric,descuento=(p_data->>'descuento')::numeric,items=p_data->'items',
      metodo_pago=p_data->>'metodo_pago',monto_recibido=new_total,cambio=0,updated_at=now(),updated_by=p_actor WHERE id=f.id;
    UPDATE public.citas SET barbero_id=(p_data->>'barbero_id')::uuid,
      servicio_id=COALESCE(NULLIF(p_data->>'servicio_id','')::uuid,servicio_id),items=p_data->'items',
      precio_final=new_total,metodo_pago=p_data->>'metodo_pago',updated_at=now() WHERE id=f.cita_id AND comercio_id=p_comercio;
  END IF;
  RETURN jsonb_build_object('success',true,'total',new_total);
END $$;
REVOKE ALL ON FUNCTION public.app_change_sale(uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.app_change_sale(uuid,uuid,uuid,text,jsonb) TO project_admin;

CREATE OR REPLACE FUNCTION public.app_delete_unused_barber(p_comercio uuid,p_barber uuid) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  PERFORM 1 FROM public.barberos WHERE id=p_barber AND comercio_id=p_comercio FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Barbero no encontrado'; END IF;
  IF EXISTS(SELECT 1 FROM public.citas WHERE barbero_id=p_barber)
    OR EXISTS(SELECT 1 FROM public.facturas WHERE barbero_id=p_barber)
    OR EXISTS(SELECT 1 FROM public.liquidaciones WHERE barbero_id=p_barber)
    OR EXISTS(SELECT 1 FROM public.asistencias WHERE barbero_id=p_barber)
    OR EXISTS(SELECT 1 FROM public.notas_clientes WHERE barbero_id=p_barber)
    THEN RAISE EXCEPTION 'El barbero tiene historial. Desactívalo para conservar sus registros'; END IF;
  DELETE FROM public.horarios_atencion WHERE barbero_id=p_barber AND comercio_id=p_comercio;
  DELETE FROM public.horarios_bloqueados WHERE barbero_id=p_barber AND comercio_id=p_comercio;
  DELETE FROM public.admin_users WHERE barbero_id=p_barber AND comercio_id=p_comercio;
  DELETE FROM public.barberos WHERE id=p_barber AND comercio_id=p_comercio;
  RETURN jsonb_build_object('success',true);
END $$;
REVOKE ALL ON FUNCTION public.app_delete_unused_barber(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.app_delete_unused_barber(uuid,uuid) TO project_admin;
NOTIFY pgrst,'reload schema';
COMMIT;
