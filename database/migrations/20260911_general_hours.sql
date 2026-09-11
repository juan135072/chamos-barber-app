BEGIN;
SET LOCAL lock_timeout='5s';

CREATE OR REPLACE FUNCTION public.app_general_hours(p_comercio uuid,p_day integer)
RETURNS TABLE(opens time,closes time,is_open boolean,step integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  WITH config AS (SELECT COALESCE(jsonb_object_agg(clave,valor),'{}'::jsonb) c
    FROM public.sitio_configuracion WHERE comercio_id=p_comercio),
  day_config AS (SELECT c,CASE p_day WHEN 0 THEN 'horario_domingo' WHEN 6 THEN 'horario_sabado' ELSE 'horario' END prefix FROM config)
  SELECT COALESCE(NULLIF(c->>(prefix||'_apertura'),''),NULLIF(c->>'horario_apertura',''),'10:30')::time,
    COALESCE(NULLIF(c->>(prefix||'_cierre'),''),NULLIF(c->>'horario_cierre',''),'20:00')::time,
    p_day<>0 OR COALESCE(c->>'horario_domingo_activo','false')='true',
    GREATEST(5,LEAST(120,COALESCE(NULLIF(c->>'intervalo_citas',''),'30')::integer)) FROM day_config;
$$;

CREATE OR REPLACE FUNCTION public.app_sync_general_hours(p_comercio uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
  INSERT INTO public.horarios_atencion(barbero_id,comercio_id,dia_semana,hora_inicio,hora_fin,activo)
    SELECT b.id,b.comercio_id,d,h.opens,h.closes,true FROM public.barberos b
    CROSS JOIN generate_series(0,6) d CROSS JOIN LATERAL public.app_general_hours(p_comercio,d) h
    WHERE b.comercio_id=p_comercio
  ON CONFLICT(barbero_id,dia_semana) DO UPDATE SET hora_inicio=excluded.hora_inicio,hora_fin=excluded.hora_fin,updated_at=now();
  -- Leave each barber's existing active flag, pause and dated blocks intact.
END $$;
REVOKE ALL ON FUNCTION public.app_sync_general_hours(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.app_sync_general_hours(uuid) TO project_admin;

CREATE OR REPLACE FUNCTION public.app_new_barber_hours() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
  INSERT INTO public.horarios_atencion(barbero_id,comercio_id,dia_semana,hora_inicio,hora_fin,activo)
    SELECT NEW.id,NEW.comercio_id,d,h.opens,h.closes,true FROM generate_series(0,6) d
    CROSS JOIN LATERAL public.app_general_hours(NEW.comercio_id,d) h;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS app_new_barber_hours ON public.barberos;
CREATE TRIGGER app_new_barber_hours AFTER INSERT ON public.barberos FOR EACH ROW EXECUTE FUNCTION public.app_new_barber_hours();

CREATE OR REPLACE FUNCTION public.app_save_settings(p_comercio uuid,p_values jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE h record;
BEGIN
  IF jsonb_typeof(p_values)<>'object' THEN RAISE EXCEPTION 'Configuración inválida'; END IF;
  PERFORM 1 FROM public.comercios WHERE id=p_comercio FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comercio no encontrado'; END IF;
  INSERT INTO public.sitio_configuracion(clave,valor,comercio_id,publico)
    SELECT key,value,p_comercio,key<>'pos_clave_seguridad' FROM jsonb_each_text(p_values)
  ON CONFLICT(clave,comercio_id) DO UPDATE SET valor=excluded.valor,publico=excluded.publico,updated_at=now();
  FOR h IN SELECT * FROM generate_series(0,6) d CROSS JOIN LATERAL public.app_general_hours(p_comercio,d) LOOP
    IF h.opens>=h.closes THEN RAISE EXCEPTION 'La hora de cierre debe ser posterior a la apertura'; END IF;
  END LOOP;
  IF p_values ? 'sitio_timezone' THEN
    UPDATE public.comercios SET timezone=p_values->>'sitio_timezone' WHERE id=p_comercio;
  END IF;
  PERFORM public.app_sync_general_hours(p_comercio);
END $$;
REVOKE ALL ON FUNCTION public.app_save_settings(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.app_save_settings(uuid,jsonb) TO project_admin;

-- Public configuration previously exposed the POS authorization PIN.
UPDATE public.sitio_configuracion SET publico=false WHERE clave='pos_clave_seguridad';
DROP POLICY IF EXISTS app_private_settings_anon ON public.sitio_configuracion;
CREATE POLICY app_private_settings_anon ON public.sitio_configuracion AS RESTRICTIVE FOR SELECT TO anon
  USING(publico IS TRUE AND clave<>'pos_clave_seguridad');
DROP POLICY IF EXISTS app_private_settings_staff ON public.sitio_configuracion;
CREATE POLICY app_private_settings_staff ON public.sitio_configuracion AS RESTRICTIVE FOR SELECT TO authenticated
  USING((publico IS TRUE AND clave<>'pos_clave_seguridad') OR
    (comercio_id=public.get_my_comercio_id() AND public.app_has_role(ARRAY['admin']::text[])));
DO $$ DECLARE action text; BEGIN
  FOREACH action IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.horarios_atencion','app_role_'||lower(action));
    EXECUTE format('CREATE POLICY %I ON public.horarios_atencion AS RESTRICTIVE FOR %s TO authenticated %s %s',
      'app_role_'||lower(action),action,
      CASE WHEN action IN ('UPDATE','DELETE') THEN 'USING(public.app_has_role(ARRAY[''admin'']::text[]))' ELSE '' END,
      CASE WHEN action IN ('INSERT','UPDATE') THEN 'WITH CHECK(public.app_has_role(ARRAY[''admin'']::text[]))' ELSE '' END);
  END LOOP;
END $$;

-- Availability uses the same weekday, Saturday and Sunday settings as the site.
CREATE OR REPLACE FUNCTION public.get_horarios_disponibles(p_barbero_id uuid,p_fecha date,p_duracion_minutos integer DEFAULT 30)
RETURNS TABLE(hora text,disponible boolean,motivo text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_tenant uuid; v_tz text; v_open time; v_close time; v_step integer; v_is_open boolean;
BEGIN
  IF p_duracion_minutos<1 OR p_duracion_minutos>1440 THEN RAISE EXCEPTION 'Duración inválida'; END IF;
  SELECT b.comercio_id,COALESCE(c.timezone,'America/Santiago') INTO v_tenant,v_tz FROM public.barberos b
    JOIN public.comercios c ON c.id=b.comercio_id WHERE b.id=p_barbero_id AND b.activo IS TRUE AND c.activo IS TRUE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT h.opens,h.closes,h.step,h.is_open INTO v_open,v_close,v_step,v_is_open
    FROM public.app_general_hours(v_tenant,extract(dow FROM p_fecha)::integer) h;
  IF NOT v_is_open THEN RETURN; END IF;
  RETURN QUERY WITH slots AS (
    SELECT t AS starts,t+make_interval(mins=>p_duracion_minutos) AS ends
    FROM generate_series(p_fecha+v_open,p_fecha+v_close-interval '1 minute',make_interval(mins=>v_step)) t
  ), evaluated AS (
    SELECT s.starts, CASE
      WHEN s.starts<=now() AT TIME ZONE v_tz THEN 'Horario pasado'
      WHEN s.ends>p_fecha+v_close OR NOT EXISTS(SELECT 1 FROM public.horarios_atencion h
        WHERE h.barbero_id=p_barbero_id AND h.activo IS TRUE AND h.dia_semana=extract(dow FROM p_fecha)
          AND s.starts>=p_fecha+h.hora_inicio AND s.ends<=p_fecha+h.hora_fin) THEN 'Fuera de horario'
      WHEN EXISTS(SELECT 1 FROM public.horarios_atencion h WHERE h.barbero_id=p_barbero_id
        AND h.dia_semana=extract(dow FROM p_fecha) AND h.pausa_inicio IS NOT NULL AND h.pausa_fin IS NOT NULL
        AND s.starts<p_fecha+h.pausa_fin AND s.ends>p_fecha+h.pausa_inicio) THEN 'Descanso'
      WHEN EXISTS(SELECT 1 FROM public.citas c WHERE c.barbero_id=p_barbero_id AND c.fecha=p_fecha
        AND c.estado IN ('pendiente','confirmada') AND c.fecha+c.hora<s.ends
        AND c.fecha+c.hora+make_interval(mins=>public.app_appointment_duration(c.items,c.servicio_id))>s.starts) THEN 'Ocupado'
      WHEN EXISTS(SELECT 1 FROM public.horarios_bloqueados b WHERE b.barbero_id=p_barbero_id
        AND b.fecha_hora_inicio AT TIME ZONE v_tz<s.ends AND b.fecha_hora_fin AT TIME ZONE v_tz>s.starts) THEN 'Bloqueado'
      ELSE NULL END AS reason FROM slots s
  ) SELECT to_char(e.starts,'HH24:MI'),e.reason IS NULL,COALESCE(e.reason,'Disponible') FROM evaluated e ORDER BY e.starts;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
