# 📋 Auditoría de API Routes - Chamos Barber

## 🎯 Objetivo
Documentar todas las API routes necesarias y su estado actual para evitar endpoints faltantes en el futuro.

---

## ✅ API Routes Implementadas

### 1. `/api/barberos` (GET)
- **Archivo**: `src/pages/api/barberos.ts`
- **Usado en**: `src/pages/equipo.tsx`
- **Tabla BD**: `barberos`
- **Descripción**: Obtiene la lista de barberos activos con sus datos completos
- **Respuesta**: 
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "nombre": "Carlos Mendoza",
        "biografia": "...",
        "foto_url": "https://...",
        "especialidades": ["Cortes modernos"],
        "experiencia_anos": 8,
        "telefono": "+56...",
        "instagram": "@username",
        "calificacion": 4.9
      }
    ]
  }
  ```

### 2. `/api/sitio-configuracion` (GET)
- **Archivo**: `src/pages/api/sitio-configuracion.ts`
- **Usado en**: `src/components/Footer.tsx`
- **Tabla BD**: `configuracion_sitio`
- **Descripción**: Obtiene la configuración general del sitio (redes sociales, contacto, horarios)
- **Respuesta**:
  ```json
  [
    {
      "id": "uuid",
      "nombre_negocio": "Chamos Barber",
      "direccion": "...",
      "telefono": "+56...",
      "email": "...",
      "instagram": "https://...",
      "facebook": "https://...",
      "twitter": "https://...",
      "youtube": "https://...",
      "tiktok": "https://...",
      "whatsapp": "+56...",
      "google_maps_url": "...",
      "horario_atencion": "...",
      "descripcion": "..."
    }
  ]
  ```

### 3. `/api/configuracion/social` (GET)
- **Archivo**: `src/pages/api/configuracion/social.ts`
- **Usado en**: `src/components/Navigation.tsx`
- **Tabla BD**: `enlaces_sociales`
- **Descripción**: Obtiene los enlaces a redes sociales activas
- **Respuesta**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "plataforma": "instagram",
        "url": "https://instagram.com/...",
        "activo": true,
        "orden_display": 1
      }
    ]
  }
  ```

---

## 🔄 Mapeo de Campos BD → Frontend

### Tabla `barberos`
| Campo BD | Campo Frontend | Transformación |
|----------|----------------|----------------|
| `nombre` + `apellido` | `nombre` | Concatenación |
| `descripcion` | `biografia` | Directo |
| `imagen_url` | `foto_url` | Directo |
| `especialidad` | `especialidades[]` | Convertir a array |
| `experiencia_anos` | `experiencia_anos` | Directo |
| `calificacion` | `calificacion` | Directo |
| `telefono` | `telefono` | Directo |
| `instagram` | `instagram` | Directo |

---

## 📊 Tablas de Base de Datos

### 1. `barberos`
```sql
CREATE TABLE barberos (
  id UUID PRIMARY KEY,
  nombre VARCHAR(255),
  apellido VARCHAR(255),
  email VARCHAR(255),
  telefono VARCHAR(50),
  especialidad TEXT,
  experiencia_anos INTEGER,
  calificacion DECIMAL(2,1),
  descripcion TEXT,
  imagen_url TEXT,
  instagram VARCHAR(255),
  activo BOOLEAN,
  orden_display INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### 2. `configuracion_sitio`
```sql
CREATE TABLE configuracion_sitio (
  id UUID PRIMARY KEY,
  nombre_negocio VARCHAR(255),
  direccion TEXT,
  telefono VARCHAR(50),
  email VARCHAR(255),
  whatsapp VARCHAR(50),
  instagram VARCHAR(255),
  facebook VARCHAR(255),
  twitter VARCHAR(255),
  youtube VARCHAR(255),
  tiktok VARCHAR(255),
  google_maps_url TEXT,
  horario_atencion TEXT,
  descripcion TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### 3. `enlaces_sociales`
```sql
CREATE TABLE enlaces_sociales (
  id UUID PRIMARY KEY,
  plataforma VARCHAR(50),
  url TEXT,
  activo BOOLEAN,
  orden_display INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## 🔒 Políticas RLS

Todas las tablas tienen:

1. **Lectura pública** (anon + authenticated):
   - `barberos`: Solo registros con `activo = true`
   - `configuracion_sitio`: Todos los registros
   - `enlaces_sociales`: Solo registros con `activo = true`

2. **Escritura admin** (service_role):
   - Acceso completo para operaciones CRUD desde el panel admin

---

## 🛠️ Guía de Mantenimiento

### Para agregar una nueva API route:

1. **Identificar necesidad**:
   - Revisar componentes frontend que hacen `fetch('/api/...')`
   - Verificar si el endpoint existe en `src/pages/api/`

2. **Crear el archivo**:
   ```typescript
   // src/pages/api/nueva-ruta.ts
   import type { NextApiRequest, NextApiResponse } from 'next'
   import { supabase } from '../../lib/supabase'
   
   export default async function handler(req, res) {
     if (req.method !== 'GET') {
       return res.status(405).json({ error: 'Method not allowed' })
     }
     
     const { data, error } = await supabase
       .from('tabla')
       .select('*')
     
     if (error) return res.status(500).json({ error: error.message })
     return res.status(200).json(data)
   }
   ```

3. **Verificar tabla BD**:
   - Confirmar que la tabla existe en Supabase
   - Verificar políticas RLS (permitir lectura pública si es necesario)

4. **Mapear datos**:
   - Si los nombres de campos BD ≠ Frontend, mapear en la API

5. **Commit y deploy**:
   ```bash
   git add src/pages/api/
   git commit -m "feat: agregar API route /api/nueva-ruta"
   git push origin master
   ```

---

## 🔍 Comando de Auditoría

Para encontrar llamadas a API routes en el código:

```bash
# Buscar todas las llamadas fetch a /api/
grep -r "fetch.*'/api/" --include="*.tsx" --include="*.ts" src/

# Listar API routes existentes
find src/pages/api -type f -name "*.ts"
```

---

## 📅 Historial de Cambios

- **2025-11-02**: Auditoría inicial y creación de 3 API routes base
  - Creado `/api/barberos`
  - Creado `/api/sitio-configuracion`
  - Creado `/api/configuracion/social`
  - Creadas tablas `configuracion_sitio` y `enlaces_sociales`

---

## 🎯 TODO Futuro

### Endpoints potencialmente necesarios:
- `/api/servicios` - Para página de servicios
- `/api/portfolio` - Para galería de trabajos
- `/api/citas` - Para sistema de reservas
- `/api/horarios` - Para disponibilidad de barberos
- `/api/admin/*` - Endpoints del panel administrativo

### Al implementar nuevas funcionalidades:
1. ✅ Verificar si se necesita una API route
2. ✅ Crear el endpoint antes de hacer el deploy
3. ✅ Actualizar este documento
4. ✅ Verificar políticas RLS en Supabase

---

**Última actualización**: 2025-11-02  
**Mantenido por**: Claude AI Assistant
