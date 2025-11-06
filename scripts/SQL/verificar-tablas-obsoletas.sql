-- =====================================================
-- SCRIPT: Verificación de Tablas Obsoletas
-- Descripción: Verifica qué tablas y columnas del dashboard existen
--              SIN eliminar nada - Solo diagnóstico
-- Autor: GenSpark AI
-- Fecha: 2025-11-06
-- =====================================================

-- =====================================================
-- DIAGNÓSTICO 1: Tablas del Dashboard
-- =====================================================

SELECT 
    '🔍 TABLAS DEL DASHBOARD' as categoria,
    table_name as nombre,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as tamaño,
    CASE 
        WHEN table_name IN ('barbero_resenas', 'barbero_portfolio', 'barbero_certificaciones', 'barbero_estadisticas')
        THEN '❌ OBSOLETA - Dashboard Profesional'
        WHEN table_name = 'solicitudes_barberos'
        THEN '⚠️ DECISIÓN REQUERIDA - Sistema de Registro'
        ELSE '✅ MANTENER'
    END as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'barbero_resenas',
    'barbero_portfolio',
    'barbero_certificaciones',
    'barbero_estadisticas',
    'solicitudes_barberos'
);

-- =====================================================
-- DIAGNÓSTICO 2: Contar registros en tablas obsoletas
-- =====================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 REGISTROS EN TABLAS OBSOLETAS';
    RAISE NOTICE '========================================';
    
    -- Verificar barbero_resenas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barbero_resenas') THEN
        SELECT COUNT(*) INTO v_count FROM barbero_resenas;
        RAISE NOTICE 'barbero_resenas: % registros', v_count;
    ELSE
        RAISE NOTICE 'barbero_resenas: NO EXISTE';
    END IF;
    
    -- Verificar barbero_portfolio
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barbero_portfolio') THEN
        SELECT COUNT(*) INTO v_count FROM barbero_portfolio;
        RAISE NOTICE 'barbero_portfolio: % registros', v_count;
    ELSE
        RAISE NOTICE 'barbero_portfolio: NO EXISTE';
    END IF;
    
    -- Verificar barbero_certificaciones
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barbero_certificaciones') THEN
        SELECT COUNT(*) INTO v_count FROM barbero_certificaciones;
        RAISE NOTICE 'barbero_certificaciones: % registros', v_count;
    ELSE
        RAISE NOTICE 'barbero_certificaciones: NO EXISTE';
    END IF;
    
    -- Verificar barbero_estadisticas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barbero_estadisticas') THEN
        SELECT COUNT(*) INTO v_count FROM barbero_estadisticas;
        RAISE NOTICE 'barbero_estadisticas: % registros', v_count;
    ELSE
        RAISE NOTICE 'barbero_estadisticas: NO EXISTE';
    END IF;
    
    -- Verificar solicitudes_barberos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'solicitudes_barberos') THEN
        SELECT COUNT(*) INTO v_count FROM solicitudes_barberos;
        RAISE NOTICE 'solicitudes_barberos: % registros', v_count;
    ELSE
        RAISE NOTICE 'solicitudes_barberos: NO EXISTE';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- DIAGNÓSTICO 3: Columnas obsoletas en tabla barberos
-- =====================================================

SELECT 
    '📝 COLUMNAS EN BARBEROS' as categoria,
    column_name as nombre,
    data_type as tipo,
    CASE 
        WHEN column_name IN ('slug', 'instagram')
        THEN '✅ MANTENER - Usadas en sistema actual'
        WHEN column_name IN ('biografia', 'whatsapp', 'facebook', 'twitter', 'tiktok')
        THEN '⚠️ DECISIÓN - Útiles para sistema de registro'
        WHEN column_name IN ('total_clientes', 'total_cortes', 'promedio_calificacion', 'total_resenas')
        THEN '❌ OBSOLETAS - Dashboard Profesional'
        ELSE '❓ VERIFICAR'
    END as estado
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'barberos' 
AND column_name IN (
    'slug',
    'biografia',
    'foto_url',
    'whatsapp',
    'facebook',
    'twitter',
    'tiktok',
    'instagram',
    'certificaciones',
    'idiomas',
    'horario_preferido',
    'disponible_fines_semana',
    'total_clientes',
    'total_cortes',
    'promedio_calificacion',
    'total_resenas'
)
ORDER BY estado DESC, column_name;

