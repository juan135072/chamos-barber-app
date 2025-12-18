-- ===================================================================
-- MIGRACIÓN: Fix Timezone en Horarios Disponibles
-- ===================================================================
-- Propósito: Actualizar la función para usar la zona horaria de Chile
-- al comparar fechas y horas, permitiendo reservas "hoy" correctamente.
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
AS $$
DECLARE
  dia_semana_num integer;
  hora_actual time;
  fecha_actual date;
BEGIN
  -- Obtener día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
  dia_semana_num := EXTRACT(DOW FROM fecha_param);
  
  -- Obtener fecha y hora actual en CHILE (Santiago)
  -- Esto es crucial para que "hoy" sea correcto aunque el servidor esté en UTC
  fecha_actual := (now() AT TIME ZONE 'America/Santiago')::date;
  hora_actual := (now() AT TIME ZONE 'America/Santiago')::time;
  
  -- Generar horarios del día (9:00 AM a 7:00 PM cada 30 minutos)
  RETURN QUERY
  WITH horarios_base AS (
    -- Generar todos los posibles horarios del día
    SELECT 
      to_char(h, 'HH24:MI') as hora_slot
    FROM generate_series(
      '09:00'::time,
      '19:00'::time,
      '30 minutes'::interval
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
    FROM horarios_atencion ht
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

-- Asegurar permisos
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO anon;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO service_role;
