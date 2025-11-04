-- ===================================================================
-- FUNCIÓN: Obtener Horarios Disponibles para Reservas
-- ===================================================================
-- Propósito: Retorna horarios disponibles para un barbero en una fecha,
-- considerando las citas ya reservadas y el horario de trabajo
-- ===================================================================

-- 1. ELIMINAR FUNCIÓN SI EXISTE (para recrearla)
DROP FUNCTION IF EXISTS get_horarios_disponibles(uuid, date);

-- 2. CREAR FUNCIÓN DE HORARIOS DISPONIBLES
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

-- 3. DAR PERMISOS A LA FUNCIÓN
-- Permitir que usuarios anónimos (desde /reservar) puedan ejecutarla
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO anon;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_horarios_disponibles(uuid, date) TO service_role;

-- ===================================================================
-- TESTS DE LA FUNCIÓN
-- ===================================================================

-- Test 1: Ver horarios disponibles para un barbero específico hoy
SELECT * 
FROM get_horarios_disponibles(
  (SELECT id FROM barberos LIMIT 1), -- Primer barbero
  CURRENT_DATE
)
ORDER BY hora;

-- Test 2: Ver horarios disponibles para mañana
SELECT * 
FROM get_horarios_disponibles(
  (SELECT id FROM barberos LIMIT 1),
  CURRENT_DATE + interval '1 day'
)
WHERE disponible = true  -- Solo mostrar disponibles
ORDER BY hora;

-- Test 3: Ver horarios ocupados vs disponibles
SELECT 
  disponible,
  motivo,
  COUNT(*) as cantidad
FROM get_horarios_disponibles(
  (SELECT id FROM barberos LIMIT 1),
  CURRENT_DATE + interval '1 day'
)
GROUP BY disponible, motivo
ORDER BY disponible DESC;

-- Test 4: Ver horarios para todos los barberos (comparación)
SELECT 
  b.nombre || ' ' || b.apellido as barbero,
  h.hora,
  h.disponible,
  h.motivo
FROM barberos b
CROSS JOIN LATERAL get_horarios_disponibles(b.id, CURRENT_DATE + interval '1 day') h
WHERE b.activo = true
  AND h.disponible = true
ORDER BY b.nombre, h.hora
LIMIT 20;

-- ===================================================================
-- RESULTADO ESPERADO:
-- ===================================================================
-- ✅ Función retorna horarios de 9:00 AM a 7:00 PM cada 30 min
-- ✅ Marca como NO disponible las horas ya reservadas
-- ✅ Marca como NO disponible las horas pasadas (si es hoy)
-- ✅ Considera horarios de trabajo del barbero (si están definidos)
-- ✅ Proporciona motivo de por qué no está disponible
-- ===================================================================

-- ===================================================================
-- ÍNDICES PARA MEJORAR PERFORMANCE (OPCIONAL)
-- ===================================================================

-- Crear índice compuesto para búsquedas rápidas de citas
CREATE INDEX IF NOT EXISTS idx_citas_barbero_fecha_hora 
ON citas(barbero_id, fecha, hora) 
WHERE estado IN ('pendiente', 'confirmada');

-- Crear índice para horarios de trabajo
CREATE INDEX IF NOT EXISTS idx_horarios_trabajo_barbero_dia 
ON horarios_trabajo(barbero_id, dia_semana) 
WHERE activo = true;

-- ===================================================================
-- NOTAS IMPORTANTES:
-- ===================================================================
-- 1. Esta función se ejecuta en TIEMPO REAL cada vez que se consulta
-- 2. Considera las citas con estado 'pendiente' y 'confirmada'
-- 3. NO considera citas 'canceladas' o 'completadas'
-- 4. Si no hay horarios_trabajo definidos, usa todos los horarios
-- 5. La hora actual se compara solo si la fecha es hoy
-- ===================================================================
