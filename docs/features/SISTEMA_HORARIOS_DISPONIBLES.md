# 📅 Sistema de Horarios Disponibles - Chamos Barber

## 🎯 Objetivo

Implementar un sistema robusto que muestre horarios disponibles en tiempo real, prevenga reservas duplicadas y proporcione una excelente experiencia de usuario.

## 🏗️ Arquitectura

### Capas de Protección contra Duplicados

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO SELECCIONA HORA                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  CAPA 1: UI - Solo muestra horarios disponibles             │
│  ✅ Filtra slots con disponible=false                        │
│  ✅ Recarga al cambiar barbero/fecha                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  CAPA 2: Frontend Validation (createCita helper)            │
│  ✅ Verifica disponibilidad antes de INSERT                  │
│  ✅ Valida que no sea hora pasada                            │
│  ✅ Maneja race conditions                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  CAPA 3: Database Constraint (UNIQUE INDEX)                 │
│  ✅ Previene duplicados a nivel de BD                        │
│  ✅ Retorna error 23505 si hay conflict                      │
│  ✅ Garantía absoluta de integridad                          │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Componentes del Sistema

### 1. Función SQL: `get_horarios_disponibles`

**Ubicación**: `scripts/SQL/create-horarios-disponibles-function.sql`

**Propósito**: Calcular en tiempo real qué horarios están disponibles.

**Parámetros**:
- `barbero_id_param` (uuid): ID del barbero
- `fecha_param` (date): Fecha de la reserva

**Retorna**:
```sql
TABLE (
  hora text,         -- '09:00', '09:30', etc.
  disponible boolean, -- true/false
  motivo text        -- 'Disponible', 'Ya reservado', 'Hora pasada', etc.
)
```

**Lógica**:

1. **Generar slots base**: De 9:00 AM a 7:00 PM cada 30 minutos
2. **Consultar citas reservadas**: Solo estados 'pendiente' y 'confirmada'
3. **Verificar horario de trabajo**: Si está definido para el barbero
4. **Validar hora actual**: Si es hoy, no mostrar horas pasadas
5. **Marcar disponibilidad**: Combinar todas las validaciones

**Ejemplo de uso**:
```sql
SELECT * FROM get_horarios_disponibles(
  '123e4567-e89b-12d3-a456-426614174000',
  '2025-11-04'
);
```

**Resultado esperado**:
```
hora   | disponible | motivo
-------+------------+------------------
09:00  | true       | Disponible
09:30  | false      | Ya reservado
10:00  | true       | Disponible
10:30  | false      | Hora pasada
...
```

---

### 2. Helper de Supabase: `getHorariosDisponibles`

**Ubicación**: `lib/supabase-helpers.ts`

**Función**:
```typescript
getHorariosDisponibles: async (barbero_id: string, fecha: string) => {
  const { data, error } = await supabase.rpc('get_horarios_disponibles', {
    barbero_id_param: barbero_id,
    fecha_param: fecha
  })
  
  if (error) throw error
  return data || []
}
```

**Manejo de errores**:
- Si la función SQL no existe, retorna `null`
- El frontend usa horarios por defecto como fallback
- Logs detallados en consola para debugging

---

### 3. Validación en `createCita`

**Ubicación**: `lib/supabase-helpers.ts`

**Validaciones implementadas**:

#### Validación 1: Disponibilidad
```typescript
const { data: existingCitas } = await supabase
  .from('citas')
  .select('id')
  .eq('barbero_id', cita.barbero_id)
  .eq('fecha', cita.fecha)
  .eq('hora', cita.hora)
  .in('estado', ['pendiente', 'confirmada'])

if (existingCitas && existingCitas.length > 0) {
  throw new Error('⚠️ Este horario acaba de ser reservado...')
}
```

#### Validación 2: Hora pasada
```typescript
const fechaHora = new Date(`${cita.fecha}T${cita.hora}`)
const ahora = new Date()

if (fechaHora <= ahora) {
  throw new Error('⚠️ No puedes reservar una cita en el pasado...')
}
```

#### Validación 3: Race conditions
```typescript
const { data, error } = await supabase
  .from('citas')
  .insert([cita])
  .select()
  .single()

if (error?.code === '23505') {
  throw new Error('⚠️ Este horario fue reservado mientras completabas...')
}
```

---

### 4. Constraint de Base de Datos

**Ubicación**: `scripts/SQL/add-citas-unique-constraint.sql`

**Índice único parcial**:
```sql
CREATE UNIQUE INDEX unique_cita_activa_por_barbero_fecha_hora
ON citas (barbero_id, fecha, hora)
WHERE estado IN ('pendiente', 'confirmada');
```

