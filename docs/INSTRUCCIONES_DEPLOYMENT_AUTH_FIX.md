# 🚀 INSTRUCCIONES DE DEPLOYMENT: Fix de Autenticación de Barberos

**Fecha:** 2 de noviembre de 2025  
**Commit:** `2daa72c`  
**Prioridad:** 🔴 CRÍTICA

---

## ✅ Cambios Implementados

### Problema Resuelto
❌ **ANTES:** Barberos aprobados no podían hacer login (faltaba creación en `auth.users`)  
✅ **AHORA:** Barberos aprobados automáticamente tienen cuenta en Supabase Auth

### Archivos Creados/Modificados
1. **`lib/supabase-admin.ts`** (NUEVO)
   - Cliente admin con service_role
   - Usado para operaciones administrativas

2. **`lib/supabase-helpers.ts`** (MODIFICADO)
   - Función `aprobarSolicitudBarbero` reescrita completamente
   - Ahora crea usuarios en Auth + rollback automático

3. **`.env.example`** (ACTUALIZADO)
   - Documentación de `SUPABASE_SERVICE_ROLE_KEY`

---

## 🔑 PASO 1: Obtener Service Role Key

### En Supabase Dashboard

1. **Navega a tu proyecto en Supabase:**
   - URL: https://supabase.com/dashboard

2. **Ve a Project Settings:**
   - Panel izquierdo → ⚙️ **Settings**
   - **API** (en el menú de settings)

3. **Copia la Service Role Key:**
   - En la sección **Project API keys**
   - Busca **`service_role`** (NO el `anon` key)
   - Click en **Reveal** y copia la clave completa

   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
   ```

⚠️ **IMPORTANTE:** Esta clave es **SECRETA** y da acceso administrativo total. NUNCA la expongas en el frontend ni en repositorios públicos.

---

## 🔧 PASO 2: Configurar en Coolify

### Agregar Variable de Entorno

1. **Abre tu aplicación en Coolify:**
   - Dashboard → Tu proyecto

2. **Ve a Environment Variables:**
   - **Settings** → **Environment Variables**

3. **Agrega la nueva variable:**
   ```
   Nombre: SUPABASE_SERVICE_ROLE_KEY
   Valor: [pega aquí la service_role key de Supabase]
   ```

4. **Guarda los cambios:**
   - Click en **Save** o **Update**

### Variables Existentes (Verificar)

Asegúrate de que también estén configuradas:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🚀 PASO 3: Deployment

### Opción A: Deployment Automático (Si está configurado)

Coolify debería detectar el nuevo commit automáticamente y hacer deploy.

**Verifica:**
- Dashboard → Deployments → Último deployment en progreso

### Opción B: Deployment Manual

Si no se inicia automáticamente:

1. **En Coolify Dashboard:**
   - Ve a tu aplicación
   - Click en **Deploy**
   - Espera a que termine el build

### Monitorear el Build

1. **Revisa los logs en tiempo real:**
   - Coolify → Deployments → [último deployment] → Logs

2. **Busca confirmaciones:**
   ```
   Building...
   ✓ Compiled successfully
   ✓ Collecting page data
   ✓ Generating static pages
   ```

3. **Si hay error de variable:**
   ```
   Error: SUPABASE_SERVICE_ROLE_KEY no está definida
   ```
   → Regresa al PASO 2 y verifica que agregaste la variable correctamente

---

## 🧪 PASO 4: Pruebas Post-Deployment

### Test 1: Verificar Variables de Entorno

**Crear una solicitud de prueba:**

1. **Ve a la página de registro:**
   - URL: `https://tu-app.com/registro-barbero`

2. **Completa el formulario con datos de prueba:**
   - Nombre: Test
   - Apellido: Barbero
   - Email: test.barbero@example.com
   - Teléfono: +58 424 000 0000
   - Años de experiencia: 1
   - (Resto opcional)

3. **Envía la solicitud**

4. **Verifica que se creó:**
   - Login como admin
   - Admin Panel → Solicitudes
   - Deberías ver la solicitud pendiente

---

### Test 2: Aprobar Barbero (CRÍTICO)

**Aprobar la solicitud de prueba:**

1. **En Admin Panel → Solicitudes:**
   - Click en **Aprobar** en la solicitud de prueba

