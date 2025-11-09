-- ===================================================================
-- PRUEBAS DE VERIFICACIÓN - Función get_horarios_disponibles
-- ===================================================================
-- Ejecuta estas pruebas DESPUÉS de aplicar APLICAR_ESTA_MIGRACION.sql
-- ===================================================================

-- ===================================================================
-- PREPARACIÓN: Obtener un barbero para las pruebas
-- ===================================================================
-- Ejecuta esto primero para ver qué barberos tienes:
SELECT id, nombre, apellido FROM barberos WHERE activo = true LIMIT 5;

-- Copia uno de los IDs de arriba y úsalo en las siguientes pruebas
-- Por ejemplo: '123e4567-e89b-12d3-a456-426614174000'

-- ===================================================================
-- PRUEBA 1: Ver todos los horarios disponibles para MAÑANA
-- ===================================================================
-- Reemplaza 'TU_BARBERO_ID_AQUI' con un ID real de la consulta anterior
SELECT * 
FROM get_horarios_disponibles(
  'TU_BARBERO_ID_AQUI'::uuid,  -- ⚠️ REEMPLAZAR CON ID REAL
  CURRENT_DATE + interval '1 day'
)
ORDER BY hora;

-- Resultado esperado: Lista de horarios de 09:00 a 19:00 cada 30 min
-- Con columnas: hora | disponible | motivo

-- ===================================================================
-- PRUEBA 2: Ver SOLO horarios disponibles para mañana
-- ===================================================================
SELECT * 
FROM get_horarios_disponibles(
  'TU_BARBERO_ID_AQUI'::uuid,  -- ⚠️ REEMPLAZAR CON ID REAL
  CURRENT_DATE + interval '1 day'
)
WHERE disponible = true
ORDER BY hora;

-- Resultado esperado: Solo los slots con disponible = true

-- ===================================================================
-- PRUEBA 3: Contar horarios disponibles vs ocupados
-- ===================================================================
SELECT 
  disponible,
  motivo,
  COUNT(*) as cantidad
FROM get_horarios_disponibles(
  'TU_BARBERO_ID_AQUI'::uuid,  -- ⚠️ REEMPLAZAR CON ID REAL
  CURRENT_DATE + interval '1 day'
)
GROUP BY disponible, motivo
ORDER BY disponible DESC;

-- Resultado esperado: Resumen con cantidades por motivo

-- ===================================================================
-- PRUEBA 4: Verificar que las citas bloquean correctamente
-- ===================================================================
-- Primero, ver si hay citas para un barbero en una fecha específica:
SELECT 
  c.id,
  c.hora,
  s.nombre as servicio,
  s.duracion_minutos,
  c.hora::time + (s.duracion_minutos * interval '1 minute') as hora_fin_calculada
FROM citas c
JOIN servicios s ON s.id = c.servicio_id
WHERE c.barbero_id = 'TU_BARBERO_ID_AQUI'::uuid  -- ⚠️ REEMPLAZAR
  AND c.fecha = CURRENT_DATE + interval '1 day'
  AND c.estado IN ('pendiente', 'confirmada')
ORDER BY c.hora;

-- Luego verificar que esos slots Y los siguientes estén bloqueados:
-- Por ejemplo, si hay una cita a las 10:00 con duración de 40 min:
--   - 10:00 debe estar bloqueada
--   - 10:30 debe estar bloqueada (porque 10:30 < 10:40)
--   - 11:00 debe estar disponible (porque 11:00 >= 10:40)

-- ===================================================================
-- PRUEBA 5: Crear una cita de prueba y verificar bloqueo
-- ===================================================================
-- ADVERTENCIA: Esto creará una cita real. Ajusta los valores según necesites.

-- Paso 1: Crear cita de prueba (40 minutos a las 14:00)
-- INSERT INTO citas (
--   barbero_id,
--   cliente_nombre,
--   cliente_telefono,
--   servicio_id,
--   fecha,
--   hora,
--   estado
-- ) VALUES (
--   'TU_BARBERO_ID_AQUI'::uuid,  -- ⚠️ REEMPLAZAR
--   'Cliente Prueba',
--   '555-0000',
--   (SELECT id FROM servicios WHERE duracion_minutos = 40 LIMIT 1), -- Servicio de 40 min
--   CURRENT_DATE + interval '2 days',  -- Pasado mañana
--   '14:00',
--   'pendiente'
-- );

-- Paso 2: Verificar que 14:00 Y 14:30 estén bloqueados
-- SELECT * 
-- FROM get_horarios_disponibles(
--   'TU_BARBERO_ID_AQUI'::uuid,  -- ⚠️ REEMPLAZAR
--   CURRENT_DATE + interval '2 days'
-- )
-- WHERE hora IN ('14:00', '14:30', '15:00')
-- ORDER BY hora;

-- Resultado esperado:
-- 14:00 | false | Ya reservado   ← Bloqueado (inicio de cita)
-- 14:30 | false | Ya reservado   ← Bloqueado (dentro de duración)
-- 15:00 | true  | Disponible     ← Disponible (después de 14:40)

-- Paso 3: Limpiar cita de prueba (si la creaste)
-- DELETE FROM citas 
-- WHERE cliente_nombre = 'Cliente Prueba' 
--   AND cliente_telefono = '555-0000';

-- ===================================================================
-- PRUEBA 6: Ver horarios para todos los barberos activos
-- ===================================================================
SELECT 
  b.nombre || ' ' || b.apellido as barbero,
  h.hora,
  h.disponible,
  h.motivo
FROM barberos b
CROSS JOIN LATERAL get_horarios_disponibles(
  b.id, 
  CURRENT_DATE + interval '1 day'
) h
WHERE b.activo = true
  AND h.disponible = true
ORDER BY b.nombre, h.hora
LIMIT 30;

-- Resultado esperado: Horarios disponibles para cada barbero activo

-- ===================================================================
-- ✅ VERIFICACIÓN EXITOSA SI:
-- ===================================================================
-- 1. ✅ Las consultas ejecutan sin errores
-- 2. ✅ Los horarios se generan de 09:00 a 19:00 cada 30 min
-- 3. ✅ Las citas bloquean el slot de inicio Y los siguientes (según duración)
-- 4. ✅ Un slot está disponible solo DESPUÉS de que termina la cita anterior
-- 5. ✅ Las horas pasadas aparecen como no disponibles
-- ===================================================================
