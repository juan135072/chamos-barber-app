# 📋 Instrucciones: URLs Amigables y Portfolio de Barberos

**Fecha:** 2025-11-02  
**Commit:** `222e217`  
**Estado:** ⏳ Pendiente ejecución de SQL

---

## 🎯 Objetivo

Implementar:
1. **URLs amigables** para barberos (ej: `/barbero/carlos-ramirez`)
2. **Dashboard individual** para cada barbero con su portfolio de trabajos
3. **Sistema de portfolio** con imágenes categorizadas

---

## ⚠️ ACCIÓN REQUERIDA: Ejecutar SQL

### Paso 1: Acceder a Supabase Studio

1. Ve a: `https://supabase.chamosbarber.com`
2. Inicia sesión con tus credenciales
3. Navega a: **SQL Editor** (icono `</>` en el menú lateral)

### Paso 2: Ejecutar el Script SQL

1. Abre el archivo: `scripts/add-slug-and-portfolio.sql`
2. **Copia TODO el contenido** del archivo
3. **Pega** en el SQL Editor de Supabase
4. Haz clic en **"Run"** (▶️) o presiona `Ctrl+Enter`

### Paso 3: Verificar Resultados

Al final del script verás dos consultas de verificación:

**Verificación 1: Slugs creados**
```
nombre    | apellido | slug
----------|----------|---------------
Carlos    | Ramírez  | carlos-ramirez
Miguel    | Torres   | miguel-torres
Luis      | Mendoza  | luis-mendoza
Jorge     | Silva    | jorge-silva
```

**Verificación 2: Items de portfolio**
```
barbero          | items_portfolio
-----------------|----------------
Carlos Ramírez   | 4
Miguel Torres    | 5
Luis Mendoza     | 4
Jorge Silva      | 4
```

**Total esperado:** ~17 items de portfolio

---

## ✨ Lo Que Se Implementó

### 1. Campo `slug` en Barberos

```sql
-- Nuevo campo agregado a la tabla barberos
ALTER TABLE barberos ADD COLUMN slug TEXT;
CREATE UNIQUE INDEX barberos_slug_key ON barberos(slug);
```

**Slugs generados:**
- `carlos-ramirez` (Carlos Ramírez)
- `miguel-torres` (Miguel Torres)
- `luis-mendoza` (Luis Mendoza)
- `jorge-silva` (Jorge Silva)

### 2. Tabla `barbero_portfolio`

Nueva tabla para almacenar el portfolio de trabajos:

```sql
CREATE TABLE barbero_portfolio (
  id UUID PRIMARY KEY,
  barbero_id UUID REFERENCES barberos(id),
  imagen_url TEXT NOT NULL,
  titulo TEXT,
  descripcion TEXT,
  categoria TEXT,  -- 'corte-clasico', 'fade', 'barba', 'color', 'diseno', 'infantil'
  tags TEXT[],     -- Etiquetas para búsqueda
  likes INTEGER DEFAULT 0,
  orden_display INTEGER DEFAULT 0,
  aprobado BOOLEAN DEFAULT false,  -- Moderación
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Datos Demo de Portfolio

**Carlos Ramírez** (4 items):
- ✂️ Corte Clásico Ejecutivo
- 🧔 Barba Perfilada
- 💈 Side Part Clásico
- 👔 Corte Caballero

**Miguel Torres** (5 items):
- 🎨 Fade Alto con Diseño
- ✨ Mid Fade Texturizado
- 💫 Taper Fade
- 🎭 Diseño Tribal
- 🌀 Burst Fade

**Luis Mendoza** (4 items):
- 🎨 Coloración Platino
- 🌈 Mechas Balayage
- 💎 Gris Ash
- 💧 Tratamiento Capilar

**Jorge Silva** (4 items):
- 👶 Corte Infantil Clásico
- 🧒 Corte Moderno Juvenil
- 🍼 Primer Corte
- 📚 Corte Escolar

### 4. RLS Policies

```sql
-- Acceso público a portfolio aprobado y activo
CREATE POLICY "portfolio_public_select" 
ON barbero_portfolio FOR SELECT 
TO anon, authenticated 
USING (aprobado = true AND activo = true);