**Características**:
- ✅ **Parcial**: Solo aplica a citas activas
- ✅ **Permite canceladas**: Múltiples citas canceladas en mismo slot
- ✅ **A nivel de BD**: Garantía absoluta de integridad
- ✅ **Performance**: Índice optimiza búsquedas

**Error generado**:
```
Code: 23505
Message: duplicate key value violates unique constraint
```

---

### 5. UI en `/reservar`

**Ubicación**: `src/pages/reservar.tsx`

**Características del UI**:

#### A. Carga de horarios
```typescript
useEffect(() => {
  if (formData.fecha && formData.barbero_id) {
    loadAvailableSlots()
  }
}, [formData.fecha, formData.barbero_id])
```

#### B. Visualización
- ✅ Solo muestra horarios disponibles
- ✅ Contador de slots disponibles
- ✅ Indicador visual de selección
- ✅ Sección expandible con horarios ocupados
- ✅ Íconos y colores para cada estado

#### C. Estados visuales

**Disponible**:
```jsx
<div className="time-slot">
  <span>09:00</span>
  <i className="fas fa-check-circle"></i>
</div>
```

**Ocupado**:
```jsx
<div style={{ 
  textDecoration: 'line-through',
  opacity: 0.6,
  cursor: 'not-allowed'
}}>
  <div>09:30</div>
  <div>🔒 Ocupado</div>
</div>
```

**Sin horarios**:
```jsx
<div className="empty-state">
  <i className="fas fa-calendar-times"></i>
  <p>No hay horarios disponibles</p>
  <p>Selecciona otra fecha o barbero</p>
</div>
```

---

## 🔄 Flujo Completo de Reserva

### Paso 1: Usuario selecciona barbero y fecha
```
Usuario → Selecciona barbero ID: abc-123
Usuario → Selecciona fecha: 2025-11-04
```

### Paso 2: Sistema carga horarios
```
Frontend → llamada a getHorariosDisponibles(abc-123, 2025-11-04)
Backend → ejecuta función SQL get_horarios_disponibles
Backend → retorna array de slots con disponibilidad
Frontend → filtra y muestra solo disponibles
```

### Paso 3: Usuario selecciona hora
```
Usuario → Click en slot 10:00
Frontend → guarda hora en state
Frontend → habilita botón "Siguiente"
```

### Paso 4: Usuario completa datos y confirma
```
Usuario → Nombre, teléfono, email
Usuario → Click "Confirmar Reserva"
```

### Paso 5: Validación y creación
```
Frontend → llamada a createCita(data)
Helper → Validación 1: verifica disponibilidad (SELECT)
Helper → Validación 2: verifica hora no pasada
Helper → Validación 3: intenta INSERT
Database → Constraint valida unicidad
Database → INSERT exitoso o error 23505
```

### Paso 6: Respuesta al usuario
```
✅ Éxito: "¡Cita reservada exitosamente!"
❌ Duplicado: "Este horario fue reservado mientras..."
❌ Hora pasada: "No puedes reservar en el pasado..."
```

---

## 🧪 Testing

### Test 1: Horarios disponibles se cargan correctamente
```typescript
// En console del navegador (en /reservar)
const { data } = await supabase.rpc('get_horarios_disponibles', {
  barbero_id_param: 'abc-123',
  fecha_param: '2025-11-04'
})
console.log('Disponibles:', data.filter(s => s.disponible).length)
console.log('Ocupados:', data.filter(s => !s.disponible).length)
```

### Test 2: No se pueden crear duplicados
```sql
-- En Supabase SQL Editor
BEGIN;

-- Insertar primera cita
INSERT INTO citas (barbero_id, fecha, hora, servicio_id, cliente_nombre, cliente_telefono, estado)
VALUES ('abc-123', '2025-11-04', '10:00', 'servicio-1', 'Test 1', '+56912345678', 'pendiente');

-- Intentar insertar duplicado (DEBE FALLAR)
INSERT INTO citas (barbero_id, fecha, hora, servicio_id, cliente_nombre, cliente_telefono, estado)
VALUES ('abc-123', '2025-11-04', '10:00', 'servicio-1', 'Test 2', '+56987654321', 'pendiente');

ROLLBACK;
```

