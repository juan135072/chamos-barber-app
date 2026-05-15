# Troubleshooting Guide - Chamos Barber

## 🔍 Índice de Problemas

1. [Problemas de Autenticación](#problemas-de-autenticación)
2. [Problemas de Base de Datos](#problemas-de-base-de-datos)
3. [Problemas de Deployment](#problemas-de-deployment)
4. [Problemas de Build](#problemas-de-build)
5. [Problemas de UI/UX](#problemas-de-uiux)
6. [Problemas de Performance](#problemas-de-performance)

## ⚡ Problemas Resueltos Recientemente

### ✅ Fix: Import Path Incorrecto en CitasSection.tsx (2025-11-02)

**Síntoma**: Build fallaba con error de TypeScript:
```
Type error: Cannot find module '../../lib/database.types'
File: src/components/barbero/CitasSection.tsx
```

**Causa**: Path relativo incorrecto (2 niveles en lugar de 3).

**Solución aplicada**: 
```typescript
// ANTES (incorrecto)
import type { Database } from '../../lib/database.types'

// DESPUÉS (correcto)
import type { Database } from '../../../lib/database.types'
```

**Commit**: [`2d91c6f`](https://github.com/juan135072/chamos-barber-app/commit/2d91c6f4bebe8ed0388dad6ed8e35bbfd11b00a5)  
**Status**: ✅ Resuelto - Deploy exitoso en producción

Ver detalles completos en [Deployment Success 2025-11-02](./DEPLOYMENT_SUCCESS_2025-11-02.md)

---

## 🔐 Problemas de Autenticación

### 1. Login no redirige después de credenciales correctas

**Síntomas**:
- Usuario ingresa credenciales correctas
- Login parece exitoso
- Página no redirige a /admin o /barbero-panel

**Diagnóstico**:
```typescript
// Agregar logs en login.tsx
console.log('🔍 Verificando acceso para:', session.user.email)
console.log('🆔 User ID:', session.user.id)
```

**Causas posibles**:

#### Causa 1: Query usa email en lugar de ID

```typescript
// ❌ INCORRECTO
const { data: adminUser } = await supabase
  .from('admin_users')
  .select('*')
  .eq('email', session.user.email)  // ← Error aquí
  .single()

// ✅ CORRECTO
const { data: adminUser } = await supabase
  .from('admin_users')
  .select('*')
  .eq('id', session.user.id)  // ← Usar ID
  .single()
```

**Solución**: Cambiar query para usar `session.user.id`

#### Causa 2: Usuario no existe en admin_users

**Verificación**:
```sql
-- En Supabase Studio SQL Editor
SELECT * FROM admin_users WHERE email = 'admin@chamosbarber.com';

-- Debe retornar una fila
```

**Solución**: Insertar usuario en admin_users
```sql
INSERT INTO admin_users (id, email, rol, activo)
VALUES (
  'd90e5c62-8f18-4482-b62a-a3caee6a8d46',  -- ID de auth.users
  'admin@chamosbarber.com',
  'admin',
  true
);
```

#### Causa 3: Usuario está desactivado

**Verificación**:
```sql
SELECT * FROM admin_users WHERE email = 'admin@chamosbarber.com';
-- Revisar columna 'activo'
```

**Solución**:
```sql
UPDATE admin_users 
SET activo = true 
WHERE email = 'admin@chamosbarber.com';
```

#### Causa 4: RLS bloqueando query (recursión infinita)

**Síntoma**: Error "infinite recursion detected in policy"

**Solución**: Ya aplicada, RLS deshabilitado en admin_users
```sql
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
```

---

### 2. Error "No tienes permisos para acceder"

**Síntomas**:
- Login exitoso en Supabase Auth
- Mensaje de error sobre permisos
- Sesión se cierra automáticamente

**Diagnóstico**:
```typescript
console.log('❌ Error al verificar admin_users:', error)
console.log('📊 Resultado de query:', adminUser)
```

**Causas posibles**:

1. Usuario no tiene rol asignado
2. Usuario no está en tabla admin_users
3. Usuario está desactivado (activo = false)

**Solución**: Verificar y corregir datos en admin_users

---

### 3. Contraseña incorrecta (pero es la correcta)

**Síntomas**:
- Usuario está seguro de la contraseña
- Error "Credenciales inválidas"

**Causas posibles**:

1. **Password fue cambiado en Supabase**
   
   **Verificación**:
   ```sql
   SELECT encrypted_password FROM auth.users 
   WHERE email = 'admin@chamosbarber.com';
   -- Si es NULL o diferente, el password cambió
   ```

2. **Usuario no confirmó email**
   
   **Verificación**:
   ```sql
   SELECT email_confirmed_at FROM auth.users 
   WHERE email = 'admin@chamosbarber.com';
   -- Debe tener una fecha, no NULL
   ```

   **Solución**:
   ```sql
   UPDATE auth.users 
   SET email_confirmed_at = now() 
   WHERE email = 'admin@chamosbarber.com';
   ```

3. **Reset de contraseña necesario**
   
   **Solución**:
   ```typescript
   // Desde código
   const { error } = await supabase.auth.resetPasswordForEmail(
     'admin@chamosbarber.com',
     { redirectTo: 'https://chamosbarber.com/reset-password' }
   )
   ```

---

## 🗄️ Problemas de Base de Datos

### 1. Error "relation does not exist"

**Síntomas**:
```
error: relation "public.citas" does not exist
```

**Causa**: Tabla no existe o nombre incorrecto

**Verificación**:
```sql
-- Listar todas las tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

**Solución**: Crear tabla si no existe
```sql
-- Ver DATABASE.md para scripts de creación
```

---

### 2. Error "column does not exist"

**Síntomas**:
```
error: column "barbero_id" of relation "citas" does not exist
```

**Causa**: Columna no existe o nombre incorrecto

**Verificación**:
```sql
-- Ver columnas de una tabla
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'citas';
```

**Solución**: Agregar columna si falta
```sql
ALTER TABLE citas 
ADD COLUMN barbero_id uuid REFERENCES barberos(id);
```

---

### 3. Error "foreign key constraint"

**Síntomas**:
```
error: insert or update on table "citas" violates foreign key constraint
```

**Causa**: Intentando insertar ID que no existe en tabla relacionada

**Verificación**:
```sql
-- Verificar que el barbero existe
SELECT id FROM barberos WHERE id = 'uuid-del-barbero';

-- Verificar que el servicio existe
SELECT id FROM servicios WHERE id = 'uuid-del-servicio';
```

**Solución**: Usar IDs válidos o crear el registro relacionado primero

---

### 4. Query retorna datos de otro barbero

**Síntomas**:
- Barbero ve citas que no son suyas
- Datos mezclados entre barberos

**Causa**: Falta filtro `.eq('barbero_id', userId)` en query

**Verificación**:
```typescript
// Revisar código del componente
const { data } = await supabase
  .from('citas')
  .select('*')
  // ¿Falta el filtro?
```

**Solución**: Agregar filtro obligatorio
```typescript
const { data } = await supabase
  .from('citas')
  .select('*')
  .eq('barbero_id', barberoId)  // ← Agregar esto
```

---

### 5. Error "Cannot read property 'nombre' of null"

**Síntomas**:
```
TypeError: Cannot read property 'nombre' of null
cita.barberos.nombre
```

**Causa**: JOIN no retorna datos (barbero fue eliminado o no existe)

**Verificación**:
```typescript
console.log('Cita:', cita)
console.log('Barbero:', cita.barberos)  // null o undefined
```

**Solución**:
```typescript
// Opción 1: Usar inner join
.select(`
  *,
  barberos:barbero_id!inner (nombre, apellido)
`)

// Opción 2: Validar en código
{cita.barberos && (
  <p>{cita.barberos.nombre}</p>
)}

// Opción 3: Usar optional chaining
<p>{cita.barberos?.nombre ?? 'N/A'}</p>
```

---

## 🚀 Problemas de Deployment

### 1. Build falla con "Cannot find module"

**Síntomas**:
```
Error: Cannot find module '../../../lib/database.types'
    at CitasTab.tsx:3:1
```

**Causa**: Path relativo incorrecto en TypeScript imports

**Casos documentados**:
1. ✅ **CitasTab.tsx** (resuelto commit `e62550e`)
   - Ubicación: `src/components/admin/tabs/CitasTab.tsx`
   - Path correcto: `../../../../lib/database.types` (4 niveles)

2. ✅ **CitasSection.tsx** (resuelto commit `2d91c6f` - 2025-11-02)
   - Ubicación: `src/components/barbero/CitasSection.tsx`
   - Path correcto: `../../../lib/database.types` (3 niveles)

**Método de diagnóstico**:
```bash
# 1. Identificar ubicación exacta del archivo
pwd  # Verificar directorio actual
ls -la src/components/barbero/

# 2. Contar niveles hasta raíz
# Ejemplo: src/components/barbero/CitasSection.tsx
# barbero → components → src → raíz = 3 niveles

# 3. Construir path correcto
# ../../../lib/database.types
```

**Solución paso a paso**:
```typescript
// 1. Identificar el archivo con error
// src/components/barbero/CitasSection.tsx

// 2. Contar niveles correctamente
// barbero (1) → components (2) → src (3) → raíz
// = 3 niveles = ../../../

// 3. Aplicar corrección
// ANTES (incorrecto)
import type { Database } from '../../lib/database.types'

// DESPUÉS (correcto)
import type { Database } from '../../../lib/database.types'
```

**Prevención**:
```bash
# Siempre hacer build local antes de push
cd /home/user/webapp
npm run build

# Si build local pasa, deployment también pasará
# Si build local falla, arreglar antes de push
```

**Referencias**:
- [Deployment Success 2025-11-02](./DEPLOYMENT_SUCCESS_2025-11-02.md) - Caso CitasSection.tsx
- [Commit 2d91c6f](https://github.com/juan135072/chamos-barber-app/commit/2d91c6f4bebe8ed0388dad6ed8e35bbfd11b00a5)

**Verificación local**:
```bash
cd /home/user/webapp
npm run build  # Debe pasar sin errores
```

---

### 2. Deployment exitoso pero página en blanco

**Síntomas**:
- Build completa correctamente
- Página carga pero muestra pantalla blanca
- Console muestra errores de JavaScript

**Diagnóstico**:
```bash
# Abrir navegador, F12 → Console
# Ver errores JavaScript
```

**Causas posibles**:

1. **Variables de entorno faltantes**
   
   **Verificación**:
   ```javascript
   console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
   // undefined = variable no configurada
   ```

   **Solución**: Configurar en Coolify y redeployar

2. **Error en componente inicial**
   
   **Verificación**: Ver console del navegador

   **Solución**: Agregar error boundaries
   ```typescript
   class ErrorBoundary extends React.Component {
     componentDidCatch(error, errorInfo) {
       console.error('Error capturado:', error, errorInfo)
     }
     render() {
       return this.props.children
     }
   }
   ```

---

### 3. Deploy se queda colgado (timeout)

**Síntomas**:
- Build empieza correctamente
- Se detiene en un punto
- Coolify muestra timeout

**Causas posibles**:

1. **npm install muy lento**
   
   **Solución**: Verificar dependencias
   ```bash
   npm list --depth=0
   # Eliminar paquetes no usados
   ```

2. **Build muy pesado**
   
   **Solución**: Optimizar next.config.js
   ```javascript
   module.exports = {
     productionBrowserSourceMaps: false,
     compress: true,
   }
   ```

---

## 🎨 Problemas de UI/UX

### 1. Estilos no se aplican correctamente

**Síntomas**:
- Componentes sin estilo
- Clases de Tailwind no funcionan

**Causas posibles**:

1. **Tailwind no configurado**
   
   **Verificación**:
   ```bash
   cat tailwind.config.js
   ```

   **Solución**: Verificar que contenido está configurado
   ```javascript
   module.exports = {
     content: [
       './src/pages/**/*.{js,ts,jsx,tsx}',
       './src/components/**/*.{js,ts,jsx,tsx}',
     ],
   }
   ```

2. **Build de CSS no ejecutado**
   
   **Solución**:
   ```bash
   npm run build
   # Debe generar archivos CSS
   ```

---

### 2. Modal no se cierra

**Síntomas**:
- Modal abierto
- Click fuera no cierra
- Botón X no funciona

**Causa**: Event handler no conectado o estado no actualizado

**Verificación**:
```typescript
console.log('Modal abierto:', isOpen)
```

**Solución**:
```typescript
// Verificar que setIsOpen está conectado
<button onClick={() => setIsOpen(false)}>
  Cerrar
</button>

// Verificar click outside
<div onClick={(e) => {
  if (e.target === e.currentTarget) {
    setIsOpen(false)
  }
}}>
```

---

### 3. Datos no se actualizan después de cambio

**Síntomas**:
- Usuario cambia estado de cita
- UI no refleja el cambio
- Requiere refresh manual

**Causa**: Estado local no se actualiza después de mutation

**Solución**:
```typescript
const handleUpdate = async () => {
  // 1. Update en DB
  const { error } = await supabase
    .from('citas')
    .update({ estado: 'confirmada' })
    .eq('id', citaId)

  if (error) return

  // 2. Actualizar estado local
  setCitas(prevCitas =>
    prevCitas.map(c =>
      c.id === citaId ? { ...c, estado: 'confirmada' } : c
    )
  )

  // O recargar todo
  loadCitas()
}
```

---

## ⚡ Problemas de Performance

### 1. Página carga muy lento

**Síntomas**:
- Landing page tarda mucho en cargar
- Imágenes tardan en aparecer

**Diagnóstico**:
```bash
# En navegador: F12 → Network
# Ver tiempo de carga de recursos
```

**Soluciones**:

1. **Optimizar imágenes**
   ```typescript
   // Usar Next.js Image component
   import Image from 'next/image'
   
   <Image
     src="/barbero.jpg"
     alt="Barbero"
     width={300}
     height={300}
     loading="lazy"
   />
   ```

2. **Lazy loading de componentes**
   ```typescript
   import dynamic from 'next/dynamic'
   
   const CitasTab = dynamic(() => import('./tabs/CitasTab'), {
     loading: () => <div>Cargando...</div>
   })
   ```

---

### 2. Query muy lenta

**Síntomas**:
- Carga de citas tarda varios segundos
- Filtros lentos

**Diagnóstico**:
```sql
-- En Supabase Studio → SQL Editor
EXPLAIN ANALYZE
SELECT * FROM citas
JOIN barberos ON citas.barbero_id = barberos.id;

-- Ver tiempo de ejecución
```

**Soluciones**:

1. **Agregar índices**
   ```sql
   CREATE INDEX idx_citas_barbero_id ON citas(barbero_id);
   CREATE INDEX idx_citas_fecha ON citas(fecha);
   ```

2. **Limitar resultados**
   ```typescript
   const { data } = await supabase
     .from('citas')
     .select('*')
     .limit(100)  // ← Agregar límite
     .order('fecha', { ascending: false })
   ```

3. **Paginar resultados**
   ```typescript
   const { data } = await supabase
     .from('citas')
     .select('*')
     .range(0, 49)  // Primeras 50
     .order('fecha', { ascending: false })
   ```

---

## 🔧 Herramientas de Debugging

### 1. Console Logs Útiles

```typescript
// En cualquier componente
console.log('🔍 Debug:', variable)
console.log('📊 Estado actual:', state)
console.error('❌ Error:', error)
console.warn('⚠️ Advertencia:', warning)
```

### 2. React DevTools

```bash
# Instalar extensión en navegador
# Chrome: React Developer Tools
# Firefox: React Developer Tools

# F12 → Tab "Components"
# Ver props y state de componentes
```

### 3. Supabase Studio

```
URL: https://supabase.chamosbarber.com/project/default
- Table Editor: Ver/editar datos
- SQL Editor: Ejecutar queries
- Auth: Gestionar usuarios
- Logs: Ver logs de DB
```

### 4. Network Tab

```bash
# F12 → Network
# Filtrar por:
# - XHR: Requests a Supabase
# - JS: Scripts cargados
# - CSS: Estilos cargados
```

---

## 📞 Cuando Todo Falla

1. **Verificar que Supabase está up**
   ```bash
   curl https://supabase.chamosbarber.com/health
   ```

2. **Limpiar cache y rebuild**
   ```bash
   rm -rf .next
   rm -rf node_modules
   npm install
   npm run build
   ```

3. **Verificar logs de Coolify**
   - Dashboard → Project → Logs

4. **Consultar documentación**
   - [System Overview](../architecture/SYSTEM_OVERVIEW.md)
   - [Database Schema](../architecture/DATABASE.md)
   - [Auth System](../architecture/AUTH_SYSTEM.md)

5. **Crear GitHub Issue**
   - Descripción del problema
   - Pasos para reproducir
   - Logs relevantes
   - Screenshots si aplica

---

## 📚 Referencias

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Coolify Docs](https://coolify.io/docs)

---

## 📝 Agregar Nuevo Problema

Si encuentras un problema nuevo:

1. Documentarlo aquí siguiendo el formato:
   - Síntomas
   - Diagnóstico
   - Causas posibles
   - Solución

2. Commit:
   ```bash
   git add docs/deployment/TROUBLESHOOTING.md
   git commit -m "docs: agregar solución para problema X"
   git push origin master
   ```
