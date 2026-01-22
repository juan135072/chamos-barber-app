-- ================================================================
-- 🧪 DATOS DE PRUEBA - CHAMOS BARBER APP
-- ================================================================
-- Este script inserta datos de prueba mínimos para testing
-- ================================================================

-- 1️⃣ INSERTAR CATEGORÍAS DE SERVICIOS
INSERT INTO categorias_servicios (nombre, descripcion, orden, activo)
SELECT 'Cortes', 'Cortes de cabello profesionales y modernos', 1, true
WHERE NOT EXISTS (SELECT 1 FROM categorias_servicios WHERE nombre = 'Cortes');

INSERT INTO categorias_servicios (nombre, descripcion, orden, activo)
SELECT 'Barba', 'Servicios de arreglo y cuidado de barba', 2, true
WHERE NOT EXISTS (SELECT 1 FROM categorias_servicios WHERE nombre = 'Barba');

INSERT INTO categorias_servicios (nombre, descripcion, orden, activo)
SELECT 'Tratamientos', 'Tratamientos capilares y faciales', 3, true
WHERE NOT EXISTS (SELECT 1 FROM categorias_servicios WHERE nombre = 'Tratamientos');

-- 2️⃣ INSERTAR SERVICIOS (usando variables temporales)
DO $$
DECLARE
  cat_cortes_id UUID;
  cat_barba_id UUID;
  cat_tratamientos_id UUID;