-- Acceso completo para service_role
CREATE POLICY "portfolio_service_all" 
ON barbero_portfolio FOR ALL 
TO service_role 
USING (true);
```

---

## 🚀 Nuevas Rutas API

### `/api/barberos/[id]` 
**Obtener barbero individual por UUID o slug**

```bash
# Por UUID (modo antiguo - aún funciona)
GET /api/barberos/0d268607-78fa-49b6-9efe-2ab78735be83

# Por slug (modo nuevo - URLs amigables)
GET /api/barberos/carlos-ramirez
```

**Respuesta:**
```json
{
  "id": "0d268607-78fa-49b6-9efe-2ab78735be83",
  "slug": "carlos-ramirez",
  "nombre": "Carlos Ramírez",
  "biografia": "Barbero con más de 8 años de experiencia...",
  "foto_url": "https://...",
  "especialidades": ["Cortes clásicos y barbas"],
  "experiencia_anos": 8,
  "telefono": "+56912345678",
  "instagram": "@carlosramirezbarber"
}
```

### `/api/barbero-portfolio`
**Obtener portfolio de trabajos**

```bash
# Portfolio de un barbero específico (por UUID)
GET /api/barbero-portfolio?barbero_id=0d268607-78fa-49b6-9efe-2ab78735be83

# Con límite de resultados
GET /api/barbero-portfolio?barbero_id=0d268607-78fa-49b6-9efe-2ab78735be83&limit=6

# Solo items no aprobados (para admin)
GET /api/barbero-portfolio?barbero_id=xxx&aprobado=false
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": "...",
      "barbero_id": "...",
      "imagen_url": "https://...",
      "titulo": "Corte Clásico Ejecutivo",
      "descripcion": "Corte tradicional con degradado suave...",
      "categoria": "corte-clasico",
      "tags": ["clásico", "profesional", "degradado"],
      "likes": 0,
      "orden_display": 1,
      "aprobado": true,
      "activo": true
    }
  ]
}
```

---

## 💻 Cambios en el Frontend

### Página `/equipo`

**Antes:**
```tsx
<Link href={`/barbero/${barbero.id}`}>  // UUID largo
```

**Después:**
```tsx
<Link href={`/barbero/${barbero.slug || barbero.id}`}>  // Slug amigable
```

**Resultado:**
- ✅ `https://chamosbarber.com/barbero/carlos-ramirez`
- ✅ `https://chamosbarber.com/barbero/miguel-torres`
- ✅ `https://chamosbarber.com/barbero/luis-mendoza`
- ✅ `https://chamosbarber.com/barbero/jorge-silva`

### Página `/barbero/[id]`

- ✅ Acepta tanto UUIDs como slugs en la URL
- ✅ Muestra información del barbero
- ✅ Muestra portfolio de trabajos (si existe)
- ✅ Botones de contacto (WhatsApp, Instagram)
- ✅ Botón "Reservar Cita"

---

## 🧪 Cómo Probar

### 1. Después de Ejecutar el SQL

Espera a que Coolify complete el deployment (ya está pusheado).

### 2. Probar URLs Amigables

Accede a estas URLs en tu navegador:

```
https://chamosbarber.com/barbero/carlos-ramirez
https://chamosbarber.com/barbero/miguel-torres
https://chamosbarber.com/barbero/luis-mendoza
https://chamosbarber.com/barbero/jorge-silva
```

**Deberías ver:**
- ✅ Información completa del barbero
- ✅ Sección "Portfolio de Trabajos" con 4-5 imágenes
- ✅ Botones de contacto funcionales
- ✅ URL limpia y legible

### 3. Probar desde la Página de Equipo

