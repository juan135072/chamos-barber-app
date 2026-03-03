-- ===================================================================
-- MIGRACIÓN: Horario Base Dinámico
-- Fecha: 2026-03-03
-- Descripción: Agrega configuración base de horarios y actualiza
-- la función get_horarios_disponibles para usar esta configuración.
-- ===================================================================

-- 1. Insertar configuraciones base por defecto para cada comercio (o general si no hay)
INSERT INTO public.sitio_configuracion (clave, valor, tipo, descripcion, categoria, comercio_id)
SELECT 'horario_apertura', '09:00', 'time', 'Hora de apertura base del local', 'sistema', id
FROM public.comercios
ON CONFLICT (clave, comercio_id) DO NOTHING;

INSERT INTO public.sitio_configuracion (clave, valor, tipo, descripcion, categoria, comercio_id)
SELECT 'horario_cierre', '19:00', 'time', 'Hora de cierre base del local', 'sistema', id
FROM public.comercios
ON CONFLICT (clave, comercio_id) DO NOTHING;

INSERT INTO public.sitio_configuracion (clave, valor, tipo, descripcion, categoria, comercio_id)
SELECT 'intervalo_citas', '30', 'number', 'Intervalo en minutos para la disponibilidad de citas', 'sistema', id
FROM public.comercios
ON CONFLICT (clave, comercio_id) DO NOTHING;

-- 2. ELIMINAR FUNCIÓN SI EXISTE (para recrearla)
DROP FUNCTION IF EXISTS get_horarios_disponibles(uuid, date);

-- 3. CREAR FUNCIÓN DE HORARIOS DISPONIBLES (Dinámica)
CREATE OR REPLACE FUNCTION get_horarios_disponibles(
  barbero_id_param uuid,
  fecha_param date
)
RETURNS TABLE (
  hora text,
  disponible boolean,
  motivo text
) 
LANGUAGE plpgsql
AS $$
DECLARE
  dia_semana_num integer;
  hora_actual time;
  fecha_actual date;
  v_apertura time;
  v_cierre time;
  v_intervalo text;
BEGIN
  -- Obtener día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
  dia_semana_num := EXTRACT(DOW FROM fecha_param);
  
  -- Obtener fecha y hora actual
  fecha_actual := CURRENT_DATE;
  hora_actual := CURRENT_TIME;
  
  -- Obtener configuración dinámica (LIMIT 1 por seguridad en entornos multitenant)
  SELECT COALESCE(NULLIF(valor, ''), '09:00')::time INTO v_apertura
  FROM public.sitio_configuracion WHERE clave = 'horario_apertura' LIMIT 1;
  
  SELECT COALESCE(NULLIF(valor, ''), '19:00')::time INTO v_cierre
  FROM public.sitio_configuracion WHERE clave = 'horario_cierre' LIMIT 1;
  
  SELECT COALESCE(NULLIF(valor, ''), '30') || ' minutes' INTO v_intervalo
  FROM public.sitio_configuracion WHERE clave = 'intervalo_citas' LIMIT 1;

  -- Valores por defecto en caso de que no existan aún
  IF v_apertura IS NULL THEN v_apertura := '09:00'::time; END IF;
  IF v_cierre IS NULL THEN v_cierre := '19:00'::time; END IF;
  IF v_intervalo IS NULL THEN v_intervalo := '30 minutes'; END IF;

  -- Generar horarios del día basado en la configuración
  RETURN QUERY
  WITH horarios_base AS (
    -- Generar todos los posibles horarios del día
    SELECT 
      to_char(h, 'HH24:MI') as hora_slot
    FROM generate_series(
      v_apertura,
      v_cierre,
      v_intervalo::interval
    ) h
  ),
  citas_reservadas AS (
    -- Obtener citas ya reservadas para este barbero en esta fecha
    SELECT 
      c.hora::time as hora_reservada
    FROM citas c
    WHERE c.barbero_id = barbero_id_param
      AND c.fecha = fecha_param
      AND c.estado IN ('pendiente', 'confirmada') -- No contar canceladas
  ),
  horarios_trabajo AS (
    -- Obtener horarios de trabajo del barbero (si existen)
    SELECT 
      ht.hora_inicio,
      ht.hora_fin
    FROM horarios_trabajo ht
    WHERE ht.barbero_id = barbero_id_param
      AND ht.dia_semana = dia_semana_num
      AND ht.activo = true
  )
  SELECT 
    hb.hora_slot::text as hora,
    CASE
      -- Si la fecha es en el pasado, no disponible
      WHEN fecha_param < fecha_actual THEN false
      
      -- Si es hoy y la hora ya pasó, no disponible
      WHEN fecha_param = fecha_actual 
        AND hb.hora_slot::time <= hora_actual THEN false
      
      -- Si hay horarios de trabajo definidos, verificar si está en rango
      WHEN EXISTS (SELECT 1 FROM horarios_trabajo)
        AND NOT EXISTS (
          SELECT 1 
          FROM horarios_trabajo ht2
          WHERE hb.hora_slot::time >= ht2.hora_inicio
            AND hb.hora_slot::time < ht2.hora_fin
        ) THEN false
      
      -- Si ya está reservado, no disponible
      WHEN EXISTS (
        SELECT 1 
        FROM citas_reservadas cr 
        WHERE cr.hora_reservada = hb.hora_slot::time
      ) THEN false
      
      -- Si pasa todas las validaciones, está disponible
      ELSE true
    END as disponible,
    CASE
      WHEN fecha_param < fecha_actual THEN 'Fecha pasada'
      WHEN fecha_param = fecha_actual 
        AND hb.hora_slot::time <= hora_actual THEN 'Hora pasada'
      WHEN EXISTS (SELECT 1 FROM horarios_trabajo)
        AND NOT EXISTS (
          SELECT 1 
          FROM horarios_trabajo ht2
          WHERE hb.hora_slot::time >= ht2.hora_inicio
            AND hb.hora_slot::time < ht2.hora_fin
        ) THEN 'Fuera de horario de trabajo'
      WHEN EXISTS (
        SELECT 1 
        FROM citas_reservadas cr 
        WHERE cr.hora_reservada = hb.hora_slot::time
      ) THEN 'Ya reservado'
      ELSE 'Disponible'
    END as motivo
  FROM horarios_base hb
  ORDER BY hb.hora_slot;
END;
$$;

-- 4. DAR PERMISOS A LA FUNCIÓN
-- Permitir que usuarios anónimos (desde /reservar) puedan ejecutarla
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO anon;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO service_role;
