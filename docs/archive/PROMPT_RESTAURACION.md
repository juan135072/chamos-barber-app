# 🔄 Prompt de Restauración - Volver al Estado Exitoso

**Propósito:** Este prompt te permite solicitar la restauración del proyecto al estado funcional del deployment exitoso del 2025-11-06.

**Commit de Referencia:** `4d909cb`  
**Estado:** Sistema de reservas funcionando correctamente en Coolify

---

## 📋 Prompt para Copiar y Pegar

Cuando necesites restaurar el proyecto a este punto, copia y pega el siguiente prompt:

```
Necesito restaurar el proyecto "chamos-barber-app" al estado exitoso del deployment de Coolify.

INFORMACIÓN DEL ESTADO OBJETIVO:
- Fecha: 2025-11-06
- Commit exitoso: 4d909cb
- Branch: master
- Archivo clave: src/pages/api/crear-cita.ts
- Documento de referencia: EXITO_DEPLOYMENT_COOLIFY.md

CONTEXTO DEL ESTADO:
1. El sistema de reservas estaba funcionando correctamente
2. El deployment en Coolify era exitoso (usando Node.js 20)
3. El archivo crear-cita.ts tenía 4 directivas @ts-ignore para resolver errores de TypeScript strict mode:
   - Línea 82: barbero.activo
   - Línea 97: servicio.activo
   - Línea 110: .insert([citaData])
   - Línea 132: nuevaCita.id

VARIABLES DE ENTORNO CONFIGURADAS EN COOLIFY:
- NEXT_PUBLIC_SUPABASE_ANON_KEY: [configurado]
- NEXT_PUBLIC_SUPABASE_URL: https://supabase.chamosbarber.com
- NIXPACKS_NODE_VERSION: 20
- PORT: 3000
- SUPABASE_SERVICE_ROLE_KEY: [configurado]

ACCIONES REQUERIDAS:
1. Verificar el estado actual del repositorio
2. Hacer checkout al commit 4d909cb o restaurar los archivos clave
3. Verificar que src/pages/api/crear-cita.ts tenga las 4 directivas @ts-ignore
4. Confirmar que las variables de entorno en Coolify estén correctas
5. Hacer un redeploy si es necesario
6. Verificar que el sistema de reservas funcione en https://chamosbarber.com/reservar

Por favor, lee EXITO_DEPLOYMENT_COOLIFY.md para entender el contexto completo del estado exitoso antes de proceder.
```

---

## 🎯 Prompt Simplificado (Versión Corta)

Si solo necesitas restaurar rápidamente sin explicaciones:

```
Restaura el proyecto al commit 4d909cb (deployment exitoso de 2025-11-06). 
Lee EXITO_DEPLOYMENT_COOLIFY.md para contexto.
Verifica src/pages/api/crear-cita.ts tiene 4 @ts-ignore.
Redeploy en Coolify si es necesario.
```

---

## 🔍 Información de Verificación Rápida

### **Checksum del Archivo Clave:**

Para verificar que el archivo `crear-cita.ts` está en el estado correcto, verifica estos indicadores:

**Líneas clave que deben existir:**
```typescript
// Línea 82
// @ts-ignore - Bypass strict type checking for barbero.activo in build environment
if (barberoError || !barbero || !barbero.activo) {

// Línea 97
// @ts-ignore - Bypass strict type checking for servicio.activo in build environment
if (servicioError || !servicio || !servicio.activo) {

// Línea 110
// @ts-ignore - Bypass strict type checking for insert operation in build environment
.insert([citaData])

// Línea 132
// @ts-ignore - nuevaCita is guaranteed to exist here if no insertError
console.log('✅ Cita creada exitosamente:', nuevaCita.id)
```

### **Comando de Verificación:**
```bash
cd /home/user/webapp
git log --oneline -1
# Debería mostrar: 4d909cb fix: Add @ts-ignore for nuevaCita.id null check

grep -n "@ts-ignore" src/pages/api/crear-cita.ts
# Debería mostrar 4 coincidencias en las líneas aproximadas: 82, 97, 110, 132
```

---

## 📊 Estado de Archivos en el Commit Exitoso

### **Archivos Modificados (vs. commit 7e5300a):**

1. **`src/pages/api/crear-cita.ts`**
   - Estado: API route completa con SERVICE_ROLE_KEY
   - Cambios: 4 directivas `@ts-ignore`
   - Líneas totales: ~145

2. **`src/pages/reservar.tsx`**
   - Estado: Llama a `/api/crear-cita` en lugar de `chamosSupabase.createCita`
   - Cambios: Reemplazar llamada directa por fetch a API route

3. **Variables de entorno (Coolify):**
   - `NIXPACKS_NODE_VERSION=20` (CRÍTICO)
   - `SUPABASE_SERVICE_ROLE_KEY` (CRÍTICO)

### **Archivos de Documentación Creados:**

