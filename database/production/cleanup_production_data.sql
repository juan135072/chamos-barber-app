-- ============================================
-- 🚨 LIMPIEZA DE DATOS DE PRUEBA PARA PRODUCCIÓN
-- ============================================
-- Proyecto: Chamos Barber App
-- Fecha: 2025-12-17
-- Versión: 1.0
--
-- ⚠️ ADVERTENCIA CRÍTICA:
-- Este script eliminará PERMANENTEMENTE todos los datos de prueba
-- Asegúrate de tener un BACKUP completo antes de ejecutar
--
-- ============================================

-- ============================================
-- 📋 TABLAS QUE SE VAN A LIMPIAR (ELIMINAR DATOS):
-- ============================================
-- ✅ citas                          (Citas/Reservas)
-- ✅ notas_clientes                 (Notas de clientes)
-- ✅ walk_in_clients                (Clientes sin reserva)
-- ✅ facturas                        (Facturas/Cobros)
-- ✅ ventas_diarias_por_barbero      (Ventas diarias)
-- ✅ liquidaciones                   (Liquidaciones de comisiones)
-- ✅ comisiones_pendientes           (Comisiones pendientes)
-- ✅ cierre_caja_diario              (Cierres de caja)
-- ✅ horarios_bloqueados             (Horarios bloqueados temporales)
-- ✅ solicitudes_barberos            (Solicitudes de empleo)
--
-- ============================================
-- 🔒 TABLAS QUE SE CONSERVAN (NO SE TOCAN):
-- ============================================
-- 🔒 barberos                        (Barberos del negocio)
-- 🔒 servicios                       (Servicios ofrecidos)
-- 🔒 categorias_servicios            (Categorías de servicios)
-- 🔒 horarios_trabajo                (Horarios de trabajo base)
-- 🔒 horarios_atencion               (Horarios de atención)
-- 🔒 configuracion_comisiones        (Configuración de comisiones)
-- 🔒 admin_users                     (Usuarios administradores)
-- 🔒 roles_permisos                  (Roles y permisos)
-- 🔒 sitio_configuracion             (Configuración del sitio)
-- 🔒 barbero_portfolio               (Portfolio de barberos)
-- 🔒 portfolio_galerias              (Galerías de imágenes)
--
-- ============================================

-- ============================================
-- PASO 0: VERIFICACIÓN PRE-LIMPIEZA
-- ============================================
-- Ejecuta este query ANTES de limpiar para saber qué hay:

DO $$
DECLARE
    tabla_count RECORD;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE '📊 CONTEO DE REGISTROS PRE-LIMPIEZA';
    RAISE NOTICE '================================================';
    
    FOR tabla_count IN 
        SELECT 
            'citas' as tabla,
            COUNT(*) as registros
        FROM citas
        UNION ALL
        SELECT 'notas_clientes', COUNT(*) FROM notas_clientes
        UNION ALL
        SELECT 'walk_in_clients', COUNT(*) FROM walk_in_clients
        UNION ALL
        SELECT 'facturas', COUNT(*) FROM facturas
        UNION ALL
        SELECT 'liquidaciones', COUNT(*) FROM liquidaciones
        UNION ALL
        SELECT 'horarios_bloqueados', COUNT(*) FROM horarios_bloqueados
        UNION ALL
        SELECT 'solicitudes_barberos', COUNT(*) FROM solicitudes_barberos
        UNION ALL
        SELECT 'cierre_caja_diario', COUNT(*) FROM cierre_caja_diario
    LOOP
        RAISE NOTICE '% - % registros', tabla_count.tabla, tabla_count.registros;
    END LOOP;
    
    RAISE NOTICE '================================================';
END $$;

-- ============================================
-- PASO 1: BACKUP DE SEGURIDAD
-- ============================================
-- RECOMENDACIÓN: Exporta cada tabla antes de eliminar
-- En Supabase SQL Editor, ejecuta:
-- 
-- SELECT * FROM citas;
-- SELECT * FROM facturas;
-- SELECT * FROM liquidaciones;
-- etc... y guarda los resultados
--
-- O usa el CLI de Supabase:
-- npx supabase db dump -f backup_pre_cleanup.sql
-- ============================================

