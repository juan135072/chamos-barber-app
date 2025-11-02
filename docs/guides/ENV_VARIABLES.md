# Variables de Entorno - Chamos Barber

## 📋 Descripción General

Este documento describe todas las variables de entorno necesarias para el proyecto, su propósito, y cómo configurarlas correctamente.

## 🔐 Tipos de Variables

### Variables Públicas (NEXT_PUBLIC_*)

Las variables con prefijo `NEXT_PUBLIC_` son **públicas** y se exponen al navegador del cliente.

⚠️ **NUNCA incluir datos sensibles** en variables NEXT_PUBLIC_*

```env
# ✅ SEGURO - Se puede exponer
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ❌ INSEGURO - NO usar NEXT_PUBLIC_ para esto
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=...  # NUNCA HACER ESTO
NEXT_PUBLIC_DATABASE_PASSWORD=...          # NUNCA HACER ESTO
```

### Variables Privadas

Variables sin prefijo `NEXT_PUBLIC_` son **privadas** y solo están disponibles en el servidor (API routes, getServerSideProps, etc.).

```env
# ✅ SEGURO - Solo accesible en servidor
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_PASSWORD=secretpassword123
API_SECRET=my-secret-key
```

---

## 📝 Variables Requeridas

### 1. NEXT_PUBLIC_SUPABASE_URL

**Tipo**: Pública  
**Requerida**: ✅ Sí  
**Entornos**: Development, Production

**Descripción**: URL del proyecto de Supabase.

**Valores**:
```env
# Producción
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com

# Local (si usas Supabase CLI)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321

# Staging (si existe)
NEXT_PUBLIC_SUPABASE_URL=https://staging-supabase.chamosbarber.com
```

**Cómo obtenerla**:
1. Ir a Supabase Studio
2. Settings → API
3. Copiar "Project URL"

**Errores comunes**:
- ❌ `undefined`: Variable no configurada
- ❌ `http://localhost:3000`: URL incorrecta, debe ser la de Supabase
- ❌ Trailing slash: `https://supabase.chamosbarber.com/` (remover `/`)

---

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY

**Tipo**: Pública  
**Requerida**: ✅ Sí  
**Entornos**: Development, Production

**Descripción**: Key de autenticación anónima de Supabase. Limitada por Row Level Security (RLS).

**Formato**: JWT token largo

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAwMDAwMDAsImV4cCI6MTk5NTU3NjAwMH0.SIGNATURE_HERE
```

**Cómo obtenerla**:
1. Ir a Supabase Studio
2. Settings → API
3. Copiar "anon public" key

**Seguridad**:
- ✅ Seguro exponer al cliente
- ✅ Limitado por RLS policies
- ✅ No puede hacer operaciones admin
- ❌ NO puede bypassear RLS

**Errores comunes**:
- ❌ Usar service_role_key en lugar de anon key
- ❌ Key expirada (verificar fecha de expiración en JWT)
- ❌ Key de proyecto equivocado

---

### 3. SUPABASE_SERVICE_ROLE_KEY

**Tipo**: Privada  
**Requerida**: ⚠️ Solo para operaciones admin  
**Entornos**: Production (API routes, cron jobs)

**Descripción**: Key con privilegios completos que bypasea RLS. **NUNCA exponer al cliente**.

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4MDAwMDAwMCwiZXhwIjoxOTk1NTc2MDAwfQ.SIGNATURE_HERE
```

**Cómo obtenerla**:
1. Ir a Supabase Studio
2. Settings → API
3. Copiar "service_role secret" key

**⚠️ SEGURIDAD CRÍTICA**:
- ❌ NUNCA usar con prefijo NEXT_PUBLIC_
- ❌ NUNCA usar en componentes del cliente
- ❌ NUNCA commitear en Git
- ✅ Solo usar en API routes del servidor
- ✅ Solo usar en getServerSideProps
- ✅ Solo usar en scripts de backend

**Uso correcto**:
```typescript
// ✅ CORRECTO - En API route (server-side)
// pages/api/admin/delete-user.ts
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // ← Solo accesible en servidor
  )
  
  // Operaciones admin...
}

// ❌ INCORRECTO - En componente del cliente
// components/Admin.tsx
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ← undefined en cliente
)
```

---

### 4. NODE_ENV

**Tipo**: Sistema  
**Requerida**: ✅ Sí  
**Entornos**: Development, Production

**Descripción**: Indica el entorno de ejecución.

**Valores posibles**:
```env
# Desarrollo local
NODE_ENV=development

# Producción
NODE_ENV=production

# Testing (si aplica)
NODE_ENV=test
```

**Configuración automática**:
- `npm run dev` → `NODE_ENV=development`
- `npm run build` → `NODE_ENV=production`
- `npm start` → Usa NODE_ENV existente

**Efectos en la aplicación**:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Modo desarrollo - logs habilitados')
}

if (process.env.NODE_ENV === 'production') {
  // Desactivar source maps, optimizar bundle
}
```

---

## 📂 Archivos de Configuración

### .env.local (Desarrollo Local)

**Ubicación**: Raíz del proyecto  
**Git**: ❌ NO commitear (incluido en .gitignore)  
**Uso**: Variables locales de desarrollo

```env
# .env.local (para desarrollo local)
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=development
```

### .env.production (Opcional)

**Ubicación**: Raíz del proyecto  
**Git**: ❌ NO commitear  
**Uso**: Variables de producción (alternativa a Coolify)

```env
# .env.production (si se usa localmente)
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

### .env.example (Template)

