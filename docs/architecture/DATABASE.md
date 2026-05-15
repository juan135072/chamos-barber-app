# Database Schema - Chamos Barber

## 🗄️ Descripción General

Base de datos PostgreSQL 15 alojada en Supabase Self-hosted (supabase.chamosbarber.com).

## 📊 Diagrama ER

```
                    ┌─────────────────────────────────┐
                    │        auth.users               │
                    │  (Tabla de Supabase Auth)       │
                    │                                 │
                    │  • id (uuid, PK)                │
                    │  • email                        │
                    │  • encrypted_password           │
                    │  • created_at                   │
                    └────────┬────────────────────────┘
                             │
                             │ 1:1
                             │
                    ┌────────▼────────────────────────┐
                    │      admin_users                │
                    │  (RLS DISABLED)                 │
                    │                                 │
                    │  • id (uuid, PK, FK)            │
                    │  • email (text, unique)         │
                    │  • rol (text)                   │
                    │  • activo (boolean)             │
                    │  • barbero_id (uuid, FK)        │
                    │  • created_at (timestamp)       │
                    └────────┬────────────────────────┘
                             │
                             │ 0:1 (solo si rol=barbero)
                             │
┌────────────────────────────▼──┐              ┌───────────────────────┐
│         barberos              │              │      servicios        │
│  (RLS ENABLED)                │              │  (RLS ENABLED)        │
│                               │              │                       │
│  • id (uuid, PK)              │              │  • id (uuid, PK)      │
│  • nombre (text)              │              │  • nombre (text)      │
│  • apellido (text)            │              │  • descripcion (text) │
│  • email (text, unique)       │              │  • precio (numeric)   │
│  • telefono (text)            │              │  • duracion (int)     │
│  • biografia (text)           │              │  • activo (boolean)   │
│  • foto_url (text)            │              │  • created_at         │
│  • slug (text, unique)        │              └───────┬───────────────┘
│  • activo (boolean)           │                      │
│  • orden (int)                │                      │ n
│  • created_at (timestamp)     │                      │
│  • updated_at (timestamp)     │                      │
└───────────┬───────────────────┘                      │
            │                                          │
            │ 1                                        │ 1
            │                                          │
            │                      ┌───────────────────┴┐
            │                      │                     │
            │ n            ┌───────▼─────────────────────▼────────┐
            └──────────────►         citas                         │
                           │  (RLS ENABLED)                        │
                           │                                       │
                           │  • id (uuid, PK)                      │
                           │  • barbero_id (uuid, FK → barberos)   │
                           │  • servicio_id (uuid, FK → servicios) │
                           │  • cliente_nombre (text)              │
                           │  • cliente_email (text)               │
                           │  • cliente_telefono (text)            │
                           │  • fecha (date)                       │
                           │  • hora (time)                        │
                           │  • estado (text)                      │
                           │  • notas (text)                       │
                           │  • created_at (timestamp)             │
                           │  • updated_at (timestamp)             │
                           └───────────────────────────────────────┘


┌────────────────────────────┐
│   portfolio                │
│  (Galería de imágenes)     │
│                            │
│  • id (uuid, PK)           │
│  • barbero_id (uuid, FK)   │
│  • imagen_url (text)       │
│  • descripcion (text)      │
│  • orden (int)             │
│  • created_at (timestamp)  │
└────────────────────────────┘
```

## 📋 Tablas Detalladas

### 1. `auth.users` (Tabla del Sistema de Supabase)

**Descripción**: Tabla nativa de Supabase Auth que almacena usuarios autenticados.

**NO MODIFICAR DIRECTAMENTE** - Gestionada por Supabase Auth

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | Primary Key, generado automáticamente |
| email | text | Email único del usuario |
| encrypted_password | text | Password hasheado |
| email_confirmed_at | timestamp | Fecha de confirmación de email |
| created_at | timestamp | Fecha de creación |

### 2. `admin_users`

**Descripción**: Tabla que extiende auth.users para gestión de roles y permisos.

**⚠️ RLS DISABLED** - Seguridad implementada a nivel de aplicación

```sql
CREATE TABLE admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  rol text NOT NULL CHECK (rol IN ('admin', 'barbero')),
  activo boolean DEFAULT true,
  barbero_id uuid REFERENCES barberos(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Índices
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_rol ON admin_users(rol);
CREATE INDEX idx_admin_users_activo ON admin_users(activo);
```

