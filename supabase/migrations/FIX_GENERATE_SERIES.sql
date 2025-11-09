-- ===================================================================
-- CORRECCIÓN: generate_series con timestamp en lugar de time
-- ===================================================================

DROP FUNCTION IF EXISTS get_horarios_disponibles(uuid, date);

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
BEGIN
  dia_semana_num := EXTRACT(DOW FROM fecha_param);
  fecha_actual := CURRENT_DATE;
  hora_actual := CURRENT_TIME;
  
  RETURN QUERY
  WITH horarios_base AS (
    -- ✅ CORREGIDO: Usar timestamp y luego convertir a time
    SELECT 
      to_char(h::time, 'HH24:MI') as hora_slot,
      h::time as hora_time
    FROM generate_series(
      '2000-01-01 09:00:00'::timestamp,
      '2000-01-01 19:00:00'::timestamp,
      '30 minutes'::interval
    ) h
  ),
  citas_con_duracion AS (
    SELECT 
      c.id,
      c.hora::time as hora_inicio,
      CASE
        WHEN c.notas ~ '\[SERVICIOS SOLICITADOS:' THEN
          COALESCE((
            SELECT SUM(s.duracion_minutos)
            FROM servicios s
            WHERE s.nombre = ANY(
              string_to_array(
                regexp_replace(
                  substring(c.notas from '\[SERVICIOS SOLICITADOS:\s*([^\]]+)\]'),
                  '\s*',
                  '',
                  'g'
                ),
                ','
              )
            )
          ), 
          (SELECT duracion_minutos FROM servicios WHERE id = c.servicio_id))
        ELSE (SELECT duracion_minutos FROM servicios WHERE id = c.servicio_id)
      END as duracion_total,
      c.hora::time + 
        COALESCE(
          CASE
            WHEN c.notas ~ '\[SERVICIOS SOLICITADOS:' THEN
              (SELECT SUM(s.duracion_minutos)
               FROM servicios s
               WHERE s.nombre = ANY(
                 string_to_array(
                   regexp_replace(
                     substring(c.notas from '\[SERVICIOS SOLICITADOS:\s*([^\]]+)\]'),
                     '\s*',
                     '',
                     'g'
                   ),
                   ','
                 )
               ))
            ELSE (SELECT duracion_minutos FROM servicios WHERE id = c.servicio_id)
          END,
          30
        ) * interval '1 minute' as hora_fin
    FROM citas c
    WHERE c.barbero_id = barbero_id_param
      AND c.fecha = fecha_param
      AND c.estado IN ('pendiente', 'confirmada')
  ),
  horarios_trabajo AS (
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
      WHEN fecha_param < fecha_actual THEN false
      WHEN fecha_param = fecha_actual 
        AND hb.hora_time <= hora_actual THEN false
      WHEN EXISTS (SELECT 1 FROM horarios_trabajo)
        AND NOT EXISTS (
          SELECT 1 
          FROM horarios_trabajo ht2
          WHERE hb.hora_time >= ht2.hora_inicio
            AND hb.hora_time < ht2.hora_fin
        ) THEN false
      WHEN EXISTS (
        SELECT 1 
        FROM citas_con_duracion cd
        WHERE hb.hora_time >= cd.hora_inicio
          AND hb.hora_time < cd.hora_fin
      ) THEN false
      ELSE true
    END as disponible,
    CASE
      WHEN fecha_param < fecha_actual THEN 'Fecha pasada'
      WHEN fecha_param = fecha_actual 
        AND hb.hora_time <= hora_actual THEN 'Hora pasada'
      WHEN EXISTS (SELECT 1 FROM horarios_trabajo)
        AND NOT EXISTS (
          SELECT 1 
          FROM horarios_trabajo ht2
          WHERE hb.hora_time >= ht2.hora_inicio
            AND hb.hora_time < ht2.hora_fin
        ) THEN 'Fuera de horario de trabajo'
      WHEN EXISTS (
        SELECT 1 
        FROM citas_con_duracion cd
        WHERE hb.hora_time >= cd.hora_inicio
          AND hb.hora_time < cd.hora_fin
      ) THEN 'Ya reservado'
      ELSE 'Disponible'
    END as motivo
  FROM horarios_base hb
  ORDER BY hb.hora_slot;
END;
$$;

GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO anon;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO service_role;

CREATE INDEX IF NOT EXISTS idx_citas_barbero_fecha_hora 
ON citas(barbero_id, fecha, hora) 
WHERE estado IN ('pendiente', 'confirmada');

CREATE INDEX IF NOT EXISTS idx_horarios_trabajo_barbero_dia 
ON horarios_trabajo(barbero_id, dia_semana) 
WHERE activo = true;
