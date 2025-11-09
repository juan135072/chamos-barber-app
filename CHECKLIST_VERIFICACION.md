# ✅ Checklist de Verificación del Sistema

## 🎯 Propósito
Usar esta lista para verificar que el sistema Chamos Barber App está funcionando correctamente después de cualquier cambio o despliegue.

---

## 🔴 VERIFICACIONES CRÍTICAS

### ☑️ 1. Función PostgreSQL existe y funciona

**Comando:**
```sql
SELECT * 
FROM get_horarios_disponibles(
  '1fb21ce6-5225-48a7-941b-5aeaa5f7e1ca'::uuid,
  '2025-11-10'::date
)
LIMIT 5;
```

**Resultado esperado:**
```
✅ Devuelve tabla con columnas: hora, disponible, motivo
✅ Muestra horarios de 09:00 en adelante
✅ Sin errores
```

**Si falla:**
- [ ] Aplicar `supabase/migrations/FIX_GENERATE_SERIES.sql` en Supabase Dashboard
- [ ] Verificar permisos: anon, authenticated, service_role
- [ ] Reintentar consulta

---

### ☑️ 2. Bloqueo por duración funciona correctamente

**Comando:**
```sql
-- Ver citas existentes
SELECT 
  b.nombre || ' ' || b.apellido as barbero,
  c.fecha,
  c.hora,
  s.duracion_minutos,
  to_char(c.hora::time + (s.duracion_minutos * interval '1 minute'), 'HH24:MI') as hora_fin
FROM citas c
JOIN servicios s ON s.id = c.servicio_id
JOIN barberos b ON b.id = c.barbero_id
WHERE c.fecha >= CURRENT_DATE
  AND c.estado IN ('pendiente', 'confirmada')
ORDER BY c.fecha, c.hora
LIMIT 5;
```

**Anotar:** hora_inicio, duracion_minutos, hora_fin

**Verificar bloqueo:**
```sql
SELECT hora, disponible, motivo
FROM get_horarios_disponibles(
  'UUID_DEL_BARBERO'::uuid,
  'FECHA_DE_LA_CITA'::date
)
WHERE hora >= 'HORA_INICIO' AND hora <= 'HORA_FIN'
ORDER BY hora;
```

**Resultado esperado:**
```
✅ Hora de inicio: bloqueada (disponible = false)
✅ Slots siguientes dentro de duración: bloqueados
✅ Primer slot después de hora_fin: disponible (disponible = true)
```

**Ejemplo:**
```
Cita: 10:00, duración 40 min, termina 10:40
├─ 10:00 → ✅ Bloqueado
├─ 10:30 → ✅ Bloqueado (dentro de 10:00-10:40)
└─ 11:00 → ✅ Disponible (después de 10:40)
```

---

### ☑️ 3. Sistema de imágenes funciona

**Verificación en Supabase:**
- [ ] Bucket `servicios-fotos` existe
- [ ] Bucket es público
- [ ] RLS policy permite SELECT público
- [ ] RLS policy permite INSERT/UPDATE/DELETE para service_role

**Verificación en base de datos:**
```sql
SELECT id, nombre, imagen_url 
FROM servicios 
WHERE imagen_url IS NOT NULL
LIMIT 5;
```

**Resultado esperado:**
```
✅ Al menos 10 servicios tienen imagen_url
✅ URLs comienzan con https://
✅ URLs son accesibles (no 404)
```

**Verificación visual:**
- [ ] Abrir admin → Servicios
- [ ] Verificar que se muestran imágenes
- [ ] Intentar subir nueva imagen
- [ ] Verificar que preview funciona

---

## 📱 VERIFICACIONES DE INTERFAZ

### ☑️ 4. Página de reservas funciona

**URL:** `/reservar`

**Checklist:**
- [ ] ✅ Selector de fecha muestra iconos de calendario
- [ ] ✅ Label dice "Selecciona una fecha (haz click en el calendario):"
- [ ] ✅ Al hacer click se abre calendario nativo
- [ ] ✅ Texto de ayuda aparece si no hay fecha seleccionada
- [ ] ✅ Lista de barberos carga correctamente
- [ ] ✅ Imágenes de servicios se muestran (80x80px)
- [ ] ✅ Al seleccionar barbero y fecha, aparecen horarios
- [ ] ✅ Horarios ocupados NO aparecen en la lista
- [ ] ✅ Solo aparecen horarios disponibles
- [ ] ✅ NO hay sección de "horarios no disponibles"

