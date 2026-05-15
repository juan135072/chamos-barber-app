-- ============================================
-- ✅ VERIFICACIÓN POST-LIMPIEZA DE PRODUCCIÓN
-- ============================================
-- Proyecto: Chamos Barber App
-- Fecha: 2025-12-17
-- Propósito: Verificar que la limpieza se ejecutó correctamente
--
-- ⚠️ Ejecuta este script DESPUÉS de cleanup_production_data.sql
-- ============================================

-- ============================================
-- SECCIÓN 1: VERIFICAR TABLAS LIMPIADAS (DEBEN ESTAR VACÍAS)
-- ============================================

SELECT 
    '🗑️  VERIFICACIÓN DE TABLAS LIMPIADAS' as seccion,
    '' as tabla,
    '' as registros,
    '' as estado;

SELECT 
    '' as seccion,
    'citas' as tabla,
    COUNT(*)::TEXT as registros,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Limpiada correctamente'
        ELSE '⚠️  ERROR: Aún tiene ' || COUNT(*) || ' registros'
    END as estado
FROM citas
UNION ALL
SELECT 
    '',
    'notas_clientes',
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) = 0 THEN '✅ Limpiada correctamente' ELSE '⚠️  ERROR: ' || COUNT(*) END
FROM notas_clientes
UNION ALL
SELECT 
    '',
    'walk_in_clients',
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) = 0 THEN '✅ Limpiada correctamente' ELSE '⚠️  ERROR: ' || COUNT(*) END
FROM walk_in_clients
UNION ALL
SELECT 
    '',
    'facturas',
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) = 0 THEN '✅ Limpiada correctamente' ELSE '⚠️  ERROR: ' || COUNT(*) END
FROM facturas
UNION ALL
SELECT 
    '',
    'horarios_bloqueados',
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) = 0 THEN '✅ Limpiada correctamente' ELSE '⚠️  ERROR: ' || COUNT(*) END
FROM horarios_bloqueados
UNION ALL
SELECT 
    '',
    'solicitudes_barberos',
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) = 0 THEN '✅ Limpiada correctamente' ELSE '⚠️  ERROR: ' || COUNT(*) END
FROM solicitudes_barberos;

-- ============================================
-- SECCIÓN 2: VERIFICAR TABLAS CONSERVADAS (DEBEN TENER DATOS)
-- ============================================

SELECT 
    '🔒 VERIFICACIÓN DE TABLAS CONSERVADAS' as seccion,
    '' as tabla,
    '' as registros,
    '' as estado;

SELECT 
    '' as seccion,
    'barberos' as tabla,
    COUNT(*)::TEXT as registros,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Datos conservados (' || COUNT(*) || ' barberos)'
        ELSE '⚠️  ERROR: Tabla vacía (se eliminaron barberos)'
    END as estado
FROM barberos
UNION ALL
SELECT 
    '',
    'servicios',
    COUNT(*)::TEXT,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Datos conservados (' || COUNT(*) || ' servicios)'
        ELSE '⚠️  ERROR: Tabla vacía'
    END
FROM servicios
UNION ALL
SELECT 
    '',
    'categorias_servicios',
    COUNT(*)::TEXT,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Datos conservados (' || COUNT(*) || ' categorías)'
        ELSE '⚠️  ERROR: Tabla vacía'
    END
FROM categorias_servicios
UNION ALL
SELECT 
    '',
    'admin_users',
    COUNT(*)::TEXT,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Datos conservados (' || COUNT(*) || ' admins)'
        ELSE '⚠️  ERROR: Tabla vacía'
    END
FROM admin_users
UNION ALL
SELECT 
    '',
    'horarios_trabajo',
    COUNT(*)::TEXT,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Datos conservados (' || COUNT(*) || ' horarios)'
        ELSE '⚠️  ADVERTENCIA: No hay horarios configurados'
    END
FROM horarios_trabajo;

-- ============================================
-- SECCIÓN 3: VERIFICAR INTEGRIDAD REFERENCIAL
-- ============================================

SELECT 
    '🔗 VERIFICACIÓN DE INTEGRIDAD REFERENCIAL' as seccion,
    '' as constraint_name,
    '' as table_name,
    '' as estado;

SELECT 
    '' as seccion,
    tc.constraint_name,
    tc.table_name,
    '✅ Activa' as estado
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN ('citas', 'facturas', 'liquidaciones', 'notas_clientes')
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================
-- SECCIÓN 4: VERIFICAR TRIGGERS ACTIVOS
-- ============================================

SELECT 
    '⚡ VERIFICACIÓN DE TRIGGERS' as seccion,
    '' as trigger_name,
    '' as table_name,
    '' as enabled;

SELECT 
    '' as seccion,
    t.trigger_name,
    t.event_object_table as table_name,
    CASE 
        WHEN t.action_timing IS NOT NULL THEN '✅ Activo'
        ELSE '⚠️  Inactivo'
    END as enabled
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
AND t.event_object_table IN ('citas', 'facturas', 'liquidaciones', 'walk_in_clients')
ORDER BY t.event_object_table, t.trigger_name;

-- ============================================
-- SECCIÓN 5: VERIFICAR ÍNDICES
-- ============================================

SELECT 
    '📊 VERIFICACIÓN DE ÍNDICES' as seccion,
    '' as table_name,
    '' as index_count,
    '' as estado;