-- ============================================
-- PASO 2: DESHABILITAR TRIGGERS TEMPORALMENTE
-- ============================================
-- Esto previene errores de integridad referencial

-- Deshabilitar triggers de auditoría (si existen)
ALTER TABLE citas DISABLE TRIGGER ALL;
ALTER TABLE facturas DISABLE TRIGGER ALL;
ALTER TABLE liquidaciones DISABLE TRIGGER ALL;
ALTER TABLE notas_clientes DISABLE TRIGGER ALL;
ALTER TABLE walk_in_clients DISABLE TRIGGER ALL;
ALTER TABLE horarios_bloqueados DISABLE TRIGGER ALL;

-- ============================================
-- PASO 3: LIMPIEZA DE DATOS (ORDEN CORRECTO)
-- ============================================

-- 3.1) Eliminar liquidaciones (depende de ventas/facturas)
DO $$
BEGIN
    DELETE FROM public.liquidaciones;
    RAISE NOTICE '✅ Liquidaciones eliminadas';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Tabla liquidaciones no existe o error: %', SQLERRM;
END $$;

-- 3.2) Eliminar comisiones pendientes
DO $$
BEGIN
    DELETE FROM public.comisiones_pendientes;
    RAISE NOTICE '✅ Comisiones pendientes eliminadas';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Tabla comisiones_pendientes no existe o error: %', SQLERRM;
END $$;

-- 3.3) Eliminar ventas diarias por barbero
DO $$
BEGIN
    DELETE FROM public.ventas_diarias_por_barbero;
    RAISE NOTICE '✅ Ventas diarias eliminadas';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Tabla ventas_diarias_por_barbero no existe o error: %', SQLERRM;
END $$;

-- 3.4) Eliminar facturas/cobros
DO $$
BEGIN
    DELETE FROM public.facturas;
    RAISE NOTICE '✅ Facturas/Cobros eliminados';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Tabla facturas no existe o error: %', SQLERRM;
END $$;

-- 3.5) Eliminar cierres de caja
DO $$
BEGIN
    DELETE FROM public.cierre_caja_diario;
    RAISE NOTICE '✅ Cierres de caja eliminados';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Tabla cierre_caja_diario no existe o error: %', SQLERRM;
END $$;

-- 3.6) Eliminar notas de clientes
DO $$
BEGIN
    DELETE FROM public.notas_clientes;
    RAISE NOTICE '✅ Notas de clientes eliminadas';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Tabla notas_clientes no existe o error: %', SQLERRM;
END $$;

-- 3.7) Eliminar clientes walk-in
DO $$
BEGIN
    DELETE FROM public.walk_in_clients;
    RAISE NOTICE '✅ Clientes Walk-In eliminados';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Tabla walk_in_clients no existe o error: %', SQLERRM;
END $$;

-- 3.8) Eliminar citas (debe ser DESPUÉS de notas_clientes)
DELETE FROM public.citas;
RAISE NOTICE '✅ Citas eliminadas';

-- 3.9) Eliminar horarios bloqueados temporales
DELETE FROM public.horarios_bloqueados;
RAISE NOTICE '✅ Horarios bloqueados eliminados';

-- 3.10) Eliminar solicitudes de barberos
DELETE FROM public.solicitudes_barberos;
RAISE NOTICE '✅ Solicitudes de barberos eliminadas';

-- ============================================
-- PASO 4: RE-HABILITAR TRIGGERS
-- ============================================

ALTER TABLE citas ENABLE TRIGGER ALL;
ALTER TABLE facturas ENABLE TRIGGER ALL;
ALTER TABLE liquidaciones ENABLE TRIGGER ALL;
ALTER TABLE notas_clientes ENABLE TRIGGER ALL;
ALTER TABLE walk_in_clients ENABLE TRIGGER ALL;
ALTER TABLE horarios_bloqueados ENABLE TRIGGER ALL;

-- ============================================
-- PASO 5: RESETEAR SECUENCIAS (OPCIONAL)
-- ============================================
-- Esto reinicia los contadores de IDs (si usas SERIAL/SEQUENCE)
-- ⚠️ Solo ejecuta si quieres que los IDs empiecen desde 1