1. Ve a: `https://chamosbarber.com/equipo`
2. Haz clic en cualquier barbero
3. Verifica que la URL use el slug (no el UUID)
4. Verifica que el portfolio se muestre correctamente

---

## 📊 Arquitectura del Portfolio

### Estructura de Carpetas (Conceptual)

```
/barbero/carlos-ramirez/
  ├── Información personal
  ├── Especialidades
  ├── Experiencia
  ├── Botones de contacto
  └── Portfolio de Trabajos
      ├── Corte Clásico Ejecutivo
      ├── Barba Perfilada
      ├── Side Part Clásico
      └── Corte Caballero
```

### Categorías de Portfolio

- `corte-clasico` - Cortes tradicionales y elegantes
- `fade` - Degradados modernos (skin fade, taper, etc.)
- `barba` - Perfilado y arreglo de barbas
- `color` - Coloración y mechas
- `diseno` - Diseños artísticos y tribales
- `infantil` - Cortes para niños y adolescentes
- `tratamiento` - Tratamientos capilares

---

## 🔮 Funcionalidades Futuras (Opcional)

### Para el Panel Admin

- **Gestión de Portfolio**: CRUD de items del portfolio desde el admin
- **Upload de Imágenes**: Subir fotos directamente desde el panel
- **Moderación**: Aprobar/rechazar items del portfolio
- **Reordenamiento**: Drag & drop para ordenar items
- **Estadísticas**: Ver likes y visualizaciones por item

### Para el Frontend Público

- **Filtros por Categoría**: Filtrar portfolio por tipo de trabajo
- **Galería Lightbox**: Modal para ver imágenes en tamaño completo
- **Sistema de Likes**: Permitir a usuarios dar "like" a trabajos
- **Compartir en Redes**: Botones para compartir portfolio items
- **SEO Mejorado**: Meta tags específicos por barbero

---

## 📝 Notas Importantes

### Compatibilidad con UUIDs

El sistema es **100% compatible con URLs antiguas**. Si alguien tiene un enlace con UUID, seguirá funcionando:

```
✅ https://chamosbarber.com/barbero/0d268607-78fa-49b6-9efe-2ab78735be83
✅ https://chamosbarber.com/barbero/carlos-ramirez
```

### Imágenes de Portfolio

Actualmente usa imágenes de Unsplash como placeholder. Para usar imágenes reales:

1. Sube las fotos a un servicio (Supabase Storage, Cloudinary, etc.)
2. Actualiza los `imagen_url` en la tabla `barbero_portfolio`
3. O implementa upload desde el panel admin

### Regenerar Tipos TypeScript (Opcional)

Para evitar `as any` en el código:

```bash
# Instalar CLI de Supabase
npm install supabase --save-dev

# Generar tipos
npx supabase gen types typescript \
  --project-id <tu-project-id> \
  --schema public > lib/database.types.ts
```

Esto agregará los tipos para `slug` y `barbero_portfolio`.

---

## ✅ Checklist Final

Antes de marcar como completado, verifica:

- [ ] SQL ejecutado en Supabase Studio
- [ ] Verificación 1: 4 barberos con slugs únicos
- [ ] Verificación 2: ~17 items de portfolio insertados
- [ ] Deployment completado en Coolify
- [ ] URLs amigables funcionando (ej: `/barbero/carlos-ramirez`)
- [ ] Portfolio visible en dashboard de cada barbero
- [ ] Enlaces desde `/equipo` usan slugs
- [ ] No hay errores en la consola del navegador

---

## 🎉 Resultado Final

Después de ejecutar el SQL, tendrás:

✅ **URLs amigables y SEO-friendly**
✅ **Dashboard individual para cada barbero**
✅ **Portfolio de trabajos con imágenes**
✅ **Sistema escalable para agregar más barberos**
✅ **Compatible con URLs antiguas (UUIDs)**

---

**¿Todo listo? Ejecuta el SQL y disfruta de los nuevos dashboards de barberos! 🎊**
