-- =====================================================
-- SCRIPT: Diagnóstico de Errores en Reservas
-- Descripción: Identifica por qué las reservas no se guardan
-- Fecha: 2025-11-06
-- =====================================================

-- =====================================================
-- PASO 1: Verificar que la tabla citas existe
-- =====================================================
SELECT 
    'TABLA CITAS' as verificacion,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'citas')
        THEN '✅ EXISTE'
        ELSE '❌ NO EXISTE'
    END as resultado;

-- =====================================================
-- PASO 2: Verificar estructura de la tabla citas
-- =====================================================
SELECT 
    column_name as columna,
    data_type as tipo,
    is_nullable as nullable,
    column_default as default_value
FROM information_schema.columns
WHERE table_name = 'citas'
ORDER BY ordinal_position;

-- =====================================================
-- PASO 3: Verificar si RLS está habilitado
-- =====================================================
SELECT 
    'RLS HABILITADO' as verificacion,
    CASE 
        WHEN rowsecurity THEN '✅ SÍ (esto es BUENO)'
        ELSE '❌ NO (esto puede causar problemas)'
    END as resultado
FROM pg_tables 
WHERE tablename = 'citas' AND schemaname = 'public';

-- =====================================================
-- PASO 4: Listar políticas RLS existentes
-- =====================================================
SELECT 
    '🔐 POLÍTICAS RLS ACTUALES' as categoria,
    policyname as nombre_politica,
    cmd as comando,
    CASE 
        WHEN roles = '{anon}' THEN '👤 anon (usuarios NO autenticados)'
        WHEN roles = '{authenticated}' THEN '🔑 authenticated (usuarios CON login)'
        WHEN roles = '{service_role}' THEN '⚙️ service_role (backend)'
        ELSE roles::text
    END as rol,
    CASE 
        WHEN qual::text = 'true' THEN '✅ Sin restricción'
        ELSE '⚠️ Con restricción: ' || qual::text
    END as condicion_using,
    CASE 
        WHEN with_check::text = 'true' THEN '✅ Sin restricción'
        WHEN with_check IS NULL THEN '➖ No aplica'
        ELSE '⚠️ Con restricción: ' || with_check::text
    END as condicion_with_check
FROM pg_policies 
WHERE tablename = 'citas'
ORDER BY cmd, policyname;

-- =====================================================
-- PASO 5: Verificar constraint único (puede causar duplicados)
-- =====================================================
SELECT 
    '🔒 CONSTRAINTS' as categoria,
    conname as nombre_constraint,
    pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'citas'::regclass
AND conname LIKE '%unique%';

-- =====================================================
-- PASO 6: Contar citas existentes
-- =====================================================
SELECT 
    '📊 CITAS EXISTENTES' as categoria,
    COUNT(*) as total,
    COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
    COUNT(CASE WHEN estado = 'confirmada' THEN 1 END) as confirmadas,
    COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) as canceladas
FROM citas;

-- =====================================================
-- PASO 7: Ver últimas 5 citas creadas
-- =====================================================
SELECT 
    id,
    cliente_nombre,
    fecha,
    hora,
    estado,
    created_at,
    CASE 
        WHEN created_at > NOW() - INTERVAL '1 hour' THEN '🆕 Reciente'
        WHEN created_at > NOW() - INTERVAL '1 day' THEN '📅 Hoy'
        ELSE '📆 Anterior'
    END as antiguedad
FROM citas 
ORDER BY created_at DESC 
LIMIT 5;

-- =====================================================
-- PASO 8: Verificar barberos y servicios (FK)
-- =====================================================
SELECT 
    'BARBEROS ACTIVOS' as categoria,
    COUNT(*) as cantidad
FROM barberos
WHERE activo = true
UNION ALL
SELECT 
    'SERVICIOS ACTIVOS' as categoria,
    COUNT(*) as cantidad
FROM servicios
WHERE activo = true;

