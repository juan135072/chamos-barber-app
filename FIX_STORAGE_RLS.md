# 🔒 SOLUCIÓN: Error "new row violates row-level security policy" en Storage

## 🔴 Problema Actual

Al intentar subir una imagen de servicio, se produce el siguiente error:

```
❌ [uploadServicioFoto] Error subiendo: StorageApiError: new row violates row-level security policy
```

**Causa**: El bucket `servicios-fotos` existe, pero **NO tiene políticas RLS configuradas** que permitan a los usuarios autenticados subir archivos.

---

## ✅ Solución

Necesitas ejecutar el script SQL que crea las políticas de acceso para los buckets de Storage.

### Opción 1: Dashboard de Supabase (RECOMENDADO)

1. **Accede al Dashboard de Supabase**:
   - URL: `https://supabase.chamosbarber.com`
   - Ve a **SQL Editor**

2. **Copia y ejecuta el siguiente SQL**:

```sql
-- ================================================================
-- POLÍTICAS DE STORAGE PARA servicios-fotos
-- ================================================================

-- 1. Permitir lectura pública (cualquiera puede ver las fotos)
DROP POLICY IF EXISTS "Public read access for servicios-fotos" ON storage.objects;
CREATE POLICY "Public read access for servicios-fotos"
ON storage.objects FOR SELECT
USING (bucket_id = 'servicios-fotos');

-- 2. Permitir subida solo a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can upload servicios-fotos" ON storage.objects;
CREATE POLICY "Authenticated users can upload servicios-fotos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'servicios-fotos'
  AND auth.role() = 'authenticated'
);

-- 3. Permitir actualización solo a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can update servicios-fotos" ON storage.objects;
CREATE POLICY "Authenticated users can update servicios-fotos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'servicios-fotos'
  AND auth.role() = 'authenticated'
);

-- 4. Permitir eliminación solo a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can delete servicios-fotos" ON storage.objects;
CREATE POLICY "Authenticated users can delete servicios-fotos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'servicios-fotos'
  AND auth.role() = 'authenticated'
);

-- ================================================================
-- POLÍTICAS DE STORAGE PARA barberos-fotos (por si acaso)
-- ================================================================

-- 1. Permitir lectura pública
DROP POLICY IF EXISTS "Public read access for barberos-fotos" ON storage.objects;
CREATE POLICY "Public read access for barberos-fotos"
ON storage.objects FOR SELECT
USING (bucket_id = 'barberos-fotos');

-- 2. Permitir subida solo a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can upload barberos-fotos" ON storage.objects;
CREATE POLICY "Authenticated users can upload barberos-fotos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'barberos-fotos'
  AND auth.role() = 'authenticated'
);

-- 3. Permitir actualización solo a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can update barberos-fotos" ON storage.objects;
CREATE POLICY "Authenticated users can update barberos-fotos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'barberos-fotos'
  AND auth.role() = 'authenticated'
);

-- 4. Permitir eliminación solo a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can delete barberos-fotos" ON storage.objects;
CREATE POLICY "Authenticated users can delete barberos-fotos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'barberos-fotos'
  AND auth.role() = 'authenticated'
);

-- ================================================================
-- VERIFICACIÓN
-- ================================================================

SELECT 
  policyname,
  cmd,
  CASE 
    WHEN policyname LIKE '%servicios-fotos%' THEN 'servicios-fotos'
    WHEN policyname LIKE '%barberos-fotos%' THEN 'barberos-fotos'
    ELSE 'otro'
  END as bucket
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (
    policyname LIKE '%servicios-fotos%'
    OR policyname LIKE '%barberos-fotos%'
  )
ORDER BY bucket, cmd;
```

3. **Resultado esperado**:

Deberías ver una tabla con 8 políticas creadas:

| policyname | cmd | bucket |
|------------|-----|--------|
| Authenticated users can delete servicios-fotos | DELETE | servicios-fotos |
| Authenticated users can upload servicios-fotos | INSERT | servicios-fotos |
| Public read access for servicios-fotos | SELECT | servicios-fotos |
| Authenticated users can update servicios-fotos | UPDATE | servicios-fotos |
| Authenticated users can delete barberos-fotos | DELETE | barberos-fotos |
| Authenticated users can upload barberos-fotos | INSERT | barberos-fotos |
| Public read access for barberos-fotos | SELECT | barberos-fotos |
| Authenticated users can update barberos-fotos | UPDATE | barberos-fotos |

---

### Opción 2: Interfaz de Supabase Storage (Manual)

Si prefieres usar la interfaz gráfica:

1. Ve a **Storage** en el Dashboard
2. Selecciona el bucket `servicios-fotos`
3. Ve a la pestaña **Policies**
4. Crea las siguientes 4 políticas:

#### Política 1: Lectura pública
- **Name**: `Public read access for servicios-fotos`
- **Policy command**: `SELECT`
- **Target roles**: `public` (o deja vacío)
- **USING expression**:
  ```sql
  bucket_id = 'servicios-fotos'
  ```

