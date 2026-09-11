BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE public.facturas DROP CONSTRAINT IF EXISTS facturas_metodo_pago_check;
ALTER TABLE public.facturas ADD CONSTRAINT facturas_metodo_pago_check CHECK (metodo_pago IN ('efectivo','tarjeta','transferencia','zelle','binance','pago_movil','otro'));
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS caja_sesion_id uuid REFERENCES public.caja_sesiones(id);
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS venta_request_id uuid;
CREATE INDEX IF NOT EXISTS facturas_caja_sesion_idx ON public.facturas(caja_sesion_id);
CREATE UNIQUE INDEX IF NOT EXISTS facturas_request_id_idx ON public.facturas(comercio_id,venta_request_id) WHERE venta_request_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.app_record_sale(p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_comercio uuid := (p_data->>'comercio_id')::uuid;
  v_cita uuid := NULLIF(p_data->>'cita_id','')::uuid;
  v_num bigint; v_invoice public.facturas; v_item jsonb; v_product public.productos;
  v_quantity numeric; v_session uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('pos:'||v_comercio::text,0));
  IF p_data->>'request_id' IS NOT NULL THEN
    SELECT * INTO v_invoice FROM public.facturas WHERE comercio_id=v_comercio AND venta_request_id=(p_data->>'request_id')::uuid;
    IF FOUND THEN
      IF v_invoice.created_by<>(p_data->>'created_by')::uuid THEN RAISE EXCEPTION 'Solicitud de venta no disponible'; END IF;
      RETURN to_jsonb(v_invoice);
    END IF;
  END IF;
  SELECT id INTO v_session FROM public.caja_sesiones WHERE comercio_id=v_comercio
    AND usuario_id=(p_data->>'created_by')::uuid AND estado='abierta'
    AND NOT EXISTS(SELECT 1 FROM public.caja_sesiones newer WHERE newer.comercio_id=v_comercio AND newer.usuario_id=(p_data->>'created_by')::uuid AND newer.fecha_apertura>caja_sesiones.fecha_apertura)
    AND (NULLIF(p_data->>'caja_sesion_id','') IS NULL OR id=(p_data->>'caja_sesion_id')::uuid)
    ORDER BY fecha_apertura DESC LIMIT 1 FOR UPDATE;
  IF NULLIF(p_data->>'caja_sesion_id','') IS NOT NULL AND v_session IS NULL THEN RAISE EXCEPTION 'La caja del turno ya está cerrada'; END IF;
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

  INSERT INTO public.facturas(caja_sesion_id,venta_request_id,numero_factura,comercio_id,created_by,cajero_id,barbero_id,cita_id,
    cliente_nombre,cliente_rut,tipo_documento,items,subtotal,descuento,total,metodo_pago,
    monto_recibido,cambio,porcentaje_comision,comision_barbero,ingreso_casa)
  VALUES (v_session,NULLIF(p_data->>'request_id','')::uuid,'B-'||lpad(v_num::text,GREATEST(4,length(v_num::text)),'0'),v_comercio,
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
  IF v_session IS NOT NULL THEN
    UPDATE public.caja_sesiones SET monto_final_esperado=COALESCE(monto_final_esperado,monto_inicial,0)+CASE WHEN v_invoice.metodo_pago='efectivo' THEN v_invoice.total ELSE 0 END WHERE id=v_session;
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

CREATE OR REPLACE FUNCTION public.app_change_sale(p_comercio uuid,p_invoice uuid,p_actor uuid,p_action text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f public.facturas; item jsonb; product public.productos; movement public.movimientos_caja; new_total numeric; qty integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('pos:'||p_comercio::text,0));
  SELECT * INTO f FROM public.facturas WHERE id=p_invoice AND comercio_id=p_comercio FOR UPDATE;
  IF NOT FOUND OR f.anulada IS TRUE THEN RAISE EXCEPTION 'Factura no disponible'; END IF;
  IF p_data ? 'expected_updated_at' AND f.updated_at IS DISTINCT FROM (p_data->>'expected_updated_at')::timestamptz THEN RAISE EXCEPTION 'La venta cambió; actualiza el POS antes de corregirla'; END IF;
  IF f.cierre_caja_id IS NOT NULL OR f.liquidacion_id IS NOT NULL THEN RAISE EXCEPTION 'La factura pertenece a un cierre o liquidación'; END IF;
  IF p_action NOT IN ('cancel','correct') THEN RAISE EXCEPTION 'Operación inválida'; END IF;
  IF f.caja_sesion_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.caja_sesiones WHERE id=f.caja_sesion_id AND estado='abierta') THEN RAISE EXCEPTION 'La sesión de caja ya está cerrada'; END IF;
  new_total:=CASE WHEN p_action='cancel' THEN 0 ELSE (p_data->>'total')::numeric END;
  IF new_total IS NULL OR new_total<0 THEN RAISE EXCEPTION 'Monto inválido'; END IF;
  -- Lock related cash sessions and change the running total atomically.
  FOR movement IN SELECT * FROM public.movimientos_caja WHERE comercio_id=p_comercio
    AND tipo='venta' AND descripcion LIKE '%factura:'||f.id::text||'%' ORDER BY sesion_id FOR UPDATE
  LOOP
    PERFORM 1 FROM public.caja_sesiones WHERE id=movement.sesion_id AND estado='abierta' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'La sesión de caja ya está cerrada'; END IF;
    UPDATE public.caja_sesiones SET monto_final_esperado=COALESCE(monto_final_esperado,monto_inicial,0)+CASE WHEN p_action='correct' AND p_data->>'metodo_pago'='efectivo' THEN new_total ELSE 0 END-CASE WHEN f.metodo_pago='efectivo' THEN f.total ELSE 0 END WHERE id=movement.sesion_id;
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
    UPDATE public.citas SET estado_pago='pendiente',metodo_pago=NULL,updated_at=now() WHERE id=f.cita_id AND comercio_id=p_comercio;
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

