# 🚀 Preparación de Base de Datos para Producción

**Proyecto:** Chamos Barber App  
**Fecha:** 2025-12-17  
**Versión:** 1.0  
**Objetivo:** Limpiar datos de prueba y dejar la base de datos lista para producción

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Datos que SE ELIMINARÁN](#datos-que-se-eliminarán)
3. [Datos que SE CONSERVARÁN](#datos-que-se-conservarán)
4. [Proceso de Backup](#proceso-de-backup)
5. [Ejecución del Script](#ejecución-del-script)
6. [Verificación Post-Limpieza](#verificación-post-limpieza)
7. [Rollback (En caso de error)](#rollback)
8. [FAQ](#faq)

---

## 🎯 RESUMEN EJECUTIVO

### ¿Qué hace este proceso?

Este proceso limpiará **TODOS los datos de prueba** de la base de datos, manteniendo **intacta la configuración base** del negocio (barberos, servicios, categorías).

### ⏱️ Tiempo Estimado
- **Backup:** 5 minutos
- **Ejecución script:** 2 minutos
- **Verificación:** 3 minutos
- **Total:** 10 minutos

### ⚠️ ADVERTENCIAS CRÍTICAS

```
🚨 ESTE PROCESO ES IRREVERSIBLE
🚨 TODOS LOS DATOS DE PRUEBA SE ELIMINARÁN PERMANENTEMENTE
🚨 ASEGÚRATE DE TENER UN BACKUP COMPLETO ANTES DE CONTINUAR
🚨 EJECUTA ESTE SCRIPT SOLO UNA VEZ
🚨 VERIFICA QUE ESTÁS EN LA BASE DE DATOS CORRECTA
```

---

## 🗑️ DATOS QUE SE ELIMINARÁN

Estas tablas quedarán **completamente vacías** (0 registros):

| Tabla | Descripción | Impacto |
|-------|-------------|---------|
| `citas` | Todas las citas/reservas | ✅ Se eliminarán |
| `notas_clientes` | Notas sobre clientes | ✅ Se eliminarán |
| `walk_in_clients` | Clientes sin reserva | ✅ Se eliminarán |
| `facturas` | Facturas y cobros | ✅ Se eliminarán |
| `ventas_diarias_por_barbero` | Reporte de ventas diarias | ✅ Se eliminarán |
| `liquidaciones` | Liquidaciones de comisiones | ✅ Se eliminarán |
| `comisiones_pendientes` | Comisiones pendientes de pago | ✅ Se eliminarán |
| `cierre_caja_diario` | Cierres de caja | ✅ Se eliminarán |
| `horarios_bloqueados` | Bloqueos temporales de horarios | ✅ Se eliminarán |
| `solicitudes_barberos` | Solicitudes de empleo | ✅ Se eliminarán |

### 📊 Impacto Esperado
```
Antes de limpieza:
- Citas: ~50+ registros
- Clientes Walk-In: ~10+ registros
- Facturas: ~30+ registros
- Liquidaciones: ~5+ registros

Después de limpieza:
- Citas: 0 registros ✅
- Clientes Walk-In: 0 registros ✅
- Facturas: 0 registros ✅
- Liquidaciones: 0 registros ✅
```

---

## 🔒 DATOS QUE SE CONSERVARÁN

Estas tablas **NO se tocarán** (mantienen todos sus datos):

| Tabla | Descripción | Estado |
|-------|-------------|--------|
| `barberos` | Barberos del negocio | 🔒 Se conserva |
| `servicios` | Servicios ofrecidos | 🔒 Se conserva |
| `categorias_servicios` | Categorías de servicios | 🔒 Se conserva |
| `horarios_trabajo` | Horarios de trabajo base | 🔒 Se conserva |
| `horarios_atencion` | Horarios de atención | 🔒 Se conserva |
| `configuracion_comisiones` | Configuración de comisiones | 🔒 Se conserva |
| `admin_users` | Usuarios administradores | 🔒 Se conserva |
| `roles_permisos` | Roles y permisos | 🔒 Se conserva |
| `sitio_configuracion` | Configuración del sitio | 🔒 Se conserva |
| `barbero_portfolio` | Portfolio de barberos | 🔒 Se conserva |
| `portfolio_galerias` | Galerías de imágenes | 🔒 Se conserva |

### ✅ Verificación de Datos Conservados
```sql
-- Ejecuta esto DESPUÉS de la limpieza para confirmar
SELECT 
    '🔒 BARBEROS' as tipo,
    COUNT(*) as total
FROM barberos
UNION ALL
SELECT '🔒 SERVICIOS', COUNT(*) FROM servicios
UNION ALL
SELECT '🔒 CATEGORÍAS', COUNT(*) FROM categorias_servicios
UNION ALL
SELECT '🔒 ADMIN USERS', COUNT(*) FROM admin_users;

-- Resultado esperado:
-- 🔒 BARBEROS      | 3-5 registros
-- 🔒 SERVICIOS     | 10-15 registros
-- 🔒 CATEGORÍAS    | 3-5 registros
-- 🔒 ADMIN USERS   | 1-3 registros
```

---

## 💾 PROCESO DE BACKUP

### ⚠️ PASO OBLIGATORIO ANTES DE CONTINUAR

**NO CONTINÚES SIN HACER BACKUP**

### Opción 1: Backup Completo de Supabase (RECOMENDADO)

```bash
# 1. Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# 2. Login a Supabase
supabase login

# 3. Crear backup completo
supabase db dump --project-ref TU_PROJECT_ID -f backup_pre_cleanup_$(date +%Y%m%d_%H%M%S).sql

# 4. Verificar que el archivo existe
ls -lh backup_pre_cleanup_*.sql
```

### Opción 2: Backup Manual desde Supabase Dashboard

1. **Ir a:** https://app.supabase.com
2. **Seleccionar proyecto:** Chamos Barber
3. **Ir a:** Database → Backups
4. **Click en:** "Create backup now"
5. **Esperar:** 1-2 minutos
6. **Verificar:** Que el backup aparezca en la lista

### Opción 3: Exportar Tablas Manualmente

Ejecuta estos queries en Supabase SQL Editor y guarda los resultados:

```sql
-- Exportar citas
COPY (SELECT * FROM citas) TO STDOUT WITH CSV HEADER;

-- Exportar facturas
COPY (SELECT * FROM facturas) TO STDOUT WITH CSV HEADER;

-- Exportar liquidaciones
COPY (SELECT * FROM liquidaciones) TO STDOUT WITH CSV HEADER;

-- Exportar walk_in_clients
COPY (SELECT * FROM walk_in_clients) TO STDOUT WITH CSV HEADER;
```

### Opción 4: Backup Rápido con SELECT

```sql
-- Crear tablas temporales de backup
CREATE TABLE backup_citas AS SELECT * FROM citas;
CREATE TABLE backup_facturas AS SELECT * FROM facturas;
CREATE TABLE backup_liquidaciones AS SELECT * FROM liquidaciones;
CREATE TABLE backup_walk_in AS SELECT * FROM walk_in_clients;

-- Verificar backups
SELECT 'backup_citas' as tabla, COUNT(*) as registros FROM backup_citas
UNION ALL
SELECT 'backup_facturas', COUNT(*) FROM backup_facturas
UNION ALL
SELECT 'backup_liquidaciones', COUNT(*) FROM backup_liquidaciones
UNION ALL
SELECT 'backup_walk_in', COUNT(*) FROM backup_walk_in;
```

---

## ⚙️ EJECUCIÓN DEL SCRIPT

### PASO 1: Acceder a Supabase SQL Editor

1. Ir a: https://app.supabase.com
2. Seleccionar proyecto: **Chamos Barber**
3. Ir a: **SQL Editor**
4. Click en: **New query**

### PASO 2: Verificar Base de Datos Correcta

```sql
-- Ejecuta esto PRIMERO para asegurarte de estar en la BD correcta
SELECT current_database(), current_user;

-- Debe devolver:
-- current_database | current_user
-- postgres         | postgres
```

### PASO 3: Pre-Verificación (IMPORTANTE)

Antes de eliminar, ejecuta esto para ver qué hay:

```sql
-- Ver conteo de registros ANTES de limpiar
SELECT 
    'citas' as tabla,
    COUNT(*) as registros_actuales
FROM citas
UNION ALL
SELECT 'facturas', COUNT(*) FROM facturas
UNION ALL
SELECT 'liquidaciones', COUNT(*) FROM liquidaciones
UNION ALL
SELECT 'walk_in_clients', COUNT(*) FROM walk_in_clients
UNION ALL
SELECT 'notas_clientes', COUNT(*) FROM notas_clientes
ORDER BY tabla;

-- GUARDA ESTE RESULTADO para comparar después
```

### PASO 4: Ejecutar Script Principal

1. **Copiar todo el contenido** de `cleanup_production_data.sql`
2. **Pegar** en el SQL Editor de Supabase
3. **LEER** el script completo antes de ejecutar
4. **Click en:** RUN (botón azul)
5. **Esperar:** 1-2 minutos

### PASO 5: Monitorear Ejecución

El script mostrará mensajes como:

```
NOTICE: ================================================
NOTICE: 📊 CONTEO DE REGISTROS PRE-LIMPIEZA
NOTICE: ================================================
NOTICE: citas - 52 registros
NOTICE: facturas - 34 registros
...
NOTICE: ✅ Liquidaciones eliminadas
NOTICE: ✅ Facturas/Cobros eliminados
NOTICE: ✅ Citas eliminadas
...
NOTICE: ================================================
NOTICE: 🎉 LIMPIEZA COMPLETADA EXITOSAMENTE
NOTICE: ================================================
```

### PASO 6: Verificar Resultado

```sql
-- Ejecuta esto DESPUÉS del script
SELECT 
    'citas' as tabla,
    COUNT(*) as registros_finales,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Limpiada'
        ELSE '⚠️ Aún tiene datos'
    END as estado
FROM citas
UNION ALL
SELECT 'facturas', COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN '✅ Limpiada' ELSE '⚠️ Aún tiene datos' END
FROM facturas
UNION ALL
SELECT 'liquidaciones', COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✅ Limpiada' ELSE '⚠️ Aún tiene datos' END
FROM liquidaciones
UNION ALL
SELECT 'walk_in_clients', COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✅ Limpiada' ELSE '⚠️ Aún tiene datos' END
FROM walk_in_clients;

-- Resultado esperado:
-- citas            | 0 | ✅ Limpiada
-- facturas         | 0 | ✅ Limpiada
-- liquidaciones    | 0 | ✅ Limpiada
-- walk_in_clients  | 0 | ✅ Limpiada
```

---

## ✅ VERIFICACIÓN POST-LIMPIEZA

### Checklist de Verificación en Base de Datos

```sql
-- ✅ 1. Verificar tablas limpiadas están vacías
SELECT COUNT(*) as citas FROM citas;          -- Debe ser 0
SELECT COUNT(*) as facturas FROM facturas;    -- Debe ser 0
SELECT COUNT(*) as liquidaciones FROM liquidaciones; -- Debe ser 0

-- ✅ 2. Verificar tablas conservadas tienen datos
SELECT COUNT(*) as barberos FROM barberos;    -- Debe ser > 0
SELECT COUNT(*) as servicios FROM servicios;  -- Debe ser > 0
SELECT COUNT(*) as categorias FROM categorias_servicios; -- Debe ser > 0

-- ✅ 3. Verificar integridad referencial
SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name IN ('citas', 'facturas', 'liquidaciones')
ORDER BY table_name;

-- ✅ 4. Verificar triggers activos
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('citas', 'facturas', 'liquidaciones')
ORDER BY event_object_table;
```

### Checklist de Verificación en Aplicación

#### 1. Panel Admin - Dashboard
```
✅ https://chamosbarber.com/admin
✅ Dashboard carga sin errores
✅ Estadísticas muestran 0 citas, 0 ventas, 0 ingresos
✅ Gráficos están vacíos (esperado)
```

#### 2. Panel Admin - Citas
```
✅ /admin/citas
✅ Tabla de citas vacía
✅ Filtros funcionan
✅ Botón "Nueva Cita" funciona
✅ Puede crear cita de prueba exitosamente
```

#### 3. Panel Admin - Clientes
```
✅ /admin/clientes
✅ Lista de clientes vacía
✅ Búsqueda funciona
✅ Categorías muestran "0 clientes"
```

#### 4. Panel Admin - Walk-In
```
✅ /admin (menú Walk-In)
✅ Estadísticas en 0 (Total, Hoy, Semana, Mes)
✅ Lista vacía
✅ Puede registrar cliente Walk-In de prueba
```

#### 5. Panel Admin - Liquidaciones
```
✅ /admin (menú Liquidaciones)
✅ No hay liquidaciones pendientes
✅ Historial vacío
✅ Botón "Crear Liquidación" funciona
```

#### 6. Panel Admin - Barberos
```
✅ /admin/barberos
✅ Lista de barberos CON datos (NO debe estar vacía)
✅ Puede ver perfil de barbero
✅ Estadísticas de barbero en 0 (esperado)
```

#### 7. Panel Admin - Servicios
```
✅ /admin/servicios
✅ Lista de servicios CON datos (NO debe estar vacía)
✅ Puede editar servicios
✅ Precios correctos
```

#### 8. Panel Admin - Categorías
```
✅ /admin/categorias
✅ Lista de categorías CON datos (NO debe estar vacía)
✅ Orden correcto
✅ Íconos correctos
```

---

## 🔄 ROLLBACK (En caso de error)

### Si algo salió mal durante la limpieza:

#### Opción 1: Restaurar desde Backup Supabase

1. Ir a: https://app.supabase.com
2. Seleccionar: **Chamos Barber**
3. Ir a: **Database → Backups**
4. Seleccionar backup pre-limpieza
5. Click: **Restore**
6. Confirmar y esperar 5-10 minutos

#### Opción 2: Restaurar desde archivo SQL

```bash
# Si hiciste dump con Supabase CLI
supabase db reset --db-url "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" --file backup_pre_cleanup_XXXXXXXXX.sql
```

#### Opción 3: Restaurar tablas temporales

```sql
-- Si creaste backups temporales (Opción 4 de backup)
TRUNCATE citas;
INSERT INTO citas SELECT * FROM backup_citas;

TRUNCATE facturas;
INSERT INTO facturas SELECT * FROM backup_facturas;

TRUNCATE liquidaciones;
INSERT INTO liquidaciones SELECT * FROM backup_liquidaciones;

TRUNCATE walk_in_clients;
INSERT INTO walk_in_clients SELECT * FROM backup_walk_in;

-- Verificar
SELECT COUNT(*) FROM citas;
SELECT COUNT(*) FROM facturas;
```

---

## ❓ FAQ

### ¿Perderé los datos de mis barberos?
**NO.** Los barberos se conservan 100%.

### ¿Perderé mis servicios y precios?
**NO.** Servicios y categorías se conservan 100%.

### ¿Perderé usuarios admin?
**NO.** Usuarios administradores se conservan 100%.

### ¿Puedo deshacer la limpieza?
**SÍ**, pero solo si hiciste backup antes. Por eso es OBLIGATORIO hacer backup.

### ¿Cuánto tiempo toma?
Aproximadamente 10 minutos totales (backup + ejecución + verificación).

### ¿Puedo ejecutar esto en producción directamente?
**SÍ**, pero SOLO DESPUÉS de hacer backup completo.

### ¿Qué pasa con las relaciones entre tablas?
El script respeta el orden de eliminación para evitar errores de integridad referencial.

### ¿Se resetean los IDs?
**NO** por defecto. Si quieres resetear los contadores de IDs, descomenta las líneas `ALTER SEQUENCE` en el script.

### ¿Afecta a los horarios de trabajo?
**NO.** Horarios de trabajo base se conservan. Solo se eliminan bloqueos temporales.

### ¿Qué pasa con las comisiones configuradas?
**NO se tocan.** La configuración de porcentajes de comisión se conserva.

---

## 📊 MÉTRICAS ESPERADAS

### Antes de Limpieza
```
📊 Base de Datos: ~500 MB
📊 Registros Totales: ~150+ registros
📊 Citas: 50+ registros
📊 Facturas: 30+ registros
📊 Liquidaciones: 5+ registros
📊 Walk-In: 10+ registros
```

### Después de Limpieza
```
✅ Base de Datos: ~100 MB (recupera espacio)
✅ Registros de Prueba: 0
✅ Citas: 0 registros
✅ Facturas: 0 registros
✅ Liquidaciones: 0 registros
✅ Walk-In: 0 registros
✅ Barberos: 3-5 registros (conservados)
✅ Servicios: 10-15 registros (conservados)
✅ Categorías: 3-5 registros (conservados)
```

---

## 🎯 PRÓXIMOS PASOS DESPUÉS DE LA LIMPIEZA

1. **✅ Verificar aplicación:** Revisar todos los paneles admin
2. **✅ Crear cita de prueba:** Validar flujo completo de reserva
3. **✅ Registrar cliente Walk-In:** Probar sistema de clientes sin reserva
4. **✅ Crear factura:** Validar sistema de cobros
5. **✅ Generar liquidación:** Verificar cálculo de comisiones
6. **✅ Probar en móvil:** Verificar responsive
7. **✅ Notificar al equipo:** Informar que producción está limpia
8. **✅ Documentar primer cliente real:** Celebrar el lanzamiento 🎉

---

## 🔗 ENLACES ÚTILES

- **Supabase Dashboard:** https://app.supabase.com
- **Aplicación Admin:** https://chamosbarber.com/admin
- **Repositorio GitHub:** https://github.com/juan135072/chamos-barber-app
- **Script SQL:** `/database/production/cleanup_production_data.sql`

---

## ✅ CONFIRMACIÓN FINAL

Antes de ejecutar, confirma:

- [ ] ✅ He leído TODO este documento
- [ ] ✅ Entiendo que los datos se eliminarán PERMANENTEMENTE
- [ ] ✅ He creado un BACKUP completo
- [ ] ✅ He verificado que estoy en la base de datos CORRECTA
- [ ] ✅ He notificado al equipo sobre la limpieza
- [ ] ✅ Tengo 10 minutos disponibles para el proceso completo
- [ ] ✅ Estoy preparado para verificar la aplicación después

**¿Listo para proceder?** Continúa con [Proceso de Backup](#proceso-de-backup)

---

**Última Actualización:** 2025-12-17  
**Versión:** 1.0  
**Autor:** Chamos Barber Dev Team  
**Estado:** ✅ Listo para Producción
