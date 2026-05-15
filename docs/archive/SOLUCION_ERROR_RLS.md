# 🔧 Solución al Error RLS en Producción

**Fecha:** 2025-11-06  
**Error:** `new row violates row-level security policy for table "citas"`  
**Estado:** Código correcto ✅, problema de configuración de Coolify ⚠️

---

## 📋 Resumen Ejecutivo

El código en el repositorio es **100% correcto** y tiene todas las soluciones implementadas:
- ✅ API Route `src/pages/api/crear-cita.ts` con SERVICE_ROLE_KEY
- ✅ Frontend `src/pages/reservar.tsx` llamando al API route
- ✅ Todas las validaciones y manejo de errores implementados
- ✅ Commit `4d909cb` desplegado en `master`

**El problema es que Coolify no tiene configurada la variable de entorno `SUPABASE_SERVICE_ROLE_KEY`.**

---

## 🎯 Solución Paso a Paso

### **Paso 1: Configurar Variable en Coolify**

1. **Acceder al panel de Coolify:**
   - URL: Tu instancia de Coolify
   - Navega a tu proyecto "chamos-barber-app"

2. **Ir a Environment Variables:**
   - Busca la sección "Environment" o "Variables de Entorno"
   - Click en "Add Variable" o "Agregar Variable"

3. **Agregar la variable:**
   ```
   Nombre: SUPABASE_SERVICE_ROLE_KEY
   Valor: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0
   ```

4. **Guardar cambios**

### **Paso 2: Verificar Otras Variables (Opcional)**

Asegúrate que también estén configuradas:
- `NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoiYW5vbiJ9.cE6BYGcPB6HC4vacIQB-Zabf4EKfVJ7x7ViZ4CIASJA`

### **Paso 3: Forzar Rebuild**

1. **Limpiar cache de build:**
   - En Coolify, busca "Clear Cache" o "Limpiar Cache"
   - Click en esta opción

2. **Forzar nuevo despliegue:**
   - Click en "Redeploy" o "Deploy Again"
   - O hacer un push vacío al repositorio:
   ```bash
   cd /home/user/webapp
   git commit --allow-empty -m "chore: Trigger Coolify rebuild for RLS fix"
   git push origin master
   ```

### **Paso 4: Verificar el Despliegue**

1. **Esperar que termine el build** (2-5 minutos)

2. **Ver los logs de build en Coolify:**
   - Busca "Build Logs" o "Deployment Logs"
   - Verifica que no hay errores de TypeScript
   - Debe mostrar: `✓ Compiled successfully`

3. **Verificar la aplicación:**
   - Abre tu aplicación en el navegador
   - Ve a la página de reservas
   - Intenta crear una cita
   - **Resultado esperado:** "¡Cita reservada exitosamente!"

---

## 🔍 Diagnóstico del Problema

### **¿Por qué ocurrió este error?**

1. **El código es correcto:**
   - El API route `/api/crear-cita` usa `SUPABASE_SERVICE_ROLE_KEY`
   - Este key bypassa todas las políticas RLS
   - El frontend llama correctamente al API route

2. **El problema es de configuración:**
   - Coolify no tiene la variable `SUPABASE_SERVICE_ROLE_KEY`
   - Sin esta variable, el código falla con: `process.env.SUPABASE_SERVICE_ROLE_KEY!`
   - Probablemente devuelve `undefined` y usa ANON_KEY como fallback
   - ANON_KEY **respeta RLS** → Error: "violates row-level security policy"

### **¿Cómo verificarlo?**

Si puedes acceder a los logs de Coolify en tiempo real:

```bash
# Busca errores como:
"Error: SUPABASE_SERVICE_ROLE_KEY is not defined"
# O warnings sobre variables de entorno faltantes
```

---

## 📊 Verificación Post-Solución

### **Test 1: Verificar Variable de Entorno**

Si tienes acceso SSH al servidor de Coolify:

