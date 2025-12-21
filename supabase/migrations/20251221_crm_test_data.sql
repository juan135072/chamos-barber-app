-- ================================================================
-- SCRIPT: Insertar Citas de Prueba para Visual CRM
-- Barbero: carlos@chamosbarber.com (Se crea si no existe)
-- ================================================================

DO $$
DECLARE
    v_barbero_id UUID;
    v_servicio_id UUID;
BEGIN
    -- 1. Buscar o Crear Barbero "Carlos"
    SELECT id INTO v_barbero_id
    FROM barberos
    WHERE email ILIKE 'carlos@chamosbarber.com'
    LIMIT 1;

    IF v_barbero_id IS NULL THEN
        RAISE NOTICE '⚠️ Creando barbero de prueba...';
        INSERT INTO barberos (
            nombre, apellido, email, telefono, instagram, 
            descripcion, especialidades, imagen_url, activo, slug
        ) VALUES (
            'Carlos', 'Pérez', 'carlos@chamosbarber.com', '+56912345678', '@carlos_barber',
            'Barbero de prueba para CRM.', ARRAY['Corte General']::TEXT[], 
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
            true, 'carlos-perez-test'
        )
        RETURNING id INTO v_barbero_id;
    ELSE
        RAISE NOTICE '✅ Barbero encontrado: ID %', v_barbero_id;
    END IF;

    -- 2. Obtener un servicio cualquiera
    SELECT id INTO v_servicio_id
    FROM servicios
    WHERE activo = true
    LIMIT 1;

    IF v_servicio_id IS NULL THEN
        RAISE EXCEPTION '❌ No hay servicios activos.';
    END IF;

    -- 3. Insertar CITA PASADA COMPLETADA
    -- NOTA: Tabla 'citas' no tiene 'precio_final' ni 'metodo_pago' (van en facturas)
    INSERT INTO citas (
        cliente_nombre, cliente_telefono, barbero_id, servicio_id,
        fecha, hora, estado, notas, 
        notas_tecnicas, foto_resultado_url
    ) VALUES (
        'Juan Pérez', '+56912345678', v_barbero_id, v_servicio_id,
        CURRENT_DATE - INTERVAL '7 days', '10:00', 'completada', 
        'Cliente frecuente - CRM Test Past',
        'Corte clásico, degradado bajo. Usar tijera entresacadora arriba.',
        'https://images.unsplash.com/photo-1593702295094-aea8c5c13d99?auto=format&fit=crop&q=80&w=300&h=300'
    );

    -- 4. Insertar CITA PENDIENTE PARA HOY
    INSERT INTO citas (
        cliente_nombre, cliente_telefono, barbero_id, servicio_id,
        fecha, hora, estado, notas
    ) VALUES (
        'Juan Pérez', '+56912345678', v_barbero_id, v_servicio_id,
        CURRENT_DATE, '15:00', 'pendiente', 
        'Quiere probar un nuevo estilo - CRM Test Pending'
    );

    RAISE NOTICE '✅ Citas de prueba creadas exitosamente para el barbero id: %', v_barbero_id;
END $$;
