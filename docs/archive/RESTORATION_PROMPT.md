# 🔄 PROMPT DE RESTAURACIÓN - Chamos Barber App

**Fecha de snapshot funcional:** 2025-11-07  
**Commit de referencia:** `ab09621`  
**Estado:** ✅ Totalmente funcional

---

## 📋 Prompt para Restaurar Estado Funcional

Copia y pega este prompt a Claude/Gemini/ChatGPT si necesitas restaurar la aplicación:

---

```
Necesito ayuda para restaurar mi aplicación Chamos Barber App a un estado funcional específico.

CONTEXTO:
- Aplicación: Next.js 14 + Supabase (PostgreSQL)
- Fecha del snapshot funcional: 2025-11-07
- Commit de referencia: ab09621
- Branch: master
- Repositorio: https://github.com/juan135072/chamos-barber-app

ESTADO FUNCIONAL QUE NECESITO RESTAURAR:

1. GESTIÓN DE BARBEROS:
   ✅ Mostrar TODOS los barberos (activos e inactivos) en panel admin
   ✅ Barberos inactivos visibles con badge rojo y opacidad 60%
   ✅ Crear nuevo barbero sin errores de RLS
   ✅ Editar barbero existente sin errores de RLS
   ✅ Desactivar/Activar barbero (soft delete) sin que desaparezca de lista
   ✅ Eliminar permanentemente con modal educativo de 2 pasos
   ✅ NO eliminar múltiples barberos por error de CASCADE

2. ARQUITECTURA IMPLEMENTADA:
   - Operaciones SELECT: Query directa desde frontend
   - Operaciones INSERT/UPDATE/DELETE: API routes con service_role key
   
3. API ROUTES CREADAS (todas con service_role key):
   - POST /api/barberos/create           (crear barbero)
   - PUT  /api/barberos/update           (actualizar barbero)
   - POST /api/barberos/toggle-active    (activar/desactivar)
   - DELETE /api/barberos/delete-permanent (eliminar permanentemente)

4. POLÍTICAS RLS DE SUPABASE (tabla: barberos):
   - SELECT: USING (true)  -- Lee TODOS sin filtrar por activo
   - INSERT: WITH CHECK (true)  -- Permite crear sin restricciones
   - UPDATE: USING (true), WITH CHECK (true)  -- Permite actualizar
   - DELETE: USING (true)  -- Permite eliminar

5. FOREIGN KEYS CONFIGURADAS:
   - admin_users → barberos: ON DELETE CASCADE (correcto)
   - citas → barberos: ON DELETE RESTRICT (correcto)
   - estadisticas → barberos: ON DELETE SET NULL (correcto)
   - horarios_trabajo → barberos: ON DELETE RESTRICT (NO CASCADE)
   - solicitudes_barberos → barberos: ON DELETE SET NULL (correcto)

6. ARCHIVOS CLAVE MODIFICADOS:
   - src/components/admin/tabs/BarberosTab.tsx (query directa)
   - lib/supabase-helpers.ts (usa API routes)
   - src/pages/api/barberos/create.ts (NUEVO)
   - src/pages/api/barberos/update.ts (NUEVO)
   - src/pages/api/barberos/toggle-active.ts (NUEVO)
   - src/pages/api/barberos/delete-permanent.ts (NUEVO)
   - src/components/admin/modals/PermanentDeleteModal.tsx (NUEVO)

7. SCRIPTS SQL DISPONIBLES:
   - sql/check_foreign_keys.sql (verificar CASCADE)
   - sql/fix_cascade_delete.sql (arreglar CASCADE)
   - sql/check_barberos_rls_select.sql (verificar políticas SELECT)
   - sql/fix_barberos_insert_rls.sql (arreglar todas las políticas RLS)

PROBLEMA ACTUAL:
[Describir aquí qué está fallando]

INFORMACIÓN DE DEBUG:
- Error específico: [copiar error completo]
- Logs de consola: [copiar logs]
- Query SQL de verificación ejecutada: [copiar resultados]

Por favor, ayúdame a:
1. Diagnosticar qué se rompió comparado con el estado funcional
2. Restaurar la funcionalidad usando las soluciones documentadas
3. Verificar que todo vuelva a funcionar correctamente

Lee primero el archivo DOCUMENTATION.md en la raíz del proyecto para entender
la arquitectura completa y las soluciones implementadas.
```

---

## 🔍 Checklist de Verificación Post-Restauración

Después de aplicar cualquier fix, verificar:

### 1. Base de Datos ✅

```sql
-- A. Verificar políticas RLS
SELECT cmd, policyname, 
  CASE 
    WHEN cmd = 'SELECT' THEN qual::text
    ELSE with_check::text
  END as condicion
FROM pg_policies 
WHERE tablename = 'barberos'
ORDER BY cmd;

-- Resultado esperado: Todas con "true"

-- B. Verificar foreign keys
SELECT 
    tc.table_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('citas', 'horarios_trabajo', 'admin_users', 'estadisticas')
AND tc.constraint_type = 'FOREIGN KEY';

-- Resultado esperado:
-- admin_users: CASCADE
-- citas: RESTRICT
-- estadisticas: SET NULL
-- horarios_trabajo: RESTRICT (NO CASCADE)

-- C. Contar barberos
SELECT 
    activo,
    COUNT(*) as total
FROM barberos
GROUP BY activo;

-- Debe mostrar tanto activos como inactivos
```

