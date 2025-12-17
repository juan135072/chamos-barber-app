-- ============================================
-- 💾 BACKUP RÁPIDO ANTES DE LIMPIEZA
-- ============================================
-- Proyecto: Chamos Barber App
-- Fecha: 2025-12-17
-- Propósito: Crear tablas de backup temporales antes de limpiar
--
-- ⚠️ EJECUTA ESTE SCRIPT ANTES DE cleanup_production_data.sql
-- ============================================

-- ============================================
-- PASO 1: VERIFICAR ESPACIO DISPONIBLE
-- ============================================

SELECT 
    '💾 ESPACIO EN BASE DE DATOS' as info,
    pg_size_pretty(pg_database_size(current_database())) as tamaño_actual,
    pg_size_pretty(pg_database_size(current_database()) * 2) as espacio_requerido_backup;

-- ============================================
-- PASO 2: CREAR TABLAS DE BACKUP
-- ============================================

-- Eliminar backups anteriores si existen
DROP TABLE IF EXISTS backup_citas CASCADE;
DROP TABLE IF EXISTS backup_notas_clientes CASCADE;
DROP TABLE IF EXISTS backup_walk_in_clients CASCADE;
DROP TABLE IF EXISTS backup_facturas CASCADE;
DROP TABLE IF EXISTS backup_liquidaciones CASCADE;
DROP TABLE IF EXISTS backup_comisiones_pendientes CASCADE;
DROP TABLE IF EXISTS backup_ventas_diarias CASCADE;
DROP TABLE IF EXISTS backup_cierre_caja CASCADE;
DROP TABLE IF EXISTS backup_horarios_bloqueados CASCADE;
DROP TABLE IF EXISTS backup_solicitudes_barberos CASCADE;

RAISE NOTICE '🗑️  Backups anteriores eliminados (si existían)';

-- ============================================
-- PASO 3: CREAR BACKUPS DE CADA TABLA
-- ============================================

-- Backup de CITAS
CREATE TABLE backup_citas AS 
SELECT * FROM citas;

-- Backup de NOTAS CLIENTES
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notas_clientes') THEN
        EXECUTE 'CREATE TABLE backup_notas_clientes AS SELECT * FROM notas_clientes';
        RAISE NOTICE '✅ Backup de notas_clientes creado';
    ELSE
        RAISE NOTICE '⚠️  Tabla notas_clientes no existe, saltando...';
    END IF;
END $$;

-- Backup de WALK-IN CLIENTS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'walk_in_clients') THEN
        EXECUTE 'CREATE TABLE backup_walk_in_clients AS SELECT * FROM walk_in_clients';
        RAISE NOTICE '✅ Backup de walk_in_clients creado';
    ELSE
        RAISE NOTICE '⚠️  Tabla walk_in_clients no existe, saltando...';
    END IF;
END $$;

-- Backup de FACTURAS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facturas') THEN
        EXECUTE 'CREATE TABLE backup_facturas AS SELECT * FROM facturas';
        RAISE NOTICE '✅ Backup de facturas creado';
    ELSE
        RAISE NOTICE '⚠️  Tabla facturas no existe, saltando...';
    END IF;
END $$;

-- Backup de LIQUIDACIONES
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'liquidaciones') THEN
        EXECUTE 'CREATE TABLE backup_liquidaciones AS SELECT * FROM liquidaciones';
        RAISE NOTICE '✅ Backup de liquidaciones creado';
    ELSE
        RAISE NOTICE '⚠️  Tabla liquidaciones no existe, saltando...';
    END IF;
END $$;

-- Backup de COMISIONES PENDIENTES
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comisiones_pendientes') THEN
        EXECUTE 'CREATE TABLE backup_comisiones_pendientes AS SELECT * FROM comisiones_pendientes';
        RAISE NOTICE '✅ Backup de comisiones_pendientes creado';
    ELSE
        RAISE NOTICE '⚠️  Tabla comisiones_pendientes no existe, saltando...';
    END IF;
END $$;

-- Backup de VENTAS DIARIAS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_diarias_por_barbero') THEN
        EXECUTE 'CREATE TABLE backup_ventas_diarias AS SELECT * FROM ventas_diarias_por_barbero';
        RAISE NOTICE '✅ Backup de ventas_diarias_por_barbero creado';
    ELSE
        RAISE NOTICE '⚠️  Tabla ventas_diarias_por_barbero no existe, saltando...';
    END IF;
END $$;

-- Backup de CIERRE CAJA
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cierre_caja_diario') THEN
        EXECUTE 'CREATE TABLE backup_cierre_caja AS SELECT * FROM cierre_caja_diario';
        RAISE NOTICE '✅ Backup de cierre_caja_diario creado';
    ELSE
        RAISE NOTICE '⚠️  Tabla cierre_caja_diario no existe, saltando...';
    END IF;