BEGIN
  -- Obtener IDs de categorías
  SELECT id INTO cat_cortes_id FROM categorias_servicios WHERE nombre = 'Cortes';
  SELECT id INTO cat_barba_id FROM categorias_servicios WHERE nombre = 'Barba';
  SELECT id INTO cat_tratamientos_id FROM categorias_servicios WHERE nombre = 'Tratamientos';
  
  -- Servicios de CORTES
  IF NOT EXISTS (SELECT 1 FROM servicios WHERE nombre = 'Corte Clásico') THEN
    INSERT INTO servicios (nombre, descripcion, precio, duracion, categoria_id, activo, imagen_url)
    VALUES (
      'Corte Clásico', 
      'Corte tradicional con tijera y máquina, incluye lavado', 
      8000, 
      30, 
      cat_cortes_id, 
      true, 
      'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=400'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM servicios WHERE nombre = 'Fade Moderno') THEN
    INSERT INTO servicios (nombre, descripcion, precio, duracion, categoria_id, activo, imagen_url)
    VALUES (
      'Fade Moderno', 
      'Degradado profesional con diseño, incluye lavado y acabado', 
      12000, 
      45, 
      cat_cortes_id, 
      true, 
      'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400'
    );
  END IF;
  
  -- Servicios de BARBA
  IF NOT EXISTS (SELECT 1 FROM servicios WHERE nombre = 'Arreglo de Barba') THEN
    INSERT INTO servicios (nombre, descripcion, precio, duracion, categoria_id, activo, imagen_url)
    VALUES (
      'Arreglo de Barba', 
      'Perfilado y arreglo completo de barba con navaja', 
      6000, 
      20, 
      cat_barba_id, 
      true, 
      'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM servicios WHERE nombre = 'Barba Premium') THEN
    INSERT INTO servicios (nombre, descripcion, precio, duracion, categoria_id, activo, imagen_url)
    VALUES (
      'Barba Premium', 
      'Arreglo completo con toalla caliente, aceites y masaje facial', 
      10000, 
      35, 
      cat_barba_id, 
      true, 
      'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400'
    );
  END IF;
  
  -- Servicios de TRATAMIENTOS
  IF NOT EXISTS (SELECT 1 FROM servicios WHERE nombre = 'Tratamiento Capilar') THEN
    INSERT INTO servicios (nombre, descripcion, precio, duracion, categoria_id, activo, imagen_url)
    VALUES (
      'Tratamiento Capilar', 
      'Hidratación profunda y tratamiento anticaída', 
      15000, 
      40, 
      cat_tratamientos_id, 
      true, 
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM servicios WHERE nombre = 'Limpieza Facial') THEN
    INSERT INTO servicios (nombre, descripcion, precio, duracion, categoria_id, activo, imagen_url)
    VALUES (
      'Limpieza Facial', 
      'Limpieza profunda de cutis con mascarilla y extracción', 
      18000, 
      50, 
      cat_tratamientos_id, 
      true, 
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400'
    );
  END IF;
END $$;

-- 3️⃣ INSERTAR BARBEROS
INSERT INTO barberos (nombre, apellido, email, telefono, especialidades, imagen_url, activo, descripcion, instagram, slug)
SELECT 
  'Carlos', 
  'Pérez', 
  'carlos@chamosbarber.com', 
  '+56912345678', 
  ARRAY['Cortes clásicos', 'Fade', 'Diseños'],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 
  true, 
  'Barbero venezolano con 8 años de experiencia. Especialista en fades y diseños modernos.', 
  '@carlos_barber_chile',
  'carlos-perez'
WHERE NOT EXISTS (SELECT 1 FROM barberos WHERE email = 'carlos@chamosbarber.com');

INSERT INTO barberos (nombre, apellido, email, telefono, especialidades, imagen_url, activo, descripcion, instagram, slug)
SELECT 
  'Miguel', 
  'Rodríguez', 
  'miguel@chamosbarber.com', 
  '+56987654321', 
  ARRAY['Barba', 'Tratamientos faciales', 'Afeitado clásico'],
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 
  true, 
  'Especialista en cuidado de barba y tratamientos faciales. Atención personalizada y dedicada.', 
  '@miguel_barbershop',
  'miguel-rodriguez'
WHERE NOT EXISTS (SELECT 1 FROM barberos WHERE email = 'miguel@chamosbarber.com');

-- 4️⃣ INSERTAR HORARIOS DE ATENCIÓN (lunes a sábado 9:00-19:00)
DO $$
DECLARE
  barbero_record RECORD;
  dia_num INT;
BEGIN
  -- Para cada barbero activo
  FOR barbero_record IN SELECT id FROM barberos WHERE activo = true LOOP
    -- Para días 1 (lunes) a 6 (sábado)
    FOR dia_num IN 1..6 LOOP
      -- Insertar si no existe
      IF NOT EXISTS (
        SELECT 1 FROM horarios_atencion 
        WHERE barbero_id = barbero_record.id 
        AND dia_semana = dia_num
      ) THEN
        INSERT INTO horarios_atencion (barbero_id, dia_semana, hora_inicio, hora_fin, activo)
        VALUES (barbero_record.id, dia_num, '09:00'::TIME, '19:00'::TIME, true);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 5️⃣ INSERTAR CITAS DE EJEMPLO
DO $$
DECLARE
  carlos_uuid UUID;
  miguel_uuid UUID;
  servicio_fade_uuid UUID;
  servicio_barba_uuid UUID;
  fecha_manana DATE;
  fecha_pasado_manana DATE;
BEGIN
  -- Obtener IDs
  SELECT id INTO carlos_uuid FROM barberos WHERE email = 'carlos@chamosbarber.com';
  SELECT id INTO miguel_uuid FROM barberos WHERE email = 'miguel@chamosbarber.com';
  SELECT id INTO servicio_fade_uuid FROM servicios WHERE nombre = 'Fade Moderno';
  SELECT id INTO servicio_barba_uuid FROM servicios WHERE nombre = 'Barba Premium';
  
  -- Fechas futuras
  fecha_manana := CURRENT_DATE + INTERVAL '1 day';
  fecha_pasado_manana := CURRENT_DATE + INTERVAL '2 days';
  
  -- Cita 1: Carlos - Fade Moderno (mañana a las 10:00)
  IF carlos_uuid IS NOT NULL AND servicio_fade_uuid IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM citas 
      WHERE barbero_id = carlos_uuid 
      AND fecha = fecha_manana 
      AND hora = '10:00'::TIME
    ) THEN
      INSERT INTO citas (barbero_id, servicio_id, cliente_nombre, cliente_email, cliente_telefono, fecha, hora, estado, notas)
      VALUES (
        carlos_uuid, 
        servicio_fade_uuid, 
        'Juan Pérez', 
        'juan.test@gmail.com', 
        '+56911111111', 
        fecha_manana, 
        '10:00'::TIME, 
        'confirmada', 
        'Cliente regular, prefiere fade bajo'
      );
    END IF;
  END IF;
  
  -- Cita 2: Miguel - Barba Premium (pasado mañana a las 15:00)
  IF miguel_uuid IS NOT NULL AND servicio_barba_uuid IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM citas 
      WHERE barbero_id = miguel_uuid 
      AND fecha = fecha_pasado_manana 
      AND hora = '15:00'::TIME
    ) THEN
      INSERT INTO citas (barbero_id, servicio_id, cliente_nombre, cliente_email, cliente_telefono, fecha, hora, estado, notas)
      VALUES (
        miguel_uuid, 
        servicio_barba_uuid, 
        'Pedro González', 
        'pedro.test@gmail.com', 
        '+56922222222', 
        fecha_pasado_manana, 
        '15:00'::TIME, 
        'pendiente', 
        'Primera vez, consultar por alergias'
      );
    END IF;
  END IF;
END $$;

-- ================================================================
-- ✅ VERIFICACIÓN FINAL
-- ================================================================
SELECT 
  'Categorías' as tabla, 
  COUNT(*) as total 
FROM categorias_servicios
UNION ALL 
SELECT 'Servicios', COUNT(*) FROM servicios
UNION ALL 
SELECT 'Barberos', COUNT(*) FROM barberos
UNION ALL 
SELECT 'Horarios', COUNT(*) FROM horarios_atencion
UNION ALL 
SELECT 'Citas', COUNT(*) FROM citas
ORDER BY tabla;

-- ================================================================
-- 📋 RESUMEN DE DATOS INSERTADOS
-- ================================================================
-- ✅ 3 categorías: Cortes, Barba, Tratamientos
-- ✅ 6 servicios (2 por categoría)
-- ✅ 2 barberos: Carlos Pérez, Miguel Rodríguez
-- ✅ 12 horarios (6 días x 2 barberos)
-- ✅ 2 citas de ejemplo (1 confirmada, 1 pendiente)
-- ================================================================