**Campos**:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | uuid | PK, FK → auth.users | ID del usuario (mismo que auth.users) |
| email | text | UNIQUE, NOT NULL | Email del usuario |
| rol | text | NOT NULL, CHECK | Rol: 'admin' o 'barbero' |
| activo | boolean | DEFAULT true | Si el usuario está activo |
| barbero_id | uuid | FK → barberos, NULLABLE | Si rol=barbero, referencia al barbero |
| created_at | timestamp | DEFAULT now() | Fecha de creación |

**Relaciones**:
- `id` → `auth.users(id)` (1:1, ON DELETE CASCADE)
- `barbero_id` → `barberos(id)` (0:1, ON DELETE SET NULL)

**Casos de Uso**:
```sql
-- Admin principal (sin barbero_id)
INSERT INTO admin_users (id, email, rol, activo) 
VALUES (
  'd90e5c62-...',
  'admin@chamosbarber.com',
  'admin',
  true
);

-- Barbero con acceso al panel
INSERT INTO admin_users (id, email, rol, activo, barbero_id) 
VALUES (
  'e123456...',
  'barbero@chamosbarber.com',
  'barbero',
  true,
  'uuid-del-barbero'
);
```

**⚠️ Importante**: RLS deshabilitado para evitar recursión infinita. Verificación de permisos se hace en código.

### 3. `barberos`

**Descripción**: Información de los barberos que trabajan en el negocio.

**RLS ENABLED** - Políticas activas (NO MODIFICAR)

```sql
CREATE TABLE barberos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  apellido text NOT NULL,
  email text UNIQUE NOT NULL,
  telefono text,
  biografia text,
  foto_url text,
  slug text UNIQUE NOT NULL,
  activo boolean DEFAULT true,
  orden int DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índices
CREATE INDEX idx_barberos_slug ON barberos(slug);
CREATE INDEX idx_barberos_activo ON barberos(activo);
CREATE INDEX idx_barberos_orden ON barberos(orden);
```

**Campos**:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Identificador único |
| nombre | text | NOT NULL | Nombre del barbero |
| apellido | text | NOT NULL | Apellido del barbero |
| email | text | UNIQUE, NOT NULL | Email de contacto |
| telefono | text | - | Teléfono de contacto |
| biografia | text | - | Biografía/descripción |
| foto_url | text | - | URL de foto de perfil |
| slug | text | UNIQUE, NOT NULL | Slug para URLs (ej: 'juan-perez') |
| activo | boolean | DEFAULT true | Si está activo/disponible |
| orden | int | DEFAULT 0 | Orden de visualización |
| created_at | timestamp | DEFAULT now() | Fecha de creación |
| updated_at | timestamp | DEFAULT now() | Última actualización |

**Relaciones**:
- ← `admin_users.barbero_id` (1:0..1)
- ← `citas.barbero_id` (1:n)
- ← `portfolio.barbero_id` (1:n)

**Ejemplo de Datos**:
```sql
INSERT INTO barberos (nombre, apellido, email, telefono, slug, biografia, orden) 
VALUES 
  ('Carlos', 'Rodríguez', 'carlos@chamosbarber.com', '+58 414-1234567', 
   'carlos-rodriguez', 'Especialista en cortes clásicos', 1),
  ('Miguel', 'Torres', 'miguel@chamosbarber.com', '+58 414-7654321', 
   'miguel-torres', 'Experto en barbas y degradados', 2);
```

### 4. `servicios`

**Descripción**: Catálogo de servicios ofrecidos por la barbería.

**RLS ENABLED**

```sql
CREATE TABLE servicios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text,
  precio numeric(10,2) NOT NULL,
  duracion int NOT NULL, -- en minutos
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Índices
CREATE INDEX idx_servicios_activo ON servicios(activo);
```

**Campos**:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Identificador único |
| nombre | text | NOT NULL | Nombre del servicio |
| descripcion | text | - | Descripción detallada |
| precio | numeric(10,2) | NOT NULL | Precio en USD/BS |
| duracion | int | NOT NULL | Duración en minutos |
| activo | boolean | DEFAULT true | Si está disponible |
| created_at | timestamp | DEFAULT now() | Fecha de creación |

**Relaciones**:
- ← `citas.servicio_id` (1:n)