**Prueba de reserva:**
1. [ ] Seleccionar barbero
2. [ ] Seleccionar fecha futura
3. [ ] Verificar que horarios mostrados son correctos
4. [ ] Seleccionar servicio (ver imagen)
5. [ ] Seleccionar horario
6. [ ] Ingresar datos de cliente
7. [ ] Crear reserva
8. [ ] Verificar que reserva aparece en admin

---

### ☑️ 5. Panel de administración funciona

**URL:** `/admin`

**Checklist:**
- [ ] ✅ Login funciona
- [ ] ✅ Dashboard muestra estadísticas
- [ ] ✅ Lista de citas carga
- [ ] ✅ Filtros de fecha funcionan
- [ ] ✅ Se pueden ver detalles de cita
- [ ] ✅ Se puede cambiar estado de cita
- [ ] ✅ Modal de servicio muestra input de imagen
- [ ] ✅ Preview de imagen funciona antes de guardar

---

### ☑️ 6. Punto de venta (POS) funciona

**URL:** `/admin/pos`

**Checklist:**
- [ ] ✅ Lista de servicios carga
- [ ] ✅ Imágenes de servicios se muestran (60x60px)
- [ ] ✅ Se pueden agregar servicios a carrito
- [ ] ✅ Total se calcula correctamente
- [ ] ✅ Se puede completar venta
- [ ] ✅ Venta se registra en sistema

---

## 🔧 VERIFICACIONES TÉCNICAS

### ☑️ 7. Configuración de Supabase

**Storage:**
```sql
-- Verificar que bucket existe
SELECT * FROM storage.buckets WHERE name = 'servicios-fotos';
```
**Esperado:** 1 fila con id, name='servicios-fotos', public=true

**Policies:**
```sql
-- Verificar policies del bucket
SELECT * FROM storage.policies WHERE bucket_id = 'servicios-fotos';
```
**Esperado:** Al menos 1 policy para SELECT público

**Índices:**
```sql
-- Verificar índices
SELECT indexname, tablename 
FROM pg_indexes 
WHERE indexname IN (
  'idx_citas_barbero_fecha_hora',
  'idx_horarios_trabajo_barbero_dia'
);
```
**Esperado:** 2 índices existen

---

### ☑️ 8. Servidor de desarrollo

**Comando:**
```bash
cd /home/user/webapp && npm run dev
```

**Checklist:**
- [ ] ✅ Servidor inicia sin errores
- [ ] ✅ Compila exitosamente
- [ ] ✅ Puerto 3000 accesible
- [ ] ✅ Hot reload funciona
- [ ] ✅ No hay errores en consola

---

### ☑️ 9. Build de producción

**Comando:**
```bash
cd /home/user/webapp && npm run build
```

**Checklist:**
- [ ] ✅ Build completa sin errores
- [ ] ✅ No hay warnings críticos
- [ ] ✅ Páginas se generan correctamente
- [ ] ✅ Assets se optimizan

---

## 🧪 PRUEBAS DE INTEGRACIÓN

### ☑️ 10. Flujo completo de reserva

**Escenario 1: Reserva simple**
1. [ ] Cliente abre /reservar
2. [ ] Selecciona barbero: Alexander Taborda
3. [ ] Selecciona fecha: Mañana
4. [ ] Ve horarios disponibles (sin horarios ocupados)
5. [ ] Selecciona servicio: Corte de Cabello (30 min)
6. [ ] Selecciona horario: 14:00
7. [ ] Ingresa datos: Nombre, teléfono, email
8. [ ] Confirma reserva
9. [ ] Recibe confirmación
10. [ ] Verifica en admin que cita existe

**Verificación:**
```sql
SELECT * FROM citas 
WHERE barbero_id = '1fb21ce6-5225-48a7-941b-5aeaa5f7e1ca'
  AND fecha = (CURRENT_DATE + interval '1 day')::date
  AND hora = '14:00'::time
ORDER BY created_at DESC
LIMIT 1;
```

