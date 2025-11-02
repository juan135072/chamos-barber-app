-- ============================================
-- SCRIPT: Insertar Citas de Prueba
-- ============================================
-- Este script inserta 4 citas de demostración con diferentes estados
-- para poder probar la funcionalidad de consulta de citas
-- ============================================

-- ====================
-- PREPARACIÓN: Obtener IDs necesarios
-- ====================

-- Obtener IDs de barberos (usando slugs)
DO $$
DECLARE
  carlos_id UUID;
  miguel_id UUID;
  luis_id UUID;
  jorge_id UUID;
  
  -- IDs de servicios (los obtendremos de la tabla servicios)
  corte_clasico_id UUID;
  fade_id UUID;
  barba_id UUID;
  corte_infantil_id UUID;
  
  -- Fechas para las citas
  fecha_hoy DATE := CURRENT_DATE;
  fecha_manana DATE := CURRENT_DATE + INTERVAL '1 day';
  fecha_proxima_semana DATE := CURRENT_DATE + INTERVAL '7 days';
  fecha_pasada DATE := CURRENT_DATE - INTERVAL '3 days';
  
BEGIN
  -- ====================
  -- PASO 1: Obtener IDs de barberos
  -- ====================
  SELECT id INTO carlos_id FROM barberos WHERE slug = 'carlos-ramirez' LIMIT 1;
  SELECT id INTO miguel_id FROM barberos WHERE slug = 'miguel-torres' LIMIT 1;
  SELECT id INTO luis_id FROM barberos WHERE slug = 'luis-mendoza' LIMIT 1;
  SELECT id INTO jorge_id FROM barberos WHERE slug = 'jorge-silva' LIMIT 1;
  
  -- ====================
  -- PASO 2: Obtener IDs de servicios
  -- ====================
  -- Intentar obtener servicios existentes, si no existen, usaremos los IDs de barberos como fallback
  SELECT id INTO corte_clasico_id FROM servicios WHERE nombre ILIKE '%corte%cl%sico%' OR nombre ILIKE '%corte%caballero%' LIMIT 1;
  SELECT id INTO fade_id FROM servicios WHERE nombre ILIKE '%fade%' OR nombre ILIKE '%degradado%' LIMIT 1;
  SELECT id INTO barba_id FROM servicios WHERE nombre ILIKE '%barba%' LIMIT 1;
  SELECT id INTO corte_infantil_id FROM servicios WHERE nombre ILIKE '%infantil%' OR nombre ILIKE '%ni%o%' LIMIT 1;
  
  -- Si no hay servicios específicos, usar el primer servicio activo para cada cita
  IF corte_clasico_id IS NULL THEN
    SELECT id INTO corte_clasico_id FROM servicios WHERE activo = true ORDER BY precio LIMIT 1;
  END IF;
  
  IF fade_id IS NULL THEN
    SELECT id INTO fade_id FROM servicios WHERE activo = true ORDER BY precio DESC LIMIT 1;
  END IF;
  
  IF barba_id IS NULL THEN
    SELECT id INTO barba_id FROM servicios WHERE activo = true ORDER BY created_at LIMIT 1;
  END IF;
  
  IF corte_infantil_id IS NULL THEN
    SELECT id INTO corte_infantil_id FROM servicios WHERE activo = true ORDER BY updated_at DESC LIMIT 1;
  END IF;
  
  -- ====================
  -- PASO 3: Verificar que tenemos datos necesarios
  -- ====================
  IF carlos_id IS NULL OR miguel_id IS NULL OR luis_id IS NULL OR jorge_id IS NULL THEN
    RAISE EXCEPTION 'No se encontraron todos los barberos necesarios. Ejecuta primero add-slug-and-portfolio.sql';
  END IF;
  
  IF corte_clasico_id IS NULL OR fade_id IS NULL OR barba_id IS NULL OR corte_infantil_id IS NULL THEN
    RAISE EXCEPTION 'No se encontraron servicios en la base de datos. Crea servicios primero.';
  END IF;
  
  -- ====================
  -- PASO 4: Insertar Citas de Prueba
  -- ====================
  
  -- CITA 1: Confirmada - Mañana con Carlos (Corte Clásico)
  INSERT INTO citas (
    barbero_id,
    servicio_id,
    cliente_nombre,
    cliente_telefono,
    cliente_email,
    fecha,
    hora,
    estado,
    notas,
    created_at,
    updated_at
  ) VALUES (
    carlos_id,
    corte_clasico_id,
    'Juan Pérez',
    '+56912345678',
    'juan.perez@example.com',
    fecha_manana,
    '10:00',
    'confirmada',
    'Cliente frecuente, prefiere corte clásico con navaja',
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;
  
  -- CITA 2: Pendiente - Próxima semana con Miguel (Fade)
  INSERT INTO citas (
    barbero_id,
    servicio_id,
    cliente_nombre,
    cliente_telefono,
    cliente_email,
    fecha,
    hora,
    estado,
    notas,
    created_at,
    updated_at
  ) VALUES (
    miguel_id,
    fade_id,
    'María González',
    '+56987654321',
    'maria.gonzalez@example.com',
    fecha_proxima_semana,
    '15:30',
    'pendiente',
    'Primera vez en la barbería, quiere fade medio',
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;
  
  -- CITA 3: Completada - Hace 3 días con Luis (Barba)
  INSERT INTO citas (
    barbero_id,
    servicio_id,
    cliente_nombre,
    cliente_telefono,
    cliente_email,
    fecha,
    hora,
    estado,
    notas,
    created_at,
    updated_at
  ) VALUES (
    luis_id,
    barba_id,
    'Carlos Rodríguez',
    '+56911223344',
    'carlos.rodriguez@example.com',
    fecha_pasada,
    '12:00',
    'completada',
    'Perfilado de barba y tratamiento hidratante',
    NOW() - INTERVAL '3 days',
    NOW()
  ) ON CONFLICT DO NOTHING;
  
  -- CITA 4: Confirmada - Hoy con Jorge (Corte Infantil)
  INSERT INTO citas (
    barbero_id,
    servicio_id,
    cliente_nombre,
    cliente_telefono,
    cliente_email,
    fecha,
    hora,
    estado,
    notas,
    created_at,
    updated_at
  ) VALUES (
    jorge_id,
    corte_infantil_id,
    'Ana Martínez',
    '+56922334455',
    'ana.martinez@example.com',
    fecha_hoy,
    '16:00',
    'confirmada',
    'Corte para niño de 8 años, primera vez',
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;
  
  -- ====================
  -- MENSAJE DE ÉXITO
  -- ====================
  RAISE NOTICE '✅ 4 citas de prueba insertadas exitosamente';
  RAISE NOTICE '📞 Teléfonos de prueba:';
  RAISE NOTICE '   - +56912345678 (Juan Pérez - Confirmada mañana)';
  RAISE NOTICE '   - +56987654321 (María González - Pendiente próxima semana)';
  RAISE NOTICE '   - +56911223344 (Carlos Rodríguez - Completada hace 3 días)';
  RAISE NOTICE '   - +56922334455 (Ana Martínez - Confirmada hoy)';
  
END $$;

-- ====================
-- VERIFICACIÓN: Mostrar citas insertadas
-- ====================

SELECT 
  c.id,
  c.fecha,
  c.hora,
  c.estado,
  c.cliente_nombre,
  c.cliente_telefono,
  b.nombre || ' ' || b.apellido as barbero,
  s.nombre as servicio
FROM citas c
JOIN barberos b ON c.barbero_id = b.id
JOIN servicios s ON c.servicio_id = s.id
WHERE c.cliente_telefono IN ('+56912345678', '+56987654321', '+56911223344', '+56922334455')
ORDER BY c.fecha DESC, c.hora DESC;

-- ====================
-- RESULTADO ESPERADO:
-- ====================
-- ✅ 4 citas insertadas
-- ✅ Diferentes estados: confirmada (2), pendiente (1), completada (1)
-- ✅ Diferentes fechas: hoy (1), mañana (1), próxima semana (1), pasada (1)
-- ✅ Diferentes barberos: Carlos, Miguel, Luis, Jorge
-- ✅ 4 números de teléfono únicos para pruebas
-- ====================

-- ====================
-- NOTAS DE USO:
-- ====================
-- Para probar en la página /consultar:
-- 1. Ve a: https://chamosbarber.com/consultar
-- 2. Ingresa cualquiera de estos teléfonos:
--    • +56912345678
--    • +56987654321
--    • +56911223344
--    • +56922334455
-- 3. Verás las citas correspondientes con todos sus detalles
-- ====================