### Test 3: Canceladas no bloquean slot
```sql
-- Insertar múltiples canceladas (DEBE FUNCIONAR)
INSERT INTO citas (barbero_id, fecha, hora, servicio_id, cliente_nombre, cliente_telefono, estado)
VALUES 
  ('abc-123', '2025-11-04', '11:00', 'servicio-1', 'Cancelado 1', '+56911111111', 'cancelada'),
  ('abc-123', '2025-11-04', '11:00', 'servicio-1', 'Cancelado 2', '+56922222222', 'cancelada');
```

### Test 4: Race condition manejada
```javascript
// Simular dos usuarios reservando simultáneamente
const createSimultaneous = async () => {
  const promises = [
    chamosSupabase.createCita({ /* cita 1 */ }),
    chamosSupabase.createCita({ /* cita 2 - mismo slot */ })
  ]
  
  try {
    await Promise.all(promises)
  } catch (error) {
    console.log('Uno falló (correcto):', error.message)
  }
}
```

---

## 📈 Monitoreo y Performance

### Métricas clave

1. **Tiempo de carga de horarios**
   - Target: < 200ms
   - Verificar en Network tab

2. **Tasa de error en reservas**
   - Errores de duplicado deberían ser < 0.1%
   - Monitorear logs de Supabase

3. **Uso del índice único**
   ```sql
   SELECT * FROM pg_stat_user_indexes
   WHERE indexname = 'unique_cita_activa_por_barbero_fecha_hora';
   ```

### Optimizaciones implementadas

1. ✅ **Índice compuesto**: `(barbero_id, fecha, hora)`
2. ✅ **Índice parcial**: Solo citas activas
3. ✅ **Caché en frontend**: State persiste entre pasos
4. ✅ **Consultas optimizadas**: Solo campos necesarios

---

## 🔐 Seguridad

### Políticas RLS

Las políticas RLS deben permitir:
- ✅ **Anon role**: Ejecutar `get_horarios_disponibles`
- ✅ **Anon role**: INSERT en tabla `citas`
- ✅ **Authenticated**: SELECT todas las citas

### Validaciones de seguridad

1. **Input sanitization**: Todos los inputs validados
2. **SQL injection**: Protegido por prepared statements de Supabase
3. **Rate limiting**: Considerar implementar en futuro
4. **CAPTCHA**: Considerar para prevenir bots

---

## 🚀 Deployment

### Pasos para desplegar

1. **Crear función SQL**:
   ```bash
   # Ejecutar en Supabase SQL Editor
   /scripts/SQL/create-horarios-disponibles-function.sql
   ```

2. **Crear constraint**:
   ```bash
   # Ejecutar en Supabase SQL Editor
   /scripts/SQL/add-citas-unique-constraint.sql
   ```

3. **Deploy código**:
   ```bash
   git add .
   git commit -m "feat: sistema de horarios disponibles en tiempo real"
   git push origin master
   ```

4. **Verificar en producción**:
   - Probar /reservar
   - Verificar horarios se cargan
   - Intentar crear cita duplicada

---

## 📝 Mantenimiento

### Agregar nuevos horarios

Modificar función SQL:
```sql
-- Cambiar rango de horas
FROM generate_series(
  '08:00'::time,  -- Hora inicio
  '20:00'::time,  -- Hora fin
  '30 minutes'::interval  -- Intervalo
) h
```

### Cambiar días de trabajo

Actualizar tabla `horarios_trabajo`:
```sql
INSERT INTO horarios_trabajo (barbero_id, dia_semana, hora_inicio, hora_fin, activo)
VALUES ('abc-123', 1, '09:00', '18:00', true);  -- Lunes
```

### Debug de problemas

1. **Horarios no se cargan**:
   ```sql
   -- Verificar función existe
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'get_horarios_disponibles';
   ```

2. **Duplicados se crean**:
   ```sql
   -- Verificar índice existe
   SELECT indexname FROM pg_indexes 
   WHERE indexname = 'unique_cita_activa_por_barbero_fecha_hora';
   ```

3. **Performance lenta**:
   ```sql
   -- Analizar plan de ejecución
   EXPLAIN ANALYZE SELECT * FROM get_horarios_disponibles('abc', '2025-11-04');
   ```

---

## 📚 Referencias

- [Función SQL](../../scripts/SQL/create-horarios-disponibles-function.sql)
- [Constraint único](../../scripts/SQL/add-citas-unique-constraint.sql)
- [Helper Supabase](../../lib/supabase-helpers.ts)
- [UI Reservar](../../src/pages/reservar.tsx)
- [PostgreSQL Unique Indexes](https://www.postgresql.org/docs/current/indexes-unique.html)
- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)

---

**Última actualización**: 2025-11-02  
**Versión**: 1.0.0  
**Estado**: ✅ Implementado y probado