-- =====================================================
-- DIAGNÓSTICO 4: Funciones relacionadas con barberos
-- =====================================================

SELECT 
    '🔧 FUNCIONES RELACIONADAS' as categoria,
    routine_name as funcion,
    routine_type as tipo,
    CASE 
        WHEN routine_name LIKE '%slug%' THEN '❌ OBSOLETA - Slug automático'
        WHEN routine_name LIKE '%calificacion%' THEN '❌ OBSOLETA - Sistema de ratings'
        WHEN routine_name LIKE '%solicitud%' THEN '⚠️ DECISIÓN - Sistema de registro'
        WHEN routine_name LIKE '%aprobar%' THEN '⚠️ DECISIÓN - Sistema de aprobación'
        ELSE '❓ VERIFICAR'
    END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%barbero%'
ORDER BY estado DESC, routine_name;

-- =====================================================
-- DIAGNÓSTICO 5: Índices obsoletos
-- =====================================================

SELECT 
    '📇 ÍNDICES' as categoria,
    indexname as nombre,
    tablename as tabla,
    CASE 
        WHEN tablename IN ('barbero_resenas', 'barbero_portfolio', 'barbero_certificaciones', 'barbero_estadisticas')
        THEN '❌ OBSOLETO - Se eliminará con tabla'
        WHEN indexname LIKE '%slug%' AND tablename = 'barberos'
        THEN '✅ MANTENER - Usado en queries'
        ELSE '❓ VERIFICAR'
    END as estado
FROM pg_indexes
WHERE schemaname = 'public'
AND (
    tablename IN ('barbero_resenas', 'barbero_portfolio', 'barbero_certificaciones', 'barbero_estadisticas', 'solicitudes_barberos')
    OR indexname LIKE '%barbero%'
)
ORDER BY estado DESC, tablename, indexname;

-- =====================================================
-- RESUMEN Y RECOMENDACIONES
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '💡 RECOMENDACIONES DE LIMPIEZA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ SEGURO ELIMINAR:';
    RAISE NOTICE '   - barbero_resenas (tabla completa)';
    RAISE NOTICE '   - barbero_portfolio (tabla completa)';
    RAISE NOTICE '   - barbero_certificaciones (tabla completa)';
    RAISE NOTICE '   - barbero_estadisticas (tabla completa)';
    RAISE NOTICE '   - generar_slug_barbero() (función)';
    RAISE NOTICE '   - actualizar_promedio_calificacion_barbero() (función)';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  DECISIÓN REQUERIDA:';
    RAISE NOTICE '   - solicitudes_barberos (tabla)';
    RAISE NOTICE '     * SI mantienes registro de barberos: MANTENER';
    RAISE NOTICE '     * SI NO usas registro de barberos: ELIMINAR';
    RAISE NOTICE '';
    RAISE NOTICE '   - aprobar_solicitud_barbero() (función)';
    RAISE NOTICE '     * Vinculada a solicitudes_barberos';
    RAISE NOTICE '';
    RAISE NOTICE '   - Columnas en tabla barberos:';
    RAISE NOTICE '     * slug, instagram: MANTENER (usadas)';
    RAISE NOTICE '     * biografia, whatsapp, redes sociales: DECISIÓN';
    RAISE NOTICE '     * total_clientes, promedio_calificacion: ELIMINAR';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PRÓXIMO PASO:';
    RAISE NOTICE '   Ejecuta cleanup-dashboard-barberos.sql';
    RAISE NOTICE '   después de revisar estos resultados';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- FIN DEL SCRIPT DE VERIFICACIÓN
-- =====================================================
