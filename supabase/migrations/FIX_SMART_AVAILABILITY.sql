-- ===================================================================
-- MIGRACIÓN: Disponibilidad Inteligente por Duración
-- ===================================================================
-- Propósito: Actualizar la función para verificar si el BLOQUE completo
-- de tiempo solicitado está libre, no solo la hora de inicio.
-- ===================================================================

-- Primero eliminamos la versión anterior (que tenía menos parámetros o diferentes)
DROP FUNCTION IF EXISTS get_horarios_disponibles(uuid, date);
DROP FUNCTION IF EXISTS get_horarios_disponibles(uuid, date, integer);

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
    -- Generar slots cada 30 min (puntos de inicio posibles)
    SELECT 
      to_char(h::time, 'HH24:MI') as hora_slot,
      h::time as hora_inicio,
      (h::time + (duracion_minutos_param || ' minutes')::interval)::time as hora_fin_solicitada
    FROM generate_series(
      '2000-01-01 09:00:00'::timestamp,
      '2000-01-01 19:00:00'::timestamp,
      '30 minutes'::interval
    ) h
  ),
  citas_existentes AS (
    -- Obtener rango ocupado por citas existentes
    -- Asumimos duración promedio de 30 min si no se puede calcular, 
    -- o usamos lógica de servicios si estuviera disponible. 
    -- Para simplificar y robustez, bloqueamos 30 min por defecto por cita existente
    -- O idealmente, la cita debería tener su duración real.
    SELECT 
      c.hora::time as inicio,
      (c.hora::time + '30 minutes'::interval)::time as fin -- Default 30 min ocupados por cita
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
      
      -- Hora pasada (si es hoy)
      WHEN fecha_param = fecha_actual AND hb.hora_inicio <= hora_actual THEN false
      
      -- Fuera de horario laboral (El servicio debe TERMINAR antes de que cierre el barbero)
      WHEN EXISTS (SELECT 1 FROM horarios_trabajo)
        AND NOT EXISTS (
          SELECT 1 
          FROM horarios_trabajo ht2
          WHERE hb.hora_inicio >= ht2.hora_inicio
            AND hb.hora_fin_solicitada <= ht2.hora_fin -- Debe terminar dentro del horario
            AND hb.hora_fin_solicitada > hb.hora_inicio -- Validar cruce de medianoche
        ) THEN false
      
      -- Conflicto con citas existentes (Overlap)
      -- Un intervalo A (StartA, EndA) se solapa con B (StartB, EndB) si:
      -- StartA < EndB AND EndA > StartB
      WHEN EXISTS (
        SELECT 1 
        FROM citas_existentes ce 
        WHERE hb.hora_inicio < ce.fin
          AND hb.hora_fin_solicitada > ce.inicio
      ) THEN false
      
      ELSE true
    END as disponible,
    CASE
      WHEN fecha_param < fecha_actual THEN 'Fecha pasada'
      WHEN fecha_param = fecha_actual AND hb.hora_inicio <= hora_actual THEN 'Hora pasada'
      WHEN EXISTS (SELECT 1 FROM horarios_trabajo) 
           AND NOT EXISTS (SELECT 1 FROM horarios_trabajo ht2 WHERE hb.hora_inicio >= ht2.hora_inicio AND hb.hora_fin_solicitada <= ht2.hora_fin) 
           THEN 'Insuficiente tiempo antes del cierre'
      WHEN EXISTS (SELECT 1 FROM citas_existentes ce WHERE hb.hora_inicio < ce.fin AND hb.hora_fin_solicitada > ce.inicio) 
           THEN 'Conflicto con otra reserva'
      ELSE 'Disponible'
    END as motivo
  FROM horarios_base hb
  ORDER BY hb.hora_slot;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date, integer) TO service_role;
