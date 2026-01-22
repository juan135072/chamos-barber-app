# 🔒 INFORME DE AUDITORÍA DE SEGURIDAD - CHAMOS BARBER
**Fecha:** 11 de Diciembre, 2025  
**Proyecto:** Chamos Barber - Sistema de Gestión de Barbería  
**Repositorio:** juan135072/chamos-barber-app  
**Rama Auditada:** master

---

## 📋 RESUMEN EJECUTIVO

| Categoría | Estado | Nivel de Riesgo |
|-----------|--------|-----------------|
| **Credenciales Expuestas** | ⚠️ ADVERTENCIA | 🟡 MEDIO |
| **Dependencias Vulnerables** | 🔴 CRÍTICO | 🔴 ALTO |
| **Inyección SQL** | ✅ SEGURO | 🟢 BAJO |
| **XSS (Cross-Site Scripting)** | ✅ SEGURO | 🟢 BAJO |
| **Autenticación** | ✅ SEGURO | 🟢 BAJO |
| **Headers de Seguridad** | ⚠️ MEJORABLE | 🟡 MEDIO |
| **Validación de Entrada** | ⚠️ MEJORABLE | 🟡 MEDIO |

**Nivel de Riesgo General:** 🟡 **MEDIO** (requiere atención)

---

## 🔴 VULNERABILIDADES CRÍTICAS

### 1. ❌ Archivo con Credenciales en el Repositorio

**Archivo:** `n8n_variables_corregidas.env`  
**Riesgo:** 🔴 **ALTO**  
**Descripción:** El archivo contiene credenciales de PostgreSQL expuestas:

```env
SERVICE_PASSWORD_POSTGRES=4mDq4euycyXqbinMMjS8YavTxnDfAxvZ
SERVICE_USER_POSTGRES=1Pxu1EBod0CXe7eR
```

**Impacto:**
- Cualquier persona con acceso al repositorio puede obtener las credenciales de la base de datos de n8n
- Posible acceso no autorizado a workflows y datos sensibles

**Recomendación URGENTE:**
```bash
# 1. Remover el archivo del repositorio
git rm n8n_variables_corregidas.env
git commit -m "security: remove exposed n8n credentials"

# 2. Agregar al .gitignore (ya está)
echo "*.env" >> .gitignore
echo "n8n_variables_corregidas.env" >> .gitignore

# 3. Cambiar las credenciales en n8n/Coolify
# - Generar nuevo SERVICE_PASSWORD_POSTGRES
# - Generar nuevo SERVICE_USER_POSTGRES
# - Actualizar en Coolify

# 4. Push los cambios
git push origin master
```

**Estado:** ⏳ **PENDIENTE DE CORRECCIÓN**

---

### 2. 🔴 Dependencias con Vulnerabilidades Críticas

**Riesgo:** 🔴 **CRÍTICO**  
**Paquetes Afectados:**

#### A) **Next.js 14.0.4** - 11 vulnerabilidades detectadas

| Vulnerabilidad | Severidad | CVE |
|----------------|-----------|-----|
| Server-Side Request Forgery (SSRF) | 🔴 HIGH | GHSA-fr5h-rqp8-mj6g |
| Cache Poisoning | 🔴 HIGH | GHSA-gp8f-8m3g-qvj9 |
| DoS in Image Optimization | 🔴 HIGH | GHSA-g77x-44xx-532m |
| DoS with Server Actions | 🔴 HIGH | GHSA-7m27-7ghc-44w9 |
| Info Exposure in Dev Server | 🔴 HIGH | GHSA-3h52-269p-cp9r |
| Cache Key Confusion | 🔴 HIGH | GHSA-g5qg-72qw-gw5v |
| Authorization Bypass | 🔴 CRITICAL | GHSA-7gfc-8cq8-jh5f |
| SSRF in Middleware | 🔴 HIGH | GHSA-4342-x723-ch2f |
| Content Injection | 🔴 HIGH | GHSA-xv57-4mr9-wg8v |
| Race Condition to Cache Poisoning | 🔴 HIGH | GHSA-qpjv-v59x-3qc4 |
| Authorization Bypass in Middleware | 🔴 CRITICAL | GHSA-f82v-jwr5-mffw |

