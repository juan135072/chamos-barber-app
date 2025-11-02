# 🚨 ERROR CRÍTICO: Reservas No Funcionan (Error 42501)

## 📋 Resumen del Problema

**Error Reportado**: 
```
Error al reservar la cita. Por favor, inténtalo de nuevo.
```

**Error Real en Base de Datos**:
```
Error 42501: new row violates row-level security policy for table "citas"
```

## 🔍 Diagnóstico Realizado

### 1. Test de Inserción Directo (curl)
Se realizó un test directo a la API de Supabase:
```bash
curl -X POST "https://api.supabase.com/rest/v1/citas"
  -H "apikey: ANON_KEY"
  -d '{ ... datos de la cita ... }'
```

**Resultado**: ❌ Error 42501 - Política RLS bloquea INSERT para usuarios anónimos

### 2. Verificación de Políticas RLS
- ✅ RLS está habilitado en la tabla `citas`
- ❌ **FALTA política que permita INSERT para rol `anon`**
- ✅ Las políticas para `authenticated` y `service_role` existen

## 🎯 Causa Raíz

La política RLS necesaria para permitir que usuarios **sin login** (anónimos) creen citas NO está activa en la base de datos.

El script `scripts/SQL/fix-citas-rls.sql` existe en el código, pero **nunca se ejecutó en Supabase Studio**.

## ✅ Solución INMEDIATA

### Paso 1: Acceder a Supabase Studio
1. Ir a: **https://supabase.chamosbarber.com/**
2. Login con credenciales de administrador

### Paso 2: Ejecutar Script SQL
1. En el menú lateral izquierdo, click en **"SQL Editor"**
2. Click en **"New query"** (botón superior derecho)
3. Copiar **TODO** el contenido del archivo:
   ```
   scripts/SQL/URGENT-fix-anon-insert-rls.sql
   ```
4. Pegar en el editor SQL
5. Click en **"RUN"** (botón verde, esquina inferior derecha)

### Paso 3: Verificar Éxito
Después de ejecutar, deberías ver:
```
✅ POLÍTICAS CREADAS
- anon_insert_citas (INSERT para anon)
- authenticated_insert_citas (INSERT para authenticated)
- authenticated_select_citas (SELECT para authenticated)
- authenticated_update_citas (UPDATE para authenticated)
- authenticated_delete_citas (DELETE para authenticated)
- service_role_all_citas (ALL para service_role)
```

### Paso 4: Probar Reserva
1. Ir a: **https://your-app.com/reservar**
2. Llenar formulario de reserva
3. Hacer click en "Confirmar Reserva"
4. ✅ Debería funcionar sin errores

## 📁 Archivos Relacionados

### Script SQL (URGENTE)
```
scripts/SQL/URGENT-fix-anon-insert-rls.sql
```
Este es el archivo que debes ejecutar YA en Supabase Studio.

### Script Original (Referencia)
```
scripts/SQL/fix-citas-rls.sql
```
Script original que contenía la misma solución pero no fue ejecutado.

### Código con Logging (Debug)
```
lib/supabase-helpers.ts
src/pages/reservar.tsx
```
Se añadió logging exhaustivo para diagnosticar el problema.

## 🔬 Detalles Técnicos

### Políticas RLS Requeridas

#### Para Usuarios ANÓNIMOS (sin login)
```sql
-- Política que faltaba y causaba el error
CREATE POLICY "anon_insert_citas"
ON citas
FOR INSERT
TO anon
WITH CHECK (true);
```

#### Para Usuarios AUTENTICADOS (admin/barberos)
```sql
-- INSERT
CREATE POLICY "authenticated_insert_citas"
ON citas FOR INSERT TO authenticated WITH CHECK (true);

-- SELECT
CREATE POLICY "authenticated_select_citas"
ON citas FOR SELECT TO authenticated USING (true);

-- UPDATE
CREATE POLICY "authenticated_update_citas"
ON citas FOR UPDATE TO authenticated 
USING (true) WITH CHECK (true);

-- DELETE
CREATE POLICY "authenticated_delete_citas"
ON citas FOR DELETE TO authenticated USING (true);
```

