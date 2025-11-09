-- ===================================================================
-- MIGRACIÓN COMPLETA: Crear/Actualizar función de horarios disponibles
-- ===================================================================
-- ESTE ARCHIVO INCLUYE:
-- 1. Eliminación de función anterior (si existe)
-- 2. Creación de función CORREGIDA que considera duración de servicios
-- 3. Permisos necesarios
-- 4. Índices para performance
-- ===================================================================

-- ===================================================================
-- PASO 1: ELIMINAR FUNCIÓN ANTERIOR (SI EXISTE)
-- ===================================================================
DROP FUNCTION IF EXISTS get_horarios_disponibles(uuid, date);

-- ===================================================================
-- PASO 2: CREAR FUNCIÓN CORREGIDA
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
  
  -- Obtener fecha y hora actual
  fecha_actual := CURRENT_DATE;
  hora_actual := CURRENT_TIME;
  
  -- Generar horarios del día (9:00 AM a 7:00 PM cada 30 minutos)
  RETURN QUERY
  WITH horarios_base AS (
    -- Generar todos los posibles horarios del día
    SELECT 
      to_char(h, 'HH24:MI') as hora_slot,
      h as hora_time
    FROM generate_series(
      '09:00'::time,
      '19:00'::time,
      '30 minutes'::interval
    ) h
  ),
  citas_con_duracion AS (
    -- ✨ NUEVA LÓGICA: Calcular rango completo de cada cita (inicio -> fin)
    SELECT 
      c.id,
      c.hora::time as hora_inicio,
      -- Calcular duración total considerando múltiples servicios
      CASE
        -- Si hay múltiples servicios en las notas, extraerlos y sumar duraciones
        WHEN c.notas ~ '\[SERVICIOS SOLICITADOS:' THEN
          COALESCE((
            -- Extraer nombres de servicios y buscar sus duraciones
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
          -- Fallback: usar duración del servicio principal
          (SELECT duracion_minutos FROM servicios WHERE id = c.servicio_id))
        -- Si no hay múltiples servicios, usar duración del servicio principal
        ELSE (SELECT duracion_minutos FROM servicios WHERE id = c.servicio_id)
      END as duracion_total,
      -- Calcular hora de fin (hora_inicio + duración)
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
          30 -- Fallback de 30 minutos si no se encuentra duración
        ) * interval '1 minute' as hora_fin
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
        AND hb.hora_time <= hora_actual THEN false
      
      -- Si hay horarios de trabajo definidos, verificar si está en rango
      WHEN EXISTS (SELECT 1 FROM horarios_trabajo)
        AND NOT EXISTS (
          SELECT 1 
          FROM horarios_trabajo ht2
          WHERE hb.hora_time >= ht2.hora_inicio
            AND hb.hora_time < ht2.hora_fin
        ) THEN false
      
      -- ✨ NUEVA LÓGICA: Verificar si el slot cae dentro del rango de alguna cita
      -- El slot está ocupado si: hora_slot >= hora_inicio_cita AND hora_slot < hora_fin_cita
      -- 
      -- EJEMPLO: Cita a las 10:00 con duración de 40 min (termina 10:40)
      --   - Slot 10:00 → 10:00 >= 10:00 AND 10:00 < 10:40 → BLOQUEADO ✅
      --   - Slot 10:30 → 10:30 >= 10:00 AND 10:30 < 10:40 → BLOQUEADO ✅
      --   - Slot 11:00 → 11:00 >= 10:40 → DISPONIBLE ✅
      WHEN EXISTS (
        SELECT 1 
        FROM citas_con_duracion cd
        WHERE hb.hora_time >= cd.hora_inicio
          AND hb.hora_time < cd.hora_fin
      ) THEN false
      
      -- Si pasa todas las validaciones, está disponible
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

-- ===================================================================
-- PASO 3: DAR PERMISOS A LA FUNCIÓN
-- ===================================================================
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO anon;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO service_role;

-- ===================================================================
-- PASO 4: CREAR ÍNDICES PARA MEJOR PERFORMANCE
-- ===================================================================
-- Índice para búsquedas rápidas de citas por barbero/fecha
CREATE INDEX IF NOT EXISTS idx_citas_barbero_fecha_hora 
ON citas(barbero_id, fecha, hora) 
WHERE estado IN ('pendiente', 'confirmada');

-- Índice para horarios de trabajo
CREATE INDEX IF NOT EXISTS idx_horarios_trabajo_barbero_dia 
ON horarios_trabajo(barbero_id, dia_semana) 
WHERE activo = true;

-- ===================================================================
-- ✅ MIGRACIÓN COMPLETADA
-- ===================================================================
-- La función ahora:
-- 1. ✅ Considera la duración completa del servicio
-- 2. ✅ Bloquea TODOS los slots dentro del rango [inicio, fin)
-- 3. ✅ Maneja múltiples servicios correctamente
-- 4. ✅ Previene citas solapadas
-- ===================================================================
