-- ===================================================================
-- MIGRACIÓN: Corregir cálculo de horarios disponibles considerando duración
-- ===================================================================
-- PROBLEMA: La función actual solo marca como ocupada la hora exacta de inicio
--           pero no considera la duración del servicio
-- 
-- EJEMPLO DEL BUG:
--   - Cita a las 10:00 con servicio de 40 min (termina 10:40)
--   - La función marca 10:00 como ocupado ✅
--   - Pero 10:30 aparece como disponible ❌ (barbero ocupado hasta 10:40)
-- 
-- SOLUCIÓN: Calcular el rango de tiempo ocupado por cada cita
--           (hora_inicio hasta hora_inicio + duracion_total_servicios)
-- ===================================================================

-- 1. ELIMINAR FUNCIÓN ANTERIOR
DROP FUNCTION IF EXISTS get_horarios_disponibles(uuid, date);

-- 2. CREAR FUNCIÓN MEJORADA CON CONSIDERACIÓN DE DURACIÓN
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
    -- Obtener citas con su duración total (suma de todos los servicios)
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
      -- El slot está ocupado si:
      --   hora_slot >= hora_inicio_cita AND hora_slot < hora_fin_cita
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

-- 3. DAR PERMISOS A LA FUNCIÓN
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO anon;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO service_role;

-- ===================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ===================================================================
COMMENT ON FUNCTION get_horarios_disponibles(uuid, date) IS 
'Retorna horarios disponibles considerando:
1. Horarios de trabajo del barbero
2. Citas ya reservadas 
3. DURACIÓN COMPLETA de cada cita (suma de todos los servicios)
4. Bloquea slots que caen dentro del rango: [hora_inicio, hora_inicio + duración)

EJEMPLO:
- Cita a las 10:00 con servicio de 40 min
- Bloquea: 10:00, 10:30 (ambos dentro del rango 10:00-10:40)
- Disponible desde: 11:00

MÚLTIPLES SERVICIOS:
- Si la cita tiene múltiples servicios, suma todas las duraciones
- Extrae servicios del campo notas con patrón [SERVICIOS SOLICITADOS: ...]
- Busca duración de cada servicio y suma el total';

-- ===================================================================
-- TESTS DE VERIFICACIÓN
-- ===================================================================

-- Test 1: Crear cita de prueba con servicio de 40 minutos
DO $$
DECLARE
  test_barbero_id uuid;
  test_servicio_id uuid;
  test_cita_id uuid;
BEGIN
  -- Obtener IDs de prueba
  SELECT id INTO test_barbero_id FROM barberos WHERE activo = true LIMIT 1;
  SELECT id INTO test_servicio_id FROM servicios WHERE duracion_minutos = 40 LIMIT 1;
  
  IF test_servicio_id IS NULL THEN
    -- Crear servicio de prueba si no existe
    INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, categoria, activo)
    VALUES ('Test 40min', 'Servicio de prueba', 15000, 40, 'test', true)
    RETURNING id INTO test_servicio_id;
  END IF;
  
  -- Insertar cita de prueba para mañana a las 10:00
  INSERT INTO citas (
    barbero_id, 
    servicio_id, 
    fecha, 
    hora, 
    cliente_nombre, 
    cliente_telefono,
    estado
  )
  VALUES (
    test_barbero_id,
    test_servicio_id,
    CURRENT_DATE + interval '1 day',
    '10:00',
    'Test Cliente',
    '+56912345678',
    'confirmada'
  )
  RETURNING id INTO test_cita_id;
  
  RAISE NOTICE 'Cita de prueba creada: ID %, Barbero %, Servicio 40min', 
    test_cita_id, test_barbero_id;
END $$;

-- Test 2: Verificar que 10:00 y 10:30 están bloqueados
SELECT 
  hora,
  disponible,
  motivo
FROM get_horarios_disponibles(
  (SELECT id FROM barberos WHERE activo = true LIMIT 1),
  CURRENT_DATE + interval '1 day'
)
WHERE hora IN ('10:00', '10:30', '11:00')
ORDER BY hora;

-- Resultado esperado:
-- 10:00 | false | Ya reservado  ✅
-- 10:30 | false | Ya reservado  ✅ (NUEVO - antes era 'Disponible')
-- 11:00 | true  | Disponible    ✅

-- ===================================================================
-- NOTAS IMPORTANTES
-- ===================================================================
-- ✅ CORREGIDO: Ahora considera la duración completa del servicio
-- ✅ MÚLTIPLES SERVICIOS: Suma duraciones de todos los servicios
-- ✅ BLOQUEO CORRECTO: Slots dentro del rango están ocupados
-- ✅ PERFORMANCE: Usa CTE eficientes con índices existentes
-- ===================================================================
