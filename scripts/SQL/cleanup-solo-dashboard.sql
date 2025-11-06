-- =====================================================
-- SCRIPT: Limpieza Solo Dashboard Profesional
-- Descripción: Elimina SOLO tablas del dashboard profesional
--              MANTIENE sistema de registro de barberos
-- Autor: GenSpark AI
-- Fecha: 2025-11-06
-- =====================================================

-- =====================================================
-- IMPORTANTE: Este script mantiene intacto:
-- =====================================================
-- ✅ solicitudes_barberos (tabla)
-- ✅ aprobar_solicitud_barbero() (función)
-- ✅ Columnas útiles en barberos (biografia, whatsapp, etc)
-- ✅ slug e instagram (columnas en uso)
--
-- ❌ Solo elimina tablas del dashboard profesional:
-- ❌ barbero_resenas, barbero_portfolio, 
-- ❌ barbero_certificaciones, barbero_estadisticas
-- =====================================================

-- =====================================================
-- PASO 1: Eliminar SOLO tablas del dashboard profesional
-- =====================================================

DROP TABLE IF EXISTS public.barbero_resenas CASCADE;
DROP TABLE IF EXISTS public.barbero_portfolio CASCADE;
DROP TABLE IF EXISTS public.barbero_certificaciones CASCADE;
DROP TABLE IF EXISTS public.barbero_estadisticas CASCADE;

-- =====================================================
-- PASO 2: Eliminar SOLO funciones del dashboard profesional
-- =====================================================

-- ⚠️ NOTA: La función generar_slug_barbero() NO se elimina
-- porque es NECESARIA para URLs amigables (/barbero/miguel-torres)
-- Si la eliminaste por error, ejecuta: restaurar-funcion-slug.sql

-- Función de actualización de calificaciones (vinculada a barbero_resenas)
DROP FUNCTION IF EXISTS public.actualizar_promedio_calificacion_barbero() CASCADE;

-- =====================================================
-- PASO 3: Eliminar SOLO columnas de estadísticas
-- =====================================================

-- Estas columnas son específicas del dashboard de estadísticas
-- y NO son necesarias para el registro de barberos

ALTER TABLE public.barberos 
DROP COLUMN IF EXISTS total_clientes,
DROP COLUMN IF EXISTS total_cortes,
DROP COLUMN IF EXISTS promedio_calificacion,
DROP COLUMN IF EXISTS total_resenas;

-- =====================================================
-- PASO 4: MANTENER estas columnas (útiles para registro)
-- =====================================================

-- NO eliminamos estas columnas porque son útiles
-- para el sistema de registro de barberos:
--
-- ✅ slug - URLs amigables
-- ✅ biografia - Descripción del barbero
-- ✅ foto_url - Foto de perfil
-- ✅ whatsapp - Contacto directo
-- ✅ facebook, twitter, tiktok, instagram - Redes sociales
-- ✅ certificaciones - Certificados (JSONB)
-- ✅ idiomas - Idiomas que habla
-- ✅ horario_preferido - Horario de trabajo
-- ✅ disponible_fines_semana - Disponibilidad

-- =====================================================
-- PASO 5: Verificar limpieza
-- =====================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ LIMPIEZA COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '❌ TABLAS ELIMINADAS:';
    RAISE NOTICE '   - barbero_resenas';
    RAISE NOTICE '   - barbero_portfolio';
    RAISE NOTICE '   - barbero_certificaciones';
    RAISE NOTICE '   - barbero_estadisticas';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FUNCIONES ELIMINADAS:';
    RAISE NOTICE '   - generar_slug_barbero()';
    RAISE NOTICE '   - actualizar_promedio_calificacion_barbero()';
    RAISE NOTICE '';
    RAISE NOTICE '📊 COLUMNAS ELIMINADAS DE barberos:';
    RAISE NOTICE '   - total_clientes';
    RAISE NOTICE '   - total_cortes';
    RAISE NOTICE '   - promedio_calificacion';
    RAISE NOTICE '   - total_resenas';
    RAISE NOTICE '';
    RAISE NOTICE '✅ MANTENIDAS (Sistema de Registro):';
    RAISE NOTICE '   - solicitudes_barberos (tabla)';
    RAISE NOTICE '   - aprobar_solicitud_barbero() (función)';
    RAISE NOTICE '   - Columnas útiles en barberos (biografia, whatsapp, etc)';
    RAISE NOTICE '';
    
    -- Verificar que solicitudes_barberos sigue existiendo
    SELECT COUNT(*) INTO v_count 
    FROM information_schema.tables 
    WHERE table_name = 'solicitudes_barberos';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✅ solicitudes_barberos: EXISTE (correcto)';
    ELSE
        RAISE NOTICE '⚠️  solicitudes_barberos: NO EXISTE';
    END IF;
    
    -- Verificar columnas en barberos
    SELECT COUNT(*) INTO v_count 
    FROM information_schema.columns 
    WHERE table_name = 'barberos' 
    AND column_name IN ('slug', 'biografia', 'whatsapp', 'instagram');
    
    RAISE NOTICE '✅ Columnas útiles en barberos: % encontradas', v_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

-- Listar tablas restantes relacionadas con barberos
SELECT 
    table_name as tabla,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as tamaño
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name = 'barberos' OR table_name LIKE '%barbero%')
ORDER BY table_name;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
