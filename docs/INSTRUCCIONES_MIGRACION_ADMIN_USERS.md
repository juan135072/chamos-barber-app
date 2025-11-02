# 🚨 INSTRUCCIONES URGENTES: Migración de admin_users

**Fecha:** 2 de noviembre de 2025  
**Prioridad:** 🔴 CRÍTICA - Ejecutar ANTES del próximo deployment

---

## 📋 Contexto

Se descubrió que el esquema de la tabla `admin_users` en la base de datos está **incompleto** y **no coincide** con lo que el código espera. Esto está causando errores de build y fallos en runtime.

### Problemas Identificados

1. **Columnas con nombres incorrectos en código:**
   - Código esperaba: `created_at`, `updated_at`
   - Base de datos tiene: `creado_en`, `actualizado_en`

2. **Columnas faltantes en base de datos:**
   - `nombre` (CRÍTICO - requerido por el código)
   - `telefono` (opcional)
   - `avatar_url` (opcional)

---

## ✅ Solución Implementada

### Parte 1: Código Actualizado (✅ Ya pusheado)

**Commit:** `52e93cb`

- ✅ Tipos TypeScript corregidos para usar `creado_en`/`actualizado_en`
- ✅ Queries SQL actualizadas para usar nombres correctos
- ✅ Script de migración creado

### Parte 2: Base de Datos (⏳ PENDIENTE - DEBES EJECUTAR)

**Script:** `scripts/SQL/migrate-admin-users-add-missing-fields.sql`

---

## 🔧 PASOS PARA EJECUTAR LA MIGRACIÓN

### Paso 1: Conectar a tu Base de Datos Supabase

Opciones:
- **Opción A:** Dashboard de Supabase → SQL Editor
- **Opción B:** `psql` desde terminal

### Paso 2: Ejecutar el Script de Migración

Copia y pega el contenido completo de este archivo:
```
scripts/SQL/migrate-admin-users-add-missing-fields.sql
```

O desde terminal:
```bash
psql <tu-connection-string> < scripts/SQL/migrate-admin-users-add-missing-fields.sql
```

### Paso 3: Verificar la Migración

El script incluye verificaciones automáticas al final. Deberías ver:

```
✅ Columnas nombre, telefono, avatar_url agregadas
✅ Todos los usuarios existentes tienen nombre poblado
✅ usuarios_sin_nombre = 0
```

---

## 📄 Contenido del Script de Migración

El script hace lo siguiente:

1. **Agrega columnas faltantes:**
   ```sql
   ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS nombre TEXT;
   ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS telefono TEXT;
   ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
   ```

2. **Migra datos existentes:**
   - Para barberos: copia nombre desde la tabla `barberos` asociada
   - Para admins: asigna 'Administrador' por defecto
   - Usa email como fallback si no hay barbero asociado

3. **Verifica la migración:**
   - Muestra estructura actualizada de la tabla
   - Lista todos los usuarios con sus nombres
   - Cuenta usuarios sin nombre (debería ser 0)

---

## ⚠️ IMPORTANTE: Orden de Ejecución

**DEBES ejecutar esta migración en el siguiente orden:**

1. ✅ **Código actualizado** (ya hecho - commit `52e93cb`)
2. ⏳ **Migración de base de datos** (PENDIENTE - ejecuta el script)
3. ⏳ **Deployment en Coolify** (después de la migración)

### ¿Por qué este orden?

- Si deployamos el código ANTES de la migración → **FALLARÁ** porque el código intentará usar `nombre` que no existe
- Si ejecutamos la migración PRIMERO → La base de datos estará lista cuando se deploye el nuevo código

---

## 🧪 Verificación Post-Migración

Después de ejecutar el script, verifica lo siguiente:

### Test 1: Verificar estructura de la tabla
```sql
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;
```

**Resultado esperado:** Deberías ver columnas:
- `id`, `email`, `rol`, `barbero_id`, `activo`
- `nombre` ✅ (nueva)
- `telefono` ✅ (nueva)
- `avatar_url` ✅ (nueva)
- `ultimo_acceso`, `creado_en`, `actualizado_en`

### Test 2: Verificar datos migrados
```sql
SELECT 
  email,
  nombre,
  rol,
  barbero_id,
  activo
FROM admin_users
ORDER BY creado_en DESC;
```

**Resultado esperado:**
- Todos los usuarios deben tener `nombre` poblado (no NULL)
- Barberos deben tener nombre del barbero asociado
- Admins deben tener 'Administrador' o su nombre específico

### Test 3: Contar usuarios sin nombre
```sql
SELECT COUNT(*) as usuarios_sin_nombre
FROM admin_users
WHERE nombre IS NULL;
```

**Resultado esperado:** `0` (cero usuarios sin nombre)

---

## 🚀 Próximos Pasos

### Después de Ejecutar la Migración

1. ✅ Confirmar que la migración fue exitosa (usuarios_sin_nombre = 0)
2. ⏳ Esperar a que Coolify deploye el nuevo código (commit `52e93cb`)
3. ⏳ Probar el sistema de aprobación de barberos
4. ⏳ Verificar que los barberos pueden hacer login

### Si Encuentras Errores

Si después de la migración aún hay problemas:

1. **Verificar logs de Coolify:** Buscar errores específicos de SQL
2. **Verificar datos migrados:** Ejecutar los queries de verificación arriba
3. **Revisar políticas RLS:** Asegurarse de que permitan SELECT/INSERT con los nuevos campos

---

## 📝 Archivos Relacionados

### Scripts SQL
- `scripts/setup-roles-system.sql` - Esquema original (incompleto)
- `scripts/SQL/migrate-admin-users-add-missing-fields.sql` - **Migración a ejecutar**

### Código TypeScript
- `lib/database.types.ts` - Tipos actualizados
- `lib/supabase-helpers.ts` - Queries actualizadas

### Documentación
- `docs/changelog/FIX_CRITICAL_DATABASE_TYPES_MISMATCH_2025-11-02.md` - Análisis del problema

---

## ❓ Preguntas Frecuentes

### ¿Es seguro ejecutar este script en producción?
✅ Sí, el script usa `IF NOT EXISTS` y `COALESCE` para ser idempotente (puede ejecutarse múltiples veces sin causar problemas).

### ¿Qué pasa si ya tengo datos en admin_users?
✅ El script migra automáticamente los nombres de los usuarios existentes desde la tabla `barberos`.

### ¿Puedo ejecutar el script más de una vez?
✅ Sí, es seguro. Si las columnas ya existen, no hace nada. Si los nombres ya están poblados, no los sobrescribe.

### ¿Qué pasa si no ejecuto la migración?
❌ El código fallará intentando insertar/seleccionar el campo `nombre` que no existe en la tabla.

---

## 📞 Soporte

Si encuentras algún problema durante la migración:

1. **Copia el error exacto** del SQL Editor o terminal
2. **Verifica el estado actual** de la tabla con los queries de verificación
3. **Reporta el error** con toda la información

---

**Estado:** ⏳ Migración PENDIENTE de ejecución  
**Prioridad:** 🔴 CRÍTICA - Ejecutar AHORA  
**Siguiente acción:** Ejecutar `migrate-admin-users-add-missing-fields.sql` en Supabase
