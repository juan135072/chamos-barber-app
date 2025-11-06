# 🧪 Prueba del Sistema de Reservas - Commit 7e5300a

**Fecha:** 2025-11-06  
**Branch:** master  
**Commit:** 7e5300a (después de la reversión)  
**Estado:** ❌ **NO FUNCIONA**

---

## 📋 Resumen Ejecutivo

El sistema de reservas **NO FUNCIONA** en el commit actual debido a **políticas RLS (Row Level Security) faltantes** en la tabla `citas`. El error que aparece es:

```
Error 42501: new row violates row-level security policy for table "citas"
```

### ✅ Lo que SÍ funciona:
- ✅ Lectura de barberos (SELECT con anon key)
- ✅ Lectura de servicios (SELECT con anon key)
- ✅ Lectura de citas existentes (SELECT con anon key)
- ✅ Inserción de citas con SERVICE_ROLE_KEY

### ❌ Lo que NO funciona:
- ❌ Inserción de citas con ANON_KEY (usuarios públicos)
- ❌ Formulario de reservas del frontend

---

## 🔍 Diagnóstico Detallado

### Prueba 1: Crear Cita con ANON KEY (Frontend)

**Comando ejecutado:**
```bash
node scripts/test-crear-cita.js
```

**Resultado:**
```
❌ ERROR AL CREAR CITA CON ANON KEY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Código: 42501
Mensaje: new row violates row-level security policy for table "citas"
Detalles: null
Hint: null
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Datos intentados:**
```json
{
  "servicio_id": "4fa76cbe-d7a0-4d4b-b3fd-f3bb6bf752b3",
  "barbero_id": "0d268607-78fa-49b6-9efe-2ab78735be83",
  "fecha": "2025-11-07",
  "hora": "10:00",
  "cliente_nombre": "Test Cliente",
  "cliente_telefono": "+56912345678",
  "cliente_email": "test@example.com",
  "notas": "Cita de prueba para diagnóstico",
  "estado": "pendiente"
}
```

### Prueba 2: Crear la Misma Cita con SERVICE_ROLE_KEY

**Resultado:**
```
✅ ¡CITA CREADA EXITOSAMENTE CON SERVICE ROLE KEY!
```

**Conclusión:** El código funciona perfectamente, pero las políticas RLS bloquean a usuarios anónimos.

---

## 🔒 Análisis de RLS (Row Level Security)

### Estado Actual:
- ✅ RLS está **HABILITADO** en la tabla `citas`
- ❌ **NO existe** política que permita INSERT para usuarios anónimos
- ✅ Existe política que permite SELECT para usuarios anónimos
- ✅ SERVICE_ROLE_KEY bypassa todas las políticas (comportamiento correcto)

### Permisos Detectados:

| Operación | ANON KEY | SERVICE_ROLE_KEY |
|-----------|----------|------------------|
| SELECT    | ✅ Sí    | ✅ Sí            |
| INSERT    | ❌ No    | ✅ Sí            |
| UPDATE    | ❓ No probado | ✅ Sí       |
| DELETE    | ❓ No probado | ✅ Sí       |

---

## 💡 Solución Requerida

Para que el sistema de reservas funcione correctamente, se necesita crear una política RLS que permita a usuarios públicos crear citas:

### SQL a Ejecutar en Supabase:

```sql
-- Política para permitir INSERT público en citas
CREATE POLICY "allow_public_insert_citas"
ON public.citas
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
```

### Explicación:
- **ON public.citas**: Aplica a la tabla de citas
- **FOR INSERT**: Solo afecta operaciones de inserción
- **TO anon, authenticated**: Permite tanto a usuarios anónimos como autenticados
- **WITH CHECK (true)**: Sin restricciones adicionales (acepta todos los datos válidos)

---

## 🔧 Código del Sistema de Reservas

El código actual está **CORRECTO** y no requiere modificaciones:

### Archivo: `src/pages/reservar.tsx`
- ✅ Usa `chamosSupabase.createCita()` correctamente
- ✅ Maneja errores apropiadamente
- ✅ Valida datos antes de enviar
- ✅ Interfaz de usuario funcional

### Archivo: `lib/supabase-helpers.ts`
- ✅ Función `createCita()` implementada correctamente
- ✅ Validaciones de duplicados implementadas
- ✅ Validaciones de fecha/hora pasadas implementadas
- ✅ Manejo de errores robusto

### Archivo: `lib/initSupabase.ts`
- ✅ Cliente Supabase configurado correctamente con ANON_KEY
- ✅ Opciones de autenticación configuradas

---

## 📊 Comparación con Estado Anterior

### Commit a319e1b (Último estable conocido):
- Estado: ✅ Funcionaba
- Motivo: Probablemente tenía la política RLS configurada

### Commit 7e5300a (Actual después de reversión):
- Estado: ❌ No funciona
- Motivo: Faltan políticas RLS en Supabase

### Conclusión:
**EL CÓDIGO NUNCA SE ROMPIÓ**. El problema es la **configuración de Supabase**, no el código de la aplicación.

---

## 🚀 Opciones de Solución

### Opción 1: Crear Política RLS (Recomendada) ⭐

**Ventajas:**
- ✅ Solución correcta y permanente
- ✅ Mantiene la seguridad de Supabase
- ✅ No requiere cambios en el código
- ✅ Funciona con el código actual

**Desventajas:**
- ⚠️ Requiere acceso a Supabase SQL Editor

**Pasos:**
1. Acceder a Supabase Studio: https://supabase.chamosbarber.com
2. Ir a SQL Editor
3. Ejecutar el SQL de creación de política (arriba)
4. Probar el sistema de reservas

---

### Opción 2: Usar API Route con SERVICE_ROLE_KEY

Esta solución ya fue implementada en el backup (`backup-before-reset-20251106-150547`).

**Ventajas:**
- ✅ Bypassa las políticas RLS
- ✅ Ya está probada y funcionando
- ✅ No requiere cambios en Supabase

**Desventajas:**
- ⚠️ Requiere crear endpoint API adicional
- ⚠️ Más complejo de mantener
- ⚠️ El frontend debe usar API route en vez de cliente directo

**Implementación:**
Ver commit en branch `backup-before-reset-20251106-150547`:
- Archivo: `src/pages/api/crear-cita.ts`
- Usa SERVICE_ROLE_KEY para bypasear RLS
- Frontend hace POST a `/api/crear-cita` en vez de usar supabase.insert()

---

## 📝 Recomendación Final

**OPCIÓN 1 es la solución correcta:**
1. Crear la política RLS en Supabase
2. Mantener el código actual sin cambios
3. Probar el sistema de reservas
4. Documentar la política creada

Si por alguna razón no es posible acceder a Supabase SQL Editor, entonces se puede restaurar la **Opción 2** desde el backup.

---

## 🧪 Scripts de Prueba Creados

Se crearon dos scripts útiles para diagnóstico:

### 1. `scripts/test-crear-cita.js`
Simula el proceso completo de crear una cita desde el frontend.

**Uso:**
```bash
node scripts/test-crear-cita.js
```

**Qué hace:**
- Crea cliente con ANON_KEY
- Obtiene barbero y servicio disponibles
- Intenta crear cita con ANON_KEY
- Si falla, prueba con SERVICE_ROLE_KEY
- Muestra diagnóstico completo

### 2. `scripts/check-rls-policies.js`
Verifica el estado de las políticas RLS.

**Uso:**
```bash
node scripts/check-rls-policies.js
```

**Qué hace:**
- Verifica si RLS está habilitado
- Prueba permisos de INSERT y SELECT
- Muestra diagnóstico detallado
- Recomienda soluciones

---

## 📌 Conclusión

### El problema NO es el código, es la configuración de RLS en Supabase

**Estado actual:**
- ❌ Sistema de reservas NO funciona
- ✅ Código está correcto
- ❌ Falta política RLS para INSERT público

**Próximo paso:**
Crear la política RLS en Supabase SQL Editor para permitir INSERT público en la tabla `citas`.

---

**Documentación generada:** 2025-11-06  
**Scripts de prueba:** `scripts/test-crear-cita.js`, `scripts/check-rls-policies.js`  
**Commit probado:** 7e5300a
