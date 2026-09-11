BEGIN;
SET LOCAL lock_timeout='5s';

CREATE OR REPLACE FUNCTION public.app_appointment_duration(p_items jsonb,p_service uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT COALESCE((
    SELECT (sum(COALESCE(NULLIF(i->>'duracion_minutos','')::numeric,s.duracion_minutos,30)*
      GREATEST(COALESCE(NULLIF(i->>'cantidad','')::numeric,1),1))+
      max(COALESCE(NULLIF(i->>'tiempo_buffer','')::numeric,s.tiempo_buffer,5)))::integer
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_items)='array' THEN p_items ELSE '[]'::jsonb END) i
    LEFT JOIN public.servicios s ON s.id::text=i->>'servicio_id'
    WHERE i->>'servicio_id' IS NOT NULL
  ),(SELECT duracion_minutos+COALESCE(tiempo_buffer,5) FROM public.servicios WHERE id=p_service),35);
$$;

CREATE OR REPLACE FUNCTION public.app_guard_appointment_overlap() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_start timestamp; v_end timestamp;
BEGIN
  IF NEW.barbero_id IS NULL OR NEW.estado NOT IN ('pendiente','confirmada') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND (NEW.barbero_id,NEW.fecha,NEW.hora,NEW.estado,NEW.items,NEW.servicio_id)
    IS NOT DISTINCT FROM (OLD.barbero_id,OLD.fecha,OLD.hora,OLD.estado,OLD.items,OLD.servicio_id) THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.barbero_id::text),NEW.fecha-DATE '2000-01-01');
  v_start:=NEW.fecha+NEW.hora;
  v_end:=v_start+make_interval(mins=>public.app_appointment_duration(NEW.items,NEW.servicio_id));
  IF EXISTS(SELECT 1 FROM public.citas c WHERE c.barbero_id=NEW.barbero_id AND c.fecha=NEW.fecha
    AND c.id IS DISTINCT FROM NEW.id AND c.estado IN ('pendiente','confirmada')
    AND c.fecha+c.hora<v_end AND c.fecha+c.hora+make_interval(mins=>public.app_appointment_duration(c.items,c.servicio_id))>v_start)
    THEN RAISE EXCEPTION 'El horario se solapa con otra reserva' USING ERRCODE='23P01'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS app_guard_appointment_overlap ON public.citas;
CREATE TRIGGER app_guard_appointment_overlap BEFORE INSERT OR UPDATE ON public.citas
FOR EACH ROW EXECUTE FUNCTION public.app_guard_appointment_overlap();

-- Cancelled appointments must not permanently occupy a start time.
ALTER TABLE public.citas DROP CONSTRAINT IF EXISTS citas_comercio_barbero_fecha_hora_key;
ALTER TABLE public.citas DROP CONSTRAINT IF EXISTS citas_barbero_id_fecha_hora_unique;
CREATE UNIQUE INDEX IF NOT EXISTS citas_active_start_unique ON public.citas(barbero_id,fecha,hora)
WHERE estado IN ('pendiente','confirmada');

CREATE OR REPLACE FUNCTION public.get_horarios_disponibles(p_barbero_id uuid,p_fecha date,p_duracion_minutos integer DEFAULT 30)
RETURNS TABLE(hora text,disponible boolean,motivo text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_tenant uuid; v_tz text; v_open time; v_close time; v_step integer;
BEGIN
  IF p_duracion_minutos<1 OR p_duracion_minutos>1440 THEN RAISE EXCEPTION 'Duración inválida'; END IF;
  SELECT b.comercio_id,COALESCE(c.timezone,'America/Santiago') INTO v_tenant,v_tz FROM public.barberos b
    JOIN public.comercios c ON c.id=b.comercio_id WHERE b.id=p_barbero_id AND b.activo IS TRUE AND c.activo IS TRUE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT COALESCE(max(NULLIF(valor,'')) FILTER(WHERE clave='horario_apertura'),'09:00')::time,
    COALESCE(max(NULLIF(valor,'')) FILTER(WHERE clave='horario_cierre'),'19:00')::time,
    GREATEST(COALESCE(max(NULLIF(valor,'')) FILTER(WHERE clave='intervalo_citas'),'30')::integer,5)
    INTO v_open,v_close,v_step FROM public.sitio_configuracion WHERE comercio_id=v_tenant;
  RETURN QUERY WITH slots AS (
    SELECT t AS starts,t+make_interval(mins=>p_duracion_minutos) AS ends
    FROM generate_series(p_fecha+v_open,p_fecha+v_close-interval '1 minute',make_interval(mins=>v_step)) t
  ), evaluated AS (
    SELECT s.starts, CASE
      WHEN s.starts<=now() AT TIME ZONE v_tz THEN 'Horario pasado'
      WHEN s.ends>p_fecha+v_close OR NOT EXISTS(SELECT 1 FROM public.horarios_atencion h
        WHERE h.barbero_id=p_barbero_id AND h.activo IS TRUE AND h.dia_semana=extract(dow FROM p_fecha)
          AND s.starts>=p_fecha+h.hora_inicio AND s.ends<=p_fecha+h.hora_fin) THEN 'Fuera de horario'
      WHEN EXISTS(SELECT 1 FROM public.citas c WHERE c.barbero_id=p_barbero_id AND c.fecha=p_fecha
        AND c.estado IN ('pendiente','confirmada') AND c.fecha+c.hora<s.ends
        AND c.fecha+c.hora+make_interval(mins=>public.app_appointment_duration(c.items,c.servicio_id))>s.starts) THEN 'Ocupado'
      WHEN EXISTS(SELECT 1 FROM public.horarios_bloqueados b WHERE b.barbero_id=p_barbero_id
        AND b.fecha_hora_inicio AT TIME ZONE v_tz<s.ends AND b.fecha_hora_fin AT TIME ZONE v_tz>s.starts) THEN 'Bloqueado'
      ELSE NULL END AS reason FROM slots s
  ) SELECT to_char(e.starts,'HH24:MI'),e.reason IS NULL,COALESCE(e.reason,'Disponible') FROM evaluated e ORDER BY e.starts;
END $$;
CREATE OR REPLACE FUNCTION public.get_horarios_disponibles(barbero_id_param uuid,fecha_param date)
RETURNS TABLE(hora text,disponible boolean,motivo text)
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT * FROM public.get_horarios_disponibles(barbero_id_param,fecha_param,30);
$$;

-- The previous body called an unqualified function despite an empty search_path.
CREATE OR REPLACE FUNCTION public.ubicacion_es_valida(p_latitud numeric,p_longitud numeric,p_ubicacion_id uuid)
RETURNS TABLE(es_valida boolean,distancia integer,radio_permitido integer)
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT d.metros<=u.radio_permitido,d.metros,u.radio_permitido FROM public.ubicaciones_barberia u
    CROSS JOIN LATERAL (SELECT public.calcular_distancia_metros(p_latitud,p_longitud,u.latitud,u.longitud)::integer metros) d
  WHERE u.id=p_ubicacion_id AND u.activa IS TRUE AND u.comercio_id=public.get_my_comercio_id()
    AND p_latitud BETWEEN -90 AND 90 AND p_longitud BETWEEN -180 AND 180;
$$;
NOTIFY pgrst,'reload schema';
COMMIT;
