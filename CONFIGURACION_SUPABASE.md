# 🗄️ Configuración de Supabase para Mejoras UX

**Fecha:** 2025-11-06  
**Propósito:** Verificar y configurar la base de datos para las nuevas funcionalidades

---

## 🔍 Verificación Necesaria

### **Campos Requeridos en Tabla `barberos`**

Para que las fotos y especialidades se muestren, la tabla `barberos` debe tener estos campos:

```sql
-- Campos que DEBEN existir:
- id (uuid, PK)
- nombre (text)
- apellido (text)
- imagen_url (text, NULLABLE) ← CRÍTICO para fotos
- especialidad (text) ← CRÍTICO para mostrar especialidad
- activo (boolean)
```

---

## 🧪 Verificar Estructura Actual

### **SQL para Verificar Campos:**

```sql
-- Ejecutar en Supabase SQL Editor
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'barberos'
ORDER BY ordinal_position;
```

**✅ Resultado Esperado:**
```
column_name     | data_type | is_nullable
----------------|-----------|-------------
id              | uuid      | NO
nombre          | text      | NO
apellido        | text      | NO
email           | text      | YES
telefono        | text      | YES
especialidad    | text      | NO          ← Debe existir
imagen_url      | text      | YES         ← Debe existir
activo          | boolean   | NO
...
```

---

## ⚠️ Si Faltan Campos

### **Caso 1: Falta el campo `imagen_url`**

```sql
-- Agregar columna imagen_url
ALTER TABLE barberos 
ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- Verificar
SELECT id, nombre, apellido, imagen_url 
FROM barberos;
```

### **Caso 2: Falta el campo `especialidad`**

```sql
-- Agregar columna especialidad
ALTER TABLE barberos 
ADD COLUMN IF NOT EXISTS especialidad TEXT 
DEFAULT 'Barbero General';

-- Verificar
SELECT id, nombre, apellido, especialidad 
FROM barberos;
```

---

## 📊 Verificar Datos Existentes

### **1. Ver Barberos Actuales:**

```sql
SELECT 
  id,
  nombre,
  apellido,
  especialidad,
  imagen_url,
  activo
FROM barberos
ORDER BY nombre;
```

**Revisar:**
- ✅ ¿Todos tienen especialidad asignada?
- ✅ ¿Cuáles tienen imagen_url?
- ✅ ¿Cuáles están activos?

### **2. Barberos Sin Foto:**

```sql
-- Ver barberos que NO tienen foto
SELECT 
  id,
  nombre,
  apellido,
  especialidad,
  imagen_url
FROM barberos
WHERE imagen_url IS NULL 
  AND activo = true;
```

**Si hay barberos sin foto:**
- No causará error
- Simplemente no se mostrará la tarjeta con foto
- El diseño funciona sin la foto

---

## 🖼️ Agregar Fotos de Barberos

### **Opción 1: Usar Supabase Storage (Recomendado)**

**Paso 1: Crear bucket de fotos**
```sql
-- En Supabase Dashboard
Storage → Create Bucket
Name: "barberos-fotos"
Public: true
```

**Paso 2: Subir fotos**
- Dashboard → Storage → barberos-fotos
- Upload images (JPG, PNG, WebP)
- Formato recomendado: `barbero-nombre-apellido.jpg`
- Tamaño: 300x300px, máx 200KB

**Paso 3: Obtener URLs**
```
https://tuproyecto.supabase.co/storage/v1/object/public/barberos-fotos/barbero-juan-perez.jpg
```

**Paso 4: Actualizar base de datos**
```sql
UPDATE barberos 
SET imagen_url = 'https://tuproyecto.supabase.co/storage/v1/object/public/barberos-fotos/barbero-juan-perez.jpg'
WHERE nombre = 'Juan' AND apellido = 'Pérez';
```

### **Opción 2: Usar URLs Externas**

```sql
-- Usar imagen de internet o CDN
UPDATE barberos 
SET imagen_url = 'https://ejemplo.com/fotos/juan-perez.jpg'
WHERE id = 'uuid-del-barbero';
```

### **Opción 3: Usar Placeholder Temporal**