-- =====================================================
-- PASO 9: Probar INSERT manual (simular reserva)
-- =====================================================
-- COMENTADO: Descomenta para probar manualmente
/*
DO $$
DECLARE
    v_barbero_id UUID;
    v_servicio_id UUID;
    v_cita_id UUID;
BEGIN
    -- Obtener primer barbero activo
    SELECT id INTO v_barbero_id FROM barberos WHERE activo = true LIMIT 1;
    
    -- Obtener primer servicio activo
    SELECT id INTO v_servicio_id FROM servicios WHERE activo = true LIMIT 1;
    
    -- Intentar insertar cita de prueba
    INSERT INTO citas (
        servicio_id,
        barbero_id,
        fecha,
        hora,
        cliente_nombre,
        cliente_telefono,
        estado
    ) VALUES (
        v_servicio_id,
        v_barbero_id,
        CURRENT_DATE + INTERVAL '1 day',
        '10:00',
        'TEST - Usuario de Prueba',
        '+56912345678',
        'pendiente'
    ) RETURNING id INTO v_cita_id;
    
    RAISE NOTICE '✅ CITA DE PRUEBA CREADA CON ID: %', v_cita_id;
    
    -- Eliminar la cita de prueba
    DELETE FROM citas WHERE id = v_cita_id;
    RAISE NOTICE '🗑️ Cita de prueba eliminada';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR AL CREAR CITA DE PRUEBA: %', SQLERRM;
END $$;
*/

-- =====================================================
-- PASO 10: Diagnóstico de problemas comunes
-- =====================================================
DO $$
DECLARE
    v_rls_habilitado BOOLEAN;
    v_tiene_politica_anon BOOLEAN;
    v_tiene_barberos BOOLEAN;
    v_tiene_servicios BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 DIAGNÓSTICO DE PROBLEMAS';
    RAISE NOTICE '========================================';
    
    -- Verificar RLS
    SELECT rowsecurity INTO v_rls_habilitado
    FROM pg_tables 
    WHERE tablename = 'citas' AND schemaname = 'public';
    
    IF NOT v_rls_habilitado THEN
        RAISE NOTICE '⚠️ PROBLEMA: RLS no está habilitado en tabla citas';
        RAISE NOTICE '   SOLUCIÓN: Ejecutar fix-citas-rls.sql';
    ELSE
        RAISE NOTICE '✅ RLS está habilitado';
    END IF;
    
    -- Verificar política para anon
    SELECT EXISTS(
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'citas' 
        AND cmd = 'INSERT' 
        AND roles = '{anon}'
    ) INTO v_tiene_politica_anon;
    
    IF NOT v_tiene_politica_anon THEN
        RAISE NOTICE '❌ PROBLEMA: No existe política INSERT para usuarios anónimos';
        RAISE NOTICE '   SOLUCIÓN: Ejecutar fix-citas-rls.sql';
    ELSE
        RAISE NOTICE '✅ Existe política INSERT para anon';
    END IF;
    
    -- Verificar barberos
    SELECT EXISTS(
        SELECT 1 FROM barberos WHERE activo = true
    ) INTO v_tiene_barberos;
    
    IF NOT v_tiene_barberos THEN
        RAISE NOTICE '❌ PROBLEMA: No hay barberos activos';
        RAISE NOTICE '   SOLUCIÓN: Activar al menos un barbero en panel admin';
    ELSE
        RAISE NOTICE '✅ Hay barberos activos';
    END IF;
    
    -- Verificar servicios
    SELECT EXISTS(
        SELECT 1 FROM servicios WHERE activo = true
    ) INTO v_tiene_servicios;
    
    IF NOT v_tiene_servicios THEN
        RAISE NOTICE '❌ PROBLEMA: No hay servicios activos';
        RAISE NOTICE '   SOLUCIÓN: Activar al menos un servicio en panel admin';
    ELSE
        RAISE NOTICE '✅ Hay servicios activos';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- RESUMEN DE CAUSAS POSIBLES
-- =====================================================
-- ❌ RLS no habilitado → fix-citas-rls.sql
-- ❌ Falta política INSERT para anon → fix-citas-rls.sql
-- ❌ No hay barberos activos → Activar desde panel admin
-- ❌ No hay servicios activos → Activar desde panel admin
-- ❌ Constraint único bloqueando → Normal, es protección
-- ❌ Error en frontend → Revisar consola del navegador
-- =====================================================

-- =====================================================
-- FIN DEL DIAGNÓSTICO
-- =====================================================