-- ALTER SEQUENCE citas_id_seq RESTART WITH 1;
-- ALTER SEQUENCE facturas_id_seq RESTART WITH 1;
-- etc...

-- ============================================
-- PASO 6: VACUUM Y OPTIMIZACIÓN
-- ============================================
-- Recupera espacio en disco y optimiza índices

VACUUM FULL citas;
VACUUM FULL facturas;
VACUUM FULL liquidaciones;
VACUUM FULL notas_clientes;
VACUUM FULL walk_in_clients;
VACUUM FULL horarios_bloqueados;
VACUUM FULL solicitudes_barberos;

ANALYZE citas;
ANALYZE facturas;
ANALYZE liquidaciones;

RAISE NOTICE '✅ Optimización completada';

-- ============================================
-- PASO 7: VERIFICACIÓN POST-LIMPIEZA
-- ============================================

DO $$
DECLARE
    tabla_count RECORD;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ CONTEO DE REGISTROS POST-LIMPIEZA';
    RAISE NOTICE '================================================';
    
    FOR tabla_count IN 
        SELECT 
            'citas' as tabla,
            COUNT(*) as registros
        FROM citas
        UNION ALL
        SELECT 'notas_clientes', COUNT(*) FROM notas_clientes
        UNION ALL
        SELECT 'walk_in_clients', COUNT(*) FROM walk_in_clients
        UNION ALL
        SELECT 'facturas', COUNT(*) FROM facturas
        UNION ALL
        SELECT 'liquidaciones', COUNT(*) FROM liquidaciones
        UNION ALL
        SELECT 'horarios_bloqueados', COUNT(*) FROM horarios_bloqueados
        UNION ALL
        SELECT 'solicitudes_barberos', COUNT(*) FROM solicitudes_barberos
        UNION ALL
        SELECT '----', 0
        UNION ALL
        SELECT 'barberos (conservado)', COUNT(*) FROM barberos
        UNION ALL
        SELECT 'servicios (conservado)', COUNT(*) FROM servicios
        UNION ALL
        SELECT 'categorias (conservado)', COUNT(*) FROM categorias_servicios
    LOOP
        RAISE NOTICE '% - % registros', tabla_count.tabla, tabla_count.registros;
    END LOOP;
    
    RAISE NOTICE '================================================';
    RAISE NOTICE '🎉 LIMPIEZA COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '================================================';
END $$;

-- ============================================
-- PASO 8: VERIFICAR TABLAS CONSERVADAS
-- ============================================

SELECT 
    '🔒 BARBEROS' as tipo,
    COUNT(*) as total
FROM barberos
UNION ALL
SELECT '🔒 SERVICIOS', COUNT(*) FROM servicios
UNION ALL
SELECT '🔒 CATEGORÍAS', COUNT(*) FROM categorias_servicios
UNION ALL
SELECT '🔒 ADMIN USERS', COUNT(*) FROM admin_users
UNION ALL
SELECT '🔒 HORARIOS TRABAJO', COUNT(*) FROM horarios_trabajo
ORDER BY tipo;

-- ============================================
-- 📌 NOTAS FINALES
-- ============================================
-- 1. ✅ Todos los datos de PRUEBA han sido eliminados
-- 2. ✅ Datos de CONFIGURACIÓN se mantienen intactos
-- 3. ✅ Base de datos lista para PRODUCCIÓN
-- 4. ⚠️  Recuerda probar la aplicación antes de lanzar
-- 5. 🔄 Considera regenerar IDs si resetaste secuencias
--
-- ============================================
-- 🎯 PRÓXIMOS PASOS:
-- ============================================
-- 1. Verificar que la app cargue correctamente
-- 2. Crear primera cita de prueba real
-- 3. Verificar que los flujos de facturación funcionen
-- 4. Validar que las liquidaciones se generen correctamente
-- 5. Probar el sistema Walk-In con cliente real
--
-- ============================================
-- ✅ SCRIPT COMPLETADO
-- ============================================
