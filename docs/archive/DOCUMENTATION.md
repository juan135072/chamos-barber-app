# 📚 Documentación Completa - Chamos Barber App

**Fecha de última actualización:** 2025-11-07  
**Commit de referencia:** `ab09621`  
**Estado:** ✅ Totalmente funcional

---

## 📋 Tabla de Contenidos

1. [Resumen del Sistema](#resumen-del-sistema)
2. [Arquitectura](#arquitectura)
3. [Problemas Resueltos](#problemas-resueltos)
4. [Estructura de Archivos Clave](#estructura-de-archivos-clave)
5. [Base de Datos y RLS](#base-de-datos-y-rls)
6. [API Routes](#api-routes)
7. [Funcionalidades Implementadas](#funcionalidades-implementadas)
8. [Scripts SQL Disponibles](#scripts-sql-disponibles)
9. [Guía de Troubleshooting](#guía-de-troubleshooting)
10. [Prompt de Restauración](#prompt-de-restauración)

---

## 🎯 Resumen del Sistema

**Chamos Barber App** es una aplicación de gestión de barbería construida con:
- **Frontend:** Next.js 14 (Pages Router), React, TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Estilos:** Tailwind CSS + CSS Variables
- **Deploy:** Railway/Vercel

### Estado Actual del Código
- **Branch principal:** `master`
- **Último commit funcional:** `ab09621`
- **Total de commits relevantes:** 6 (desde `1e0c0b4` hasta `ab09621`)

---

## 🏗️ Arquitectura

### Patrón de Diseño Principal

La aplicación usa un **patrón híbrido**:
- **Client-side queries** para operaciones de lectura (SELECT)
- **Server-side API routes** para operaciones de escritura (INSERT, UPDATE, DELETE)

**¿Por qué?**
- Las políticas RLS de Supabase pueden ser restrictivas
- Las API routes usan `service_role` key que **bypasea completamente RLS**
- Esto garantiza que las operaciones CRUD siempre funcionen

### Flujo de Datos

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (Browser)                                     │
│  - React Components                                     │
│  - Supabase Client (anon key)                          │
└────────────────┬────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌─────────┐            ┌──────────────┐
│ SELECT  │            │ INSERT       │
│ (Direct)│            │ UPDATE       │
│         │            │ DELETE       │
│ RLS: ✓  │            │ (API Routes) │
└─────────┘            └──────┬───────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ API Route        │
                    │ (service_role)   │
                    │ RLS: BYPASS ✓    │
                    └──────┬───────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ SUPABASE DB      │
                    │ (PostgreSQL)     │
                    └──────────────────┘
```

---

## 🐛 Problemas Resueltos

### Timeline de Problemas y Soluciones

#### Problema 1: RLS Bloqueaba UPDATE al Desactivar Barbero
**Fecha:** 2025-11-07  
**Commit:** `1e0c0b4`

**Error:**
```
new row violates row-level security policy for table "barberos"
```

**Causa:** 
- Las políticas RLS no permitían UPDATE a usuarios autenticados con anon key

**Solución:**
- Crear API route `/api/barberos/toggle-active` con service_role key
- Modificar `deleteBarbero()` en `supabase-helpers.ts` para usar API

**Archivos modificados:**
- `src/pages/api/barberos/toggle-active.ts` (NUEVO)
- `lib/supabase-helpers.ts` (UPDATE)

---

#### Problema 2: CASCADE DELETE Eliminaba Múltiples Barberos
**Fecha:** 2025-11-07  
**Commit:** `ef0d35b`

**Error:**
- Al eliminar 1 barbero, se eliminaban 2 barberos

**Causa:**
- Foreign key `horarios_trabajo.barbero_id` tenía `ON DELETE CASCADE`
- Eliminaba horarios en cascada y causaba efectos secundarios

**Solución:**
```sql
ALTER TABLE horarios_trabajo DROP CONSTRAINT horarios_trabajo_barbero_id_fkey;
ALTER TABLE horarios_trabajo 
ADD CONSTRAINT horarios_trabajo_barbero_id_fkey 
FOREIGN KEY (barbero_id) 
REFERENCES barberos(id) 
ON DELETE RESTRICT;
```

**Scripts SQL:**
- `sql/check_foreign_keys.sql`
- `sql/fix_cascade_delete.sql`

**Estado final de Foreign Keys:**
| Tabla | FK | DELETE Rule | Correcto |
|-------|----|-----------|----|
| admin_users | barbero_id | CASCADE | ✅ (relación 1:1) |
| citas | barbero_id | RESTRICT | ✅ |
| estadisticas | barbero_id | SET NULL | ✅ |
| horarios_trabajo | barbero_id | RESTRICT | ✅ |
| solicitudes_barberos | barbero_id | SET NULL | ✅ |

---

#### Problema 3: Barberos Inactivos No Aparecían en Lista
**Fecha:** 2025-11-07  
**Commits:** `a83dd78`, `d3f3b87`

**Error:**
- Al desactivar un barbero, desaparecía completamente de la tabla

**Causa:**
- Función `getBarberos(activo = true)` filtraba solo activos por defecto
- El componente no pasaba parámetro, pero el default era `true`

**Solución:**
```typescript
// ANTES
const data = await chamosSupabase.getBarberos() // Usaba default=true

// AHORA (query directa)
const { data } = await supabase
  .from('barberos')
  .select('*')
  .order('nombre')
```

**Archivos modificados:**
- `src/components/admin/tabs/BarberosTab.tsx`
- `lib/supabase-helpers.ts`

**Características visuales agregadas:**
- Barberos inactivos con opacidad 60%
- Fondo rojo sutil (rgba(255, 0, 0, 0.02))
- Badge rojo con icono ✗
- Tooltip "Click para reactivar"

---

#### Problema 4: Políticas RLS Filtraban Barberos Inactivos
**Fecha:** 2025-11-07  
**Commit:** `d3f3b87`

**Error:**
- La query traía solo 1 barbero cuando había 4 en la BD (1 activo + 3 inactivos)

**Causa:**
- Política RLS de SELECT tenía condición `USING (activo = true)`

**Solución:**
```sql
DROP POLICY IF EXISTS "barberos_select_public" ON barberos;

CREATE POLICY "barberos_select_all"
ON barberos FOR SELECT
TO public
USING (true);  -- Sin filtro
```

**Script SQL:**
- `sql/check_barberos_rls_select.sql`

---

#### Problema 5: RLS Bloqueaba INSERT al Crear Barbero
**Fecha:** 2025-11-07  
**Commit:** `ab09621`

**Error:**
```
new row violates row-level security policy for table "barberos"
```

**Causa:**
- Política RLS de INSERT no existía o era muy restrictiva

**Solución:**
- Crear API route `/api/barberos/create` con service_role key
- Crear API route `/api/barberos/update` con service_role key
- Modificar `createBarbero()` y `updateBarbero()` para usar APIs

**Archivos creados:**
- `src/pages/api/barberos/create.ts` (NUEVO)
- `src/pages/api/barberos/update.ts` (NUEVO)

**Script SQL:**
- `sql/fix_barberos_insert_rls.sql`

---

## 📁 Estructura de Archivos Clave

### Componentes Frontend

```
src/components/admin/
├── tabs/
│   ├── BarberosTab.tsx          ← Gestión de barberos (CRÍTICO)
│   ├── ServiciosTab.tsx          ← Gestión de servicios
│   └── CategoriasTab.tsx         ← Gestión de categorías
├── modals/
│   ├── BarberoModal.tsx          ← Crear/editar barbero
│   └── PermanentDeleteModal.tsx  ← Modal educativo para delete
└── shared/
    ├── Modal.tsx                 ← Modal base
    └── ConfirmDialog.tsx         ← Diálogo de confirmación
```

### Backend (API Routes)

```
src/pages/api/barberos/
├── create.ts              ← POST: Crear barbero (service_role)
├── update.ts              ← PUT: Actualizar barbero (service_role)
├── toggle-active.ts       ← POST: Toggle activo/inactivo (service_role)
├── delete-permanent.ts    ← DELETE: Eliminar permanentemente (service_role)
└── [id].ts               ← GET/PUT/DELETE: CRUD individual
```

### Librerías Core

```
lib/
├── supabase-helpers.ts    ← Funciones helper de Supabase (CRÍTICO)
├── initSupabase.ts        ← Cliente de Supabase
└── database.types.ts      ← Tipos generados de la BD
```

### Scripts SQL

```
sql/
├── check_foreign_keys.sql           ← Verificar CASCADE DELETE
├── fix_cascade_delete.sql           ← Arreglar CASCADE
├── check_barberos_rls_select.sql    ← Verificar políticas SELECT
├── fix_barberos_insert_rls.sql      ← Arreglar políticas INSERT
├── fix_barberos_rls_policies.sql    ← Arreglar todas las políticas
└── create_categorias_servicios.sql  ← Crear tabla de categorías
```

---

## 🗄️ Base de Datos y RLS

### Tabla: `barberos`

**Columnas principales:**
```sql
CREATE TABLE barberos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    especialidad TEXT,
    experiencia_anos INTEGER DEFAULT 0,
    calificacion DECIMAL(3,2) DEFAULT 0.0,
    imagen_url TEXT,
    instagram VARCHAR(100),
    activo BOOLEAN DEFAULT true,  -- ← Soft delete flag
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Políticas RLS Correctas (Estado Actual)

```sql
-- SELECT: Permite leer TODOS los barberos (activos e inactivos)
CREATE POLICY "barberos_select_all"
ON barberos FOR SELECT
TO public
USING (true);

-- INSERT: Permite crear barberos
CREATE POLICY "barberos_insert_authenticated"
ON barberos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "barberos_insert_public"
ON barberos FOR INSERT
TO public
WITH CHECK (true);

-- UPDATE: Permite actualizar barberos
CREATE POLICY "barberos_update_authenticated"
ON barberos FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "barberos_update_public"
ON barberos FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- DELETE: Permite eliminar barberos
CREATE POLICY "barberos_delete_authenticated"
ON barberos FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "barberos_delete_public"
ON barberos FOR DELETE
TO public
USING (true);
```

**⚠️ IMPORTANTE:**
- Todas las políticas tienen `USING (true)` o `WITH CHECK (true)`
- Esto significa **SIN RESTRICCIONES** en las operaciones
- Las API routes con service_role key también bypassean RLS completamente

---

## 🔌 API Routes

### 1. POST /api/barberos/create

**Propósito:** Crear nuevo barbero  
**Auth:** Service role key (bypasea RLS)

**Request:**
```typescript
POST /api/barberos/create
Content-Type: application/json

{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@example.com",
  "telefono": "+58 412-1234567",
  "especialidad": "Cortes clásicos",
  "experiencia_anos": 5,
  "calificacion": 4.5,
  "imagen_url": "https://...",
  "instagram": "@juanperez",
  "activo": true
}
```

**Response:**
```json
{
  "success": true,
  "barbero": { ... },
  "message": "Barbero creado exitosamente"
}
```

---

### 2. PUT /api/barberos/update

**Propósito:** Actualizar barbero existente  
**Auth:** Service role key

**Request:**
```typescript
PUT /api/barberos/update
Content-Type: application/json

{
  "barberoId": "uuid-here",
  "updates": {
    "nombre": "Juan Carlos",
    "telefono": "+58 412-9999999"
  }
}
```

**Response:**
```json
{
  "success": true,
  "barbero": { ... },
  "message": "Barbero actualizado exitosamente"
}
```

---

### 3. POST /api/barberos/toggle-active

**Propósito:** Activar/desactivar barbero (soft delete)  
**Auth:** Service role key

**Request:**
```typescript
POST /api/barberos/toggle-active
Content-Type: application/json

{
  "barberoId": "uuid-here",
  "activo": false
}
```

**Response:**
```json
{
  "success": true,
  "barbero": { ... },
  "message": "Barbero desactivado exitosamente"
}
```

**Efecto:**
- Marca `activo = false` en tabla `barberos`
- También actualiza `admin_users.activo = false` si existe
- El barbero NO se elimina, solo se desactiva
- Reversible haciendo toggle de nuevo

---

### 4. DELETE /api/barberos/delete-permanent

**Propósito:** Eliminar barbero PERMANENTEMENTE  
**Auth:** Service role key

**Request:**
```typescript
DELETE /api/barberos/delete-permanent
Content-Type: application/json

{
  "barberoId": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Barbero eliminado permanentemente",
  "deletedBarbero": { ... },
  "deletedAdmins": [ ... ]
}
```

**Validaciones:**
- Verifica que NO tenga citas asociadas
- Si tiene citas, devuelve error 400
- Elimina primero `admin_users` (FK)
- Luego elimina `barberos`
- **NO REVERSIBLE**

---

## ✨ Funcionalidades Implementadas

### 1. Gestión de Barberos

#### Ver Lista de Barberos ✅
- **Muestra TODOS** los barberos (activos e inactivos)
- Query directa: `supabase.from('barberos').select('*')`
- **Indicadores visuales:**
  - Activos: Badge verde ✓, opacidad 100%
  - Inactivos: Badge rojo ✗, opacidad 60%, fondo rojo sutil

#### Crear Barbero ✅
- Modal con formulario completo
- Validación de campos requeridos
- Upload de imagen a Supabase Storage
- Usa API route `/api/barberos/create` con service_role

#### Editar Barbero ✅
- Modal pre-poblado con datos actuales
- Actualización de todos los campos
- Usa API route `/api/barberos/update` con service_role

#### Desactivar/Activar Barbero (Soft Delete) ✅
- Click en badge "Activo" → marca como inactivo
- Click en badge "Inactivo" → reactiva
- Usa API route `/api/barberos/toggle-active`
- **El barbero NO desaparece de la lista**
- Reversible en cualquier momento

#### Eliminar Permanentemente ✅
- Dropdown con 2 opciones:
  1. **Desactivar** (recomendado) → Soft delete
  2. **Eliminar Permanentemente** → Hard delete
  
- **Modal educativo de 2 pasos:**
  - **Paso 1:** Educación sobre por qué NO eliminar
    - Preservar historial
    - Posibilidad de reactivar
    - Auditoría y cumplimiento legal
    - Checkbox "He leído y comprendido"
  - **Paso 2:** Confirmación explícita
    - Escribir "ELIMINAR PERMANENTEMENTE"
    - Validación de citas asociadas
    - NO reversible

---

### 2. Gestión de Categorías de Servicios ✅

**Tabla:** `categorias_servicios`

**Funcionalidades:**
- Crear, editar, eliminar categorías
- Reordenar con botones ↑ ↓
- Toggle activo/inactivo
- Seleccionar emoji/icono
- Usado en `ServiciosTab` para filtrar

---

### 3. Sistema de Solicitudes de Barberos ✅

**Tabla:** `solicitudes_barberos`

**Flujo:**
1. Barbero se registra en `/registro-barbero`
2. Se crea solicitud con estado `pendiente`
3. Admin ve solicitud en `SolicitudesTab`
4. Admin aprueba → crea `barbero` + `admin_user`
5. Admin rechaza → marca solicitud como `rechazada`

**Archivos:**
- `src/pages/registro-barbero.tsx` (formulario público)
- `src/pages/api/solicitudes/crear.ts` (crear solicitud)
- `src/pages/api/solicitudes/aprobar.ts` (aprobar solicitud)
- `src/components/admin/tabs/SolicitudesTab.tsx` (panel admin)

---

## 📜 Scripts SQL Disponibles

### 1. check_foreign_keys.sql
**Propósito:** Verificar todas las foreign keys y sus reglas CASCADE

```sql
-- Ejecutar para ver FKs actuales
psql> \i sql/check_foreign_keys.sql
```

**Output esperado:**
```
tabla_que_referencia | columna_fk | tabla_referenciada | delete_rule
---------------------|------------|-------------------|-------------
admin_users         | barbero_id | barberos          | CASCADE
citas               | barbero_id | barberos          | RESTRICT
horarios_trabajo    | barbero_id | barberos          | RESTRICT
...
```

---

### 2. fix_cascade_delete.sql
**Propósito:** Cambiar CASCADE a RESTRICT en `horarios_trabajo`

```sql
-- Ejecutar si horarios_trabajo tiene CASCADE
psql> \i sql/fix_cascade_delete.sql
```

---

### 3. check_barberos_rls_select.sql
**Propósito:** Verificar políticas RLS de SELECT en tabla barberos

```sql
psql> \i sql/check_barberos_rls_select.sql
```

**Output esperado:**
```
policyname          | cmd    | USING
--------------------|--------|-------
barberos_select_all | SELECT | true
```

---

### 4. fix_barberos_insert_rls.sql
**Propósito:** Crear/arreglar políticas RLS para todas las operaciones

```sql
-- Ejecutar si hay problemas de RLS en INSERT/UPDATE/DELETE
psql> \i sql/fix_barberos_insert_rls.sql
```

---

### 5. Script Completo de Verificación

Ejecutar en Supabase SQL Editor:

```sql
-- 1. Verificar foreign keys
SELECT
    tc.table_name AS "Tabla",
    kcu.column_name AS "Columna",
    ccu.table_name AS "Referencia",
    rc.delete_rule AS "DELETE Rule"
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'barberos'
ORDER BY tc.table_name;

-- 2. Verificar políticas RLS
SELECT 
    cmd AS "Comando",
    policyname AS "Política",
    roles AS "Rol",
    CASE 
        WHEN cmd = 'SELECT' THEN 'USING: ' || COALESCE(qual::text, 'true')
        WHEN cmd = 'INSERT' THEN 'WITH CHECK: ' || COALESCE(with_check::text, 'true')
        WHEN cmd = 'UPDATE' THEN 'USING: ' || COALESCE(qual::text, 'true')
        WHEN cmd = 'DELETE' THEN 'USING: ' || COALESCE(qual::text, 'true')
    END AS "Condiciones"
FROM pg_policies 
WHERE tablename = 'barberos'
ORDER BY cmd, policyname;

-- 3. Contar barberos por estado
SELECT 
    activo,
    COUNT(*) as cantidad,
    string_agg(nombre || ' ' || apellido, ', ') as nombres
FROM barberos
GROUP BY activo
ORDER BY activo DESC;
```

---

## 🔧 Guía de Troubleshooting

### Problema: Barberos inactivos no aparecen en lista

**Síntomas:**
- Al desactivar un barbero, desaparece de la tabla
- En consola: `inactivos: 0` aunque hay barberos inactivos en BD

**Diagnóstico:**
```sql
-- 1. Verificar cuántos inactivos hay en BD
SELECT COUNT(*) FROM barberos WHERE activo = false;

-- 2. Ver política RLS de SELECT
SELECT policyname, qual 
FROM pg_policies 
WHERE tablename = 'barberos' AND cmd = 'SELECT';
```

**Solución:**
```sql
-- La política debe ser USING (true), no USING (activo = true)
DROP POLICY IF EXISTS "barberos_select_public" ON barberos;

CREATE POLICY "barberos_select_all"
ON barberos FOR SELECT
TO public
USING (true);
```

**Verificar fix:**
1. Limpiar cache del navegador (Ctrl+Shift+R)
2. Recargar página de admin
3. Consola debe mostrar: `inactivos: X` donde X > 0
4. Tabla debe mostrar barberos con badge rojo

---

### Problema: RLS bloqueaba INSERT/UPDATE/DELETE

**Síntomas:**
```
new row violates row-level security policy for table "barberos"
```

**Diagnóstico:**
```sql
-- Ver políticas actuales
SELECT cmd, policyname, roles, with_check 
FROM pg_policies 
WHERE tablename = 'barberos';
```

**Solución Rápida:**
Ejecutar `sql/fix_barberos_insert_rls.sql`

**Solución Manual:**
```sql
-- Para INSERT
CREATE POLICY "barberos_insert_public"
ON barberos FOR INSERT
TO public
WITH CHECK (true);

-- Para UPDATE
CREATE POLICY "barberos_update_public"
ON barberos FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Para DELETE
CREATE POLICY "barberos_delete_public"
ON barberos FOR DELETE
TO public
USING (true);
```

---

### Problema: Se eliminan múltiples barberos

**Síntomas:**
- Al eliminar 1 barbero, se eliminan 2 o más

**Diagnóstico:**
```sql
-- Verificar CASCADE en foreign keys
SELECT
    tc.table_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND kcu.column_name = 'barbero_id';
```

**Solución:**
```sql
-- Cambiar CASCADE a RESTRICT en horarios_trabajo
ALTER TABLE horarios_trabajo 
DROP CONSTRAINT horarios_trabajo_barbero_id_fkey;

ALTER TABLE horarios_trabajo 
ADD CONSTRAINT horarios_trabajo_barbero_id_fkey 
FOREIGN KEY (barbero_id) 
REFERENCES barberos(id) 
ON DELETE RESTRICT;
```

---

### Problema: Cache del navegador

**Síntomas:**
- Código actualizado pero no se ven cambios
- Logs viejos en consola

**Solución:**
1. **Hard Refresh:** Ctrl+Shift+R (Windows/Linux) o Cmd+Shift+R (Mac)
2. **Limpiar cache:**
   - F12 → Network tab → Disable cache (checkbox)
   - Click derecho en reload → "Empty cache and hard reload"
3. **Modo incógnito:** Ctrl+Shift+N → probar ahí

---

### Problema: API routes no funcionan

**Síntomas:**
- Error 404 en llamadas a `/api/barberos/...`
- O error 500 con "service_role key not found"

**Diagnóstico:**
```bash
# Verificar que existe el archivo
ls src/pages/api/barberos/create.ts

# Verificar variables de entorno
cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY
```

**Solución:**
1. Verificar que `.env.local` tiene `SUPABASE_SERVICE_ROLE_KEY`
2. Reiniciar servidor de desarrollo: `npm run dev`
3. Verificar que el deploy incluyó las API routes

---

## 🔄 Prompt de Restauración

Si en el futuro algo se rompe y necesitas restaurar la aplicación a este estado funcional, usa este prompt:

---

