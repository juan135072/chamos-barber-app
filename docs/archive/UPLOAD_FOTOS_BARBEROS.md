# 📸 CARGA DE FOTOS DE BARBEROS - Panel Admin

**Fecha:** 2025-11-06  
**Commit:** 28c0d9a  
**Estado:** ✅ Implementado y funcional

---

## 🎯 FUNCIONALIDAD IMPLEMENTADA

Se agregó la capacidad de **cargar fotos de barberos directamente desde archivos** en el panel de administración, en lugar de requerir URLs externas.

---

## ✨ CARACTERÍSTICAS

### **En el Panel Admin → Barberos:**

✅ **Upload de archivos** (drag & drop o click)
✅ **Preview de imagen** antes de guardar
✅ **Validaciones automáticas:**
  - Tipos permitidos: JPG, PNG, WEBP, GIF
  - Tamaño máximo: 5MB
  - Mensajes de error claros

✅ **Almacenamiento en Supabase Storage**
✅ **URLs públicas automáticas**
✅ **Imágenes circulares** en la vista de barberos

---

## 🏗️ ARQUITECTURA

```
Panel Admin → Modal Barbero
     ↓
Seleccionar archivo (input type="file")
     ↓
Validar (tipo + tamaño)
     ↓
Preview local (FileReader)
     ↓
Al guardar → supabase-helpers.uploadBarberoFoto()
     ↓
Supabase Storage Bucket: barberos-fotos
     ↓
URL pública generada
     ↓
Guardar URL en tabla barberos.imagen_url
     ↓
Mostrar foto en admin y frontend
```

---

## 📁 ARCHIVOS MODIFICADOS

### **1. lib/supabase-helpers.ts**

Se agregaron 2 funciones nuevas:

```typescript
// Subir foto de barbero
uploadBarberoFoto: async (file: File, barberoId: string) => {
  // Validar tipo y tamaño
  // Generar nombre único: {barberoId}-{timestamp}.{ext}
  // Subir a bucket 'barberos-fotos'
  // Retornar URL pública
}

// Eliminar foto de barbero
deleteBarberoFoto: async (filePath: string) => {
  // Eliminar archivo del storage
}
```

### **2. src/components/admin/modals/BarberoModal.tsx**

**Cambios realizados:**

- ❌ **Removido:** Input de texto para URL
- ✅ **Agregado:** Input de archivo con drag & drop
- ✅ **Agregado:** Preview de imagen
- ✅ **Agregado:** Botón para quitar imagen
- ✅ **Agregado:** Validaciones de tipo y tamaño
- ✅ **Agregado:** Estados: `selectedFile`, `imagePreview`, `uploadingImage`
- ✅ **Modificado:** `onSubmit` para subir archivo antes de guardar

---

## 🔧 CONFIGURACIÓN REQUERIDA EN SUPABASE

### **Paso 1: Crear Bucket de Storage**

```sql
-- Opción A: Via UI
1. Ir a: Storage → Buckets
2. Click "New Bucket"
3. Name: barberos-fotos
4. Public: YES
5. Create

-- Opción B: Via SQL
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'barberos-fotos',
  'barberos-fotos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);
```

### **Paso 2: Configurar Políticas RLS**

```sql
-- Permitir uploads (usuarios autenticados)
CREATE POLICY "Admins can upload barber photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'barberos-fotos');

-- Permitir lectura (público)
CREATE POLICY "Anyone can view barber photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'barberos-fotos');

-- Permitir actualización
CREATE POLICY "Admins can update barber photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'barberos-fotos');

-- Permitir eliminación
CREATE POLICY "Admins can delete barber photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'barberos-fotos');
```

---

## 📝 CÓMO USAR

### **Para Administradores:**

1. Ir a: **Panel Admin → Barberos**
2. Click en **"Editar"** en un barbero existente
   o **"Nuevo Barbero"** para crear uno
3. En la sección **"Redes e Imagen"**:
   - Click en **"Subir archivo"**
   - O **arrastra** una imagen al área punteada
4. Verás un **preview** de la imagen
5. Click en **"Actualizar Barbero"** o **"Crear Barbero"**
6. La imagen se sube automáticamente ✅

---

## 🔍 VALIDACIONES