END $$;

-- Backup de HORARIOS BLOQUEADOS
CREATE TABLE backup_horarios_bloqueados AS 
SELECT * FROM horarios_bloqueados;

-- Backup de SOLICITUDES BARBEROS
CREATE TABLE backup_solicitudes_barberos AS 
SELECT * FROM solicitudes_barberos;

RAISE NOTICE '✅ Todos los backups creados exitosamente';

-- ============================================
-- PASO 4: VERIFICAR BACKUPS CREADOS
-- ============================================

SELECT 
    '📊 VERIFICACIÓN DE BACKUPS CREADOS' as seccion,
    '' as tabla_original,
    '' as backup_tabla,
    '' as registros,
    '' as estado;

SELECT 
    '' as seccion,
    'citas' as tabla_original,
    'backup_citas' as backup_tabla,
    COUNT(*)::TEXT as registros,
    '✅ Respaldada' as estado
FROM backup_citas
UNION ALL
SELECT 
    '',
    'notas_clientes',
    'backup_notas_clientes',
    COUNT(*)::TEXT,
    '✅ Respaldada'
FROM backup_notas_clientes
UNION ALL
SELECT 
    '',
    'walk_in_clients',
    'backup_walk_in_clients',
    COUNT(*)::TEXT,
    '✅ Respaldada'
FROM backup_walk_in_clients
UNION ALL
SELECT 
    '',
    'facturas',
    'backup_facturas',
    COUNT(*)::TEXT,
    '✅ Respaldada'
FROM backup_facturas
UNION ALL
SELECT 
    '',
    'liquidaciones',
    'backup_liquidaciones',
    COUNT(*)::TEXT,
    '✅ Respaldada'
FROM backup_liquidaciones
UNION ALL
SELECT 
    '',
    'horarios_bloqueados',
    'backup_horarios_bloqueados',
    COUNT(*)::TEXT,
    '✅ Respaldada'
FROM backup_horarios_bloqueados
UNION ALL
SELECT 
    '',
    'solicitudes_barberos',
    'backup_solicitudes_barberos',
    COUNT(*)::TEXT,
    '✅ Respaldada'
FROM backup_solicitudes_barberos;

-- ============================================
-- PASO 5: CALCULAR TAMAÑO DE BACKUPS
-- ============================================

SELECT 
    '💾 TAMAÑO DE BACKUPS' as info,
    pg_size_pretty(
        pg_total_relation_size('backup_citas') +
        COALESCE(pg_total_relation_size('backup_notas_clientes'), 0) +
        COALESCE(pg_total_relation_size('backup_walk_in_clients'), 0) +
        COALESCE(pg_total_relation_size('backup_facturas'), 0) +
        COALESCE(pg_total_relation_size('backup_liquidaciones'), 0) +
        pg_total_relation_size('backup_horarios_bloqueados') +
        pg_total_relation_size('backup_solicitudes_barberos')
    ) as tamaño_total_backups;

-- ============================================
-- PASO 6: INFORMACIÓN DE ROLLBACK
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ BACKUP COMPLETADO EXITOSAMENTE';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Tablas de backup creadas:';
    RAISE NOTICE '   - backup_citas';
    RAISE NOTICE '   - backup_notas_clientes';
    RAISE NOTICE '   - backup_walk_in_clients';
    RAISE NOTICE '   - backup_facturas';
    RAISE NOTICE '   - backup_liquidaciones';
    RAISE NOTICE '   - backup_horarios_bloqueados';
    RAISE NOTICE '   - backup_solicitudes_barberos';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 PARA RESTAURAR (si algo sale mal):';
    RAISE NOTICE '';
    RAISE NOTICE '   TRUNCATE citas;';
    RAISE NOTICE '   INSERT INTO citas SELECT * FROM backup_citas;';
    RAISE NOTICE '';
    RAISE NOTICE '   TRUNCATE facturas;';
    RAISE NOTICE '   INSERT INTO facturas SELECT * FROM backup_facturas;';
    RAISE NOTICE '';
    RAISE NOTICE '   TRUNCATE liquidaciones;';
    RAISE NOTICE '   INSERT INTO liquidaciones SELECT * FROM backup_liquidaciones;';
    RAISE NOTICE '';
    RAISE NOTICE '   ... (y así con cada tabla)';
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '⚠️  AHORA PUEDES EJECUTAR cleanup_production_data.sql';
    RAISE NOTICE '================================================';
END $$;

-- ============================================
-- ✅ SCRIPT DE BACKUP COMPLETADO
-- ============================================