CREATE OR REPLACE FUNCTION public.app_cash_register(p_comercio uuid,p_actor uuid,p_action text,p_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  s public.caja_sesiones; c public.cierres_caja; ids uuid[]; next_open timestamptz;
  amount numeric; expected numeric; sales numeric; commissions numeric; house numeric; methods jsonb;
BEGIN
  IF p_action NOT IN ('get','open','close') THEN RAISE EXCEPTION 'Operación de caja inválida'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.admin_users WHERE id=p_actor AND comercio_id=p_comercio AND activo AND rol IN ('admin','cajero')) THEN RAISE EXCEPTION 'Cajero no disponible'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('pos:'||p_comercio::text,0));
  SELECT * INTO s FROM public.caja_sesiones WHERE comercio_id=p_comercio AND usuario_id=p_actor AND estado='abierta'
    AND (p_action='close' OR NOT EXISTS(SELECT 1 FROM public.caja_sesiones newer WHERE newer.comercio_id=p_comercio AND newer.usuario_id=p_actor AND newer.fecha_apertura>caja_sesiones.fecha_apertura))
    AND (p_action<>'close' OR id=(p_data->>'sesion_id')::uuid)
    ORDER BY fecha_apertura DESC LIMIT 1 FOR UPDATE;
  IF p_action IN ('open','close') THEN
    amount:=(p_data->>'monto')::numeric;
    IF amount IS NULL OR amount<0 OR amount>100000000 OR amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Monto de caja inválido'; END IF;
  END IF;
  IF s.id IS NULL AND p_action='open' THEN
    INSERT INTO public.caja_sesiones(usuario_id,comercio_id,monto_inicial,monto_final_esperado,estado)
      VALUES(p_actor,p_comercio,amount,amount,'abierta') RETURNING * INTO s;
    INSERT INTO public.movimientos_caja(sesion_id,comercio_id,tipo,monto,descripcion)
      VALUES(s.id,p_comercio,'apertura',amount,'Fondo inicial de caja');
  ELSIF s.id IS NULL AND p_action='close' THEN
    RAISE EXCEPTION 'La caja del turno ya está cerrada';
  ELSIF s.id IS NULL THEN
    RETURN jsonb_build_object('sesion',NULL);
  END IF;
  -- Legacy sessions can overlap. Unlinked historical receipts are assigned only
  -- to their cashier's most recent opening before the receipt, never to peers.
  SELECT min(fecha_apertura) INTO next_open FROM public.caja_sesiones
    WHERE comercio_id=p_comercio AND usuario_id=p_actor AND fecha_apertura>s.fecha_apertura;
  SELECT COALESCE(array_agg(id),'{}'::uuid[]) INTO ids FROM public.facturas f
    WHERE f.comercio_id=p_comercio AND f.anulada IS NOT TRUE AND f.cierre_caja_id IS NULL
      AND (f.caja_sesion_id=s.id OR (f.caja_sesion_id IS NULL AND f.created_by=p_actor
        AND f.created_at>=s.fecha_apertura AND (next_open IS NULL OR f.created_at<next_open)));
  SELECT COALESCE(sum(total),0),COALESCE(sum(comision_barbero),0),COALESCE(sum(ingreso_casa),0)
    INTO sales,commissions,house FROM public.facturas WHERE id=ANY(ids);
  SELECT COALESCE(jsonb_object_agg(method,total),'{}'::jsonb) INTO methods
    FROM (SELECT COALESCE(metodo_pago,'otro') method,sum(total) total FROM public.facturas WHERE id=ANY(ids) GROUP BY metodo_pago) t;
  expected:=s.monto_inicial+COALESCE((methods->>'efectivo')::numeric,0);
  s.monto_final_esperado:=expected;
  IF p_action<>'close' THEN
    RETURN jsonb_build_object('sesion',to_jsonb(s),'total_ventas',sales,'total_comisiones',commissions,'total_casa',house,'metodos_pago',methods,'cantidad_ventas',cardinality(ids));
  END IF;
  INSERT INTO public.cierres_caja(fecha_inicio,fecha_fin,cajero_id,comercio_id,monto_apertura,monto_esperado_efectivo,
    monto_real_efectivo,total_ventas,total_comisiones,total_casa,metodos_pago,notas,estado)
    VALUES((s.fecha_apertura AT TIME ZONE 'America/Santiago')::date,(now() AT TIME ZONE 'America/Santiago')::date,p_actor,p_comercio,
      s.monto_inicial,expected,amount,sales,commissions,house,methods,NULLIF(left(p_data->>'notas',2000),''),'cerrada') RETURNING * INTO c;
  UPDATE public.facturas SET cierre_caja_id=c.id,caja_sesion_id=s.id WHERE id=ANY(ids);
  UPDATE public.caja_sesiones SET estado='cerrada',fecha_cierre=now(),monto_final=amount,monto_final_esperado=expected WHERE id=s.id RETURNING * INTO s;
  INSERT INTO public.movimientos_caja(sesion_id,comercio_id,tipo,monto,descripcion)
    VALUES(s.id,p_comercio,'cierre',amount,'Cierre Z-report '||c.id||'. Efectivo esperado: '||expected||'. Diferencia: '||(amount-expected));
  RETURN jsonb_build_object('sesion',to_jsonb(s),'cierre',to_jsonb(c),'facturasSelladas',cardinality(ids));