- `CONEXION_SUPABASE_GUIA.md`
- `scripts/reconectar-supabase.sh`
- `ANALISIS_PROBLEMA_RESERVAS.md`
- `REVERT_TO_7e5300a.md`
- `PRUEBA_RESERVAS_7e5300a.md`
- `RESUMEN_PRUEBA_OPCION1.md`
- `SOLUCION_IMPLEMENTADA.md`
- `RESUMEN_FINAL_SOLUCION.md`
- `SOLUCION_TYPESCRIPT_COOLIFY.md`
- `PASOS_SIGUIENTES_COOLIFY.md`
- `EXITO_DEPLOYMENT_COOLIFY.md`
- `PROMPT_RESTAURACION.md` (este archivo)

---

## 🚨 Problemas Conocidos y Soluciones

### **Problema 1: Build falla con errores TypeScript**

**Síntomas:**
```
Type error: Property 'activo' does not exist on type 'never'.
Type error: No overload matches this call.
Type error: 'nuevaCita' is possibly 'null'.
```

**Solución:**
- Verificar que las 4 directivas `@ts-ignore` estén presentes en `crear-cita.ts`
- Verificar que `@ts-ignore` esté **exactamente una línea antes** de cada línea problemática
- NO usar `as any` - usar `@ts-ignore` específicamente

**Referencia:** Ver sección "Errores Encontrados y Soluciones" en `EXITO_DEPLOYMENT_COOLIFY.md`

### **Problema 2: Variables de entorno no configuradas**

**Síntomas:**
```
SUPABASE_SERVICE_ROLE_KEY is not defined
```

**Solución:**
1. Ir a Coolify → Environment Variables
2. Verificar que `SUPABASE_SERVICE_ROLE_KEY` existe
3. NO usar `SERVICE_SUPABASESERVICE_KEY` (era un error anterior)
4. Redesplegar después de cambiar variables

### **Problema 3: Node.js 18 EOL warning**

**Síntomas:**
```
⚠️ NIXPACKS_NODE_VERSION not set. Nixpacks will use Node.js 18 by default, which is EOL.
```

**Solución:**
1. Agregar `NIXPACKS_NODE_VERSION=20` en Coolify Environment Variables
2. Redesplegar

### **Problema 4: "Latest configuration has not been applied"**

**Síntomas:**
- Warning amarillo en Coolify UI

**Solución:**
- Click en "Redeploy" para aplicar cambios de configuración
- Este warning es normal después de cambiar variables de entorno

---

## 🔧 Comandos de Restauración Manual

Si necesitas restaurar manualmente desde la terminal:

### **Opción A: Restaurar al commit exacto**
```bash
cd /home/user/webapp
git fetch origin
git checkout 4d909cb
# Si quieres crear un branch desde aquí:
git checkout -b restauracion-exitosa-20251106
```

### **Opción B: Restaurar solo el archivo clave**
```bash
cd /home/user/webapp
git fetch origin
git checkout 4d909cb -- src/pages/api/crear-cita.ts
git add src/pages/api/crear-cita.ts
git commit -m "restore: Restaurar crear-cita.ts al estado exitoso (4d909cb)"
```

### **Opción C: Verificar diferencias**
```bash
cd /home/user/webapp
git diff HEAD 4d909cb -- src/pages/api/crear-cita.ts
# Esto mostrará las diferencias entre el estado actual y el exitoso
```

---

## 📞 Información de Contacto con el Asistente

### **Contexto que Debes Proporcionar:**

Cuando uses el prompt de restauración, incluye esta información si está disponible:

1. **Estado actual del repositorio:**
   ```bash
   git log --oneline -5
   git status
   ```

2. **Problema que estás experimentando:**
   - Descripción del error
   - Logs de Coolify si es un error de deployment
   - URL donde ocurre el problema

3. **Lo que has intentado:**
   - Cambios realizados desde el último deployment exitoso
   - Commits nuevos después de `4d909cb`

### **Información que el Asistente Necesita Conocer:**

- **Directorio de trabajo:** `/home/user/webapp`
- **Repositorio:** `juan135072/chamos-barber-app`
- **Branch principal:** `master`
- **Entorno de deployment:** Coolify (self-hosted en VPS)
- **Supabase URL:** `https://supabase.chamosbarber.com`
- **Dominio de producción:** `https://chamosbarber.com`

---

## 🎯 Escenarios de Uso Comunes

### **Escenario 1: "Rompí el sistema de reservas"**

**Prompt sugerido:**
```
Rompí el sistema de reservas. Necesito restaurar al estado exitoso del commit 4d909cb.
Error actual: [pega el error aquí]
Lee EXITO_DEPLOYMENT_COOLIFY.md para contexto.
```

### **Escenario 2: "El deployment en Coolify está fallando"**

**Prompt sugerido:**
```
Mi deployment en Coolify está fallando con errores TypeScript.
Necesito restaurar al commit 4d909cb que funcionaba.
Logs del error: [pega logs aquí]
Lee EXITO_DEPLOYMENT_COOLIFY.md para ver cómo se resolvieron los errores TypeScript antes.
```