**Ejemplo de Datos**:
```sql
INSERT INTO servicios (nombre, descripcion, precio, duracion) 
VALUES 
  ('Corte Clásico', 'Corte tradicional con tijera', 15.00, 30),
  ('Corte + Barba', 'Corte y arreglo de barba', 25.00, 45),
  ('Degradado', 'Degradado profesional', 20.00, 40),
  ('Afeitado Clásico', 'Afeitado con navaja', 18.00, 30);
```

### 5. `citas`

**Descripción**: Reservas de citas realizadas por clientes.

**RLS ENABLED** - Políticas para proteger datos de clientes

```sql
CREATE TABLE citas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  barbero_id uuid NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
  servicio_id uuid NOT NULL REFERENCES servicios(id) ON DELETE RESTRICT,
  cliente_nombre text NOT NULL,
  cliente_email text NOT NULL,
  cliente_telefono text NOT NULL,
  fecha date NOT NULL,
  hora time NOT NULL,
  estado text DEFAULT 'pendiente' CHECK (
    estado IN ('pendiente', 'confirmada', 'completada', 'cancelada')
  ),
  notas text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Constraint: No permitir citas duplicadas (mismo barbero, fecha, hora)
  CONSTRAINT unique_cita_barbero_fecha_hora 
    UNIQUE (barbero_id, fecha, hora)
);

-- Índices para optimizar queries
CREATE INDEX idx_citas_barbero_id ON citas(barbero_id);
CREATE INDEX idx_citas_fecha ON citas(fecha);
CREATE INDEX idx_citas_estado ON citas(estado);
CREATE INDEX idx_citas_barbero_fecha ON citas(barbero_id, fecha);
```

**Campos**:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Identificador único |
| barbero_id | uuid | FK → barberos, NOT NULL | Barbero asignado |
| servicio_id | uuid | FK → servicios, NOT NULL | Servicio solicitado |
| cliente_nombre | text | NOT NULL | Nombre del cliente |
| cliente_email | text | NOT NULL | Email del cliente |
| cliente_telefono | text | NOT NULL | Teléfono del cliente |
| fecha | date | NOT NULL | Fecha de la cita |
| hora | time | NOT NULL | Hora de la cita |
| estado | text | CHECK, DEFAULT 'pendiente' | Estado actual |
| notas | text | - | Notas adicionales |
| created_at | timestamp | DEFAULT now() | Fecha de creación |
| updated_at | timestamp | DEFAULT now() | Última actualización |

**Estados Posibles**:
- `pendiente`: Recién creada, esperando confirmación
- `confirmada`: Confirmada por el barbero/admin
- `completada`: Cita realizada
- `cancelada`: Cancelada por cliente o barbero

**Relaciones**:
- `barbero_id` → `barberos(id)` (n:1, ON DELETE CASCADE)
- `servicio_id` → `servicios(id)` (n:1, ON DELETE RESTRICT)

**Constraints**:
- `unique_cita_barbero_fecha_hora`: Evita citas duplicadas en el mismo horario

**Ejemplo de Query de Creación**:
```sql
INSERT INTO citas (
  barbero_id, 
  servicio_id, 
  cliente_nombre, 
  cliente_email, 
  cliente_telefono, 
  fecha, 
  hora, 
  notas
) VALUES (
  'uuid-del-barbero',
  'uuid-del-servicio',
  'Juan Pérez',
  'juan@example.com',
  '+58 414-1234567',
  '2024-01-15',
  '14:00:00',
  'Primera vez, corte clásico'
);
```

### 6. `portfolio`

**Descripción**: Galería de imágenes de trabajos realizados por los barberos.

**RLS ENABLED**

```sql
CREATE TABLE portfolio (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  barbero_id uuid REFERENCES barberos(id) ON DELETE CASCADE,
  imagen_url text NOT NULL,
  descripcion text,
  orden int DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Índices
CREATE INDEX idx_portfolio_barbero_id ON portfolio(barbero_id);
CREATE INDEX idx_portfolio_orden ON portfolio(orden);
```

**Campos**:

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Identificador único |
| barbero_id | uuid | FK → barberos, NULLABLE | Barbero (null = galería general) |
| imagen_url | text | NOT NULL | URL de la imagen (Supabase Storage) |
| descripcion | text | - | Descripción del trabajo |
| orden | int | DEFAULT 0 | Orden de visualización |
| created_at | timestamp | DEFAULT now() | Fecha de subida |

**Relaciones**:
- `barbero_id` → `barberos(id)` (n:1, ON DELETE CASCADE)

## 🔐 Row Level Security (RLS)

### Estado Actual de RLS por Tabla