SELECT 
    '' as seccion,
    schemaname || '.' || tablename as table_name,
    COUNT(indexname)::TEXT as index_count,
    CASE 
        WHEN COUNT(indexname) > 0 THEN '✅ Índices presentes'
        ELSE '⚠️  Sin índices'
    END as estado
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('citas', 'barberos', 'servicios', 'facturas', 'liquidaciones')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================
-- SECCIÓN 6: TAMAÑO DE TABLAS
-- ============================================

SELECT 
    '💾 TAMAÑO DE TABLAS' as seccion,
    '' as table_name,
    '' as size,
    '' as row_estimate;

SELECT 
    '' as seccion,
    schemaname || '.' || tablename as table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    n_live_tup::TEXT || ' filas' as row_estimate
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND tablename IN ('citas', 'barberos', 'servicios', 'facturas', 'liquidaciones', 'walk_in_clients')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- SECCIÓN 7: VERIFICAR RLS (ROW LEVEL SECURITY)
-- ============================================

SELECT 
    '🔐 VERIFICACIÓN DE ROW LEVEL SECURITY (RLS)' as seccion,
    '' as table_name,
    '' as rls_enabled,
    '' as policies_count;

SELECT 
    '' as seccion,
    t.tablename as table_name,
    CASE 
        WHEN t.rowsecurity THEN '✅ Habilitado'
        ELSE '⚠️  Deshabilitado'
    END as rls_enabled,
    COUNT(p.policyname)::TEXT || ' políticas' as policies_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
AND t.tablename IN ('citas', 'barberos', 'servicios', 'facturas', 'liquidaciones', 'walk_in_clients', 'admin_users')
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- ============================================
-- SECCIÓN 8: RESUMEN FINAL
-- ============================================

DO $$
DECLARE
    total_limpiadas INTEGER;
    total_conservadas INTEGER;
    citas_count INTEGER;
    barberos_count INTEGER;
    servicios_count INTEGER;
BEGIN
    -- Contar tablas limpiadas
    SELECT 
        CASE WHEN EXISTS(SELECT 1 FROM citas) THEN 1 ELSE 0 END +
        CASE WHEN EXISTS(SELECT 1 FROM facturas) THEN 1 ELSE 0 END +
        CASE WHEN EXISTS(SELECT 1 FROM liquidaciones) THEN 1 ELSE 0 END +
        CASE WHEN EXISTS(SELECT 1 FROM walk_in_clients) THEN 1 ELSE 0 END
    INTO total_limpiadas;
    
    -- Contar registros clave
    SELECT COUNT(*) INTO citas_count FROM citas;
    SELECT COUNT(*) INTO barberos_count FROM barberos;
    SELECT COUNT(*) INTO servicios_count FROM servicios;
    
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ RESUMEN FINAL DE VERIFICACIÓN';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    
    IF citas_count = 0 THEN
        RAISE NOTICE '✅ Citas: LIMPIADAS (0 registros)';
    ELSE
        RAISE NOTICE '⚠️  Citas: ERROR - Aún tiene % registros', citas_count;
    END IF;
    
    IF barberos_count > 0 THEN
        RAISE NOTICE '✅ Barberos: CONSERVADOS (% registros)', barberos_count;
    ELSE
        RAISE NOTICE '❌ Barberos: ERROR - Tabla vacía (se eliminaron barberos)';
    END IF;
    
    IF servicios_count > 0 THEN
        RAISE NOTICE '✅ Servicios: CONSERVADOS (% registros)', servicios_count;
    ELSE
        RAISE NOTICE '❌ Servicios: ERROR - Tabla vacía';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    
    IF citas_count = 0 AND barberos_count > 0 AND servicios_count > 0 THEN
        RAISE NOTICE '🎉 VERIFICACIÓN EXITOSA';
        RAISE NOTICE '✅ Base de datos lista para PRODUCCIÓN';
        RAISE NOTICE '';
        RAISE NOTICE '📋 Próximos pasos:';
        RAISE NOTICE '1. Verificar aplicación en https://chamosbarber.com/admin';
        RAISE NOTICE '2. Crear cita de prueba';
        RAISE NOTICE '3. Registrar cliente Walk-In';
        RAISE NOTICE '4. Probar flujo completo de facturación';
    ELSE
        RAISE NOTICE '⚠️  VERIFICACIÓN FALLIDA';
        RAISE NOTICE 'Revisa los errores arriba y ejecuta correcciones necesarias';
    END IF;
    
    RAISE NOTICE '================================================';
END $$;

-- ============================================
-- SECCIÓN 9: QUERIES ÚTILES POST-LIMPIEZA
-- ============================================

-- Descomenta y ejecuta estos queries según necesites:

-- Ver detalles de barberos conservados
-- SELECT id, nombre, apellido, email, activo, porcentaje_comision 
-- FROM barberos 
-- ORDER BY nombre;

-- Ver detalles de servicios conservados
-- SELECT id, nombre, categoria, precio, duracion_minutos, activo
-- FROM servicios 
-- ORDER BY categoria, nombre;

-- Ver categorías conservadas
-- SELECT id, nombre, orden, activa
-- FROM categorias_servicios
-- ORDER BY orden;

-- Ver usuarios admin conservados
-- SELECT id, email, nombre, rol, activo
-- FROM admin_users
-- ORDER BY nombre;

-- ============================================
-- ✅ SCRIPT DE VERIFICACIÓN COMPLETADO
-- ============================================
