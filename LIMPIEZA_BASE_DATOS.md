# 🧹 Guía de Limpieza de Base de Datos

Esta guía te ayudará a limpiar las tablas obsoletas del dashboard profesional de barberos que fueron revertidas en el commit `536892c`.

## 📋 Scripts Disponibles

### 1. `verificar-tablas-obsoletas.sql` (RECOMENDADO EJECUTAR PRIMERO)
**Propósito:** Diagnóstico sin eliminar nada

**Qué hace:**
- ✅ Lista todas las tablas del dashboard que existen
- ✅ Muestra cuántos registros tiene cada tabla
- ✅ Identifica columnas obsoletas en la tabla `barberos`
- ✅ Lista funciones relacionadas con barberos
- ✅ Muestra índices que serán eliminados
- ✅ Proporciona recomendaciones

**Cuándo usar:** SIEMPRE ejecuta este primero para saber qué existe antes de eliminar

---

### 2. `cleanup-solo-dashboard.sql` (RECOMENDADO PARA TU CASO)
**Propósito:** Eliminar SOLO el dashboard profesional

**Qué elimina:**
- ❌ `barbero_resenas` (reseñas de clientes)
- ❌ `barbero_portfolio` (galería de fotos)
- ❌ `barbero_certificaciones` (certificados profesionales)
- ❌ `barbero_estadisticas` (estadísticas mensuales)
- ❌ Funciones: `generar_slug_barbero()`, `actualizar_promedio_calificacion_barbero()`
- ❌ Columnas en `barberos`: `total_clientes`, `total_cortes`, `promedio_calificacion`, `total_resenas`

**Qué MANTIENE:**
- ✅ `solicitudes_barberos` (tabla de registro de barberos)
- ✅ `aprobar_solicitud_barbero()` (función de aprobación)
- ✅ Columnas útiles: `slug`, `biografia`, `whatsapp`, `instagram`, `facebook`, etc.
- ✅ Todo lo necesario para el sistema de registro de barberos

**Cuándo usar:** Cuando quieres eliminar el dashboard pero mantener el registro de barberos (tu caso actual - Opción 1)

---

### 3. `cleanup-dashboard-barberos.sql` (LIMPIEZA COMPLETA)
**Propósito:** Eliminar TODO relacionado con dashboard Y registro

**Qué elimina:**
- ❌ Todas las tablas del dashboard profesional
- ❌ `solicitudes_barberos` (registro de barberos)
- ❌ Todas las funciones relacionadas
- ❌ (OPCIONAL - comentado) Todas las columnas extra en `barberos`

**Qué MANTIENE:**
- ✅ Tabla `barberos` base
- ✅ Columnas originales en `barberos` (a menos que descomentes el PASO 4)

**Cuándo usar:** Si decides eliminar TODO el sistema de registro de barberos también

---

## 🚀 Instrucciones Paso a Paso

### Paso 1: Verificar Estado Actual
```sql
-- Ejecuta esto en tu Supabase SQL Editor
-- Ubicación: scripts/SQL/verificar-tablas-obsoletas.sql
```

1. Ve a tu panel de Supabase
2. Abre el **SQL Editor**
3. Copia y pega el contenido completo de `verificar-tablas-obsoletas.sql`
4. Haz clic en **Run**
5. Revisa los resultados:
   - ¿Qué tablas existen?
   - ¿Cuántos registros tienen?
   - ¿Qué columnas en `barberos` están obsoletas?

### Paso 2: Decidir Qué Eliminar

**Opción A: Solo Dashboard (RECOMENDADO PARA TI)**
- Usa: `cleanup-solo-dashboard.sql`
- Mantiene: Sistema de registro de barberos
- Elimina: Dashboard profesional completo

**Opción B: Todo (Limpieza Total)**
- Usa: `cleanup-dashboard-barberos.sql`
- Elimina: Dashboard + Sistema de registro
- Mantiene: Solo tabla `barberos` base

### Paso 3: Ejecutar Script de Limpieza

#### Si elegiste Opción A (Recomendado):
```sql
-- Ejecuta esto en tu Supabase SQL Editor
-- Ubicación: scripts/SQL/cleanup-solo-dashboard.sql
```

