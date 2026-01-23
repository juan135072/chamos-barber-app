-- =====================================================
-- SCRIPT: INSERTAR UBICACIÓN DE PRUEBA
-- =====================================================
-- Este script inserta una ubicación de ejemplo para la barbería
-- El admin debe actualizar esto con las coordenadas reales

-- Coordenadas de ejemplo (Santiago Centro, Chile)
-- Latitud: -33.437916
-- Longitud: -70.650410

INSERT INTO ubicaciones_barberia (
    id,
    nombre,
    latitud,
    longitud,
    radio_permitido,
    activa
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Chamos Barber - Principal',
    -33.437916,
    -70.650410,
    100, -- 100 metros de radio
    true
)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    latitud = EXCLUDED.latitud,
    longitud = EXCLUDED.longitud,
    radio_permitido = EXCLUDED.radio_permitido,
    activa = EXCLUDED.activa,
    updated_at = NOW();

-- =====================================================
-- INSTRUCCIONES:
-- =====================================================
-- 1. El admin debe ir al panel de administración
-- 2. Click en "Ubicaciones GPS" en el menú
-- 3. Click en "📍 Capturar Ubicación Actual" estando en la barbería
-- 4. Guardar la ubicación con el nombre de la barbería
-- 5. El ID de esta ubicación debe usarse en MarcarAsistencia.tsx
--    (reemplazar el TODO en línea 103)
