-- ===================================================================
-- MIGRACIÓN: Lógica de Visualización de Horarios Mejorada
-- ===================================================================
-- Propósito: 
-- 1. Ampliar el rango de generación de 07:00 a 23:00.
-- 2. Filtrar slots que están totalmente fuera del horario laboral (no mostrarlos).
-- 3. Distinguir motivo "Excede cierre" para cuando empieza dentro pero no alcanza a terminar.
-- ===================================================================

CREATE OR REPLACE FUNCTION get_horarios_disponibles(
  barbero_id_param uuid,
  fecha_param date,
  duracion_minutos_param integer DEFAULT 30
)
RETURNS TABLE (
  hora text,
  disponible boolean,
  motivo text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dia_semana_num integer;
  hora_actual time;
  fecha_actual date;
BEGIN
  -- 1. Obtener día de la semana
  dia_semana_num := EXTRACT(DOW FROM fecha_param);
  
  -- 2. Obtener fecha y hora actual en CHILE
  fecha_actual := (now() AT TIME ZONE 'America/Santiago')::date;
  hora_actual := (now() AT TIME ZONE 'America/Santiago')::time;
  
  RETURN QUERY
  WITH horarios_base AS (
    -- Generar slots cada 30 min desde 07:00 hasta 23:00
    SELECT 
      to_char(h::time, 'HH24:MI') as hora_slot,
      h::time as hora_inicio,
      (h::time + (duracion_minutos_param || ' minutes')::interval)::time as hora_fin_solicitada
    FROM generate_series(
      '2000-01-01 07:00:00'::timestamp,
      '2000-01-01 23:00:00'::timestamp,
      '30 minutes'::interval
    ) h
  ),
  citas_existentes AS (
    SELECT 
      c.hora::time as inicio,
      (c.hora::time + '30 minutes'::interval)::time as fin 
    FROM citas c
    WHERE c.barbero_id = barbero_id_param
      AND c.fecha = fecha_param
      AND c.estado IN ('pendiente', 'confirmada')
  ),
  horarios_trabajo AS (
    SELECT ht.hora_inicio, ht.hora_fin
    FROM horarios_atencion ht
    WHERE ht.barbero_id = barbero_id_param
      AND ht.dia_semana = dia_semana_num
      AND ht.activo = true
  )
  SELECT 
    hb.hora_slot::text as hora,
    CASE
      -- Fecha pasada
      WHEN fecha_param < fecha_actual THEN false
      -- Hora pasada
      WHEN fecha_param = fecha_actual AND hb.hora_inicio <= hora_actual THEN false
      -- Excede horario cierre (Empieza dentro, pero termina fuera)
      WHEN EXISTS (SELECT 1 FROM horarios_trabajo) 
           AND NOT EXISTS (
             SELECT 1 FROM horarios_trabajo ht2 
             WHERE hb.hora_inicio >= ht2.hora_inicio 
               AND hb.hora_fin_solicitada <= ht2.hora_fin
               AND hb.hora_fin_solicitada > hb.hora_inicio
           ) THEN false
      -- Conflicto cita
      WHEN EXISTS (
        SELECT 1 FROM citas_existentes ce 
        WHERE hb.hora_inicio < ce.fin AND hb.hora_fin_solicitada > ce.inicio
      ) THEN false
      ELSE true
    END as disponible,
    CASE
      WHEN fecha_param < fecha_actual THEN 'Fecha pasada'
      WHEN fecha_param = fecha_actual AND hb.hora_inicio <= hora_actual THEN 'Hora pasada'
      WHEN EXISTS (SELECT 1 FROM citas_existentes ce WHERE hb.hora_inicio < ce.fin AND hb.hora_fin_solicitada > ce.inicio) THEN 'Ocupado'
      WHEN EXISTS (SELECT 1 FROM horarios_trabajo) 
           AND NOT EXISTS (
             SELECT 1 FROM horarios_trabajo ht2 
             WHERE hb.hora_inicio >= ht2.hora_inicio 
               AND hb.hora_fin_solicitada <= ht2.hora_fin
           ) THEN 'No da tiempo' -- Nuevo motivo específico
      ELSE 'Disponible'
    END as motivo
  FROM horarios_base hb
  WHERE 
    -- FILTRO CLAVE: Solo mostrar slots que EMPIEZAN dentro del horario laboral
    -- O mostrar todo si no hay horario configurado (para evitar vacío total por error)
    NOT EXISTS (SELECT 1 FROM horarios_trabajo)
    OR EXISTS (
      SELECT 1 FROM horarios_trabajo ht 
      WHERE hb.hora_inicio >= ht.hora_inicio 
        AND hb.hora_inicio < ht.hora_fin
    )
  ORDER BY hb.hora_slot;
END;
$$;

GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date, integer) TO service_role;