**Ubicación**: Raíz del proyecto  
**Git**: ✅ SÍ commitear  
**Uso**: Template para nuevos desarrolladores

```env
# .env.example (template público)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NODE_ENV=development
```

---

## 🚀 Configuración por Entorno

### Desarrollo Local

```bash
# 1. Copiar template
cp .env.example .env.local

# 2. Editar .env.local
nano .env.local

# 3. Agregar valores reales
# (solicitar al admin del proyecto)

# 4. Iniciar servidor
npm run dev
```

### Coolify (Producción)

```bash
# En panel de Coolify:
# 1. Ir a proyecto → Environment Variables
# 2. Agregar cada variable:

NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production

# 3. Guardar y redeploy
```

### Vercel (Alternativa)

```bash
# Usando Vercel CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# O desde dashboard de Vercel:
# Settings → Environment Variables
```

---

## 🔍 Validación de Variables

### Script de Validación

Crear archivo `scripts/validate-env.js`:

```javascript
// scripts/validate-env.js
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]

const optionalEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
]

function validateEnv() {
  console.log('🔍 Validando variables de entorno...\n')

  let hasErrors = false

  // Verificar variables requeridas
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.error(`❌ ERROR: ${varName} no está configurada`)
      hasErrors = true
    } else {
      console.log(`✅ ${varName} configurada`)
    }
  })

  // Verificar variables opcionales
  optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.warn(`⚠️  ADVERTENCIA: ${varName} no está configurada (opcional)`)
    } else {
      console.log(`✅ ${varName} configurada`)
    }
  })

  // Verificar formato de URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl && !supabaseUrl.startsWith('http')) {
    console.error('❌ ERROR: NEXT_PUBLIC_SUPABASE_URL debe empezar con http:// o https://')
    hasErrors = true
  }

  // Verificar que anon key es JWT
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (anonKey && !anonKey.startsWith('eyJ')) {
    console.error('❌ ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY no parece ser un JWT válido')
    hasErrors = true
  }

  if (hasErrors) {
    console.error('\n❌ Validación fallida. Corrige los errores antes de continuar.')
    process.exit(1)
  } else {
    console.log('\n✅ Todas las variables de entorno están configuradas correctamente')
  }
}

validateEnv()
```

**Uso**:
```bash
# Agregar script en package.json
{
  "scripts": {
    "validate-env": "node scripts/validate-env.js"
  }
}

# Ejecutar
npm run validate-env
```

---

## 🐛 Troubleshooting

### Error: "undefined is not a valid URL"

**Causa**: Variable NEXT_PUBLIC_SUPABASE_URL no configurada

**Solución**:
```bash
# 1. Verificar que .env.local existe
ls -la .env.local

# 2. Verificar contenido
cat .env.local

# 3. Si falta, crear y agregar variable
echo "NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com" >> .env.local

# 4. Reiniciar servidor
npm run dev
```

### Error: "Invalid JWT"

**Causa**: Anon key incorrecta o expirada

**Solución**:
```bash
# 1. Verificar formato
# La key debe empezar con "eyJ"

# 2. Decodificar JWT para ver expiración
# Usar jwt.io o:
node -e "console.log(JSON.parse(Buffer.from('PARTE_CENTRAL_DEL_JWT', 'base64').toString()))"

# 3. Si está expirada, generar nueva en Supabase Studio
```

### Variables no se actualizan

**Causa**: Next.js cachea variables de entorno

**Solución**:
```bash
# Detener servidor (Ctrl+C)
# Eliminar cache
rm -rf .next

# Reiniciar
npm run dev
```

### Variable pública muestra "undefined" en cliente

**Causa**: Falta prefijo NEXT_PUBLIC_

**Solución**:
```env
# ❌ INCORRECTO
SUPABASE_URL=https://...

# ✅ CORRECTO
NEXT_PUBLIC_SUPABASE_URL=https://...
```

---

## 🔒 Mejores Prácticas

### 1. Nunca Commitear Secrets

```bash
# Verificar .gitignore
cat .gitignore | grep env

# Debe incluir:
.env*.local
.env
.env.production
```

### 2. Usar Variables Específicas por Entorno

```bash
# Desarrollo
.env.local

# Staging
.env.staging

# Producción
.env.production
```

### 3. Documentar Nuevas Variables

Al agregar una nueva variable:

1. Agregarla a `.env.example`
2. Documentarla en este archivo
3. Actualizar script de validación
4. Notificar al equipo

### 4. Rotar Keys Periódicamente

```bash
# Cada 3-6 meses:
# 1. Generar nuevas keys en Supabase
# 2. Actualizar en Coolify
# 3. Redeploy
# 4. Actualizar en desarrollo local
# 5. Notificar al equipo
```

### 5. No Loguear Variables Sensibles

```typescript
// ❌ NUNCA
console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY)

// ✅ MEJOR
console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configurada' : 'faltante')
```

---

## 📚 Referencias

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase API Settings](https://supabase.com/docs/guides/api#api-url-and-keys)
- [Security Best Practices](https://nextjs.org/docs/security)

---

## 📝 Template Completo

```env
# ==============================================
# CHAMOS BARBER - Environment Variables
# ==============================================

# ---------------------------------------------
# Supabase Configuration
# ---------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (solo servidor)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ---------------------------------------------
# Next.js Configuration
# ---------------------------------------------
NODE_ENV=development

# ---------------------------------------------
# Notas:
# ---------------------------------------------
# - NEVER commit this file to Git
# - Request real values from project admin
# - Service Role Key should ONLY be used server-side
# ==============================================
```

Copiar este template a `.env.local` y completar con valores reales.
