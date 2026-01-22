# 🆘 PROMPT DE RECUPERACIÓN - Chamos Barber App

## 📋 USAR ESTE PROMPT SI ALGO SE ROMPE

Copia y pega este prompt completo a Claude/AI para restaurar el estado funcional del sistema:

---

```
Hola, necesito ayuda para restaurar la aplicación Chamos Barber App al estado funcional del 2025-11-09.

## CONTEXTO DEL PROYECTO

**Aplicación:** Sistema de reservas para barbería
**Stack:** Next.js 14 (Pages Router), TypeScript, Supabase PostgreSQL
**Repositorio:** https://github.com/juan135072/chamos-barber-app
**Rama de producción:** master (desplegada en Coolify)
**Directorio:** /home/user/webapp

## PROBLEMA CRÍTICO QUE FUE RESUELTO

El sistema de reservas permitía citas solapadas porque solo bloqueaba la hora de inicio, sin considerar la duración del servicio.

**Ejemplo del bug:**
- Cita a las 10:00 con servicio de 60 minutos (termina 10:40)
- Solo bloqueaba 10:00
- 10:30 aparecía como disponible (ERROR: barbero ocupado hasta 10:40)
- Permitía doble reserva

## SOLUCIÓN IMPLEMENTADA

Se creó/modificó la función PostgreSQL `get_horarios_disponibles(uuid, date)` que:

1. ✅ Calcula el rango completo de cada cita: [hora_inicio, hora_inicio + duracion)
2. ✅ Bloquea TODOS los slots dentro del rango
3. ✅ Soporta múltiples servicios (suma duraciones)
4. ✅ Usa timestamp para generate_series (compatibilidad PostgreSQL)

## ARCHIVOS CLAVE

### 1. Función PostgreSQL (CRÍTICO)
**Archivo:** `supabase/migrations/FIX_GENERATE_SERIES.sql`

Esta función DEBE estar aplicada en Supabase para que el sistema funcione correctamente.

**Cómo aplicar:**
1. Abrir Supabase Dashboard → SQL Editor
2. Copiar contenido completo del archivo
3. Ejecutar (debe devolver "Success. No rows returned")

**Lógica clave de la función:**
```sql
citas_con_duracion AS (
  SELECT 
    c.hora::time as hora_inicio,
    c.hora::time + duracion_minutos * interval '1 minute' as hora_fin
  FROM citas c
  WHERE c.barbero_id = barbero_id_param
    AND c.fecha = fecha_param
    AND c.estado IN ('pendiente', 'confirmada')
)

-- Bloquear si: hora_slot >= hora_inicio AND hora_slot < hora_fin
WHERE hb.hora_time >= cd.hora_inicio
  AND hb.hora_time < cd.hora_fin
```

### 2. Sistema de imágenes
**Archivos modificados:**
- `lib/supabase-helpers.ts` → Funciones uploadServicioFoto, deleteServicioFoto
- `src/components/admin/modals/ServicioModal.tsx` → Input de archivo y preview
- `src/pages/reservar.tsx` → Display de imágenes 80x80px
- `src/pages/admin/pos.tsx` → Display de imágenes 60x60px

**Supabase Storage:**
- Bucket: `servicios-fotos` (público)
- RLS: SELECT público, INSERT/UPDATE/DELETE solo service_role

### 3. Mejoras de UX
**Archivos:**
- `src/pages/reservar.tsx` → Iconos de calendario, texto de ayuda, removida sección de no disponibles
- `src/styles/globals.css` → Estilos para input[type="date"] con hover effects

## VERIFICACIÓN DEL SISTEMA

### Prueba 1: Verificar que la función existe
```sql
SELECT * 
FROM get_horarios_disponibles(
  '1fb21ce6-5225-48a7-941b-5aeaa5f7e1ca'::uuid,
  '2025-11-10'::date
)
ORDER BY hora
LIMIT 5;
```

**Resultado esperado:** Tabla con columnas hora, disponible, motivo

### Prueba 2: Verificar bloqueo por duración
```sql
-- Ver cita existente
SELECT 
  c.hora,
  s.duracion_minutos,
  to_char(c.hora::time + (s.duracion_minutos * interval '1 minute'), 'HH24:MI') as hora_fin
FROM citas c
JOIN servicios s ON s.id = c.servicio_id
WHERE c.barbero_id = '1fb21ce6-5225-48a7-941b-5aeaa5f7e1ca'::uuid
  AND c.fecha >= CURRENT_DATE
  AND c.estado IN ('pendiente', 'confirmada')
LIMIT 1;

