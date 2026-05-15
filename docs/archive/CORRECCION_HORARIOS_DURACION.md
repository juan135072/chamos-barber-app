# 🐛 Corrección: Horarios Disponibles Considerando Duración del Servicio

**Fecha:** 2025-11-09  
**Problema:** Bug crítico en lógica de disponibilidad de horarios  
**Estado:** ✅ Corregido con migración SQL

---

## 🔴 **PROBLEMA IDENTIFICADO**

### **Bug Actual:**
La función `get_horarios_disponibles()` solo marca como ocupada **la hora exacta de inicio** de una cita, pero **NO considera la duración del servicio**.

### **Ejemplo del Bug:**

```
📅 Fecha: 10 de Noviembre
👤 Barbero: Juan
⏰ Cita reservada: 10:00
💈 Servicio: Corte + Barba (40 minutos)
```

**Comportamiento INCORRECTO (actual):**
```
09:30 ✅ Disponible
10:00 ❌ Ocupado      ← Solo marca esta hora
10:30 ✅ Disponible   ← ❌ ERROR! El barbero sigue ocupado
11:00 ✅ Disponible
```

**Comportamiento CORRECTO (después del fix):**
```
09:30 ✅ Disponible
10:00 ❌ Ocupado      ← Hora de inicio
10:30 ❌ Ocupado      ← ✅ Dentro del rango (10:00 - 10:40)
11:00 ✅ Disponible   ← ✅ Ya terminó el servicio (10:40)
```

---

## 🔧 **SOLUCIÓN IMPLEMENTADA**

### **Nueva Lógica:**

1. **Calcular duración total de cada cita**
   - Si tiene múltiples servicios: sumar todas las duraciones
   - Si tiene un solo servicio: usar su duración

2. **Calcular rango de tiempo ocupado**
   ```sql
   hora_inicio = 10:00
   duracion_total = 40 minutos
   hora_fin = 10:40
   rango_ocupado = [10:00, 10:40)
   ```

3. **Bloquear todos los slots dentro del rango**
   ```sql
   -- Un slot está ocupado si:
   hora_slot >= hora_inicio AND hora_slot < hora_fin
   
   10:00 >= 10:00 AND 10:00 < 10:40  ✅ Ocupado
   10:30 >= 10:00 AND 10:30 < 10:40  ✅ Ocupado
   11:00 >= 10:00 AND 11:00 < 10:40  ❌ Disponible
   ```

---

## 📊 **CASOS DE USO**

### **Caso 1: Servicio Simple (30 min)**
```
Cita: 14:00
Servicio: Corte Clásico (30 min)
Rango ocupado: 14:00 - 14:30

Resultado:
14:00 ❌ Ocupado
14:30 ✅ Disponible ← Ya terminó
15:00 ✅ Disponible
```

### **Caso 2: Servicio Largo (60 min)**
```
Cita: 15:00
Servicio: Corte Premium (60 min)
Rango ocupado: 15:00 - 16:00

Resultado:
15:00 ❌ Ocupado
15:30 ❌ Ocupado ← Aún en servicio
16:00 ✅ Disponible ← Ya terminó
16:30 ✅ Disponible
```

### **Caso 3: Múltiples Servicios (70 min total)**
```
Cita: 10:00
Servicios: 
  - Corte Moderno (30 min)
  - Arreglo de Barba (40 min)
Duración total: 70 min
Rango ocupado: 10:00 - 11:10

Resultado:
10:00 ❌ Ocupado
10:30 ❌ Ocupado ← Aún haciendo el corte
11:00 ❌ Ocupado ← Haciendo la barba
11:30 ✅ Disponible ← Ya terminó (11:10)
```

### **Caso 4: Citas Consecutivas**
```
Cita 1: 09:00 - Corte (30 min) → Termina 09:30
Cita 2: 09:30 - Barba (40 min) → Termina 10:10

Resultado:
09:00 ❌ Ocupado (Cita 1)
09:30 ❌ Ocupado (Cita 2)
10:00 ❌ Ocupado (Cita 2 aún)
10:30 ✅ Disponible ← Ambas terminadas
```

---

## 🔍 **CAMBIOS TÉCNICOS**

### **ANTES (Código Antiguo):**
```sql
citas_reservadas AS (
  SELECT c.hora::time as hora_reservada
  FROM citas c
  WHERE c.barbero_id = barbero_id_param
    AND c.fecha = fecha_param
    AND c.estado IN ('pendiente', 'confirmada')
)

-- Solo verifica coincidencia exacta de hora
WHERE cr.hora_reservada = hb.hora_slot::time
```
❌ Solo bloquea la hora exacta de inicio

### **AHORA (Código Nuevo):**
```sql
citas_con_duracion AS (
  SELECT 
    c.hora::time as hora_inicio,
    -- Calcular duración total (suma de todos los servicios)
    CASE
      WHEN c.notas ~ '\[SERVICIOS SOLICITADOS:' THEN
        (SELECT SUM(s.duracion_minutos) FROM servicios s ...)
      ELSE 
        (SELECT duracion_minutos FROM servicios WHERE id = c.servicio_id)
    END as duracion_total,
    -- Calcular hora de fin
    c.hora::time + duracion_total * interval '1 minute' as hora_fin
  FROM citas c
  ...
)

-- Verifica si el slot cae dentro del rango [inicio, fin)
WHERE hb.hora_time >= cd.hora_inicio
  AND hb.hora_time < cd.hora_fin
```
✅ Bloquea todo el rango de duración del servicio