#### Si elegiste Opción B:
```sql
-- Ejecuta esto en tu Supabase SQL Editor
-- Ubicación: scripts/SQL/cleanup-dashboard-barberos.sql
```

### Paso 4: Verificar Limpieza Exitosa

Después de ejecutar el script de limpieza, ejecuta esta query:

```sql
-- Verificar que las tablas fueron eliminadas
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as tamaño
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%barbero%'
ORDER BY table_name;
```

**Resultado esperado (Opción A):**
- ✅ `barberos` - debe existir
- ✅ `solicitudes_barberos` - debe existir (si elegiste Opción A)
- ❌ `barbero_resenas` - NO debe aparecer
- ❌ `barbero_portfolio` - NO debe aparecer
- ❌ `barbero_certificaciones` - NO debe aparecer
- ❌ `barbero_estadisticas` - NO debe aparecer

---

## ⚠️ Advertencias Importantes

### 🔴 ANTES de ejecutar cualquier script de limpieza:

1. **Backup de Base de Datos**
   - Supabase hace backups automáticos, pero verifica que estén habilitados
   - Considera hacer un backup manual desde el panel de Supabase

2. **Verifica el entorno**
   - Asegúrate de estar en la base de datos correcta
   - NO ejecutes en producción sin probar primero en desarrollo

3. **Lee los resultados del script de verificación**
   - Si hay muchos registros en las tablas, considera si necesitas respaldarlos

4. **Las operaciones DROP son IRREVERSIBLES**
   - Una vez eliminadas las tablas, no se pueden recuperar (excepto desde backup)

### 🟡 Consideraciones:

- **Si mantienes el registro de barberos (Opción A):**
  - Las columnas `biografia`, `whatsapp`, `instagram`, etc. SON útiles
  - La tabla `solicitudes_barberos` es necesaria para el flujo de aprobación

- **Si tienes solicitudes pendientes:**
  - Revisa la tabla `solicitudes_barberos` antes de eliminar
  - Aprueba o rechaza solicitudes pendientes primero

- **Columnas en tabla `barberos`:**
  - `slug` e `instagram` se usan en el sistema actual - NO eliminar
  - Las columnas de estadísticas (total_clientes, etc.) son seguras de eliminar

---

## 📊 Resumen de Decisión

### Tu situación actual (commit 536892c):
- ✅ Tienes cambios de CSS (tema oscuro)
- ✅ Tienes sistema de registro de barberos
- ❌ NO quieres el dashboard profesional

### Script recomendado:
**`cleanup-solo-dashboard.sql`**

### Lo que hará:
1. Eliminará 4 tablas del dashboard profesional
2. Eliminará 2 funciones obsoletas
3. Eliminará 4 columnas de estadísticas en `barberos`
4. MANTENDRÁ todo el sistema de registro de barberos

---

## 🆘 Si algo sale mal

### Error: "Cannot drop table because other objects depend on it"
- Ejecuta el script nuevamente, tiene `CASCADE` que elimina dependencias
- O usa el script completo: `cleanup-dashboard-barberos.sql`

### Error: "Column does not exist"
- Es normal si la columna ya fue eliminada previamente
- El script usa `IF EXISTS` para evitar errores

### Necesitas restaurar algo
- Contacta soporte de Supabase para restaurar desde backup
- O re-ejecuta los scripts de creación originales si los tienes

---

## ✅ Checklist Final

Antes de dar por terminada la limpieza:

- [ ] Ejecuté `verificar-tablas-obsoletas.sql`
- [ ] Revisé los resultados y entendí qué se eliminará
- [ ] Ejecuté el script de limpieza apropiado
- [ ] Verifiqué que las tablas obsoletas fueron eliminadas
- [ ] Verifiqué que `barberos` y `solicitudes_barberos` siguen existiendo
- [ ] El sistema de registro de barberos sigue funcionando
- [ ] No hay errores en los logs de Supabase

---

## 📞 Soporte

Si tienes dudas sobre qué script ejecutar o necesitas ayuda interpretando los resultados del script de verificación, consulta con el equipo de desarrollo antes de proceder.

**Recuerda:** Es mejor tomarse 5 minutos extra para verificar que después pasar horas restaurando desde backups. 🛡️
