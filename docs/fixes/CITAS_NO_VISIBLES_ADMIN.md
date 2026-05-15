# 🐛 FIX: Citas No Visibles en Panel de Administración

## 📋 Problema

**Síntoma**: Las citas creadas desde `/reservar` (página pública) no aparecen en el panel de administración (`/admin` tab Citas).

**Reporte**: 2025-11-02

## 🔍 Diagnóstico

### Comportamiento Observado
1. Usuario crea cita desde https://chamosbarber.com/reservar
2. Formulario muestra mensaje "¡Cita reservada exitosamente!"
3. Usuario admin entra a https://chamosbarber.com/admin
4. Navega a tab "Citas"
5. **La cita NO aparece en la lista** ❌

### Causa Raíz: Row Level Security (RLS)

El problema es causado por **políticas RLS incorrectas o ausentes** en la tabla `citas`:

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Usuario Anónimo│         │   Tabla: citas   │         │  Usuario Admin  │
│   (/reservar)   │ ─INSERT─→ │   + RLS activo   │ ◄─SELECT─ │   (/admin)      │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │                            │
                                     │                            │
                                  ✅ INSERT                    ❌ SELECT
                                  permitido                   BLOQUEADO
```

**Escenarios posibles**:

1. **RLS habilitado sin políticas adecuadas**
   - INSERT está permitido para usuarios anónimos (anon role)
   - SELECT NO está permitido para usuarios autenticados (authenticated role)
   - Resultado: Cita se crea pero admin no puede verla

2. **Políticas demasiado restrictivas**
   - Solo permite SELECT con filtro específico
   - Admins no tienen acceso total
   - Resultado: Algunas citas no son visibles

3. **RLS deshabilitado pero permisos de tabla incorrectos**
   - Menos probable, pero posible
   - Permisos GRANT no están configurados correctamente

## 🛠️ Solución

### Opción 1: Aplicar Script SQL (RECOMENDADO)

Ejecuta el script completo que configura RLS correctamente:

```bash
# 1. Abre Supabase Studio
https://supabase.chamosbarber.com

# 2. Ve a SQL Editor

# 3. Ejecuta el script
/home/user/webapp/scripts/SQL/fix-citas-rls.sql
```

El script hace lo siguiente:
- ✅ Habilita RLS en tabla `citas`
- ✅ Crea política de INSERT para usuarios anónimos
- ✅ Crea política de SELECT para usuarios autenticados (admins/barberos)
- ✅ Crea política de UPDATE para usuarios autenticados
- ✅ Crea política de DELETE para usuarios autenticados
- ✅ Asegura acceso total para service_role (backup)

### Opción 2: Comandos SQL Manuales

Si prefieres hacerlo paso a paso:

```sql
-- 1. Habilitar RLS
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

-- 2. Permitir INSERT anónimo (desde /reservar)
CREATE POLICY "Permitir crear citas anónimas"
ON citas
FOR INSERT
TO anon
WITH CHECK (true);

-- 3. Permitir SELECT autenticado (admin/barberos)
CREATE POLICY "Permitir leer todas las citas a usuarios autenticados"
ON citas
FOR SELECT
TO authenticated
USING (true);

-- 4. Permitir UPDATE autenticado
CREATE POLICY "Permitir actualizar citas a usuarios autenticados"
ON citas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Permitir DELETE autenticado
CREATE POLICY "Permitir eliminar citas a usuarios autenticados"
ON citas
FOR DELETE
TO authenticated
USING (true);
```

### Opción 3: Deshabilitar RLS (NO RECOMENDADO - Solo para Testing)

⚠️ **ADVERTENCIA**: Esto expone todas las citas públicamente. Solo usar en desarrollo.

```sql
ALTER TABLE citas DISABLE ROW LEVEL SECURITY;
```

## ✅ Verificación Post-Fix

### 1. Verificar Políticas RLS

```sql
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN roles = '{anon}' THEN 'anon'
    WHEN roles = '{authenticated}' THEN 'authenticated'
    ELSE roles::text
  END AS role
FROM pg_policies 
WHERE tablename = 'citas';
```

**Resultado esperado**:
```
policyname                                        | cmd    | role
--------------------------------------------------+--------+---------------
Permitir crear citas anónimas                     | INSERT | anon
Permitir crear citas autenticadas                 | INSERT | authenticated
Permitir leer todas las citas a usuarios autent.. | SELECT | authenticated
Permitir actualizar citas a usuarios autenticados | UPDATE | authenticated
Permitir eliminar citas a usuarios autenticados   | DELETE | authenticated
Service role tiene acceso completo                | ALL    | service_role
```

### 2. Verificar Citas Existentes

```sql
SELECT id, cliente_nombre, fecha, hora, estado, created_at 
FROM citas 
ORDER BY created_at DESC 
LIMIT 10;
```

Deberías ver TODAS las citas, incluyendo las creadas antes del fix.

### 3. Test Manual Completo

#### A. Crear Cita desde /reservar
```bash
1. Abre navegador en modo incógnito (sin sesión)
2. Ve a https://chamosbarber.com/reservar
3. Completa formulario y reserva cita
4. Anota nombre del cliente y hora
```

#### B. Verificar en Admin Panel
```bash
1. Abre navegador normal
2. Login como admin (admin@chamosbarber.com)
3. Ve a https://chamosbarber.com/admin
4. Click en tab "Citas"
5. ✅ La cita debe aparecer inmediatamente
6. Click en botón "Actualizar" si no aparece
```

#### C. Verificar Filtros
```bash
1. En admin panel, usa filtros:
   - Estado: "Pendiente" (la nueva cita debería aparecer)
   - Fecha: "Futuras" (si la cita es en el futuro)