```sql
-- Usar imagen placeholder mientras consigues las fotos reales
UPDATE barberos 
SET imagen_url = 'https://ui-avatars.com/api/?name=Juan+Perez&size=300&background=d4af37&color=1a1a1a'
WHERE nombre = 'Juan' AND apellido = 'Pérez';

-- O usar placeholder genérico
UPDATE barberos 
SET imagen_url = 'https://via.placeholder.com/300x300/d4af37/1a1a1a?text=Barbero'
WHERE imagen_url IS NULL;
```

---

## 🏷️ Actualizar Especialidades

```sql
-- Ver especialidades actuales
SELECT DISTINCT especialidad 
FROM barberos 
WHERE especialidad IS NOT NULL;

-- Actualizar especialidades específicas
UPDATE barberos 
SET especialidad = 'Especialista en Cortes Modernos'
WHERE nombre = 'Juan' AND apellido = 'Pérez';

UPDATE barberos 
SET especialidad = 'Experto en Barbería Clásica'
WHERE nombre = 'Carlos' AND apellido = 'Mendoza';

UPDATE barberos 
SET especialidad = 'Maestro en Diseños y Fade'
WHERE nombre = 'Pedro' AND apellido = 'González';
```

**Ejemplos de especialidades:**
- "Especialista en Cortes Modernos"
- "Experto en Barbería Clásica"
- "Maestro en Diseños y Fade"
- "Especialista en Barbas y Bigotes"
- "Experto en Cortes Infantiles"

---

## 🧪 Testing con Datos Reales

### **Crear Cita de Prueba:**

```sql
-- Insertar cita de prueba con barbero que tenga foto
INSERT INTO citas (
  cliente_nombre,
  cliente_telefono,
  cliente_email,
  barbero_id,
  servicio_id,
  fecha,
  hora,
  estado,
  notas
) VALUES (
  'Cliente Prueba',
  '+56984568747',
  'prueba@test.com',
  (SELECT id FROM barberos WHERE imagen_url IS NOT NULL LIMIT 1),
  (SELECT id FROM servicios WHERE activo = true LIMIT 1),
  CURRENT_DATE + INTERVAL '1 day',
  '15:00',
  'pendiente',
  'Cita de prueba para verificar foto'
);
```

### **Verificar Cita Creada:**

```sql
SELECT 
  c.id,
  c.cliente_nombre,
  c.cliente_telefono,
  c.fecha,
  c.hora,
  c.estado,
  b.nombre || ' ' || b.apellido as barbero,
  b.imagen_url,
  b.especialidad,
  s.nombre as servicio
FROM citas c
JOIN barberos b ON c.barbero_id = b.id
JOIN servicios s ON c.servicio_id = s.id
WHERE c.cliente_telefono = '+56984568747'
ORDER BY c.fecha DESC, c.hora DESC;
```

---

## 📋 Checklist de Configuración

### **Estructura de Base de Datos:**

- [ ] Campo `imagen_url` existe en tabla `barberos`
- [ ] Campo `especialidad` existe en tabla `barberos`
- [ ] Ambos campos son nullables (o tienen defaults)

### **Datos de Barberos:**

- [ ] Al menos 1 barbero tiene `imagen_url` configurado
- [ ] Todos los barberos activos tienen `especialidad`
- [ ] URLs de imágenes son accesibles (probar en navegador)

### **Testing:**

- [ ] Crear cita de prueba con barbero que tenga foto
- [ ] Consultar citas con teléfono de prueba
- [ ] Verificar que foto aparece en `/consultar`
- [ ] Verificar que especialidad se muestra

---

## 🔧 Script de Configuración Completo