| Tabla | RLS Enabled | Motivo |
|-------|-------------|--------|
| `admin_users` | ❌ NO | Evitar recursión infinita en auth |
| `barberos` | ✅ SÍ | Proteger datos, políticas activas |
| `servicios` | ✅ SÍ | Proteger catálogo |
| `citas` | ✅ SÍ | Proteger datos de clientes |
| `portfolio` | ✅ SÍ | Proteger galería |

### Políticas RLS Importantes

⚠️ **NO MODIFICAR las políticas de `barberos`** - Ya están funcionando correctamente

```sql
-- Ejemplo de política en 'citas' (público puede insertar)
CREATE POLICY "public_can_insert_citas" ON citas
  FOR INSERT TO public
  WITH CHECK (true);

-- Admin puede ver todo (implementado en código, no en RLS)
-- Barberos ven solo sus citas (implementado en código)
```

## 🔄 Triggers y Funciones

### Actualizar `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar a tablas que tienen updated_at
CREATE TRIGGER update_barberos_updated_at 
  BEFORE UPDATE ON barberos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_citas_updated_at 
  BEFORE UPDATE ON citas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 📊 Queries Comunes

### 1. Admin: Ver todas las citas con información relacionada

```sql
SELECT 
  c.*,
  b.nombre || ' ' || b.apellido as barbero_nombre,
  s.nombre as servicio_nombre,
  s.precio as servicio_precio
FROM citas c
JOIN barberos b ON c.barbero_id = b.id
JOIN servicios s ON c.servicio_id = s.id
ORDER BY c.fecha DESC, c.hora DESC;
```

### 2. Barbero: Ver solo sus citas

```sql
SELECT 
  c.*,
  s.nombre as servicio_nombre,
  s.precio as servicio_precio
FROM citas c
JOIN servicios s ON c.servicio_id = s.id
WHERE c.barbero_id = 'uuid-del-barbero'
ORDER BY c.fecha DESC, c.hora DESC;
```

### 3. Estadísticas de citas

```sql
SELECT 
  estado,
  COUNT(*) as cantidad
FROM citas
WHERE fecha >= CURRENT_DATE
GROUP BY estado;
```

### 4. Barberos más solicitados

```sql
SELECT 
  b.nombre || ' ' || b.apellido as barbero,
  COUNT(c.id) as total_citas
FROM barberos b
LEFT JOIN citas c ON b.id = c.barbero_id
GROUP BY b.id, b.nombre, b.apellido
ORDER BY total_citas DESC;
```

### 5. Horarios disponibles para un barbero en una fecha

```sql
-- Primero obtener las horas ocupadas
SELECT hora 
FROM citas 
WHERE barbero_id = 'uuid-del-barbero' 
  AND fecha = '2024-01-15'
  AND estado != 'cancelada';

-- Luego filtrar horarios disponibles en la aplicación
-- (9:00 AM - 6:00 PM, intervalos de 30 min)
```

## 🔧 Migraciones y Mantenimiento

### Script de Limpieza de Citas Antiguas

```sql
-- Eliminar citas completadas de más de 6 meses
DELETE FROM citas 
WHERE estado = 'completada' 
  AND fecha < CURRENT_DATE - INTERVAL '6 months';
```

### Backup Recomendado

```bash
# Backup completo
pg_dump -h supabase.chamosbarber.com -U postgres chamosbarber > backup.sql

# Backup solo de una tabla
pg_dump -h supabase.chamosbarber.com -U postgres -t citas chamosbarber > citas_backup.sql
```

## 📈 Optimización

### Índices Recomendados (Ya Implementados)

✅ Todos los índices mencionados en cada tabla ya están creados

### Análisis de Performance

```sql
-- Ver queries lentas
SELECT * FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Análisis de uso de índices
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 🆕 Cambios Futuros (Planificados)

1. **Tabla `pagos`**:
   - Registrar pagos de citas
   - Estado: pagado/pendiente
   - Método: efectivo/transferencia/tarjeta

2. **Tabla `notificaciones`**:
   - Sistema de notificaciones
   - Email/SMS recordatorios

3. **Tabla `horarios_barberos`**:
   - Disponibilidad personalizada por barbero
   - Días laborables, horarios especiales

## 📚 Referencias

- [Supabase Database Docs](https://supabase.com/docs/guides/database)
- [PostgreSQL 15 Docs](https://www.postgresql.org/docs/15/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