END $$;
REVOKE ALL ON FUNCTION public.app_cash_register(uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.app_cash_register(uuid,uuid,text,jsonb) TO project_admin;
CREATE OR REPLACE FUNCTION public.app_update_unpaid_appointment(p_comercio uuid,p_cita uuid,p_barbero uuid,p_servicio uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.citas; s public.servicios; v_items jsonb; item jsonb; changed boolean:=false; total numeric; qty integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('pos:'||p_comercio::text,0));
  SELECT * INTO c FROM public.citas WHERE id=p_cita AND comercio_id=p_comercio FOR UPDATE;
  IF NOT FOUND OR c.estado='cancelada' OR c.estado_pago='pagado' OR EXISTS(SELECT 1 FROM public.facturas WHERE cita_id=p_cita AND anulada IS NOT TRUE) THEN RAISE EXCEPTION 'La cita no está pendiente de cobro'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.barberos WHERE id=p_barbero AND comercio_id=p_comercio AND activo) THEN RAISE EXCEPTION 'Barbero no disponible'; END IF;
  SELECT * INTO s FROM public.servicios WHERE id=p_servicio AND comercio_id=p_comercio AND activo;
  IF NOT FOUND THEN RAISE EXCEPTION 'Servicio no disponible'; END IF;
  v_items:=COALESCE(c.items,'[]'::jsonb); total:=c.precio_final;
  IF c.servicio_id IS DISTINCT FROM p_servicio THEN
    v_items:='[]'::jsonb;
    FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(c.items,'[]'::jsonb)) LOOP
      IF NOT changed AND item->>'producto_id' IS NULL THEN
        qty:=COALESCE((item->>'cantidad')::integer,1);
        item:=jsonb_build_object('servicio_id',s.id,'tipo','servicio','nombre',s.nombre,'cantidad',qty,'precio',s.precio,'subtotal',s.precio*qty,'duracion_minutos',s.duracion_minutos,'tiempo_buffer',s.tiempo_buffer);
        changed:=true;
      END IF;
      v_items:=v_items||jsonb_build_array(item);
    END LOOP;
    IF NOT changed THEN v_items:=v_items||jsonb_build_array(jsonb_build_object('servicio_id',s.id,'tipo','servicio','nombre',s.nombre,'cantidad',1,'precio',s.precio,'subtotal',s.precio,'duracion_minutos',s.duracion_minutos,'tiempo_buffer',s.tiempo_buffer)); END IF;
    SELECT sum((value->>'precio')::numeric*(value->>'cantidad')::numeric) INTO total FROM jsonb_array_elements(v_items);
  END IF;
  UPDATE public.citas SET barbero_id=p_barbero,servicio_id=p_servicio,items=v_items,precio_final=total,updated_at=now() WHERE id=c.id;
  RETURN jsonb_build_object('success',true);
END $$;
REVOKE ALL ON FUNCTION public.app_update_unpaid_appointment(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.app_update_unpaid_appointment(uuid,uuid,uuid,uuid) TO project_admin;
-- Check the PIN without returning its value or depending on client read policies.
CREATE OR REPLACE FUNCTION public.app_verify_pos_pin(p_comercio uuid,p_pin text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p_pin IS NOT NULL AND EXISTS(SELECT 1 FROM public.sitio_configuracion WHERE comercio_id=p_comercio AND clave='pos_clave_seguridad' AND valor<>'' AND valor=p_pin);
$$;
REVOKE ALL ON FUNCTION public.app_verify_pos_pin(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.app_verify_pos_pin(uuid,text) TO project_admin;
NOTIFY pgrst,'reload schema';
COMMIT;