**Versión Actual:** `14.0.4`  
**Versión Segura:** `14.2.33` o superior

#### B) **glob** - Command Injection

| Campo | Valor |
|-------|-------|
| **Severidad** | 🔴 HIGH |
| **CVE** | GHSA-5j98-mcp5-4vw2 |
| **Descripción** | Command injection via -c/--cmd |
| **CVSS Score** | 7.5 |

#### C) **js-yaml** - Prototype Pollution

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟡 MODERATE |
| **CVE** | GHSA-mh29-5h37-fv8m |
| **Descripción** | Prototype pollution in merge (<<) |
| **CVSS Score** | 5.3 |

#### D) **tar** - Race Condition

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟡 MODERATE |
| **CVE** | GHSA-29xp-372q-xqph |
| **Descripción** | Race condition leading to uninitialized memory exposure |

**Solución INMEDIATA:**

```bash
# 1. Actualizar Next.js (URGENTE)
npm install next@latest

# 2. Actualizar otras dependencias
npm audit fix

# 3. Para vulnerabilidades que requieren cambios mayores
npm audit fix --force

# 4. Verificar que la app funciona
npm run build
npm run dev

# 5. Commit y deploy
git add package.json package-lock.json
git commit -m "security: update vulnerable dependencies (Next.js, glob, js-yaml, tar)"
git push origin master
```

**Estado:** ⏳ **ACCIÓN REQUERIDA INMEDIATA**

---

## 🟡 ADVERTENCIAS DE SEGURIDAD MEDIA

### 3. ⚠️ Variables de Entorno Hardcodeadas

**Archivo:** `next.config.js` (líneas 32-34)

```javascript
env: {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'chamos-barber-secret-key',
},
```

**Problema:**
- El secret por defecto `'chamos-barber-secret-key'` es muy predecible
- Si no se configura `NEXTAUTH_SECRET` en producción, se usa el valor débil

**Recomendación:**

```javascript
// next.config.js
env: {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET, // NO usar default en producción
},

// Agregar validación
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  throw new Error('❌ NEXTAUTH_SECRET must be set in production')
}
```

**Estado:** ⚠️ **REQUIERE REVISIÓN**

---

### 4. ⚠️ Falta CSP (Content Security Policy)

**Ubicación:** `next.config.js`  
**Problema:** No hay configuración de Content Security Policy

**Headers Actuales:**
```javascript
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
]
```

**Recomendación - Agregar CSP:**

```javascript
{
  key: 'Content-Security-Policy',
  value: `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
    img-src 'self' data: https: blob:;
    font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    frame-src 'none';
    object-src 'none';
  `.replace(/\s+/g, ' ').trim()
},
{
  key: 'X-XSS-Protection',
  value: '1; mode=block'
},
{
  key: 'Permissions-Policy',
  value: 'camera=(), microphone=(), geolocation=()'
}
```

**Estado:** ⚠️ **MEJORA RECOMENDADA**

---

### 5. ⚠️ Validación de Entrada Limitada

**Archivos Afectados:**
- `src/pages/api/crear-cita.ts`
- `src/pages/api/barberos/create.ts`
- `src/pages/api/consultar-citas.ts`

**Problema:**
- Se usa `req.body` directamente sin validación exhaustiva con Zod
- Solo validación básica de campos requeridos

**Ejemplo (crear-cita.ts):**
```typescript
const citaData: any = req.body // ⚠️ Tipo 'any'
```

**Recomendación - Usar Zod:**

```typescript
import { z } from 'zod'

const citaSchema = z.object({
  barbero_id: z.string().uuid(),
  servicio_id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  cliente_nombre: z.string().min(2).max(100).trim(),
  cliente_telefono: z.string().regex(/^\+?[\d\s-()]+$/),
  cliente_email: z.string().email().optional(),
  notas: z.string().max(500).optional()
})

// En el handler
const citaData = citaSchema.parse(req.body)
```

**Estado:** ⚠️ **MEJORA RECOMENDADA**

---

### 6. ⚠️ Falta Rate Limiting

