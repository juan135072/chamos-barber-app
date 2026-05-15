# 🚨 MIGRACIÓN URGENTE - Corregir Error de Cobro

## Problema
Error al cobrar citas: **"column reference 'numero_factura' is ambiguous"**

## Causa
La función RPC `cobrar_cita()` usa `SELECT c.*` que causa ambigüedad cuando luego usa `RETURNING numero_factura`.

## Solución
Ejecutar el archivo de migración que especifica columnas explícitas.

---

## 📋 PASOS PARA APLICAR (Opción 1 - Recomendada)

### 1. Ir al Dashboard de Supabase
- Abre: https://supabase.com/dashboard
- Selecciona tu proyecto
- Ve a **SQL Editor**

### 2. Copiar y Ejecutar el SQL
- Abre el archivo: `supabase/migrations/fix_cobrar_cita_ambiguity.sql`
- Copia TODO el contenido
- Pégalo en el SQL Editor
- Haz clic en **Run** o presiona `Ctrl+Enter`

### 3. Verificar
Deberías ver: `Success. No rows returned`

---

## 📋 PASOS PARA APLICAR (Opción 2 - Desde archivo)

Si Supabase tiene opción de ejecutar migraciones desde archivos:

1. Ve a **Database** → **Migrations**
2. Busca opción de "Upload migration" o "Run SQL file"
3. Sube: `supabase/migrations/fix_cobrar_cita_ambiguity.sql`
4. Ejecuta

---

## ✅ Verificación Post-Migración

Después de ejecutar la migración:

1. **Refresca** la página del POS
2. **Intenta cobrar** una cita de prueba
3. **Verifica** que NO aparezca el error de `numero_factura`
4. **Confirma** que se genere la factura correctamente

---

## 🔍 Qué Hace Esta Migración

La migración **reemplaza** la función `cobrar_cita()` con una versión corregida que:

✅ Especifica columnas explícitas en lugar de `c.*`
✅ Usa `facturas.numero_factura` en el RETURNING para eliminar ambigüedad
✅ Mantiene exactamente la misma funcionalidad

**NO elimina ni modifica datos**, solo actualiza la lógica de la función.

---

## ⚠️ Importante

Esta migración debe ejecutarse **DIRECTAMENTE en Supabase** antes de que el código desplegado funcione correctamente.

Los cambios de código TypeScript ya están en producción, pero necesitan que esta función RPC esté actualizada.

---

## 📞 Si Necesitas Ayuda

Si tienes problemas ejecutando la migración, avísame y puedo:
- Crear un script alternativo
- Guiarte paso a paso con capturas
- Buscar otra forma de aplicarla