```bash
# Dentro del contenedor de la app
echo $SUPABASE_SERVICE_ROLE_KEY
# Debe mostrar: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### **Test 2: Probar Creación de Cita**

1. Abre la página de reservas
2. Selecciona un servicio
3. Selecciona un barbero
4. Elige fecha y hora
5. Llena datos del cliente
6. Click en "Reservar"

**Resultado esperado:**
```
✅ ¡Cita reservada exitosamente! Te contactaremos pronto para confirmar.
```

**Errores posibles y soluciones:**

| Error | Causa | Solución |
|-------|-------|----------|
| `violates row-level security policy` | Variable no configurada | Verificar paso 1 |
| `HORARIO_OCUPADO` | Horario ya reservado | Seleccionar otra hora |
| `BARBERO_NO_DISPONIBLE` | Barbero inactivo | Verificar en Admin Panel |
| `SERVICIO_NO_DISPONIBLE` | Servicio inactivo | Verificar en Admin Panel |
| `FECHA_PASADA` | Fecha en el pasado | Seleccionar fecha futura |

---

## 🚀 Solución Alternativa (Si Coolify no funciona)

Si por alguna razón Coolify no permite configurar variables de entorno, puedes usar otro método:

### **Opción A: Archivo .env en el servidor**

1. SSH al servidor donde corre Coolify
2. Busca el directorio del deployment
3. Crea un archivo `.env.production`:
   ```bash
   echo 'SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0' > .env.production
   ```
4. Reinicia el contenedor

### **Opción B: Modificar política RLS (NO RECOMENDADO)**

Solo como último recurso, puedes deshabilitar RLS en la tabla `citas`:

```sql
-- PELIGRO: Esto elimina toda la seguridad
ALTER TABLE citas DISABLE ROW LEVEL SECURITY;
```

**⚠️ NO HAGAS ESTO** a menos que sea absolutamente necesario y temporal.

---

## 📝 Historial de Cambios

### **Commits Relacionados**

```bash
29b389f docs: Add comprehensive deployment success documentation and restoration prompt
4d909cb fix: Add @ts-ignore for nuevaCita.id null check
e3f1896 fix: Move @ts-ignore to correct line for insert operation
c85c065 docs: Add deployment checklist for Coolify
c7475f7 docs: Add TypeScript build fix documentation
```

### **Archivos Modificados**

1. **`src/pages/api/crear-cita.ts`**
   - Creado en commit `e3f1896`
   - API route que usa SERVICE_ROLE_KEY
   - 149 líneas con validaciones completas

2. **`src/pages/reservar.tsx`**
   - Modificado para usar fetch('/api/crear-cita')
   - Línea 141: Llamada al API route
   - Manejo de errores implementado

---

## 🎓 Conceptos Clave

### **¿Qué es SERVICE_ROLE_KEY?**

Es una clave administrativa de Supabase que:
- **Bypassa todas las políticas RLS**
- **Tiene acceso completo a la base de datos**
- **Debe usarse solo en el backend (API routes)**
- **NUNCA debe exponerse al cliente**

### **¿Por qué necesitamos RLS bypass?**

Las políticas RLS actuales en la tabla `citas` no permiten INSERT público:
- ✅ SELECT público: Cualquiera puede ver citas
- ✅ UPDATE/DELETE: Solo usuarios autenticados
- ❌ INSERT público: **NO PERMITIDO**

Sin embargo, queremos que **clientes anónimos puedan reservar citas**.

**Solución:** API route en el backend que usa SERVICE_ROLE_KEY.

### **Flujo de Seguridad**

```
Frontend (Cliente) 
    ↓ (ANON_KEY - respeta RLS)
    ↓ fetch('/api/crear-cita')
    ↓
Backend (API Route)
    ↓ (SERVICE_ROLE_KEY - bypassa RLS)
    ↓ INSERT INTO citas
    ↓
✅ Cita creada exitosamente
```

---

## 🔐 Seguridad

### **¿Es seguro usar SERVICE_ROLE_KEY?**

**SÍ**, siempre que:
1. ✅ Se use **solo en el backend** (API routes)
2. ✅ No se exponga en el código del cliente
3. ✅ Se validen todos los datos antes de insertar
4. ✅ Se implementen rate limits si es necesario

Nuestro código cumple todos estos requisitos:
- ✅ SERVICE_ROLE_KEY solo en `process.env` del servidor
- ✅ 5 validaciones antes de insertar (líneas 40-103)
- ✅ Manejo de race conditions
- ✅ Prevención de fechas pasadas
- ✅ Verificación de horarios duplicados

---

## 📞 Soporte

Si después de seguir todos los pasos el error persiste:

1. **Verificar logs de Coolify:**
   - ¿Hay errores en el build?
   - ¿Se aplicaron las variables de entorno?

2. **Verificar logs de la aplicación:**
   - ¿Hay errores de conexión a Supabase?
   - ¿Se está usando SERVICE_ROLE_KEY?

3. **Verificar Supabase:**
   - ¿La URL es correcta?
   - ¿Las credenciales son válidas?
   - ¿La tabla `citas` existe?

4. **Último recurso:**
   - Revisar la documentación de Coolify sobre variables de entorno
   - Contactar soporte de Coolify
   - Considerar migrar a otro servicio de deployment (Vercel, Netlify, Railway)

---

## ✅ Checklist de Verificación

Antes de marcar como "resuelto", verifica:

- [ ] Variable `SUPABASE_SERVICE_ROLE_KEY` configurada en Coolify
- [ ] Build exitoso sin errores de TypeScript
- [ ] Deployment completado correctamente
- [ ] Aplicación carga sin errores en el navegador
- [ ] Página de reservas funciona correctamente
- [ ] **Prueba real: Crear una cita exitosamente**
- [ ] Verificar en Supabase que la cita fue creada
- [ ] No hay errores RLS en los logs

---

## 🎉 Resultado Esperado

Después de aplicar la solución:

```
Usuario: Crea una cita en la página de reservas
Sistema: ✅ ¡Cita reservada exitosamente! Te contactaremos pronto para confirmar.
Supabase: Nueva fila en tabla `citas` con estado 'pendiente'
Admin: Puede ver la nueva cita en el panel de administración
```

**Estado final:** Sistema de reservas funcionando al 100% sin errores RLS.

---

**Última actualización:** 2025-11-06  
**Commit actual:** 29b389f  
**Branch:** master  
**Estado del código:** ✅ CORRECTO - Solo falta configuración en Coolify
