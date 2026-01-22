# 🔧 FIX URGENTE - Sistema de Liquidaciones

## ❌ Error Actual
```
column "monto_total_vendido" of relation "liquidaciones" does not exist
```

## 🎯 Causa del Problema
La función `crear_liquidacion` en la base de datos está intentando insertar datos en una columna llamada `monto_total_vendido`, pero la columna correcta en la tabla `liquidaciones` es **`total_ventas`**.

## ✅ Solución

### **Opción 1: Ejecutar Script SQL (RECOMENDADO)**

1. **Abrir Supabase Dashboard**
   - Ir a: https://supabase.com/dashboard
   - Seleccionar tu proyecto

2. **Abrir SQL Editor**
   - Menu lateral → "SQL Editor"
   - O ir directamente a: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

3. **Ejecutar el Script**
   - Copiar TODO el contenido de `FIX_CREAR_LIQUIDACION_FUNCTION.sql`
   - Pegarlo en el SQL Editor
   - Click en "Run" o presionar `Ctrl + Enter`

4. **Verificar Resultado**
   Deberías ver un mensaje de éxito:
   ```
   Success. No rows returned
   ```
   
   Y luego la verificación mostrará:
   ```
   routine_name: crear_liquidacion
   routine_type: FUNCTION
   data_type: uuid
   ```

### **Opción 2: SQL Directo (Rápido)**

Si prefieres ejecutar solo el código esencial, copia y pega esto en Supabase SQL Editor:

```sql
-- Recrear función corregida
CREATE OR REPLACE FUNCTION public.crear_liquidacion(
  p_barbero_id UUID,
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_liquidacion_id UUID;
  v_numero_liquidacion VARCHAR(50);
  v_total_ventas DECIMAL(10,2);
  v_cantidad_servicios INTEGER;
  v_porcentaje_comision DECIMAL(5,2);
  v_total_comision DECIMAL(10,2);
  v_facturas_ids UUID[];
BEGIN
  IF p_fecha_fin < p_fecha_inicio THEN
    RAISE EXCEPTION 'La fecha fin debe ser posterior a la fecha inicio';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.barberos 
    WHERE id = p_barbero_id AND activo = true
  ) THEN
    RAISE EXCEPTION 'Barbero no encontrado o inactivo';
  END IF;

  SELECT porcentaje_comision INTO v_porcentaje_comision
  FROM public.barberos WHERE id = p_barbero_id;

  SELECT 
    COALESCE(COUNT(*), 0),
    COALESCE(SUM(total), 0),
    ARRAY_AGG(id)
  INTO 
    v_cantidad_servicios,
    v_total_ventas,
    v_facturas_ids
  FROM public.facturas
  WHERE barbero_id = p_barbero_id
    AND fecha::DATE BETWEEN p_fecha_inicio AND p_fecha_fin
    AND estado = 'pagada'
    AND comision_pagada = false;

  IF v_cantidad_servicios = 0 OR v_total_ventas = 0 THEN
    RAISE EXCEPTION 'No hay ventas en el período seleccionado para liquidar';
  END IF;

  v_total_comision := (v_total_ventas * v_porcentaje_comision / 100);

  SELECT COALESCE(
    'LIQ-' || LPAD((COUNT(*) + 1)::TEXT, 6, '0'),
    'LIQ-000001'
  ) INTO v_numero_liquidacion
  FROM public.liquidaciones;

  INSERT INTO public.liquidaciones (
    numero_liquidacion,
    barbero_id,
    fecha_inicio,
    fecha_fin,
    total_ventas,
    cantidad_servicios,
    porcentaje_comision,
    total_comision,
    facturas_ids,
    estado,
    created_at
  ) VALUES (
    v_numero_liquidacion,
    p_barbero_id,
    p_fecha_inicio,
    p_fecha_fin,
    v_total_ventas,
    v_cantidad_servicios,
    v_porcentaje_comision,
    v_total_comision,
    v_facturas_ids,
    'pendiente',
    NOW()
  )
  RETURNING id INTO v_liquidacion_id;

  UPDATE public.facturas
  SET 
    liquidacion_id = v_liquidacion_id,
    updated_at = NOW()
  WHERE id = ANY(v_facturas_ids);

  RETURN v_liquidacion_id;
END;
$$;
```

## 🧪 Probar la Corrección

Después de ejecutar el script, prueba crear una liquidación nuevamente:

1. Ir a `/admin/liquidaciones`
2. Click en "Crear Liquidación" para Carlos Pérez
3. Seleccionar período (por ejemplo: Mes Actual)
4. Click en "Crear Liquidación"

**Resultado esperado:** ✅ Liquidación creada exitosamente sin errores

## 📊 Cambios Realizados

| Antes (❌ Error) | Después (✅ Correcto) |
|------------------|----------------------|
| `monto_total_vendido` | `total_ventas` |
| Columna inexistente | Columna que existe en la tabla |

## 🔍 Verificación Adicional

Para confirmar que la función está correcta, ejecuta en SQL Editor:

```sql
SELECT 
  routine_name,
  routine_type,
  specific_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'crear_liquidacion';
```

Debería retornar la función con tipo `FUNCTION`.

## 📝 Notas

- ✅ El frontend ya está correcto y no necesita cambios
- ✅ El modal se ve perfecto con el tema oscuro
- ❌ Solo falta corregir la función RPC en la base de datos
- ⚡ Este es el único paso pendiente para que funcione completamente

---

**¿Necesitas ayuda adicional?** Contacta al equipo de desarrollo.