**Problema:**
- No hay límite de peticiones por IP
- Vulnerable a ataques de fuerza bruta y DoS

**APIs sin Rate Limiting:**
- `/api/crear-cita` (puede ser abusado para spam de reservas)
- `/api/consultar-citas` (puede ser usado para enumerar teléfonos)
- `/api/solicitudes/crear` (puede ser abusado para spam)

**Recomendación - Implementar Rate Limiting:**

```bash
npm install express-rate-limit
```

```typescript
// middleware/rateLimit.ts
import rateLimit from 'express-rate-limit'

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de peticiones
  message: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.'
})

export const createCitaLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 citas por hora por IP
  message: 'Has excedido el límite de reservas por hora.'
})
```

**Estado:** ⚠️ **MEJORA RECOMENDADA**

---

### 7. ⚠️ Logs con Información Sensible

**Archivos con Logs Excesivos:**
- `src/pages/api/crear-cita.ts`
- `src/pages/api/consultar-citas.ts`

**Problema:**
```typescript
console.log('🔵 [crear-cita] Request data:', JSON.stringify(citaData, null, 2))
// ⚠️ Puede loggear información sensible: teléfonos, emails, nombres
```

**Recomendación:**

```typescript
// Sanitizar logs en producción
const sanitizeForLog = (data: any) => {
  if (process.env.NODE_ENV === 'production') {
    return {
      ...data,
      cliente_telefono: data.cliente_telefono?.replace(/\d(?=\d{4})/g, '*'),
      cliente_email: data.cliente_email?.replace(/(.{2}).*(@.*)/, '$1***$2')
    }
  }
  return data
}

console.log('[crear-cita] Request:', sanitizeForLog(citaData))
```

**Estado:** ⚠️ **MEJORA RECOMENDADA**

---

## ✅ ASPECTOS POSITIVOS DE SEGURIDAD

### 1. ✅ No Hay Inyección SQL

- ✅ Se usa Supabase Query Builder (no SQL raw)
- ✅ Todos los queries usan parametrización
- ✅ No se detectó concatenación de strings SQL

**Ejemplo seguro:**
```typescript
const { data, error } = await supabase
  .from('citas')
  .select('*')
  .eq('cliente_telefono', telefono) // ✅ Parametrizado
```

---

### 2. ✅ No Hay XSS (Cross-Site Scripting)

- ✅ No se usa `dangerouslySetInnerHTML`
- ✅ No se usa `eval()` o `Function()`
- ✅ React escapa automáticamente el contenido

---

### 3. ✅ Autenticación Segura con Supabase

- ✅ Se usa Supabase Auth (OAuth + JWT)
- ✅ Tokens manejados por Supabase (no custom)
- ✅ Row Level Security (RLS) habilitado

---

### 4. ✅ .gitignore Configurado Correctamente

```gitignore
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
supabase-mcp-config.json
CREDENCIALES-ADMIN.md
```

✅ Archivos sensibles están excluidos del repo

---

### 5. ✅ HTTPS Configurado en Producción

- ✅ Coolify usa Let's Encrypt
- ✅ `chamosbarber.com` con SSL válido
- ✅ Redirección HTTP → HTTPS

---

### 6. ✅ Service Role Key Correctamente Aislada

