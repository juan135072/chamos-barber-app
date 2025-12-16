# 📦 Configuración de Storage en Supabase

## Descripción General

Esta aplicación utiliza **Supabase Storage** para almacenar imágenes de barberos y servicios. Se requieren dos buckets públicos configurados correctamente para que la funcionalidad de subida de imágenes funcione.

---

## 🗂️ Buckets Requeridos

### 1. `barberos-fotos`
- **Propósito**: Almacenar fotos de perfil de barberos
- **Público**: Sí ✅
- **Tamaño máximo**: 5MB (5,242,880 bytes)
- **Tipos MIME permitidos**: 
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/webp`
  - `image/gif`
- **Código relacionado**: `lib/supabase-helpers.ts` líneas 520-598

### 2. `servicios-fotos`
- **Propósito**: Almacenar fotos de servicios ofrecidos
- **Público**: Sí ✅
- **Tamaño máximo**: 5MB (5,242,880 bytes)
- **Tipos MIME permitidos**: 
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/webp`
  - `image/gif`
- **Código relacionado**: `lib/supabase-helpers.ts` líneas 600-678

---

## ✅ Verificación de Buckets

### Script de Verificación

Ejecuta el siguiente comando para verificar que todos los buckets necesarios existen:

```bash
node scripts/check-storage-buckets.js
```

**Salida esperada:**

```
✅ Se encontraron 2 bucket(s):

1. barberos-fotos
   - ID: barberos-fotos
   - Público: Sí
   - Creado: 2025-12-05T23:41:26.217Z

2. servicios-fotos
   - ID: servicios-fotos
   - Público: Sí
   - Creado: 2025-12-16T22:58:13.214Z

🔍 Verificando buckets requeridos:
  ✅ barberos-fotos: EXISTE
  ✅ servicios-fotos: EXISTE

✅ Todos los buckets necesarios existen
```

---

## 🔧 Creación Automática de Buckets

Si algún bucket falta, puedes crearlos automáticamente usando:

```bash
node scripts/create-storage-buckets.js
```

**Requisitos:**
- La variable de entorno `SUPABASE_SERVICE_ROLE_KEY` debe estar configurada en `.env.local`
- El Service Role Key tiene permisos de administrador para crear buckets

**Salida esperada:**

```
📊 RESUMEN:
  ✅ Creados: 1
  ⚠️  Ya existían: 1
  ❌ Fallidos: 0

✅ Los buckets están listos para usar
```

---

## 🖥️ Creación Manual de Buckets

Si la creación automática falla o prefieres crearlos manualmente:

### Pasos en el Dashboard de Supabase

1. **Accede al Dashboard**:
   - URL: `https://supabase.chamosbarber.com`
   - Ve a la sección **Storage**

2. **Crear bucket `servicios-fotos`** (si no existe):
   - Click en **"Create new bucket"**
   - **Nombre**: `servicios-fotos`
   - **Public bucket**: ✅ **YES** (importante)
   - **File size limit**: `5242880` bytes (5MB)
   - **Allowed MIME types**: 
     ```
     image/jpeg, image/jpg, image/png, image/webp, image/gif
     ```
   - Click **"Create bucket"**

3. **Verificar bucket `barberos-fotos`** (debe existir desde antes):
   - Si no existe, crear con los mismos parámetros que `servicios-fotos`

4. **Configurar políticas de acceso** (RLS - Row Level Security):
   
   Para cada bucket, asegúrate de que existan políticas para:
   
   **Política: Permitir lectura pública**
   ```sql
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING ( bucket_id = 'servicios-fotos' );
   ```
   
   **Política: Permitir inserción autenticada**
   ```sql
   CREATE POLICY "Authenticated users can upload"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'servicios-fotos'
     AND auth.role() = 'authenticated'
   );
   ```
   
   **Política: Permitir eliminación autenticada**
   ```sql
   CREATE POLICY "Authenticated users can delete"
   ON storage.objects FOR DELETE
   USING (
     bucket_id = 'servicios-fotos'
     AND auth.role() = 'authenticated'
   );
   ```

---

## 🧪 Prueba de Funcionalidad

### 1. Verificar buckets

```bash
node scripts/check-storage-buckets.js
```

### 2. Probar subida de imagen