2. **Confirmar aprobación:**
   - Click en **Aprobar** en el modal

3. **Verificar el alert de éxito:**
   ```
   ✅ Solicitud aprobada!
   
   Barbero creado: Test Barbero
   Email: test.barbero@example.com
   Contraseña: ChamosXXXXXXXX!XXXX
   
   ⚠️ IMPORTANTE: Guarda esta contraseña...
   ```

4. **GUARDA LA CONTRASEÑA** (la necesitas para el siguiente test)

**Si ves error:**
```
❌ Supabase Admin Client no está configurado
```
→ La variable `SUPABASE_SERVICE_ROLE_KEY` no está configurada correctamente. Regresa al PASO 2.

**Si ves otro error:**
→ Revisa los logs del navegador (F12 → Console) y compártelos para diagnóstico.

---

### Test 3: Login del Barbero Aprobado (CRÍTICO)

**Verificar que el barbero puede hacer login:**

1. **Cierra sesión del admin:**
   - Click en tu nombre → Logout

2. **Ve a la página de login:**
   - URL: `https://tu-app.com/login`

3. **Inicia sesión con el barbero de prueba:**
   - Email: `test.barbero@example.com`
   - Contraseña: (la que guardaste del alert)

4. **Verifica acceso exitoso:**
   - Deberías ver el **Panel de Barbero**
   - No el panel de admin

**Si NO puedes hacer login:**
- ❌ Verifica que copiaste la contraseña correcta
- ❌ Revisa los logs del navegador
- ❌ Ejecuta el script de diagnóstico (abajo)

**Si login es exitoso:**
✅ ¡ÉXITO! El sistema de aprobación funciona correctamente.

---

### Test 4: Verificación en Base de Datos (Opcional)

**En Supabase SQL Editor, ejecuta:**

```sql
-- Verificar que el barbero de prueba existe en todas las tablas
SELECT 
  'auth.users' as tabla,
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at
FROM auth.users u
WHERE u.email = 'test.barbero@example.com'

UNION ALL

SELECT 
  'barberos' as tabla,
  b.id,
  b.email,
  NULL as email_confirmed_at,
  b.created_at
FROM barberos b
WHERE b.email = 'test.barbero@example.com'

UNION ALL

SELECT 
  'admin_users' as tabla,
  au.id,
  au.email,
  NULL as email_confirmed_at,
  au.creado_en as created_at
FROM admin_users au
WHERE au.email = 'test.barbero@example.com'

ORDER BY tabla;
```

**Resultado esperado:**
- ✅ **3 registros** con el **mismo UUID** en las 3 tablas
- ✅ `email_confirmed_at` en `auth.users` NO es null
- ✅ Todos creados aproximadamente al mismo tiempo

**Si faltan registros:**
→ Algo falló durante la aprobación. Ejecuta el script de rollback manual (abajo).

---

## 🔍 Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY no está definida"

**Causa:** Variable de entorno no configurada o mal nombrada.

**Solución:**
1. Verifica el nombre exacto: `SUPABASE_SERVICE_ROLE_KEY` (sin espacios ni errores tipográficos)
2. Verifica que el valor es la `service_role` key (empieza con `eyJ...`)
3. Re-deploya después de agregar/corregir la variable

---

### Error: "Error creando usuario en Supabase Auth"

**Causa:** Posibles razones:
- Service Role Key incorrecta o expirada
- Email ya existe en auth.users
- Problema de conectividad con Supabase

**Solución:**
1. **Verifica la Service Role Key:**
   - Cópiala de nuevo desde Supabase Dashboard
   - Asegúrate de copiar la clave **completa** (sin cortar)

2. **Verifica si el email ya existe:**
   ```sql
   SELECT id, email, created_at
   FROM auth.users
   WHERE email = 'test.barbero@example.com';
   ```
   Si existe, elimínalo:
   ```sql
   -- ⚠️ SOLO EN DESARROLLO
   DELETE FROM auth.users WHERE email = 'test.barbero@example.com';
   ```

3. **Verifica conectividad:**
   - Prueba acceso a Supabase Dashboard
   - Verifica que el proyecto esté activo

---

### Barbero Aprobado pero NO Puede Hacer Login

**Diagnóstico:**

