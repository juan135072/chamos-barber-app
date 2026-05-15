# 🔧 GUÍA: Configuración de Supabase Storage para Fotos de Barberos

**Fecha:** 2025-11-06  
**Para:** Deploy en producción (Coolify)  
**Estado:** ⚠️ REQUERIDO para que funcione el upload de fotos

---

## 🎯 PROBLEMA

El deploy falló porque falta la configuración del **Storage Bucket** en Supabase para almacenar las fotos de barberos.

**Error típico:**
```
Error: Bucket 'barberos-fotos' not found
Error: Permission denied for bucket 'barberos-fotos'
```

---

## ✅ SOLUCIÓN RÁPIDA (5 MINUTOS)

### **Opción 1: Ejecutar Script SQL (RECOMENDADO)**

1. **Abre Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/[TU_PROJECT_ID]
   ```

2. **Ve a SQL Editor:**
   - Click en **"SQL Editor"** en el menú lateral
   - O directo: https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql

3. **Crea nueva consulta:**
   - Click en **"New query"**

4. **Copia y pega este script completo:**
   - Archivo: `supabase/setup-storage-barberos-fotos.sql`
   - O copia el contenido de abajo 👇

5. **Ejecuta:**
   - Click en **"Run"** o presiona `Ctrl + Enter`

6. **Verifica resultado:**
   ```sql
   -- Deberías ver:
   -- ✅ 1 bucket creado
   -- ✅ 4 políticas creadas
   ```

---

## 📋 SCRIPT SQL COMPLETO

```sql
-- CREAR BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'barberos-fotos',
  'barberos-fotos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- POLÍTICAS RLS
CREATE POLICY "allow_public_read_barberos_fotos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'barberos-fotos');

CREATE POLICY "allow_authenticated_insert_barberos_fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'barberos-fotos');

CREATE POLICY "allow_authenticated_update_barberos_fotos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'barberos-fotos')
WITH CHECK (bucket_id = 'barberos-fotos');

CREATE POLICY "allow_authenticated_delete_barberos_fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'barberos-fotos');

-- VERIFICAR
SELECT id, name, public FROM storage.buckets WHERE id = 'barberos-fotos';
```

---

## 🖱️ OPCIÓN 2: Configuración Manual (UI)

### **Paso 1: Crear Bucket**

1. Ve a **Storage** en el menú lateral
2. Click en **"New Bucket"**
3. Configura:
   - **Name:** `barberos-fotos`
   - **Public bucket:** ✅ **SÍ** (IMPORTANTE)
   - **File size limit:** `5 MB`
   - **Allowed MIME types:** 
     ```
     image/jpeg
     image/jpg
     image/png
     image/webp
     image/gif
     ```
4. Click **"Create bucket"**

### **Paso 2: Configurar Políticas**

1. En el bucket `barberos-fotos`, ve a **"Policies"**
2. Click **"New Policy"**
3. Crea 4 políticas:

#### **Política 1: Lectura Pública**
```
Policy name: allow_public_read_barberos_fotos
Target roles: public
Policy command: SELECT
Definition: (bucket_id = 'barberos-fotos')
```

#### **Política 2: Subida Autenticada**
```
Policy name: allow_authenticated_insert_barberos_fotos
Target roles: authenticated
Policy command: INSERT
Check expression: (bucket_id = 'barberos-fotos')
```

#### **Política 3: Actualización Autenticada**
```
Policy name: allow_authenticated_update_barberos_fotos
Target roles: authenticated
Policy command: UPDATE
Using expression: (bucket_id = 'barberos-fotos')
Check expression: (bucket_id = 'barberos-fotos')
```

#### **Política 4: Eliminación Autenticada**
```
Policy name: allow_authenticated_delete_barberos_fotos
Target roles: authenticated
Policy command: DELETE
Using expression: (bucket_id = 'barberos-fotos')
```

---

## 🔍 VERIFICACIÓN

### **1. Verificar Bucket Creado**

```sql
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'barberos-fotos';
```

**Resultado esperado:**
```
id              | barberos-fotos
name            | barberos-fotos
public          | true           ✅ DEBE SER TRUE
file_size_limit | 5242880       (5MB)
allowed_mime_types | {image/jpeg,image/jpg,image/png,image/webp,image/gif}
```

### **2. Verificar Políticas**

```sql
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%barberos_fotos%';
```

**Resultado esperado:**
```
4 políticas encontradas:
- allow_public_read_barberos_fotos (SELECT, public)
- allow_authenticated_insert_barberos_fotos (INSERT, authenticated)
- allow_authenticated_update_barberos_fotos (UPDATE, authenticated)
- allow_authenticated_delete_barberos_fotos (DELETE, authenticated)
```

### **3. Probar Upload**

1. Ve al panel de administración
2. Edita un barbero
3. Sube una foto
4. Si funciona: ✅ Todo configurado correctamente
5. Si falla: 👇 Ver troubleshooting

---

## 🐛 TROUBLESHOOTING

### **Error: "Bucket 'barberos-fotos' not found"**

**Causa:** El bucket no existe en Supabase.

**Solución:**
```sql
-- Verificar si existe
SELECT * FROM storage.buckets WHERE id = 'barberos-fotos';

