-- ===================================================================
-- MIGRACIÓN COMPLETA: Fix Horarios Disponibles
-- ===================================================================
-- Propósito: Corregir TODOS los problemas detectados en la función get_horarios_disponibles:
-- 1. Error de generate_series(time, time): Usamos timestamps explícitos.
-- 2. Error de nombre de tabla: Usamos 'horarios_atencion' en vez de 'horarios_trabajo'.
-- 3. Error de Timezone: Usamos 'America/Santiago' para fecha/hora actual.
-- ===================================================================

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
SECURITY DEFINER
AS $$
DECLARE
  dia_semana_num integer;
  hora_actual time;
  fecha_actual date;
BEGIN
  -- 1. Obtener día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
  dia_semana_num := EXTRACT(DOW FROM fecha_param);
  
  -- 2. Obtener fecha y hora actual en CHILE (Santiago)
  fecha_actual := (now() AT TIME ZONE 'America/Santiago')::date;
  hora_actual := (now() AT TIME ZONE 'America/Santiago')::time;
  
  RETURN QUERY
  WITH horarios_base AS (
    -- 3. CORRECCIÓN generate_series: Usar timestamp arbitrario (2000-01-01) para generar rangos
    -- Esto evita el error "function generate_series(time, time, interval) does not exist"
    SELECT 
      to_char(h::time, 'HH24:MI') as hora_slot,
      h::time as hora_time
    FROM generate_series(
      '2000-01-01 09:00:00'::timestamp,
      '2000-01-01 19:00:00'::timestamp,
      '30 minutes'::interval
    ) h
  ),
  citas_reservadas AS (
    -- Obtener citas ya reservadas
    SELECT 
      c.hora::time as hora_reservada
    FROM citas c
    WHERE c.barbero_id = barbero_id_param
      AND c.fecha = fecha_param
      AND c.estado IN ('pendiente', 'confirmada')
  ),
  horarios_trabajo AS (
    -- 4. CORRECCIÓN Tabla: Usar 'horarios_atencion'
    SELECT 
      ht.hora_inicio,
      ht.hora_fin
    FROM horarios_atencion ht
    WHERE ht.barbero_id = barbero_id_param
      AND ht.dia_semana = dia_semana_num
      AND ht.activo = true
  )
  SELECT 
    hb.hora_slot::text as hora,
    CASE
      -- Validación: Fecha pasada
      WHEN fecha_param < fecha_actual THEN false
      
      -- Validación: Hora pasada (si es hoy)
      WHEN fecha_param = fecha_actual 
        AND hb.hora_time <= hora_actual THEN false
      
      -- Validación: Fuera de horario laboral
      WHEN EXISTS (SELECT 1 FROM horarios_trabajo)
        AND NOT EXISTS (
          SELECT 1 
          FROM horarios_trabajo ht2
          WHERE hb.hora_time >= ht2.hora_inicio
            AND hb.hora_time < ht2.hora_fin
        ) THEN false
      
      -- Validación: Ya reservado
      WHEN EXISTS (
        SELECT 1 
        FROM citas_reservadas cr 
        WHERE cr.hora_reservada = hb.hora_time
      ) THEN false
      
      -- Disponible
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
        FROM citas_reservadas cr 
        WHERE cr.hora_reservada = hb.hora_time
      ) THEN 'Ya reservado'
      ELSE 'Disponible'
    END as motivo
  FROM horarios_base hb
  ORDER BY hb.hora_slot;
END;
$$;

-- Asegurar permisos para todos los roles
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO anon;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO service_role;