-- Verificar que bloquea correctamente
SELECT hora, disponible, motivo
FROM get_horarios_disponibles(
  '1fb21ce6-5225-48a7-941b-5aeaa5f7e1ca'::uuid,
  'FECHA_DE_LA_CITA'::date
)
WHERE hora >= 'HORA_INICIO' AND hora <= 'HORA_FIN'
ORDER BY hora;
```

**Resultado esperado:**
- Hora de inicio: bloqueada
- Slots siguientes dentro de duración: bloqueados
- Slots después de hora_fin: disponibles

### Prueba 3: Verificar en aplicación web
1. Ir a /reservar
2. Seleccionar barbero con cita existente
3. Seleccionar fecha de la cita
4. Verificar que NO aparecen slots ocupados

## BARBEROS EN SISTEMA

| ID | Nombre | Apellido |
|----|---------|----------|
| 1fb21ce6-5225-48a7-941b-5aeaa5f7e1ca | Alexander | Taborda |
| 0d268607-78fa-49b6-9efe-2ab78735be83 | Gustavo | Melendez |
| d3843337-f707-4448-94dc-145adef35ccb | Roswin | Aguilera |
| e94795b9-51fb-4a57-8a40-6c4731bf3c46 | Hingover | Bonilla |
| 2cfb08e5-4116-434c-afdc-42e70a2ef88e | Roudit | Barreto |

## COMMITS CLAVE

1. **33550c2** - Migración inicial y documentación
2. **2e93eb0** - Archivos simplificados
3. **e159f2f** - Fix de generate_series con timestamp (CRÍTICO)

## WORKFLOW DE GIT

```
genspark_ai_developer (desarrollo)
  ↓ merge
master (producción Coolify) ← RAMA DE DESPLIEGUE
  ↓ merge
main (espejo GitHub)
```

## CASO DE PRUEBA REAL

**Cliente:** HINGOVER BONILLA ESLAVA
**Barbero:** Alexander Taborda
**Hora:** 09:00
**Servicio:** Servicio Completo (60 minutos)
**Hora fin:** 10:00

**Resultado verificado:**
- 09:00 → Bloqueado ✅
- 09:30 → Bloqueado ✅ (CORRECCIÓN FUNCIONANDO)
- 10:00 → Disponible ✅

## ERRORES COMUNES Y SOLUCIONES

### Error: "function get_horarios_disponibles does not exist"
**Causa:** Función no aplicada en Supabase
**Solución:** Ejecutar contenido de `supabase/migrations/FIX_GENERATE_SERIES.sql` en Supabase Dashboard

### Error: "function generate_series(time...) does not exist"
**Causa:** Versión antigua de la función
**Solución:** Reemplazar con versión que usa timestamp (FIX_GENERATE_SERIES.sql)

### Los horarios se muestran disponibles cuando no deberían
**Causa:** Función no considera duración
**Solución:** Verificar que la lógica usa `hora_time >= hora_inicio AND hora_time < hora_fin`

### Las imágenes no se muestran
**Soluciones:**
1. Verificar bucket `servicios-fotos` existe y es público
2. Verificar RLS policies permiten SELECT público
3. Verificar URLs en tabla servicios son válidas

## ARCHIVOS DE DOCUMENTACIÓN

- `HISTORIAL_CAMBIOS.md` - Historial completo de cambios
- `CORRECCION_HORARIOS_DURACION.md` - Documentación técnica del fix
- `supabase/migrations/APLICAR_ESTA_MIGRACION.sql` - Migración simplificada
- `supabase/migrations/PRUEBAS_VERIFICACION.sql` - Tests paso a paso
- `supabase/migrations/FIX_GENERATE_SERIES.sql` - Versión final funcionando

## SOLICITUD ESPECÍFICA

Por favor ayúdame a:
1. Verificar el estado actual del sistema
2. Identificar qué está roto
3. Restaurar la funcionalidad siguiendo esta documentación
4. Aplicar las correcciones necesarias
5. Verificar con las pruebas mencionadas

Gracias!
```

---

## 🎯 CÓMO USAR ESTE PROMPT

1. **Si algo se rompe en el futuro**, copia TODO el texto entre los ``` del prompt
2. Pégalo en una nueva conversación con Claude/AI
3. Agrega detalles específicos del problema actual
4. El AI tendrá todo el contexto para restaurar el sistema

---

## 📝 NOTA IMPORTANTE

Este prompt contiene:
- ✅ Contexto completo del proyecto
- ✅ Descripción del problema resuelto
- ✅ Solución implementada con código clave
- ✅ Archivos críticos
- ✅ Comandos de verificación
- ✅ Datos de prueba reales
- ✅ Troubleshooting común
- ✅ Referencias a documentación completa

Con este prompt, cualquier AI puede restaurar el sistema sin necesidad de explorar desde cero.