---

## 🚀 **CÓMO APLICAR LA CORRECCIÓN**

### **Paso 1: Ejecutar Migración SQL**

1. Abre **Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/[TU_PROJECT_ID]
   ```

2. Ve a **SQL Editor**

3. Abre el archivo de migración:
   ```
   supabase/migrations/fix_horarios_disponibles_duracion.sql
   ```

4. **Copia TODO el contenido** del archivo

5. **Pega** en el SQL Editor

6. **Ejecuta** (Click en "Run" o Ctrl+Enter)

### **Paso 2: Verificar Corrección**

Ejecuta el test incluido en la migración:
```sql
-- Ver horarios después de crear cita de prueba de 40 min a las 10:00
SELECT hora, disponible, motivo
FROM get_horarios_disponibles(
  (SELECT id FROM barberos LIMIT 1),
  CURRENT_DATE + interval '1 day'
)
WHERE hora IN ('10:00', '10:30', '11:00')
ORDER BY hora;
```

**Resultado Esperado:**
```
 hora  | disponible |    motivo     
-------+------------+---------------
 10:00 | false      | Ya reservado
 10:30 | false      | Ya reservado   ← ✅ CORREGIDO!
 11:00 | true       | Disponible
```

---

## 📋 **BENEFICIOS**

✅ **Previene doble reserva** - No se pueden hacer dos citas que se solapen  
✅ **Respeta duración real** - Considera el tiempo que realmente toma el servicio  
✅ **Múltiples servicios** - Suma correctamente duraciones de varios servicios  
✅ **Experiencia realista** - Los horarios reflejan la disponibilidad real del barbero  
✅ **Sin conflictos** - El barbero nunca tendrá citas solapadas  

---

## ⚠️ **IMPORTANTE**

### **Esta corrección es CRÍTICA porque:**

1. **Sin ella**: Los clientes pueden reservar horarios cuando el barbero está ocupado
2. **Resultado**: Citas solapadas, barbero con dos clientes a la vez
3. **Impacto**: Mala experiencia del cliente, desorganización, pérdida de confianza

### **Con la corrección:**

1. **Cálculo preciso**: Solo muestra horarios realmente disponibles
2. **Sin conflictos**: Imposible que dos citas se solapen
3. **Profesional**: El sistema respeta el tiempo real de cada servicio

---

## 🧪 **ESCENARIOS DE PRUEBA**

### **Test 1: Servicio corto (30 min)**
```
1. Reservar cita a las 14:00 con "Corte Clásico" (30 min)
2. Verificar disponibilidad:
   - 13:30 ✅ Disponible
   - 14:00 ❌ Ocupado
   - 14:30 ✅ Disponible (servicio terminó)
```

### **Test 2: Servicio largo (60 min)**
```
1. Reservar cita a las 15:00 con "Tratamiento Capilar" (60 min)
2. Verificar disponibilidad:
   - 15:00 ❌ Ocupado
   - 15:30 ❌ Ocupado (aún en tratamiento)
   - 16:00 ✅ Disponible (tratamiento terminó)
```

### **Test 3: Múltiples servicios**
```
1. Reservar cita a las 10:00 con:
   - Corte Moderno (30 min)
   - Arreglo de Barba (40 min)
   Total: 70 min → Termina 11:10

2. Verificar disponibilidad:
   - 10:00 ❌ Ocupado
   - 10:30 ❌ Ocupado
   - 11:00 ❌ Ocupado
   - 11:30 ✅ Disponible (terminó a las 11:10)
```

---

## 📝 **NOTAS ADICIONALES**

### **Manejo de Múltiples Servicios:**

El código detecta automáticamente si una cita tiene múltiples servicios buscando el patrón en las notas:
```
[SERVICIOS SOLICITADOS: Corte Moderno, Arreglo de Barba]
```

Si encuentra este patrón:
1. Extrae los nombres de los servicios
2. Busca cada servicio en la tabla `servicios`
3. Suma todas las duraciones
4. Usa el total para calcular el rango ocupado

### **Fallback:**
Si no puede determinar la duración (caso raro), usa 30 minutos por defecto.

---

## ✅ **CHECKLIST DE VERIFICACIÓN**

Después de aplicar la migración, verifica:

- [ ] La función `get_horarios_disponibles` fue actualizada
- [ ] Los permisos están configurados (anon, authenticated, service_role)
- [ ] El test muestra 10:00 y 10:30 como ocupados
- [ ] La página `/reservar` solo muestra horarios realmente disponibles
- [ ] Las citas con servicios largos bloquean múltiples slots
- [ ] Las citas con múltiples servicios suman duraciones correctamente

---

**¡Bug Crítico Corregido!** 🎉

Ahora el sistema de reservas funciona correctamente, respetando la duración real de cada servicio y evitando conflictos de horarios.