2. Usa búsqueda por nombre del cliente
3. ✅ La cita debe ser encontrada
```

## 📊 Comportamiento Correcto Post-Fix

### Flujo Esperado

```
1. Usuario anónimo crea cita en /reservar
   ↓
2. INSERT permitido por política RLS "anon"
   ↓
3. Cita se guarda en tabla citas con estado 'pendiente'
   ↓
4. Admin hace login
   ↓
5. Admin ve tab Citas
   ↓
6. SELECT permitido por política RLS "authenticated"
   ↓
7. ✅ Admin ve TODAS las citas (incluyendo la nueva)
```

### Permisos por Rol

| Rol            | INSERT | SELECT | UPDATE | DELETE |
|----------------|--------|--------|--------|--------|
| anon (público) | ✅ Sí  | ❌ No  | ❌ No  | ❌ No  |
| authenticated  | ✅ Sí  | ✅ Sí  | ✅ Sí  | ✅ Sí  |
| service_role   | ✅ Sí  | ✅ Sí  | ✅ Sí  | ✅ Sí  |

## 🔄 Si el Problema Persiste

### 1. Verificar Sesión de Admin

```javascript
// En Chrome DevTools Console (en /admin)
const { data: { session } } = await supabase.auth.getSession()
console.log('User ID:', session?.user?.id)
console.log('Role:', session?.user?.role)
```

Debe retornar:
```javascript
User ID: "d90e5c62-8f18-4482-b62a-a3caee6a8d46" (o similar)
Role: "authenticated"
```

### 2. Verificar Queries en Network Tab

```bash
1. Abre Chrome DevTools (F12)
2. Ve a tab "Network"
3. Filtra por "citas"
4. Recarga página /admin
5. Busca request a Supabase con endpoint /rest/v1/citas
6. Ve la respuesta (Response tab)
```

**Respuesta esperada**: Array con todas las citas
**Respuesta problemática**: `[]` (array vacío) o error 403

### 3. Test con Service Role Key (Bypass RLS)

```javascript
// Temporal: Usar service role key para verificar que citas existen
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  'https://supabase.chamosbarber.com',
  'YOUR_SERVICE_ROLE_KEY' // ⚠️ NUNCA en cliente, solo para test
)

const { data, error } = await supabaseAdmin
  .from('citas')
  .select('*')

console.log('Citas (service role):', data)
```

Si esto retorna citas, confirma que el problema es RLS.

### 4. Verificar Variables de Entorno

```bash
# En el servidor (Coolify)
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Deben coincidir con las de Supabase
```

## 📝 Prevención Futura

### 1. Documentar Políticas RLS

Mantener documentación actualizada de políticas RLS en:
- `docs/architecture/DATABASE.md`
- `scripts/SQL/` (scripts de creación)

### 2. Testing de Permisos

Crear tests automatizados para verificar permisos:

```typescript
// tests/rls/citas.test.ts
describe('RLS Policies - Citas', () => {
  it('anonymous users can insert citas', async () => {
    // Test INSERT anónimo
  })
  
  it('authenticated users can read all citas', async () => {
    // Test SELECT autenticado
  })
  
  // ... más tests
})
```

### 3. Checklist Pre-Deployment

- [ ] RLS policies documentadas
- [ ] Tests de permisos pasando
- [ ] Verificación manual en staging
- [ ] Script de rollback preparado

## 🔗 Referencias

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [Script de Fix](../../scripts/SQL/fix-citas-rls.sql)
- [Troubleshooting Guide](../deployment/TROUBLESHOOTING.md)

## 📞 Soporte

Si después de aplicar el fix el problema persiste:

1. **Verificar logs de Supabase**:
   - Supabase Studio → Logs
   - Buscar errores relacionados con `citas`

2. **Revisar este documento**:
   - Seguir pasos de verificación
   - Ejecutar queries de diagnóstico

3. **Contactar soporte**:
   - GitHub Issues
   - Email: admin@chamosbarber.com

---

**Status**: 🟡 En investigación  
**Prioridad**: 🔴 Alta  
**Última actualización**: 2025-11-02
