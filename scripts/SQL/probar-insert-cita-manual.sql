-- =====================================================
-- SCRIPT: Probar INSERT Manual de Cita
-- Descripción: Inserta una cita de prueba para verificar que funciona
-- =====================================================

-- PASO 1: Obtener IDs de barbero y servicio activos
SELECT 
    'BARBEROS DISPONIBLES' as tipo,
    id,
    nombre || ' ' || apellido as nombre_completo,
    activo
FROM barberos
WHERE activo = true
LIMIT 3;

SELECT 
    'SERVICIOS DISPONIBLES' as tipo,
    id,
    nombre,
    precio,
    activo
FROM servicios
WHERE activo = true
LIMIT 3;

-- PASO 2: Insertar cita de prueba (CAMBIA LOS IDs por los que viste arriba)
-- ⚠️ IMPORTANTE: Reemplaza los IDs con los valores reales de tu base de datos

/*
INSERT INTO citas (
    servicio_id,
    barbero_id,
    fecha,
    hora,
    cliente_nombre,
    cliente_telefono,
    cliente_email,
    estado
) VALUES (
    'PEGA_AQUI_ID_DEL_SERVICIO',  -- ID del servicio
    'PEGA_AQUI_ID_DEL_BARBERO',   -- ID del barbero
    CURRENT_DATE + INTERVAL '2 days',  -- Pasado mañana
    '14:30',
    'TEST - Juan Pérez',
    '+56912345678',
    'test@example.com',
    'pendiente'
) RETURNING 
    id,
    cliente_nombre,
    fecha,
    hora,
    estado,
    created_at;
*/

-- PASO 3: Si funcionó, verás la cita creada. Ahora elimínala:
-- DELETE FROM citas WHERE cliente_nombre LIKE 'TEST%';

-- =====================================================
-- Si este INSERT funciona:
-- ✅ Las políticas RLS están bien
-- ❌ El problema está en el frontend o las variables de entorno
--
-- Si este INSERT NO funciona:
-- ❌ Hay un problema con las políticas RLS o la estructura de la tabla
-- =====================================================