### 2. Frontend ✅

Abrir consola del navegador (F12) y verificar:

```javascript
// Debe aparecer este log:
🔄 Cargando TODOS los barberos (activos e inactivos)...

📊 Barberos cargados: {
  total: X,      // Total de barberos
  activos: Y,    // Barberos con activo=true
  inactivos: Z,  // Barberos con activo=false (debe ser > 0 si hay)
  lista: [...]   // Array completo
}
```

### 3. API Routes ✅

```bash
# Verificar que existen los archivos
ls -la src/pages/api/barberos/

# Debe mostrar:
# - create.ts
# - update.ts
# - toggle-active.ts
# - delete-permanent.ts

# Verificar variable de entorno
grep SUPABASE_SERVICE_ROLE_KEY .env.local

# Debe mostrar la clave (no vacía)
```

### 4. Funcionalidad Manual ✅

1. **Ver barberos inactivos:**
   - Debe mostrar todos los barberos
   - Inactivos con badge rojo y opacidad reducida

2. **Crear barbero:**
   - Click en "Nuevo Barbero"
   - Llenar formulario
   - Guardar → debe crear sin error

3. **Editar barbero:**
   - Click en ícono editar ✏️
   - Modificar campo
   - Guardar → debe actualizar sin error

4. **Desactivar/Activar:**
   - Click en badge "Activo"
   - Debe cambiar a "Inactivo"
   - Barbero NO desaparece
   - Se ve con opacidad 60%

5. **Eliminar permanentemente:**
   - Click en dropdown 🗑️
   - Seleccionar "Eliminar Permanentemente"
   - Completar los 2 pasos
   - Solo debe eliminar ese barbero

---

## 📞 Información de Contacto para Soporte

Si este prompt no resuelve el problema, incluir en la conversación:

1. **Output de scripts SQL:**
   ```sql
   \i sql/check_foreign_keys.sql
   \i sql/check_barberos_rls_select.sql
   ```

2. **Logs completos de consola del navegador** (con F12 abierto)

3. **Logs del servidor** (si aplica)

4. **Screenshot** del error o comportamiento incorrecto

5. **Commit actual:**
   ```bash
   git log -1 --oneline
   git status
   ```

---

## 🔐 Variables de Entorno Requeridas

Verificar que `.env.local` tenga:

```env
NEXT_PUBLIC_SUPABASE_URL=https://rxwumtluzxomruzxlhzz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh... (clave anon pública)
SUPABASE_SERVICE_ROLE_KEY=eyJh... (clave service_role PRIVADA)
```

**⚠️ CRÍTICO:** `SUPABASE_SERVICE_ROLE_KEY` es esencial para que las API routes funcionen.

---

## 🎯 Resumen de Arquitectura para Quick Fix

```
┌─────────────────────────────────────────┐
│  PROBLEMA COMÚN: RLS bloqueando ops    │
├─────────────────────────────────────────┤
│  SOLUCIÓN: API routes + service_role    │
└─────────────────────────────────────────┘

Frontend (BarberosTab.tsx)
    │
    ├─ SELECT → supabase.from('barberos').select('*')
    │            (directo, RLS policy: true)
    │
    ├─ INSERT → fetch('/api/barberos/create')
    │            (API route con service_role)
    │
    ├─ UPDATE → fetch('/api/barberos/update')
    │            (API route con service_role)
    │
    └─ DELETE → fetch('/api/barberos/delete-permanent')
                 (API route con service_role)

Backend (API Routes)
    │
    ├─ createClient(..., SERVICE_ROLE_KEY)
    │   └─ Bypasea RLS completamente ✅
    │
    └─ Operaciones directas en BD
        └─ Sin restricciones de políticas
```

---

## 📚 Documentación Relacionada

- **DOCUMENTATION.md** - Documentación completa del sistema
- **sql/** - Scripts SQL para diagnóstico y fixes
- **src/pages/api/barberos/** - API routes con service_role

---

## ✅ Commits de Referencia

Si necesitas hacer `git checkout` a un estado específico:

```bash
# Estado completamente funcional (último)
git checkout ab09621

# Otros commits importantes:
git log --oneline --graph --all

ab09621 - fix(barberos): Usar API routes para CREATE y UPDATE
d3f3b87 - fix(barberos): Query directa para cargar TODOS
a83dd78 - fix(barberos): Mostrar TODOS los barberos
57aefde - debug(barberos): Agregar logging frontend
ef0d35b - debug(barberos): Agregar logging API routes
1e0c0b4 - fix(barberos): Usar API routes con service_role
```

---

**Fecha de creación de este documento:** 2025-11-07  
**Última actualización:** 2025-11-07  
**Versión:** 1.0  
**Autor:** Documentación automática de sesión de desarrollo