-- Si no existe, crear:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('barberos-fotos', 'barberos-fotos', true);
```

---

### **Error: "Policy already exists"**

**Causa:** Intentaste crear políticas que ya existen.

**Solución:**
```sql
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "allow_public_read_barberos_fotos" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_insert_barberos_fotos" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_update_barberos_fotos" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_delete_barberos_fotos" ON storage.objects;

-- Luego ejecuta el script de creación nuevamente
```

---

### **Error: "Permission denied"**

**Causa:** Falta configuración de políticas RLS.

**Solución:**
```sql
-- Verificar políticas
SELECT policyname FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%barberos_fotos%';

-- Si no hay 4 políticas, ejecutar el script completo
```

---

### **Las fotos no se ven en el frontend**

**Causa 1:** Bucket no es público.

**Solución:**
```sql
-- Verificar y actualizar
UPDATE storage.buckets 
SET public = true 
WHERE id = 'barberos-fotos';
```

**Causa 2:** Falta política de lectura pública.

**Solución:**
```sql
CREATE POLICY "allow_public_read_barberos_fotos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'barberos-fotos');
```

**Causa 3:** URL incorrecta.

**Solución:**
Verifica que la URL tenga este formato:
```
https://[TU_SUPABASE_URL]/storage/v1/object/public/barberos-fotos/[ARCHIVO]

✅ Correcto:
https://abc.supabase.co/storage/v1/object/public/barberos-fotos/foto.jpg

❌ Incorrecto:
https://abc.supabase.co/storage/barberos-fotos/foto.jpg  (falta /v1/object/public/)
```

---

### **No puedo subir fotos (error 403)**

**Causa:** Usuario no autenticado o faltan políticas.

**Solución:**
```sql
-- Verificar política INSERT
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname = 'allow_authenticated_insert_barberos_fotos';

-- Si no existe, crear:
CREATE POLICY "allow_authenticated_insert_barberos_fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'barberos-fotos');
```

---

### **Deploy falló después de ejecutar script**

**Causa:** Coolify necesita rebuild.

**Solución:**
1. Ve a Coolify
2. Ve a tu proyecto `chamos-barber-app`
3. Click en **"Restart"** o **"Rebuild"**
4. Espera a que termine el deploy
5. Verifica que funcione

---

## 📊 DESPUÉS DE CONFIGURAR

### **1. Redeploy en Coolify**

```bash
# Opción 1: Desde Coolify UI
1. Ve a tu proyecto
2. Click "Restart"

# Opción 2: Forzar rebuild
1. Ve a Settings
2. Click "Rebuild"
```

### **2. Verificar Variables de Entorno**

En Coolify, verifica que tengas:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[TU_PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[TU_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[TU_SERVICE_ROLE_KEY]
```

### **3. Probar Upload**

1. Abre la aplicación: https://chamosbarber.com/admin
2. Login como administrador
3. Ve a **Barberos**
4. Edita un barbero
5. Sube una foto
6. Si funciona: ✅ **¡Todo listo!**

---

## 🎯 CHECKLIST FINAL

Marca cada ítem cuando lo completes:

- [ ] Script SQL ejecutado en Supabase
- [ ] Bucket `barberos-fotos` creado
- [ ] Bucket configurado como **público**
- [ ] 4 políticas RLS creadas
- [ ] Verificado bucket en Storage UI
- [ ] Redeploy en Coolify completado
- [ ] Variables de entorno verificadas
- [ ] Probado upload en panel admin ✅
- [ ] Probado upload en panel barberos ✅
- [ ] Fotos visibles en frontend ✅

---

## 📸 UBICACIONES CON UPLOAD DE FOTOS

Después de configurar, estas 3 ubicaciones funcionarán:

1. **📝 Formulario de Registro Público**
   - URL: https://chamosbarber.com/registro-barbero
   - Barberos pueden subir foto al solicitar registro

2. **🔧 Panel Admin - Modal de Barberos**
   - URL: https://chamosbarber.com/admin
   - Administradores pueden subir/cambiar fotos

3. **👤 Panel de Barberos - Sección Perfil**
   - URL: https://chamosbarber.com/barbero-panel
   - Barberos pueden actualizar su foto de perfil

---

## 🆘 AYUDA ADICIONAL

Si después de seguir esta guía aún tienes problemas:

1. **Verifica logs de Supabase:**
   ```
   Dashboard → Logs → Storage
   ```

2. **Verifica logs de Coolify:**
   ```
   Application → Logs
   ```

3. **Abre la consola del navegador:**
   ```
   F12 → Console
   Busca errores relacionados con storage
   ```

4. **Prueba la URL directamente:**
   ```
   Copia la URL de una foto
   Ábrela en el navegador
   Si no carga: problema de políticas o bucket público
   ```

---

## ✅ CONFIRMACIÓN DE ÉXITO

Sabrás que todo funciona cuando:

✅ Puedes subir fotos desde el panel admin  
✅ Puedes subir fotos desde el panel de barberos  
✅ Las fotos se ven en la lista de barberos  
✅ Las fotos se ven en el frontend público  
✅ Las URLs de fotos empiezan con `/storage/v1/object/public/barberos-fotos/`  
✅ No hay errores en la consola del navegador  
✅ El deploy en Coolify está en estado "Running"  

---

**¡Listo! Después de ejecutar este script, el sistema de fotos funcionará perfectamente.** 🎉
