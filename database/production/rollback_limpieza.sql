-- ============================================
-- 🔄 ROLLBACK - RESTAURAR DATOS DESDE BACKUP
-- ============================================
-- Proyecto: Chamos Barber App
-- Fecha: 2025-12-17
-- Propósito: Restaurar datos desde tablas de backup
--
-- ⚠️ SOLO EJECUTA ESTE SCRIPT SI:
-- - Ya ejecutaste cleanup_production_data.sql
-- - Ya ejecutaste backup_rapido.sql ANTES de limpiar
-- - Algo salió mal y necesitas restaurar los datos
--
-- ============================================

-- ============================================
-- VERIFICACIÓN PREVIA
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE '🔄 INICIANDO PROCESO DE ROLLBACK';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ADVERTENCIA: Este proceso restaurará TODOS los datos';
    RAISE NOTICE '   de las tablas de backup a las tablas originales.';
    RAISE NOTICE '';
    RAISE NOTICE 'Presiona CTRL+C en los próximos 5 segundos para cancelar...';
    RAISE NOTICE '';
    PERFORM pg_sleep(5);
    RAISE NOTICE '✅ Continuando con rollback...';
    RAISE NOTICE '';
END $$;

-- ============================================
-- PASO 1: VERIFICAR QUE EXISTEN LOS BACKUPS
-- ============================================

DO $$
DECLARE
    tablas_backup TEXT[] := ARRAY[
        'backup_citas',
        'backup_facturas',
        'backup_liquidaciones',
        'backup_notas_clientes',
        'backup_walk_in_clients',
        'backup_horarios_bloqueados',
        'backup_solicitudes_barberos'
    ];
    tabla TEXT;
    existe BOOLEAN;
BEGIN
    RAISE NOTICE '📋 Verificando existencia de tablas de backup...';
    RAISE NOTICE '';
    
    FOREACH tabla IN ARRAY tablas_backup
    LOOP
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = tabla
        ) INTO existe;
        
        IF existe THEN
            RAISE NOTICE '✅ % existe', tabla;
        ELSE
            RAISE NOTICE '⚠️  % NO EXISTE (se saltará)', tabla;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- ============================================
-- PASO 2: DESHABILITAR TRIGGERS
-- ============================================

ALTER TABLE citas DISABLE TRIGGER ALL;
ALTER TABLE facturas DISABLE TRIGGER ALL;
ALTER TABLE liquidaciones DISABLE TRIGGER ALL;
ALTER TABLE notas_clientes DISABLE TRIGGER ALL;
ALTER TABLE walk_in_clients DISABLE TRIGGER ALL;
ALTER TABLE horarios_bloqueados DISABLE TRIGGER ALL;
ALTER TABLE solicitudes_barberos DISABLE TRIGGER ALL;

RAISE NOTICE '⚡ Triggers deshabilitados temporalmente';

-- ============================================
-- PASO 3: RESTAURAR CITAS
-- ============================================

DO $$
DECLARE
    registros_restaurados INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_citas') THEN
        -- Limpiar tabla actual
        TRUNCATE citas CASCADE;
        
        -- Restaurar desde backup
        INSERT INTO citas 
        SELECT * FROM backup_citas;
        
        GET DIAGNOSTICS registros_restaurados = ROW_COUNT;
        
        RAISE NOTICE '✅ Citas restauradas: % registros', registros_restaurados;
    ELSE
        RAISE NOTICE '⚠️  No se encontró backup_citas, saltando...';
    END IF;
END $$;

-- ============================================
-- PASO 4: RESTAURAR NOTAS DE CLIENTES
-- ============================================

DO $$
DECLARE
    registros_restaurados INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_notas_clientes') THEN
        TRUNCATE notas_clientes CASCADE;
        INSERT INTO notas_clientes SELECT * FROM backup_notas_clientes;
        GET DIAGNOSTICS registros_restaurados = ROW_COUNT;
        RAISE NOTICE '✅ Notas de clientes restauradas: % registros', registros_restaurados;
    ELSE
        RAISE NOTICE '⚠️  No se encontró backup_notas_clientes, saltando...';
    END IF;
END $$;

-- ============================================
-- PASO 5: RESTAURAR WALK-IN CLIENTS
-- ============================================

DO $$
DECLARE
    registros_restaurados INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_walk_in_clients') THEN
        TRUNCATE walk_in_clients CASCADE;
        INSERT INTO walk_in_clients SELECT * FROM backup_walk_in_clients;
        GET DIAGNOSTICS registros_restaurados = ROW_COUNT;
        RAISE NOTICE '✅ Walk-In Clients restaurados: % registros', registros_restaurados;
    ELSE
        RAISE NOTICE '⚠️  No se encontró backup_walk_in_clients, saltando...';
    END IF;
END $$;

-- ============================================
-- PASO 6: RESTAURAR FACTURAS
-- ============================================

DO $$
DECLARE
    registros_restaurados INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_facturas') THEN
        TRUNCATE facturas CASCADE;
        INSERT INTO facturas SELECT * FROM backup_facturas;
        GET DIAGNOSTICS registros_restaurados = ROW_COUNT;
        RAISE NOTICE '✅ Facturas restauradas: % registros', registros_restaurados;
    ELSE
        RAISE NOTICE '⚠️  No se encontró backup_facturas, saltando...';
    END IF;
END $$;

-- ============================================
-- PASO 7: RESTAURAR LIQUIDACIONES
-- ============================================