```typescript
// ✅ Usado solo en API routes del servidor
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ✅ Solo en servidor
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

✅ No expuesta al cliente

---

## 📊 RESUMEN DE ARCHIVOS SENSIBLES

| Archivo | Estado | En Git? | Recomendación |
|---------|--------|---------|---------------|
| `.env.local` | ✅ Seguro | ❌ NO | Mantener fuera del repo |
| `.env.example` | ✅ Seguro | ✅ SÍ | OK (sin credenciales reales) |
| `n8n_variables_corregidas.env` | 🔴 PELIGRO | ✅ SÍ | **REMOVER URGENTE** |
| `N8N_VARIABLES_COMPLETAS.txt` | 🔴 PELIGRO | ✅ SÍ | **REMOVER URGENTE** |
| `CREAR_ADMIN_Y_STORAGE.sql` | ✅ Seguro | ✅ SÍ | OK (solo templates) |
| `.gitignore` | ✅ Bien configurado | ✅ SÍ | OK |

---

## 🎯 PLAN DE ACCIÓN PRIORITARIO

### 🔴 CRÍTICO (Hacer HOY)

1. **Remover credenciales expuestas del repo**
   ```bash
   git rm n8n_variables_corregidas.env N8N_VARIABLES_COMPLETAS.txt
   git commit -m "security: remove exposed n8n credentials"
   git push origin master
   ```

2. **Cambiar credenciales de n8n en Coolify**
   - Generar nueva `SERVICE_PASSWORD_POSTGRES`
   - Generar nuevo `SERVICE_USER_POSTGRES`
   - Actualizar variables en Coolify

3. **Actualizar Next.js a versión segura**
   ```bash
   npm install next@latest
   npm audit fix
   npm run build
   git add package.json package-lock.json
   git commit -m "security: update Next.js to fix critical vulnerabilities"
   git push origin master
   ```

---

### 🟡 IMPORTANTE (Hacer esta semana)

4. **Agregar CSP headers** en `next.config.js`

5. **Implementar validación con Zod** en todas las APIs

6. **Agregar Rate Limiting** a APIs públicas

7. **Validar NEXTAUTH_SECRET** en producción

---

### 🟢 MEJORAS (Hacer este mes)

8. **Sanitizar logs de producción**

9. **Implementar monitoreo de seguridad**
   ```bash
   npm install --save-dev @next/bundle-analyzer
   npm install helmet
   ```

10. **Documentar procedimientos de seguridad**

11. **Configurar backups automáticos**

12. **Implementar 2FA para admin**

---

## 📝 CHECKLIST DE VERIFICACIÓN

```markdown
- [ ] Remover n8n_variables_corregidas.env del repo
- [ ] Cambiar credenciales de PostgreSQL en n8n
- [ ] Actualizar Next.js a 14.2.33+
- [ ] Ejecutar npm audit fix
- [ ] Agregar CSP headers
- [ ] Implementar validación Zod
- [ ] Agregar rate limiting
- [ ] Validar NEXTAUTH_SECRET en producción
- [ ] Sanitizar logs
- [ ] Revisar permisos RLS en Supabase
- [ ] Configurar backups automáticos
- [ ] Documentar incident response plan
```

---

## 🔐 CONFIGURACIÓN RECOMENDADA DE SUPABASE

### Row Level Security (RLS) Policies

Verificar que estas políticas están activas:

```sql
-- Tabla: citas
✅ Permitir lectura pública de citas propias (filtrado por cliente_telefono)
✅ Permitir INSERT solo con service_role
✅ Permitir UPDATE solo a admin/barbero autenticado

-- Tabla: barberos
✅ Permitir lectura pública de barberos activos
✅ Permitir UPDATE solo a admin

-- Tabla: admin_users
✅ Bloquear lectura pública
✅ Permitir acceso solo a usuarios autenticados
```

---

## 📚 RECURSOS Y REFERENCIAS

- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [Supabase Security Guide](https://supabase.com/docs/guides/security)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

## 📧 CONTACTO

**Para reportar vulnerabilidades de seguridad:**
- Email: security@chamosbarber.com (crear este email)
- Respuesta esperada: 24-48 horas

---

**Última actualización:** 11 de Diciembre, 2025  
**Auditor:** AI Security Assistant  
**Siguiente revisión:** 11 de Enero, 2026

---

## 🎓 CONCLUSIÓN

El proyecto **Chamos Barber** presenta un **nivel de seguridad MEDIO** con buenas prácticas en prevención de inyección SQL y XSS, pero requiere atención inmediata en:

1. 🔴 **Credenciales expuestas** en archivos `.env` del repositorio
2. 🔴 **Dependencias vulnerables** (Next.js con 11 CVEs críticos)
3. 🟡 **Headers de seguridad** incompletos (falta CSP)
4. 🟡 **Rate limiting** no implementado

**Tiempo estimado de corrección:**
- Crítico: 2-4 horas
- Importante: 1-2 días
- Mejoras: 1 semana

**Recomendación:** Priorizar las acciones críticas antes del próximo deploy a producción.

---

**FIN DEL INFORME**