#### Para SERVICE ROLE (sistema)
```sql
CREATE POLICY "service_role_all_citas"
ON citas FOR ALL TO service_role 
USING (true) WITH CHECK (true);
```

## 🧪 Validación del Fix

### Test Manual en la Web
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Intenta hacer una reserva en `/reservar`
4. Deberías ver logs como:
   ```
   🔄 Iniciando reserva con datos: {...}
   🔍 [createCita] Iniciando validaciones...
   🔍 [createCita] VALIDACIÓN 1: Verificando citas existentes...
   🔍 [createCita] Citas existentes encontradas: 0
   🔍 [createCita] VALIDACIÓN 2: Verificando hora no sea pasada...
   🔍 [createCita] VALIDACIÓN 3: Intentando insertar cita en BD...
   ✅ [createCita] Cita creada exitosamente: {...}
   ✅ Cita creada exitosamente: {...}
   ```

### Test con curl (Opcional)
```bash
curl -X POST "https://api.supabase.com/rest/v1/citas" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "servicio_id": "UUID_SERVICIO",
    "barbero_id": "UUID_BARBERO",
    "fecha": "2025-11-05",
    "hora": "10:00",
    "cliente_nombre": "Test Cliente",
    "cliente_telefono": "+58 424 123 4567",
    "estado": "pendiente"
  }'
```

**Resultado esperado**: ✅ Objeto JSON con la cita creada

## 📚 Referencias

### Documentación Relacionada
- `docs/changelog/EXITO_SISTEMA_HORARIOS_COMPLETO_2025-11-02.md` - Sistema completo implementado
- `docs/fixes/QUICK_FIX_CITAS_RLS.md` - Guía rápida RLS
- `docs/fixes/CITAS_NO_VISIBLES_ADMIN.md` - Problema similar previo

### Commits Relevantes
- `3014f0c` - fix(critical): script SQL para resolver error 42501
- `eeb4fe8` - debug: agregar logging exhaustivo
- `7e385fc` - docs: documentar éxito completo del sistema

## ⏱️ Tiempo Estimado

- **Ejecución del script**: 30 segundos
- **Verificación**: 1 minuto
- **Test completo**: 2-3 minutos

**Total**: ~5 minutos

## ❓ Preguntas Frecuentes

### ¿Por qué no se ejecutó el script automáticamente?
Los scripts SQL de Supabase **deben ejecutarse manualmente** en Supabase Studio por razones de seguridad. No se pueden ejecutar desde el código de la aplicación.

### ¿Puedo ejecutar el script varias veces?
Sí, el script incluye `DROP POLICY IF EXISTS` que limpia políticas antiguas antes de crear las nuevas.

### ¿Qué pasa si no ejecuto el script?
Las reservas desde `/reservar` seguirán fallando con el error 42501.

### ¿Este fix afecta la seguridad?
No. Las políticas RLS mantienen la seguridad:
- Usuarios anónimos: Solo pueden **crear** citas (no leerlas)
- Usuarios autenticados: Pueden **leer, crear, actualizar, eliminar** citas
- Service role: Acceso completo para operaciones del sistema

## 🎯 Checklist de Verificación

Después de ejecutar el script, verifica:

- [ ] El script se ejecutó sin errores en Supabase Studio
- [ ] Aparecen 6 políticas en el resultado del script
- [ ] La política `anon_insert_citas` está presente
- [ ] Puedes crear una reserva desde `/reservar` sin errores
- [ ] La reserva aparece en el panel de administración
- [ ] Los logs de consola muestran "✅ Cita creada exitosamente"

## 📞 Soporte

Si después de ejecutar el script sigues teniendo problemas:

1. Copia los logs de la consola del navegador (F12 → Console)
2. Copia el resultado de ejecutar el script SQL
3. Reporta el problema con ambos logs

---

**Fecha de creación**: 2025-11-02  
**Prioridad**: 🔴 CRÍTICA  
**Estado**: ⚠️ PENDIENTE DE EJECUCIÓN  
**Archivo SQL**: `scripts/SQL/URGENT-fix-anon-insert-rls.sql`