DO $$
DECLARE
    registros_restaurados INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_liquidaciones') THEN
        TRUNCATE liquidaciones CASCADE;
        INSERT INTO liquidaciones SELECT * FROM backup_liquidaciones;
        GET DIAGNOSTICS registros_restaurados = ROW_COUNT;
        RAISE NOTICE '✅ Liquidaciones restauradas: % registros', registros_restaurados;
    ELSE
        RAISE NOTICE '⚠️  No se encontró backup_liquidaciones, saltando...';
    END IF;
END $$;

-- ============================================
-- PASO 8: RESTAURAR HORARIOS BLOQUEADOS
-- ============================================

DO $$
DECLARE
    registros_restaurados INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_horarios_bloqueados') THEN
        TRUNCATE horarios_bloqueados CASCADE;
        INSERT INTO horarios_bloqueados SELECT * FROM backup_horarios_bloqueados;
        GET DIAGNOSTICS registros_restaurados = ROW_COUNT;
        RAISE NOTICE '✅ Horarios bloqueados restaurados: % registros', registros_restaurados;
    ELSE
        RAISE NOTICE '⚠️  No se encontró backup_horarios_bloqueados, saltando...';
    END IF;
END $$;

-- ============================================
-- PASO 9: RESTAURAR SOLICITUDES BARBEROS
-- ============================================

DO $$
DECLARE
    registros_restaurados INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_solicitudes_barberos') THEN
        TRUNCATE solicitudes_barberos CASCADE;
        INSERT INTO solicitudes_barberos SELECT * FROM backup_solicitudes_barberos;
        GET DIAGNOSTICS registros_restaurados = ROW_COUNT;
        RAISE NOTICE '✅ Solicitudes barberos restauradas: % registros', registros_restaurados;
    ELSE
        RAISE NOTICE '⚠️  No se encontró backup_solicitudes_barberos, saltando...';
    END IF;
END $$;

-- ============================================
-- PASO 10: RE-HABILITAR TRIGGERS
-- ============================================

ALTER TABLE citas ENABLE TRIGGER ALL;
ALTER TABLE facturas ENABLE TRIGGER ALL;
ALTER TABLE liquidaciones ENABLE TRIGGER ALL;
ALTER TABLE notas_clientes ENABLE TRIGGER ALL;
ALTER TABLE walk_in_clients ENABLE TRIGGER ALL;
ALTER TABLE horarios_bloqueados ENABLE TRIGGER ALL;
ALTER TABLE solicitudes_barberos ENABLE TRIGGER ALL;

RAISE NOTICE '⚡ Triggers re-habilitados';

-- ============================================
-- PASO 11: VERIFICAR RESTAURACIÓN
-- ============================================

SELECT 
    '📊 VERIFICACIÓN POST-ROLLBACK' as seccion,
    '' as tabla,
    '' as registros,
    '' as estado;

SELECT 
    '' as seccion,
    'citas' as tabla,
    COUNT(*)::TEXT as registros,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Restaurada (' || COUNT(*) || ' registros)'
        ELSE '⚠️  Vacía (no había backup o backup estaba vacío)'
    END as estado
FROM citas
UNION ALL
SELECT 
    '',
    'facturas',
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) > 0 THEN '✅ Restaurada (' || COUNT(*) || ')' ELSE '⚠️  Vacía' END
FROM facturas
UNION ALL
SELECT 
    '',
    'liquidaciones',
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) > 0 THEN '✅ Restaurada (' || COUNT(*) || ')' ELSE '⚠️  Vacía' END
FROM liquidaciones
UNION ALL
SELECT 
    '',
    'walk_in_clients',
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) > 0 THEN '✅ Restaurada (' || COUNT(*) || ')' ELSE '⚠️  Vacía' END
FROM walk_in_clients
UNION ALL
SELECT 
    '',
    'notas_clientes',
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) > 0 THEN '✅ Restaurada (' || COUNT(*) || ')' ELSE '⚠️  Vacía' END
FROM notas_clientes;

-- ============================================
-- PASO 12: OPTIMIZAR TABLAS
-- ============================================

VACUUM ANALYZE citas;
VACUUM ANALYZE facturas;
VACUUM ANALYZE liquidaciones;
VACUUM ANALYZE walk_in_clients;
VACUUM ANALYZE notas_clientes;

RAISE NOTICE '🔧 Tablas optimizadas';

-- ============================================
-- PASO 13: RESUMEN FINAL
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ ROLLBACK COMPLETADO EXITOSAMENTE';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Datos restaurados desde backup';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICACIÓN:';
    RAISE NOTICE '   1. Revisa los conteos arriba';
    RAISE NOTICE '   2. Verifica la aplicación: https://chamosbarber.com/admin';
    RAISE NOTICE '   3. Comprueba que los datos son correctos';
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  LIMPIAR BACKUPS (OPCIONAL):';
    RAISE NOTICE '   Si todo está correcto, puedes eliminar las tablas de backup:';
    RAISE NOTICE '';
    RAISE NOTICE '   DROP TABLE IF EXISTS backup_citas CASCADE;';
    RAISE NOTICE '   DROP TABLE IF EXISTS backup_facturas CASCADE;';
    RAISE NOTICE '   DROP TABLE IF EXISTS backup_liquidaciones CASCADE;';
    RAISE NOTICE '   DROP TABLE IF EXISTS backup_notas_clientes CASCADE;';
    RAISE NOTICE '   DROP TABLE IF EXISTS backup_walk_in_clients CASCADE;';
    RAISE NOTICE '   DROP TABLE IF EXISTS backup_horarios_bloqueados CASCADE;';
    RAISE NOTICE '   DROP TABLE IF EXISTS backup_solicitudes_barberos CASCADE;';
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
END $$;

-- ============================================
-- ✅ SCRIPT DE ROLLBACK COMPLETADO
-- ============================================