#### Política 2: Subir archivos (autenticados)
- **Name**: `Authenticated users can upload servicios-fotos`
- **Policy command**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
  ```sql
  bucket_id = 'servicios-fotos' AND auth.role() = 'authenticated'
  ```

#### Política 3: Actualizar archivos (autenticados)
- **Name**: `Authenticated users can update servicios-fotos`
- **Policy command**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**:
  ```sql
  bucket_id = 'servicios-fotos' AND auth.role() = 'authenticated'
  ```

#### Política 4: Eliminar archivos (autenticados)
- **Name**: `Authenticated users can delete servicios-fotos`
- **Policy command**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
  ```sql
  bucket_id = 'servicios-fotos' AND auth.role() = 'authenticated'
  ```

---

## 🧪 Verificación

Después de ejecutar el SQL:

### 1. Verificar políticas en Supabase

```sql
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%servicios-fotos%'
ORDER BY cmd;
```

Deberías ver 4 políticas: DELETE, INSERT, SELECT, UPDATE

### 2. Probar subida de imagen

1. Ve a `https://chamosbarber.com/admin`
2. Panel Admin → **Servicios**
3. Click en **"+ Nuevo Servicio"**
4. Completa el formulario
5. Selecciona una imagen (JPG, PNG, WEBP, GIF - máximo 5MB)
6. Click en **"Guardar"**

### 3. Logs esperados en consola

**✅ ANTES (error)**:
```
📤 [uploadServicioFoto] Subiendo archivo: e2533db1-d93d-48a9-8293-f66071b70eb2-1765926551482.jpg
❌ [uploadServicioFoto] Error subiendo: StorageApiError: new row violates row-level security policy
```

**✅ DESPUÉS (éxito)**:
```
📤 [uploadServicioFoto] Subiendo archivo: e2533db1-d93d-48a9-8293-f66071b70eb2-1765926551482.jpg
✅ [uploadServicioFoto] Archivo subido: e2533db1-d93d-48a9-8293-f66071b70eb2-1765926551482.jpg
🔗 [uploadServicioFoto] URL pública: https://api.chamosbarber.com/storage/v1/object/public/servicios-fotos/e2533db1-d93d-48a9-8293-f66071b70eb2-1765926551482.jpg
```

---

## 🔍 Entendiendo el Problema

### ¿Qué son las políticas RLS en Storage?

**Row Level Security (RLS)** en Supabase Storage controla:
- **Quién** puede ver archivos (SELECT)
- **Quién** puede subir archivos (INSERT)
- **Quién** puede modificar archivos (UPDATE)
- **Quién** puede eliminar archivos (DELETE)

### ¿Por qué faltan las políticas?

Cuando creaste el bucket `servicios-fotos` con el script `create-storage-buckets.js`, el bucket se creó **SIN políticas RLS**. Por defecto, Supabase bloquea todas las operaciones hasta que explícitamente las permitas.

### ¿Por qué `barberos-fotos` funciona?

Probablemente este bucket se creó manualmente antes y las políticas se configuraron en ese momento.

---

## 📋 Checklist Post-Configuración

Después de ejecutar el SQL, verifica:

- [ ] 8 políticas creadas en total (4 por bucket)
- [ ] Política SELECT existe para lectura pública
- [ ] Política INSERT existe para usuarios autenticados
- [ ] Política UPDATE existe para usuarios autenticados
- [ ] Política DELETE existe para usuarios autenticados
- [ ] Subida de imagen de servicio funciona sin errores
- [ ] URL pública de imagen accesible desde navegador
- [ ] No hay errores en consola del navegador

---

## 🎯 Referencias

- **Script SQL completo**: `scripts/SQL/create-storage-policies.sql`
- **Documentación Storage**: `STORAGE_SETUP.md`
- **Supabase Storage Docs**: https://supabase.com/docs/guides/storage/security/access-control
- **Código fuente**: `lib/supabase-helpers.ts` líneas 600-678

---

## 🚨 Troubleshooting

### Error: "new row violates row-level security policy"

**Causa**: No hay políticas RLS o están mal configuradas

**Solución**: Ejecuta el SQL de este documento

### Error: "Bucket not found"

**Causa**: El bucket no existe

**Solución**: Ejecuta `node scripts/create-storage-buckets.js`

### Error: "invalid JWT"

**Causa**: Usuario no autenticado o sesión expirada

**Solución**: 
1. Cierra sesión y vuelve a entrar
2. Verifica que `auth.role() = 'authenticated'` en la sesión

---

## ✅ ¡Listo!

Una vez ejecutado el SQL, la subida de imágenes funcionará correctamente. 🎉

**Próximo paso**: Ejecuta el SQL en el Dashboard de Supabase y prueba subir una imagen nuevamente.