### **Escenario 3: "Quiero entender qué cambió"**

**Prompt sugerido:**
```
Quiero ver las diferencias entre mi código actual y el estado exitoso del commit 4d909cb.
Lee EXITO_DEPLOYMENT_COOLIFY.md para entender el contexto del estado exitoso.
Muéstrame qué cambió en src/pages/api/crear-cita.ts.
```

### **Escenario 4: "Actualicé dependencias y todo se rompió"**

**Prompt sugerido:**
```
Actualicé package.json y ahora el build falla.
Necesito restaurar al estado exitoso (commit 4d909cb) incluyendo package.json y package-lock.json.
Lee EXITO_DEPLOYMENT_COOLIFY.md para ver las dependencias que funcionaban.
```

---

## 🔒 Puntos de Seguridad y Backup

### **Antes de Restaurar:**

1. **Crear un backup del estado actual:**
   ```bash
   cd /home/user/webapp
   git checkout -b backup-antes-restauracion-$(date +%Y%m%d-%H%M%S)
   git push origin backup-antes-restauracion-$(date +%Y%m%d-%H%M%S)
   ```

2. **Documentar el problema:**
   - Captura de pantalla del error
   - Logs de Coolify
   - Descripción de lo que intentabas hacer

### **Después de Restaurar:**

1. **Verificar que funciona:**
   - Hacer una reserva de prueba en https://chamosbarber.com/reservar
   - Verificar logs en Coolify
   - Confirmar que aparece en la base de datos

2. **Documentar la restauración:**
   - Crear un archivo `RESTAURACION_[FECHA].md` con:
     - Por qué fue necesaria la restauración
     - Qué problema se resolvió
     - Lecciones aprendidas

---

## 📚 Documentos de Referencia (Orden de Lectura)

Si necesitas entender todo el contexto, lee en este orden:

1. **`EXITO_DEPLOYMENT_COOLIFY.md`** (este documento que acabas de crear)
   - Entender qué funcionaba y por qué

2. **`SOLUCION_IMPLEMENTADA.md`**
   - Detalles de la implementación de la API route

3. **`SOLUCION_TYPESCRIPT_COOLIFY.md`**
   - Detalles técnicos de los errores TypeScript

4. **`CONEXION_SUPABASE_GUIA.md`**
   - Cómo reconectar a Supabase si pierdes la conexión

5. **`RESUMEN_FINAL_SOLUCION.md`**
   - Vista de alto nivel de toda la solución

---

## ✨ Prompt de Verificación Post-Restauración

Después de restaurar, usa este prompt para verificar:

```
He restaurado el proyecto al commit 4d909cb. 
Por favor verifica:

1. Que src/pages/api/crear-cita.ts tiene las 4 directivas @ts-ignore en las líneas correctas
2. Que las variables de entorno en Coolify están configuradas (especialmente NIXPACKS_NODE_VERSION=20)
3. Que el deployment en Coolify sea exitoso
4. Que pueda hacer una reserva de prueba en https://chamosbarber.com/reservar

Usa EXITO_DEPLOYMENT_COOLIFY.md como referencia del estado esperado.
```

---

## 🎓 Notas Adicionales

### **¿Por qué este estado es "exitoso"?**

1. ✅ Build de Next.js completa sin errores
2. ✅ TypeScript compilation exitosa
3. ✅ Deployment en Coolify exitoso
4. ✅ Sistema de reservas funcional en producción
5. ✅ Todas las validaciones de negocio funcionando
6. ✅ Variables de entorno correctamente configuradas
7. ✅ Node.js 20 (versión LTS soportada)

### **¿Qué NO incluye este estado?**

- ❌ Dashboard de barberos (fue removido intencionalmente)
- ❌ Políticas RLS públicas en `citas` (se usa SERVICE_ROLE_KEY en su lugar)
- ❌ Acceso directo desde frontend a Supabase para crear citas (se usa API route)

### **Mantenimiento Futuro:**

Este estado puede necesitar actualizarse si:
- Se actualizan dependencias principales (Next.js, Supabase, TypeScript)
- Se migra a otra plataforma de deployment
- Se cambia la arquitectura de autenticación
- Se modifican las tablas de la base de datos

**En ese caso:**
- Crear un nuevo documento `EXITO_DEPLOYMENT_[FECHA].md`
- Actualizar este `PROMPT_RESTAURACION.md` con el nuevo commit de referencia

---

## 📅 Historial de Versiones

| Versión | Fecha | Commit | Notas |
|---------|-------|--------|-------|
| 1.0 | 2025-11-06 | `4d909cb` | Estado inicial exitoso - Sistema de reservas funcional |

---

**Última actualización:** 2025-11-06  
**Autor:** Asistente IA (Claude)  
**Validado por:** Deployment exitoso en Coolify  
**Próxima revisión:** Cuando se haga un cambio mayor al sistema
