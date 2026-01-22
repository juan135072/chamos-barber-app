-- ============================================
-- 🧪 DATOS DE PRUEBA - CHAMOS BARBER APP
-- ============================================
-- Autor: Security Audit Team
-- Fecha: 2025-12-11
-- Propósito: Datos realistas para testing completo
-- ============================================

-- ============================================
-- 🗑️ LIMPIEZA PREVIA (Opcional)
-- ============================================
-- DESCOMENTAR SOLO SI QUIERES EMPEZAR DE CERO
-- DELETE FROM citas WHERE true;
-- DELETE FROM horarios_barberos WHERE true;
-- DELETE FROM barberos WHERE true;
-- DELETE FROM servicios WHERE true;
-- DELETE FROM categorias_servicios WHERE true;
-- DELETE FROM admin_users WHERE true;

-- ============================================
-- 📂 1. CATEGORÍAS DE SERVICIOS (3)
-- ============================================
INSERT INTO categorias_servicios (nombre, descripcion, orden, activo)
VALUES 
  ('Cortes', 'Cortes de cabello profesionales y modernos', 1, true),
  ('Barba', 'Servicios de arreglo y cuidado de barba', 2, true),
  ('Tratamientos', 'Tratamientos capilares y faciales', 3, true)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- ✂️ 2. SERVICIOS (6 servicios: 2 por categoría)
-- ============================================

-- CATEGORÍA: CORTES
INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, categoria_id, activo, imagen_url)
SELECT 
  'Corte Clásico',
  'Corte tradicional con tijera y máquina, incluye lavado',
  8000,
  30,
  c.id,
  true,
  'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=400'
FROM categorias_servicios c WHERE c.nombre = 'Cortes'
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, categoria_id, activo, imagen_url)
SELECT 
  'Fade Moderno',
  'Degradado profesional con diseño, incluye lavado y acabado',
  12000,
  45,
  c.id,
  true,
  'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400'
FROM categorias_servicios c WHERE c.nombre = 'Cortes'
ON CONFLICT (nombre) DO NOTHING;

-- CATEGORÍA: BARBA
INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, categoria_id, activo, imagen_url)
SELECT 
  'Arreglo de Barba',
  'Perfilado y arreglo completo de barba con navaja',
  6000,
  20,
  c.id,
  true,
  'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400'
FROM categorias_servicios c WHERE c.nombre = 'Barba'
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, categoria_id, activo, imagen_url)
SELECT 
  'Barba Premium',
  'Arreglo completo con toalla caliente, aceites y masaje facial',
  10000,
  35,
  c.id,
  true,
  'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400'
FROM categorias_servicios c WHERE c.nombre = 'Barba'
ON CONFLICT (nombre) DO NOTHING;

-- CATEGORÍA: TRATAMIENTOS
INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, categoria_id, activo, imagen_url)
SELECT 
  'Tratamiento Capilar',
  'Hidratación profunda y tratamiento anticaída',
  15000,
  40,
  c.id,
  true,
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400'
FROM categorias_servicios c WHERE c.nombre = 'Tratamientos'
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, categoria_id, activo, imagen_url)
SELECT 
  'Limpieza Facial',
  'Limpieza profunda de cutis con mascarilla y extracción',
  18000,
  50,
  c.id,
  true,
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400'
FROM categorias_servicios c WHERE c.nombre = 'Tratamientos'
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- 💈 3. BARBEROS (2)
-- ============================================

-- BARBERO 1: Experimentado (Carlos)
INSERT INTO barberos (
  nombre,
  apellido,
  email,
  telefono,
  especialidad,
  anos_experiencia,
  foto_url,
  activo,
  descripcion_corta,
  instagram,
  calificacion_promedio
)
VALUES (
  'Carlos',
  'Pérez',
  'carlos@chamosbarber.com',
  '+56912345678',
  'Cortes clásicos y modernos',
  8,
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  true,
  'Barbero venezolano con 8 años de experiencia. Especialista en fades y diseños.',
  '@carlos_barber_chile',
  4.8
)
ON CONFLICT (email) DO NOTHING;

