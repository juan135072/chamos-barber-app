# Guía de Deployment con Coolify - Chamos Barber

## 🚀 Descripción General

Chamos Barber se despliega automáticamente en Coolify, una plataforma self-hosted de CI/CD similar a Heroku/Vercel.

## 🏗️ Configuración de Coolify

### Información del Proyecto

- **Plataforma**: Coolify (self-hosted en VPS)
- **URL de Producción**: https://chamosbarber.com
- **Rama Monitoreada**: `master` (no `main`)
- **Build Pack**: Nixpacks (detección automática)
- **Tiempo de Build**: ~2-5 minutos

### Acceso a Coolify

```
URL: [Tu URL de Coolify]
Usuario: [Admin]
Proyecto: chamos-barber
```

## 📋 Requisitos Previos

### 1. Repository Setup

```bash
# El repositorio debe tener:
✅ package.json con scripts de build
✅ next.config.js configurado
✅ Variables de entorno definidas en Coolify
✅ Rama master actualizada
```

### 2. Variables de Entorno en Coolify

Configurar en el panel de Coolify:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Next.js
NODE_ENV=production
```

⚠️ **IMPORTANTE**: Las variables con prefijo `NEXT_PUBLIC_` son públicas y se embeben en el bundle del cliente.

## 🔄 Flujo de Deployment

### Pipeline Automático

```
1. git push origin master
        ↓
2. Coolify detecta cambio en rama master
        ↓
3. Webhook trigger (GitHub → Coolify)
        ↓
4. Coolify clona repositorio
        ↓
5. Nixpacks detecta proyecto Next.js
        ↓
6. Instala dependencias (npm install)
        ↓
7. Build del proyecto (npm run build)
        ↓
8. Deployment
        ↓
9. URL actualizada (chamosbarber.com)
```

### Comandos Ejecutados por Nixpacks

```bash
# 1. Install phase
npm ci --production=false

# 2. Build phase
npm run build

# 3. Start phase
npm start
```

## 📝 Scripts de package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

## 🔧 Configuración de Next.js

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Configuración de imágenes
  images: {
    domains: [
      'supabase.chamosbarber.com',
      // Agregar más dominios si usas CDN
    ],
  },

  // Variables de entorno públicas
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Optimización de build
  compress: true,
  
  // Para deployment en subdirectorio (si aplica)
  // basePath: '/app',
  // assetPrefix: '/app',
}

module.exports = nextConfig
```

## 🚨 Troubleshooting de Deployment

### Error: "Cannot find module"

**Síntoma**: Build falla con error de módulo no encontrado

```
Error: Cannot find module '../../../lib/database.types'
```

**Causa**: Path relativo incorrecto en imports

**Solución**:
```typescript
// ANTES (incorrecto)
import type { Database } from '../../../lib/database.types'

// DESPUÉS (correcto - contar niveles correctamente)
import type { Database } from '../../../../lib/database.types'
```

**Cómo verificar**:
```bash
# Desde la ubicación del archivo, contar carpetas hasta raíz
src/components/admin/tabs/CitasTab.tsx
# tabs → admin → components → src → raíz (4 niveles)
../../../../lib/database.types
```

### Error: "Build failed"

**Síntoma**: Coolify muestra "Build failed" en logs

**Pasos de diagnóstico**:

1. **Ver logs en Coolify**:
   - Panel de Coolify → Project → Logs
   - Buscar error específico

2. **Verificar build local**:
   ```bash
   cd /home/user/webapp
   npm run build
   ```

3. **Errores comunes**:
   - TypeScript errors
   - ESLint errors
   - Import paths incorrectos
   - Variables de entorno faltantes

**Solución**:
```bash
# Arreglar errores localmente
npm run build  # Debe pasar sin errores

# Commit y push
git add .
git commit -m "fix: corregir errores de build"
git push origin master
```

### Error: "Deployment timeout"

**Síntoma**: Deployment se queda colgado

**Causa posible**:
- Build muy pesado
- Timeout de Coolify muy corto
- Dependencias muy grandes

**Solución**:
- Aumentar timeout en configuración de Coolify
- Optimizar dependencias (eliminar las no usadas)
- Usar `.npmrc` para configurar timeout de npm

### Error: "Application crashed"

**Síntoma**: Build exitoso pero aplicación no inicia

**Verificar**:

1. **Logs de runtime**:
   ```bash
   # En Coolify, ver logs de la aplicación corriendo
   ```

2. **Puerto correcto**:
   ```javascript
   // Next.js usa puerto 3000 por defecto
   // Coolify debe mapear correctamente
   ```

3. **Variables de entorno**:
   ```bash
   # Verificar que todas las variables están configuradas
   # Especialmente NEXT_PUBLIC_SUPABASE_URL
   ```

### Error: "Connection to Supabase failed"

**Síntoma**: App corre pero no puede conectar a Supabase

**Verificar**:

1. **Variables de entorno**:
   ```bash
   # En Coolify, verificar:
   NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

2. **Firewall**:
   - VPS de Coolify debe poder acceder a supabase.chamosbarber.com
   - Puerto 443 (HTTPS) abierto

3. **DNS**:
   ```bash
   # Verificar que el dominio resuelve correctamente
   nslookup supabase.chamosbarber.com
   ```

## 🔐 Seguridad en Deployment

### Variables Sensibles

```env
# ✅ PÚBLICAS (safe para cliente)
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Limitada por RLS

# ❌ PRIVADAS (solo backend)
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NO exponer al cliente
```

### Verificar Exposición de Secrets

```bash
# Nunca commitear archivos con secrets
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore

# Verificar que no están en git
git ls-files | grep env
# Debe estar vacío
```

## 📊 Monitoreo de Deployment

### Logs en Tiempo Real

En Coolify:
1. Ir al proyecto
2. Tab "Logs"
3. Ver build logs y runtime logs

### Health Check

```bash
# Verificar que la app responde
curl https://chamosbarber.com

# Debe retornar HTML de la landing page
```

### Verificar Deployment Exitoso

```bash
# 1. Build logs muestran éxito
✅ Build completed successfully

# 2. Runtime logs no muestran errores
✅ Server running on port 3000

# 3. Aplicación responde
curl -I https://chamosbarber.com
# HTTP/2 200
```

## 🔄 Rollback

### Revertir a Versión Anterior

```bash
# Opción 1: Revertir commit
git revert HEAD
git push origin master

# Opción 2: Reset a commit anterior
git reset --hard <commit-hash>
git push origin master --force

# Opción 3: Desde Coolify UI
# - Panel de Coolify → Deployments
# - Seleccionar deployment anterior
# - Clic en "Redeploy"
```

## 🚀 Optimización de Deployment

### Cache de Dependencias

Nixpacks cachea automáticamente `node_modules` si `package-lock.json` no cambia.

```bash
# Asegurar que package-lock.json está commiteado
git add package-lock.json
git commit -m "chore: actualizar package-lock.json"
```

### Build Time Optimization

```javascript
// next.config.js
module.exports = {
  // Desactivar source maps en producción
  productionBrowserSourceMaps: false,

  // Optimizar imágenes
  images: {
    formats: ['image/webp'],
  },

  // Comprimir output
  compress: true,
}
```

### Dependency Audit

```bash
# Revisar dependencias no usadas
npm install -g depcheck
depcheck

# Eliminar dependencias no usadas
npm uninstall <paquete-no-usado>
```

## 📋 Checklist Pre-Deployment

Antes de hacer push a master:

- [ ] Build local exitoso (`npm run build`)
- [ ] No hay errores de TypeScript
- [ ] No hay errores de ESLint
- [ ] Variables de entorno configuradas en Coolify
- [ ] Tests pasan (si aplica)
- [ ] Commit message descriptivo
- [ ] Branch master actualizado

```bash
# Checklist rápido
cd /home/user/webapp
npm run build  # Debe pasar
npm run lint   # Debe pasar
git status     # Verificar cambios
git log -1     # Verificar último commit
git push origin master  # Deploy
```

## 🔔 Notificaciones de Deployment

### Configurar Webhooks (Opcional)

Coolify puede enviar notificaciones a:
- Slack
- Discord
- Email
- Custom webhook

Configurar en: Coolify → Project → Settings → Notifications

## 📈 Monitoreo Post-Deployment

### Verificación Manual

```bash
# 1. Verificar homepage
curl https://chamosbarber.com

# 2. Verificar API/login
curl https://chamosbarber.com/login

# 3. Verificar conexión a Supabase
# (hacer login en la app y verificar que funciona)
```

### Logs de Producción

```bash
# Ver logs en Coolify
# Dashboard → Project → Logs → Runtime Logs

# Buscar errores
grep -i error logs.txt
grep -i exception logs.txt
```

## 🆘 Contacto y Soporte

Si hay problemas con el deployment:

1. **Verificar logs de Coolify**
2. **Consultar este documento**
3. **Revisar [Troubleshooting Guide](./TROUBLESHOOTING.md)**
4. **Verificar [GitHub Issues](link-to-repo/issues)**

## 📚 Referencias

- [Coolify Docs](https://coolify.io/docs)
- [Nixpacks](https://nixpacks.com)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

## 📝 Historial de Deployments

| Fecha | Commit | Cambio | Build Time | Estado |
|-------|--------|--------|------------|--------|
| 2025-11-02 | `2d91c6f` | Fix import path en CitasSection.tsx | ~2.5 min | ✅ **EXITOSO** |
| 2025-11-02 | `e62550e` | Fix import path en CitasTab.tsx | ~2 min | ✅ Exitoso |
| 2025-11-02 | Previo | Implementar sistema completo de citas | ~3 min | ✅ Exitoso |
| 2025-11-02 | Previo | Crear documentación del proyecto | N/A | ✅ Exitoso |
| 2025-11-01 | Previo | Fix login admin y RLS policies | ~2 min | ✅ Exitoso |

> **Nota**: Actualizar esta tabla después de cada deployment importante

### 🎉 Último Deployment Exitoso

**Fecha**: 2025-11-02 17:39:15 UTC
**Commit**: `2d91c6f4bebe8ed0388dad6ed8e35bbfd11b00a5`
**Mensaje**: "fix(build): corregir path de import en CitasSection.tsx"

#### Detalles del Build:
- **Imagen Base**: `ghcr.io/railwayapp/nixpacks:ubuntu-1745885067`
- **Node Version**: 18.20.5
- **npm Version**: 9.9.4
- **Build Time**: 2 minutos 30 segundos
- **Image Size**: 554.76 MiB
- **Estado**: ✅ Build exitoso, deployment completado

#### Fases del Build:
```
1. Setup: nodejs_18, npm-9_x, curl, wget
2. Install: npm ci (23.9s)
3. Build: npm run build (29.3s)
4. Start: npm run start
```

#### Rolling Update:
- Nuevo container: `doowogccoc04kk84kogo48gc-173611771443`
- Container anterior: `doowogccoc04kk84kogo48gc-173251663337` (removido exitosamente)
- Zero downtime deployment: ✅

#### URLs Activas:
- **Producción**: https://chamosbarber.com
- **WWW**: https://www.chamosbarber.com

#### Verificación Post-Deploy:
```bash
# Server está corriendo exitosamente
✅ Container started
✅ Rolling update completed
✅ Old containers removed
✅ Application accessible
```