```sql
-- ============================================
-- SCRIPT DE CONFIGURACIÓN COMPLETO
-- ============================================

-- 1. Verificar estructura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'barberos'
  AND column_name IN ('imagen_url', 'especialidad')
ORDER BY ordinal_position;

-- 2. Agregar campos si no existen
ALTER TABLE barberos 
ADD COLUMN IF NOT EXISTS imagen_url TEXT;

ALTER TABLE barberos 
ADD COLUMN IF NOT EXISTS especialidad TEXT 
DEFAULT 'Barbero Profesional';

-- 3. Actualizar especialidades
UPDATE barberos 
SET especialidad = CASE 
  WHEN especialidad IS NULL THEN 'Barbero Profesional'
  ELSE especialidad
END;

-- 4. Agregar fotos placeholder (temporal)
UPDATE barberos 
SET imagen_url = 'https://ui-avatars.com/api/?name=' || 
                 REPLACE(nombre || '+' || apellido, ' ', '+') || 
                 '&size=300&background=d4af37&color=1a1a1a'
WHERE imagen_url IS NULL 
  AND activo = true;

-- 5. Verificar resultado
SELECT 
  id,
  nombre,
  apellido,
  especialidad,
  imagen_url,
  activo
FROM barberos
ORDER BY activo DESC, nombre;

-- 6. Crear cita de prueba (opcional)
INSERT INTO citas (
  cliente_nombre,
  cliente_telefono,
  barbero_id,
  servicio_id,
  fecha,
  hora,
  estado
) VALUES (
  'Prueba UX',
  '+56999999999',
  (SELECT id FROM barberos WHERE activo = true LIMIT 1),
  (SELECT id FROM servicios WHERE activo = true LIMIT 1),
  CURRENT_DATE + INTERVAL '2 days',
  '15:00',
  'pendiente'
);

-- 7. Verificar cita con foto
SELECT 
  c.cliente_nombre,
  b.nombre || ' ' || b.apellido as barbero,
  b.imagen_url,
  b.especialidad,
  c.fecha,
  c.hora
FROM citas c
JOIN barberos b ON c.barbero_id = b.id
WHERE c.cliente_telefono = '+56999999999';
```

---

## ⚠️ Problemas Comunes

### **Problema 1: Imágenes no cargan (CORS)**

**Síntoma:** Foto no aparece, error en consola del navegador

**Causa:** CORS bloqueando las imágenes externas

**Solución:**
1. Usar Supabase Storage (sin problemas de CORS)
2. O configurar CORS en el servidor de imágenes
3. O usar servicio con CORS abierto (como ui-avatars.com)

### **Problema 2: URL de imagen inválida**

**Síntoma:** Imagen rota (ícono 🖼️❌)

**Causa:** URL incorrecta o imagen no existe

**Solución:**
```sql
-- Probar URL manualmente en navegador
-- Si no carga, actualizar:
UPDATE barberos 
SET imagen_url = 'URL_CORRECTA'
WHERE id = 'uuid';
```

### **Problema 3: Especialidad vacía**

**Síntoma:** Especialidad no se muestra

**Causa:** Campo null o vacío

**Solución:**
```sql
UPDATE barberos 
SET especialidad = 'Barbero Profesional'
WHERE especialidad IS NULL OR especialidad = '';
```

---

## 🎯 Configuración Mínima Recomendada

**Para que funcione TODO:**

```sql
-- Mínimo 1 barbero con foto y especialidad
UPDATE barberos 
SET 
  imagen_url = 'https://ui-avatars.com/api/?name=Barbero&size=300&background=d4af37&color=1a1a1a',
  especialidad = 'Barbero Profesional'
WHERE activo = true
LIMIT 1;
```

**Para producción completa:**
- Todos los barberos activos con foto real
- Todos con especialidad descriptiva
- Fotos en Supabase Storage
- Tamaño uniforme (300x300px)

---

## ✅ Verificación Final

```sql
-- Query completo para verificar todo
SELECT 
  b.id,
  b.nombre,
  b.apellido,
  b.especialidad,
  b.imagen_url,
  b.activo,
  COUNT(c.id) as total_citas,
  COUNT(CASE WHEN c.estado IN ('pendiente', 'confirmada') THEN 1 END) as citas_pendientes
FROM barberos b
LEFT JOIN citas c ON b.id = c.barbero_id
WHERE b.activo = true
GROUP BY b.id, b.nombre, b.apellido, b.especialidad, b.imagen_url, b.activo
ORDER BY b.nombre;
```

**✅ Resultado esperado:**
- Todos los barberos tienen `especialidad` (no null)
- Al menos algunos tienen `imagen_url` (preferiblemente todos)
- `total_citas` y `citas_pendientes` muestran datos

---

**Última Actualización:** 2025-11-06  
**Estado:** 📝 Guía de configuración  
**Próxima Acción:** Ejecutar scripts en Supabase SQL Editor
