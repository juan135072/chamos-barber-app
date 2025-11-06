-- =====================================================
-- SCRIPT: Limpieza de Tablas Obsoletas del Dashboard
-- Descripción: Elimina todas las tablas, funciones y políticas
--              relacionadas con el dashboard profesional de barberos
-- Autor: GenSpark AI
-- Fecha: 2025-11-06
-- =====================================================

-- =====================================================
-- PASO 1: Verificar qué tablas existen actualmente
-- =====================================================
SELECT 
    'TABLAS EXISTENTES' as categoria,
    table_name as nombre,
    'TABLE' as tipo
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'barbero_resenas',
    'barbero_portfolio',
    'barbero_certificaciones',
    'barbero_estadisticas',
    'solicitudes_barberos'
)
UNION ALL
SELECT 
    'COLUMNAS EN BARBEROS' as categoria,
    column_name as nombre,
    'COLUMN' as tipo
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'barberos' 
AND column_name IN (
    'biografia',
    'foto_url',
    'whatsapp',
    'facebook',
    'twitter',
    'tiktok',
    'certificaciones',
    'idiomas',
    'horario_preferido',
    'disponible_fines_semana',
    'total_clientes',
    'total_cortes',
    'promedio_calificacion',
    'total_resenas'
)
ORDER BY categoria, nombre;

-- =====================================================
-- PASO 2: Eliminar tablas del dashboard (en orden correcto)
-- =====================================================

-- Eliminar tabla de reseñas
DROP TABLE IF EXISTS public.barbero_resenas CASCADE;

-- Eliminar tabla de portfolio
DROP TABLE IF EXISTS public.barbero_portfolio CASCADE;

-- Eliminar tabla de certificaciones
DROP TABLE IF EXISTS public.barbero_certificaciones CASCADE;

-- Eliminar tabla de estadísticas
DROP TABLE IF EXISTS public.barbero_estadisticas CASCADE;

-- Eliminar tabla de solicitudes de barberos (si existe)
DROP TABLE IF EXISTS public.solicitudes_barberos CASCADE;

-- =====================================================
-- PASO 3: Eliminar funciones relacionadas
-- =====================================================

-- Función de slug de barberos
DROP FUNCTION IF EXISTS public.generar_slug_barbero() CASCADE;

-- Función de actualización de calificaciones
DROP FUNCTION IF EXISTS public.actualizar_promedio_calificacion_barbero() CASCADE;

-- Función de actualización de updated_at para solicitudes
DROP FUNCTION IF EXISTS public.update_solicitudes_barberos_updated_at() CASCADE;

-- Función de aprobación de solicitudes de barberos
DROP FUNCTION IF EXISTS public.aprobar_solicitud_barbero(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.aprobar_solicitud_barbero(uuid, text, uuid) CASCADE;

-- =====================================================
-- PASO 4: Eliminar columnas obsoletas de la tabla barberos
-- =====================================================

-- Nota: Solo eliminar estas columnas si NO las necesitas para
-- el sistema de registro de barberos (Opción 1 que elegiste)
-- Si decides mantener el registro de barberos, OMITE esta sección

-- COMENTADO por seguridad - Descomenta solo si estás seguro
/*
ALTER TABLE public.barberos 
DROP COLUMN IF EXISTS biografia,
DROP COLUMN IF EXISTS foto_url,
DROP COLUMN IF EXISTS whatsapp,
DROP COLUMN IF EXISTS facebook,
DROP COLUMN IF EXISTS twitter,
DROP COLUMN IF EXISTS tiktok,
DROP COLUMN IF EXISTS certificaciones,
DROP COLUMN IF EXISTS idiomas,
DROP COLUMN IF EXISTS horario_preferido,
DROP COLUMN IF EXISTS disponible_fines_semana,
DROP COLUMN IF EXISTS total_clientes,
DROP COLUMN IF EXISTS total_cortes,
DROP COLUMN IF EXISTS promedio_calificacion,
DROP COLUMN IF EXISTS total_resenas;
*/

-- =====================================================
-- PASO 5: Verificar limpieza
-- =====================================================

SELECT 
    'DESPUÉS DE LIMPIEZA' as status,
    COUNT(*) as tablas_dashboard_restantes
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'barbero_resenas',
    'barbero_portfolio',
    'barbero_certificaciones',
    'barbero_estadisticas'
);

-- =====================================================
-- PASO 6: Listar funciones restantes relacionadas con barberos
-- =====================================================

SELECT 
    routine_name as funcion,
    routine_type as tipo
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%barbero%'
ORDER BY routine_name;

-- =====================================================
-- RESUMEN DE LIMPIEZA
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ LIMPIEZA COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Tablas eliminadas:';
    RAISE NOTICE '   - barbero_resenas';
    RAISE NOTICE '   - barbero_portfolio';
    RAISE NOTICE '   - barbero_certificaciones';
    RAISE NOTICE '   - barbero_estadisticas';
    RAISE NOTICE '   - solicitudes_barberos';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Funciones eliminadas:';
    RAISE NOTICE '   - generar_slug_barbero()';
    RAISE NOTICE '   - actualizar_promedio_calificacion_barbero()';
    RAISE NOTICE '   - update_solicitudes_barberos_updated_at()';
    RAISE NOTICE '   - aprobar_solicitud_barbero()';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  NOTA: Las columnas en la tabla "barberos"';
    RAISE NOTICE '   NO fueron eliminadas por seguridad.';
    RAISE NOTICE '   Si deseas eliminarlas, descomenta el PASO 4.';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
