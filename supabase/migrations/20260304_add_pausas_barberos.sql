-- ===================================================================
-- MIGRACIÓN: Inactividad temporal (Descansos) para Barberos
-- Fecha: 2026-03-04
-- Descripción: Añade columnas pausa_inicio y pausa_fin a horarios_atencion
-- y actualiza get_horarios_disponibles para omitir las horas en ese rango.
-- ===================================================================

-- 1. Añadir columnas a la tabla horarios_atencion
ALTER TABLE public.horarios_atencion
ADD COLUMN IF NOT EXISTS pausa_inicio TIME DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pausa_fin TIME DEFAULT NULL;

-- 2. Eliminar la función actual para evitar conflictos en parámetros/retornos
DROP FUNCTION IF EXISTS get_horarios_disponibles(uuid, date);

-- 3. Crear función de horarios actualizadas con limpieza de inactividad
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
      ht.hora_fin,
      ht.pausa_inicio,
      ht.pausa_fin
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
      
      -- Si hay horarios de trabajo definidos, verificar si está FUERA del rango de trabajo normal
      WHEN EXISTS (SELECT 1 FROM horarios_trabajo)
        AND NOT EXISTS (
          SELECT 1 
          FROM horarios_trabajo ht2
          WHERE hb.hora_slot::time >= ht2.hora_inicio
            AND hb.hora_slot::time < ht2.hora_fin
        ) THEN false
        
      -- Verificar si la hora CAE DENTRO del periodo de pausa / inactividad configurado
      WHEN EXISTS (
          SELECT 1 
          FROM horarios_trabajo ht3
          WHERE ht3.pausa_inicio IS NOT NULL 
            AND ht3.pausa_fin IS NOT NULL
            AND hb.hora_slot::time >= ht3.pausa_inicio
            AND hb.hora_slot::time < ht3.pausa_fin
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
          FROM horarios_trabajo ht3
          WHERE ht3.pausa_inicio IS NOT NULL 
            AND ht3.pausa_fin IS NOT NULL
            AND hb.hora_slot::time >= ht3.pausa_inicio
            AND hb.hora_slot::time < ht3.pausa_fin
      ) THEN 'Pausa o Inactividad del barbero'

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
