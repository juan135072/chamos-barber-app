# 🔧 Solución: Error "Could not find the 'cita_id' column"

**Fecha:** 2025-12-17  
**Error:** `Could not find the 'cita_id' column of 'facturas' in the schema cache`  
**Status:** 🟡 **REQUIERE ACCIÓN EN SUPABASE**

---

## 📋 Descripción del Problema

Cuando intentas cobrar una cita en el POS, aparece el error:

```
❌ Error al crear factura: 
{
  code: "PGRST204",
  message: "Could not find the 'cita_id' column of 'facturas' in the schema cache"
}
```

### 🔍 Causa Raíz

Este error ocurre porque:

1. **PostgREST (el motor de API de Supabase) tiene un schema cache desactualizado**
2. La columna `cita_id` probablemente existe en la base de datos, pero PostgREST no la reconoce
3. O la columna `cita_id` fue eliminada accidentalmente durante la limpieza de producción

---

## ✅ Soluciones (3 Opciones)

### **Opción 1: Refrescar Schema Cache en Supabase (Más Rápido)** ⚡

1. **Ir al Dashboard de Supabase:**
   ```
   https://app.supabase.com
   ```

2. **Seleccionar tu proyecto:** `chamos-barber-app`

3. **Ir a Settings → API:**
   - Scroll hasta "API Settings"
   - Buscar "Schema Cache"
   - Click en **"Reload schema cache"** o **"Refresh schema"**

4. **Esperar 10-30 segundos** para que el cache se actualice

5. **Probar nuevamente** el cobro en el POS

**⏱️ Tiempo:** 2-3 minutos  
**✅ Probabilidad de éxito:** 70%

---

### **Opción 2: Verificar y Crear Columna (Si no existe)** 🔧

Si la Opción 1 no funciona, significa que la columna realmente no existe y hay que crearla.

#### Paso 1: Verificar Schema
1. Ir a **Supabase → SQL Editor**
2. Copiar y ejecutar este script:

```sql
-- VERIFICAR SI LA COLUMNA EXISTE
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'facturas'
ORDER BY ordinal_position;
```

3. **Buscar en los resultados** si aparece `cita_id`

#### Paso 2a: Si cita_id NO existe, crear la columna
```sql
-- CREAR LA COLUMNA cita_id
ALTER TABLE public.facturas 
ADD COLUMN cita_id UUID NULL;

-- AGREGAR FOREIGN KEY
ALTER TABLE public.facturas 
ADD CONSTRAINT facturas_cita_id_fkey 
FOREIGN KEY (cita_id) 
REFERENCES public.citas(id) 
ON DELETE SET NULL;

-- CREAR ÍNDICE
CREATE INDEX idx_facturas_cita_id 
ON public.facturas(cita_id);

-- REFRESCAR PERMISOS
GRANT ALL ON public.facturas TO authenticated;
GRANT ALL ON public.facturas TO service_role;
```

#### Paso 2b: Si cita_id SÍ existe, refrescar cache
```sql
-- Simplemente ejecutar cualquier query para forzar refresh
SELECT 1;
```

Luego ir a **Settings → API → Reload schema cache**

**⏱️ Tiempo:** 5-10 minutos  
**✅ Probabilidad de éxito:** 95%

---

### **Opción 3: Usar Script Completo de Verificación** 📝

He creado un script completo que verifica y corrige el problema automáticamente.

1. **Ir a Supabase → SQL Editor**
2. **Copiar el archivo:** `database/production/verificar_schema_facturas.sql`
3. **Pegar y ejecutar** en SQL Editor
4. **Leer los mensajes** en la pestaña "Messages"
5. **Refrescar schema cache** en Settings → API

**⏱️ Tiempo:** 5-10 minutos  
**✅ Probabilidad de éxito:** 98%

---

## 🚨 Solución Temporal (Mientras arreglas el schema)

Si necesitas que el POS funcione **AHORA** mientras resuelves el problema del schema, puedes usar este workaround:

### Modificar el código para NO usar cita_id

**Archivo:** `src/components/pos/ModalCobrarCita.tsx`

**Cambiar:**
```typescript
const facturaPayload = {
  numero_factura: numeroFactura,
  cita_id: cita.id,  // ← ESTA LÍNEA CAUSA EL ERROR
  barbero_id: cita.barbero_id || cita.barbero?.id || '',
  // ... resto del código
}
```

