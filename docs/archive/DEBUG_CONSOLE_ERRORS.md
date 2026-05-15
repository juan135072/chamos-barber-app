# 🐛 CÓMO OBTENER EL ERROR COMPLETO DE LA CONSOLA

## 📋 INSTRUCCIONES PASO A PASO:

### **Paso 1: Abrir la Consola del Navegador**
- Presiona **F12** (o Click derecho → Inspeccionar)
- Ve a la pestaña **Console**

### **Paso 2: Limpiar la Consola**
- Click en el ícono 🚫 (Clear console)
- O presiona: `Ctrl + L`

### **Paso 3: Intentar Hacer la Venta Nuevamente**
- Selecciona: **Carlos Pérez**
- Servicio: **Corte Clásico** ($15.000)
- Cliente: **Cliente Prueba**
- Teléfono: **+56911111111**
- Método: **Efectivo**
- Click: **COBRAR**

### **Paso 4: Ver el Error Completo**

Cuando aparezca el error en rojo, verás algo así:

```
🔴 Error calculando comisión: Object
    ▶ {message: "...", details: "...", hint: "...", code: "..."}
```

#### **⚠️ IMPORTANTE: EXPANDIR EL OBJETO**
1. **Click en el triángulo ▶** al lado de "Object"
2. Se expandirá mostrando todo el contenido:
   ```
   {
     message: "function calcular_comisiones_factura...",
     details: "...",
     hint: "...",
     code: "42883"
   }
   ```

3. **Click derecho** en el objeto expandido
4. Selecciona: **"Copy object"** (Copiar objeto)
5. Pégalo en tu respuesta

---

### **Paso 5: Hacer lo Mismo con el Segundo Error**

```
🔴 Error al crear venta: Object
    ▶ {message: "...", details: "...", hint: "...", code: "..."}
```

Repite el proceso:
1. Click en el triángulo ▶
2. Click derecho → Copy object
3. Pégalo en tu respuesta

---

## 📸 ALTERNATIVAMENTE (MÁS FÁCIL):

### **Opción A: Captura de Pantalla**
1. Expande ambos errores (click en los triángulos ▶)
2. Toma una captura de pantalla que muestre:
   - Los dos errores expandidos
   - Todo el contenido de los objetos

### **Opción B: Copy as cURL**
1. Ve a la pestaña **Network** (Red)
2. Busca la petición fallida (en rojo):
   - `rpc/calcular_comisiones_factura`
   - `facturas`
3. Click derecho → **Copy** → **Copy as cURL**
4. Pégalo en tu respuesta

---

## 🎯 LO QUE NECESITO VER:

```json
// Error 1: Error calculando comisión
{
  "message": "...",
  "details": "...",
  "hint": "...",
  "code": "..."
}

// Error 2: Error al crear venta
{
  "message": "...",
  "details": "...",
  "hint": "...",
  "code": "..."
}
```

---

## 🔧 MIENTRAS TANTO: DIAGNÓSTICO EN SUPABASE

Ejecuta este script en **Supabase SQL Editor**:

```sql
-- ================================================================
-- 🐛 DIAGNÓSTICO: Verificar función y tabla facturas
-- ================================================================

-- 1️⃣ Verificar que la función existe y tiene permisos
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  proacl as permissions
FROM pg_proc
WHERE proname = 'calcular_comisiones_factura'
ORDER BY arguments;

-- 2️⃣ Probar la función manualmente con el ID de Carlos
DO $$
DECLARE
  carlos_id UUID;
  result RECORD;
BEGIN
  SELECT id INTO carlos_id FROM barberos WHERE nombre = 'Carlos' LIMIT 1;
  
  RAISE NOTICE 'ID de Carlos: %', carlos_id;
  
  -- Probar con INTEGER
  FOR result IN 
    SELECT * FROM calcular_comisiones_factura(carlos_id, 15000)
  LOOP
    RAISE NOTICE 'Resultado: porcentaje=%, comision=%, casa=%', 
      result.porcentaje, result.comision_barbero, result.ingreso_casa;
  END LOOP;
END $$;

-- 3️⃣ Ver estructura completa de la tabla facturas
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'facturas'
ORDER BY ordinal_position;

-- 4️⃣ Ver constraints de facturas
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.facturas'::regclass
ORDER BY contype, conname;

-- 5️⃣ Verificar políticas RLS de facturas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'facturas'
ORDER BY policyname;

-- 6️⃣ Intentar un INSERT de prueba
DO $$
DECLARE
  carlos_id UUID;
  servicio_id UUID;
  test_factura_id UUID;
BEGIN
  SELECT id INTO carlos_id FROM barberos WHERE nombre = 'Carlos' LIMIT 1;
  SELECT id INTO servicio_id FROM servicios WHERE nombre = 'Corte Clásico' LIMIT 1;
  
  INSERT INTO facturas (
    barbero_id,
    cliente_nombre,
    cliente_telefono,
    total,
    metodo_pago,
    servicios,
    comision_barbero,
    ingreso_casa
  ) VALUES (
    carlos_id,
    'Cliente Prueba Debug',
    '+56999999999',
    15000,
    'efectivo',
    ARRAY[servicio_id],
    7500,
    7500
  )
  RETURNING id INTO test_factura_id;
  
  RAISE NOTICE 'Factura de prueba creada: %', test_factura_id;
  
  -- Eliminar la factura de prueba
  DELETE FROM facturas WHERE id = test_factura_id;
  RAISE NOTICE 'Factura de prueba eliminada';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR al insertar: % - %', SQLSTATE, SQLERRM;
END $$;
```

**Ejecuta este script y envíame los resultados completos.**

---

## 📞 ENVÍAME:

1. ✅ **Errores expandidos** (copy object) o captura de pantalla
2. ✅ **Resultados del script SQL** de diagnóstico
3. ✅ **(Opcional)** Pestaña Network → Copy as cURL de las peticiones fallidas

Con esa información podré identificar el problema exacto. 🚀