-- BARBERO 2: Junior (Miguel)
INSERT INTO barberos (
  nombre,
  apellido,
  email,
  telefono,
  especialidad,
  anos_experiencia,
  foto_url,
  activo,
  descripcion_corta,
  instagram,
  calificacion_promedio
)
VALUES (
  'Miguel',
  'Rodríguez',
  'miguel@chamosbarber.com',
  '+56987654321',
  'Barba y tratamientos faciales',
  3,
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
  true,
  'Especialista en cuidado de barba y tratamientos. Atención personalizada.',
  '@miguel_barbershop',
  4.5
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 🕐 4. HORARIOS BARBEROS (Lun-Sáb: 9:00-19:00)
-- ============================================

-- Horarios para Carlos (barbero_id obtenido dinámicamente)
DO $$
DECLARE
  carlos_id UUID;
  dia INT;
BEGIN
  -- Obtener ID de Carlos
  SELECT id INTO carlos_id FROM barberos WHERE email = 'carlos@chamosbarber.com' LIMIT 1;
  
  IF carlos_id IS NOT NULL THEN
    -- Lunes a Sábado (1-6)
    FOR dia IN 1..6 LOOP
      INSERT INTO horarios_barberos (barbero_id, dia_semana, hora_inicio, hora_fin, activo)
      VALUES (carlos_id, dia, '09:00', '19:00', true)
      ON CONFLICT (barbero_id, dia_semana) DO UPDATE
      SET hora_inicio = '09:00', hora_fin = '19:00', activo = true;
    END LOOP;
  END IF;
END $$;

-- Horarios para Miguel
DO $$
DECLARE
  miguel_id UUID;
  dia INT;
BEGIN
  -- Obtener ID de Miguel
  SELECT id INTO miguel_id FROM barberos WHERE email = 'miguel@chamosbarber.com' LIMIT 1;
  
  IF miguel_id IS NOT NULL THEN
    -- Lunes a Sábado (1-6)
    FOR dia IN 1..6 LOOP
      INSERT INTO horarios_barberos (barbero_id, dia_semana, hora_inicio, hora_fin, activo)
      VALUES (miguel_id, dia, '09:00', '19:00', true)
      ON CONFLICT (barbero_id, dia_semana) DO UPDATE
      SET hora_inicio = '09:00', hora_fin = '19:00', activo = true;
    END LOOP;
  END IF;
END $$;

-- ============================================
-- 📅 5. CITAS DE EJEMPLO (2)
-- ============================================

-- CITA 1: Confirmada (mañana a las 10:00)
DO $$
DECLARE
  carlos_id UUID;
  servicio_fade_id UUID;
  fecha_manana DATE;
BEGIN
  -- Obtener IDs
  SELECT id INTO carlos_id FROM barberos WHERE email = 'carlos@chamosbarber.com' LIMIT 1;
  SELECT id INTO servicio_fade_id FROM servicios WHERE nombre = 'Fade Moderno' LIMIT 1;
  
  -- Fecha mañana
  fecha_manana := CURRENT_DATE + INTERVAL '1 day';
  
  IF carlos_id IS NOT NULL AND servicio_fade_id IS NOT NULL THEN
    INSERT INTO citas (
      barbero_id,
      servicio_id,
      cliente_nombre,
      cliente_email,
      cliente_telefono,
      fecha,
      hora,
      estado,
      notas
    )
    VALUES (
      carlos_id,
      servicio_fade_id,
      'Juan Pérez',
      'juan.test@gmail.com',
      '+56911111111',
      fecha_manana,
      '10:00',
      'confirmada',
      'Cliente regular, prefiere fade bajo'
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- CITA 2: Pendiente (pasado mañana a las 15:00)
DO $$
DECLARE
  miguel_id UUID;
  servicio_barba_id UUID;
  fecha_pasado_manana DATE;
BEGIN
  -- Obtener IDs
  SELECT id INTO miguel_id FROM barberos WHERE email = 'miguel@chamosbarber.com' LIMIT 1;
  SELECT id INTO servicio_barba_id FROM servicios WHERE nombre = 'Barba Premium' LIMIT 1;
  
  -- Fecha pasado mañana
  fecha_pasado_manana := CURRENT_DATE + INTERVAL '2 days';
  
  IF miguel_id IS NOT NULL AND servicio_barba_id IS NOT NULL THEN
    INSERT INTO citas (
      barbero_id,
      servicio_id,
      cliente_nombre,
      cliente_email,
      cliente_telefono,
      fecha,
      hora,
      estado,
      notas
    )
    VALUES (
      miguel_id,
      servicio_barba_id,
      'Pedro González',
      'pedro.test@gmail.com',
      '+56922222222',
      fecha_pasado_manana,
      '15:00',
      'pendiente',
      'Primera vez, consultar por alergias'
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- ✅ VERIFICACIÓN DE DATOS INSERTADOS
-- ============================================

-- Contar registros
SELECT 
  'Categorías' as tabla, COUNT(*) as total FROM categorias_servicios
UNION ALL
SELECT 'Servicios', COUNT(*) FROM servicios
UNION ALL
SELECT 'Barberos', COUNT(*) FROM barberos
UNION ALL
SELECT 'Horarios', COUNT(*) FROM horarios_barberos
UNION ALL
SELECT 'Citas', COUNT(*) FROM citas;

-- Mostrar resumen de barberos y servicios
SELECT 
  b.nombre || ' ' || b.apellido as barbero,
  b.email,
  b.telefono,
  b.especialidad,
  b.anos_experiencia,
  COUNT(h.id) as dias_laborales
FROM barberos b
LEFT JOIN horarios_barberos h ON b.id = h.barbero_id
WHERE b.activo = true
GROUP BY b.id, b.nombre, b.apellido, b.email, b.telefono, b.especialidad, b.anos_experiencia;

-- Mostrar servicios por categoría
SELECT 
  c.nombre as categoria,
  s.nombre as servicio,
  s.precio,
  s.duracion_minutos || ' min' as duracion
FROM servicios s
JOIN categorias_servicios c ON s.categoria_id = c.id
WHERE s.activo = true
ORDER BY c.orden, s.precio;

-- Mostrar citas programadas
SELECT 
  c.fecha,
  c.hora,
  c.cliente_nombre,
  b.nombre || ' ' || b.apellido as barbero,
  s.nombre as servicio,
  c.estado
FROM citas c
JOIN barberos b ON c.barbero_id = b.id
JOIN servicios s ON c.servicio_id = s.id
WHERE c.fecha >= CURRENT_DATE
ORDER BY c.fecha, c.hora;

-- ============================================
-- 📝 NOTAS FINALES
-- ============================================
/*
✅ DATOS CREADOS:
- 3 Categorías de servicios
- 6 Servicios (2 por categoría)
- 2 Barberos (Carlos y Miguel)
- 12 Horarios (6 días x 2 barberos)
- 2 Citas de ejemplo

🔐 USUARIOS DE PRUEBA (crear manualmente en Supabase Auth):

1️⃣ ADMIN:
   Email: admin@chamosbarber.com
   Password: Admin123456!
   → Luego insertar en admin_users con el UUID de Supabase Auth

2️⃣ BARBERO (Carlos):
   Email: carlos@chamosbarber.com
   Password: Carlos123456!
   → Asociar UUID al barbero en tabla barberos

3️⃣ CLIENTE:
   Email: cliente@test.com
   Password: Cliente123456!
   → Solo para probar flujo de reservas

📧 SIGUIENTE PASO:
Ejecutar este SQL en Supabase Dashboard → SQL Editor
*/