**Por:**
```typescript
const facturaPayload = {
  numero_factura: numeroFactura,
  // cita_id: cita.id,  // ← COMENTAR TEMPORALMENTE
  barbero_id: cita.barbero_id || cita.barbero?.id || '',
  // ... resto del código
}
```

⚠️ **IMPORTANTE:** Esto es solo temporal. Perderás la relación entre facturas y citas.

---

## 🔍 Diagnóstico Paso a Paso

### 1. Verificar si la columna existe
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'facturas' 
AND column_name = 'cita_id';
```

**Resultado esperado:**
- Si devuelve `cita_id` → La columna existe, solo hay que refrescar cache
- Si no devuelve nada → Hay que crear la columna

### 2. Ver la estructura completa de facturas
```sql
\d+ facturas;
-- o
SELECT * FROM information_schema.columns 
WHERE table_name = 'facturas' 
AND table_schema = 'public';
```

### 3. Verificar permisos RLS
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'facturas';
```

### 4. Probar INSERT manualmente
```sql
INSERT INTO facturas (
  numero_factura,
  cita_id,  -- Esta línea fallará si la columna no existe
  barbero_id,
  cliente_nombre,
  items,
  subtotal,
  total,
  metodo_pago,
  porcentaje_comision,
  comision_barbero,
  ingreso_casa
) VALUES (
  'FAC-TEST-001',
  NULL,  -- Usar NULL para probar
  (SELECT id FROM barberos LIMIT 1),
  'Cliente Test',
  '[{"servicio":"Test","precio":10}]'::jsonb,
  10,
  10,
  'efectivo',
  50,
  5,
  5
);
```

Si este INSERT falla con el mismo error → La columna no existe  
Si funciona → Solo es problema de cache

---

## 📊 Checklist de Verificación

Después de aplicar la solución:

- [ ] La columna `cita_id` aparece en la estructura de `facturas`
- [ ] El schema cache de Supabase está refrescado
- [ ] Puedes insertar una factura manualmente con `cita_id`
- [ ] El POS permite cobrar citas sin error
- [ ] Las facturas creadas tienen el campo `cita_id` poblado
- [ ] La relación cita ↔ factura funciona correctamente

---

## 🎯 Recomendación

**OPCIÓN 1 primero** (Refrescar cache) - Toma solo 2 minutos

Si no funciona → **OPCIÓN 2** (Verificar y crear columna) - Más seguro

Si todo falla → **OPCIÓN 3** (Script completo) - Solución definitiva

---

## 🔗 Links Importantes

- **Supabase Dashboard:** https://app.supabase.com
- **SQL Editor:** https://app.supabase.com/project/_/sql
- **API Settings:** https://app.supabase.com/project/_/settings/api
- **Database:** https://app.supabase.com/project/_/database/tables
- **Script de Verificación:** `database/production/verificar_schema_facturas.sql`

---

## 📝 Después de Resolver

1. **Probar el POS:**
   - Ir a: https://chamosbarber.com/pos
   - Seleccionar una cita
   - Cobrar con monto editable
   - Verificar que no aparezca error

2. **Verificar en Supabase:**
   ```sql
   SELECT 
     id,
     numero_factura,
     cita_id,  -- Debe aparecer con UUID o NULL
     cliente_nombre,
     total,
     created_at
   FROM facturas
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **Confirmar relación:**
   ```sql
   SELECT 
     f.numero_factura,
     f.total,
     c.cliente_nombre,
     c.fecha,
     c.estado
   FROM facturas f
   LEFT JOIN citas c ON f.cita_id = c.id
   WHERE f.cita_id IS NOT NULL
   ORDER BY f.created_at DESC
   LIMIT 5;
   ```

---

## ⚠️ Notas Importantes

1. **Cache de PostgREST:** Se actualiza automáticamente cada 10-15 minutos, pero puedes forzar el refresh manualmente

2. **Permisos RLS:** Asegúrate de que los permisos de Row Level Security permitan INSERT en facturas con `cita_id`

3. **Tipos TypeScript:** Los tipos en `lib/database.types.ts` muestran que `cita_id` debe existir. Si no existe en la DB real, hay inconsistencia.

4. **Regenerar Tipos:** Después de cualquier cambio en el schema, regenera los tipos:
   ```bash
   npx supabase gen types typescript --project-id <PROJECT_ID> > lib/database.types.ts
   ```

---

**Estado:** 🟡 Esperando acción en Supabase  
**Prioridad:** 🔴 ALTA - Bloquea funcionalidad crítica del POS

**¿Necesitas ayuda con algún paso específico?** 🚀