### **Tipos de archivo permitidos:**
- ✅ JPG/JPEG
- ✅ PNG
- ✅ WEBP
- ✅ GIF
- ❌ Otros (muestra error)

### **Tamaño máximo:**
- ✅ Hasta 5MB
- ❌ Mayor a 5MB (muestra error)

### **Mensajes de error:**
- "Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)"
- "La imagen es muy grande. Tamaño máximo: 5MB"

---

## 🎨 INTERFAZ DE USUARIO

### **Sin imagen:**
```
┌────────────────────────────────────────┐
│     📤 Icono de upload                 │
│                                        │
│     [Subir archivo] o arrastra         │
│                                        │
│     PNG, JPG, WEBP, GIF hasta 5MB     │
└────────────────────────────────────────┘
```

### **Con imagen seleccionada:**
```
┌────────────────────────────────────────┐
│  ⭕ Preview imagen      [❌ Quitar]    │
│  (circular 96x96px)                    │
│                                        │
│  ✅ Archivo: foto-barbero.jpg          │
└────────────────────────────────────────┘
```

---

## 🔗 URLs GENERADAS

Las imágenes se almacenan con este patrón:

```
https://supabase.chamosbarber.com/storage/v1/object/public/barberos-fotos/{barberoId}-{timestamp}.{ext}

Ejemplo:
https://supabase.chamosbarber.com/storage/v1/object/public/barberos-fotos/abc123-1699285600000.jpg
```

---

## ✅ BENEFICIOS

1. **Más fácil para el admin:**
   - No necesita subir imagen a otro servicio
   - No necesita copiar/pegar URLs
   - Drag & drop directo

2. **Mejor control:**
   - Validaciones automáticas
   - Tamaños controlados
   - Formatos específicos

3. **Centralizado:**
   - Todo en Supabase
   - No depende de servicios externos
   - URLs permanentes

4. **Profesional:**
   - Preview antes de guardar
   - Mensajes claros
   - UX moderna

---

## 🐛 TROUBLESHOOTING

### **Error: "Bucket not found"**
```
Solución: Crear bucket 'barberos-fotos' en Supabase Storage
```

### **Error: "Permission denied"**
```
Solución: Verificar políticas RLS del bucket
```

### **Error: "File too large"**
```
Solución: La imagen debe ser menor a 5MB
Comprimir o redimensionar imagen
```

### **No se ve la imagen después de subir**
```
Verificar:
1. Bucket es público
2. Políticas RLS configuradas
3. Hard refresh (Ctrl+Shift+R)
4. Verificar URL en tabla barberos
```

---

## 📊 ESTRUCTURA DE DATOS

### **Tabla: barberos**
```sql
CREATE TABLE barberos (
  id UUID PRIMARY KEY,
  nombre VARCHAR NOT NULL,
  apellido VARCHAR NOT NULL,
  imagen_url TEXT,  -- ← Aquí se guarda la URL pública
  ...
);
```

### **Storage: barberos-fotos**
```
barberos-fotos/
├── abc123-1699285600000.jpg
├── def456-1699285700000.png
└── ghi789-1699285800000.webp
```

---

## 🚀 PRÓXIMOS PASOS (OPCIONAL)

### **Mejoras futuras posibles:**

1. **Recorte de imagen:**
   - Agregar editor para recortar
   - Permitir ajustar zoom

2. **Compresión automática:**
   - Redimensionar a tamaño óptimo
   - Comprimir para web

3. **Múltiples imágenes:**
   - Galería de fotos del barbero
   - Portfolio de trabajos

4. **Eliminar imagen antigua:**
   - Al subir nueva, borrar la anterior
   - Liberar espacio en storage

---

## 📌 NOTAS IMPORTANTES

⚠️ **Bucket debe ser público** para que las fotos se muestren en el frontend

⚠️ **Variables de entorno correctas** en Coolify (.env)

⚠️ **Usuario debe estar autenticado** (admin) para subir fotos

✅ **Las fotos se muestran automáticamente** en:
  - Panel de administración
  - Panel de barbero
  - Página de consulta de citas (frontend)
  - Página de reservas (frontend)

---

**Estado:** ✅ Funcionalidad completa e implementada
**Commit:** 28c0d9a
**Fecha:** 2025-11-06