1. **Verifica que existe en auth.users:**
   ```sql
   SELECT id, email, email_confirmed_at
   FROM auth.users
   WHERE email = 'barbero@example.com';
   ```

2. **Si NO existe en auth.users:**
   → El proceso de aprobación falló silenciosamente.
   → Revisa los logs del servidor (Coolify → Logs)

3. **Si existe pero email_confirmed_at es NULL:**
   → Confirma el email manualmente:
   ```sql
   UPDATE auth.users
   SET email_confirmed_at = NOW()
   WHERE email = 'barbero@example.com';
   ```

4. **Si existe y está confirmado pero aún no puede login:**
   → Verifica que la contraseña sea correcta
   → Intenta resetear password desde Supabase Dashboard

---

### Rollback Manual (Si algo salió mal)

**Si un barbero fue parcialmente creado (existe en alguna tabla pero no en todas):**

```sql
-- Reemplaza 'barbero@example.com' con el email problemático
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Obtener UUID del barbero
  SELECT id INTO user_uuid
  FROM barberos
  WHERE email = 'barbero@example.com'
  LIMIT 1;
  
  IF user_uuid IS NOT NULL THEN
    -- Eliminar de admin_users
    DELETE FROM admin_users WHERE id = user_uuid;
    
    -- Eliminar de barberos
    DELETE FROM barberos WHERE id = user_uuid;
    
    -- Resetear solicitud a pendiente
    UPDATE solicitudes_barberos
    SET estado = 'pendiente',
        barbero_id = NULL,
        fecha_revision = NULL
    WHERE email = 'barbero@example.com';
    
    RAISE NOTICE 'Rollback completado para UUID: %', user_uuid;
  END IF;
END $$;

-- Eliminar de auth.users (SOLO si tienes permisos)
-- Alternativamente, hazlo desde Supabase Dashboard → Authentication → Users
DELETE FROM auth.users WHERE email = 'barbero@example.com';
```

Después del rollback, puedes intentar aprobar la solicitud nuevamente.

---

## 📊 Checklist de Deployment

### Pre-Deployment
- [ ] Service Role Key obtenida de Supabase
- [ ] Variable `SUPABASE_SERVICE_ROLE_KEY` agregada en Coolify
- [ ] Variables existentes verificadas
- [ ] Script de diagnóstico ejecutado (opcional)

### Durante Deployment
- [ ] Build inicia correctamente
- [ ] No hay errores de compilación TypeScript
- [ ] No hay errores de variables de entorno
- [ ] Deployment completa exitosamente

### Post-Deployment
- [ ] Página de registro accesible
- [ ] Se puede crear solicitud de barbero
- [ ] Admin puede ver solicitudes pendientes
- [ ] **CRÍTICO:** Admin puede aprobar solicitud sin errores
- [ ] **CRÍTICO:** Alert muestra contraseña generada
- [ ] **CRÍTICO:** Barbero puede hacer login con credenciales
- [ ] Barbero ve su panel específico (no panel admin)

### Verificación en DB (Opcional)
- [ ] Usuario existe en `auth.users`
- [ ] Barbero existe en `barberos` con mismo UUID
- [ ] Admin_user existe en `admin_users` con mismo UUID
- [ ] Solicitud marcada como 'aprobada' con barbero_id

---

## 🎉 Confirmación de Éxito

Si **TODOS** los tests pasaron:

✅ El sistema de aprobación de barberos funciona correctamente  
✅ Barberos aprobados pueden hacer login  
✅ Datos consistentes en Auth y tablas custom  
✅ Rollback automático protege contra errores  
✅ Sistema listo para producción

---

## 📝 Soporte

Si encuentras problemas no cubiertos en este documento:

1. **Revisa los logs:**
   - Coolify → Logs (backend)
   - Navegador F12 → Console (frontend)

2. **Ejecuta diagnóstico:**
   - `scripts/SQL/debug-solicitudes-barberos.sql`

3. **Comparte información:**
   - Mensaje de error exacto
   - Logs relevantes
   - Pasos para reproducir

---

**Estado:** ✅ Fix implementado y listo para deployment  
**Siguiente acción:** Configurar `SUPABASE_SERVICE_ROLE_KEY` en Coolify y deployar  
**Tiempo estimado:** 10-15 minutos (configuración + deployment + testing)