1. Ve a `https://chamosbarber.com/admin`
2. Navega a la pestaña **"Servicios"**
3. Click en **"Agregar Servicio"** o edita un servicio existente
4. Selecciona una imagen (JPG, PNG, WEBP, GIF - máximo 5MB)
5. Completa el formulario y guarda

**Logs esperados en consola:**

```
📤 [uploadServicioFoto] Subiendo archivo: 0ae0fee7-4557-4eab-b352-0ade7aae3cfb-1734392947880.webp
✅ [uploadServicioFoto] Archivo subido: 0ae0fee7-4557-4eab-b352-0ade7aae3cfb-1734392947880.webp
🔗 [uploadServicioFoto] URL pública: https://api.chamosbarber.com/storage/v1/object/public/servicios-fotos/0ae0fee7-4557-4eab-b352-0ade7aae3cfb-1734392947880.webp
```

### 3. Si hay errores

**Error común**: `StorageApiError: Bucket not found`

**Solución**:
1. Verifica que el bucket existe: `node scripts/check-storage-buckets.js`
2. Si falta, créalo: `node scripts/create-storage-buckets.js`
3. Reinicia la aplicación
4. Intenta subir la imagen nuevamente

**Error común**: `StorageApiError: new row violates row-level security policy`

**Solución**:
- Verifica que las políticas de Storage están configuradas correctamente
- Asegúrate de que el usuario está autenticado
- Verifica que el bucket es **público**

---

## 📋 Requisitos del Sistema

### Variables de Entorno

En `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://api.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Para crear buckets
```

### Dependencias

```json
{
  "@supabase/supabase-js": "^2.x",
  "dotenv": "^17.x"
}
```

---

## 🔍 Troubleshooting

### Problema: "Bucket not found"

1. **Verificar buckets existentes**:
   ```bash
   node scripts/check-storage-buckets.js
   ```

2. **Crear buckets faltantes**:
   ```bash
   node scripts/create-storage-buckets.js
   ```

3. **Verificar URL de Supabase**:
   - Debe ser `https://api.chamosbarber.com` (API REST)
   - NO usar `https://supabase.chamosbarber.com` (Studio UI)

### Problema: "Permission denied"

1. **Verificar autenticación**:
   - El usuario debe estar autenticado con Supabase Auth
   - Verifica `supabase.auth.getSession()`

2. **Verificar políticas RLS**:
   - Ve a Storage -> [bucket] -> Policies
   - Asegúrate de que existen políticas de INSERT/SELECT/DELETE

### Problema: "File too large"

- **Tamaño máximo**: 5MB (5,242,880 bytes)
- **Solución**: Redimensiona la imagen antes de subirla
- **Código relacionado**: `supabase-helpers.ts` líneas 530, 610

### Problema: "Invalid MIME type"

- **Tipos permitidos**: JPEG, JPG, PNG, WEBP, GIF
- **Solución**: Convierte la imagen a un formato permitido
- **Código relacionado**: `supabase-helpers.ts` líneas 524-527, 604-607

---

## 📝 Referencias

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Row Level Security for Storage](https://supabase.com/docs/guides/storage/security/access-control)
- Código fuente: `lib/supabase-helpers.ts`
- Scripts:
  - `scripts/check-storage-buckets.js`
  - `scripts/create-storage-buckets.js`

---

## ✅ Checklist de Configuración

- [ ] Bucket `barberos-fotos` existe
- [ ] Bucket `servicios-fotos` existe
- [ ] Ambos buckets son públicos
- [ ] Límite de tamaño: 5MB
- [ ] Tipos MIME permitidos: image/jpeg, image/png, image/webp, image/gif
- [ ] Políticas RLS configuradas (SELECT, INSERT, DELETE)
- [ ] Variable `NEXT_PUBLIC_SUPABASE_URL` apunta a API REST
- [ ] Variable `SUPABASE_SERVICE_ROLE_KEY` configurada (para scripts)
- [ ] Subida de imágenes de barberos funciona
- [ ] Subida de imágenes de servicios funciona

---

## 🎉 Resultado Esperado

Después de completar la configuración, deberías poder:

1. ✅ Subir fotos de barberos sin errores
2. ✅ Subir fotos de servicios sin errores
3. ✅ Ver las imágenes en la aplicación web
4. ✅ Eliminar imágenes antiguas al reemplazarlas
5. ✅ Validación de tipos de archivo y tamaño

¡Todo listo para gestionar imágenes en Chamos Barber App! 🎉✂️