**Esperado:** ✅ Cita existe con estado 'pendiente'

---

### ☑️ 11. Verificar que NO permite solapamiento

**Escenario 2: Intentar reservar en horario ocupado**

1. [ ] Barbero tiene cita a las 10:00 con servicio de 60 min
2. [ ] Verificar en SQL que 10:00 y 10:30 están bloqueados:

```sql
SELECT hora, disponible 
FROM get_horarios_disponibles(
  '1fb21ce6-5225-48a7-941b-5aeaa5f7e1ca'::uuid,
  (CURRENT_DATE + interval '1 day')::date
)
WHERE hora IN ('10:00', '10:30', '11:00');
```

**Esperado:**
```
10:00 | false  ← Bloqueado
10:30 | false  ← Bloqueado (CORRECCIÓN)
11:00 | true   ← Disponible
```

3. [ ] Abrir /reservar
4. [ ] Seleccionar mismo barbero y fecha
5. [ ] Verificar que 10:00 NO aparece en lista
6. [ ] Verificar que 10:30 NO aparece en lista
7. [ ] Verificar que 11:00 SÍ aparece en lista

**Si falla:** La función PostgreSQL no está aplicada correctamente.

---

### ☑️ 12. Prueba con múltiples servicios

**Escenario 3: Reserva con múltiples servicios**

1. [ ] Crear reserva en POS con 2 servicios
2. [ ] Servicio 1: 30 min
3. [ ] Servicio 2: 40 min
4. [ ] Total esperado: 70 min
5. [ ] Verificar en SQL que bloquea correctamente:

```sql
-- Ver cita con múltiples servicios
SELECT 
  c.hora,
  c.notas,
  CASE
    WHEN c.notas ~ '\[SERVICIOS SOLICITADOS:' THEN
      (SELECT SUM(s.duracion_minutos) FROM servicios s
       WHERE s.nombre = ANY(
         string_to_array(
           regexp_replace(
             substring(c.notas from '\[SERVICIOS SOLICITADOS:\s*([^\]]+)\]'),
             '\s*', '', 'g'
           ),
           ','
         )
       ))
    ELSE (SELECT duracion_minutos FROM servicios WHERE id = c.servicio_id)
  END as duracion_calculada
FROM citas c
WHERE c.id = 'ID_DE_LA_CITA'::uuid;
```

**Esperado:** ✅ duracion_calculada = 70

6. [ ] Verificar que bloquea los siguientes 70 minutos

---

## 📋 LISTA DE VERIFICACIÓN RÁPIDA

Marca cada item después de verificar:

### Crítico (debe estar ✅)
- [ ] Función PostgreSQL existe
- [ ] Bloqueo por duración funciona
- [ ] No permite citas solapadas
- [ ] Página de reservas carga
- [ ] Admin panel carga

### Importante
- [ ] Imágenes de servicios funcionan
- [ ] Selector de fecha mejorado
- [ ] POS funciona correctamente
- [ ] Múltiples servicios suman duraciones

### Deseable
- [ ] Build de producción exitoso
- [ ] No hay warnings en consola
- [ ] Performance es buena
- [ ] Todos los tests SQL pasan

---

## 🆘 SI ALGO FALLA

1. **Consulta primero:** [`DOCUMENTACION_INDICE.md`](DOCUMENTACION_INDICE.md)
2. **Busca el error en:** [`HISTORIAL_CAMBIOS.md`](HISTORIAL_CAMBIOS.md) sección "Troubleshooting"
3. **Si es crítico:** Usa [`PROMPT_RECUPERACION.md`](PROMPT_RECUPERACION.md)
4. **Pruebas adicionales:** [`supabase/migrations/PRUEBAS_VERIFICACION.sql`](supabase/migrations/PRUEBAS_VERIFICACION.sql)

---

## 📊 RESUMEN DE ESTADO

**Fecha de verificación:** _____________

**Verificado por:** _____________

**Estado general:**
- [ ] ✅ Todo funcionando perfectamente
- [ ] ⚠️ Funcionando con advertencias menores
- [ ] 🔴 Problemas críticos encontrados

**Notas adicionales:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**Última actualización del checklist:** 2025-11-09
