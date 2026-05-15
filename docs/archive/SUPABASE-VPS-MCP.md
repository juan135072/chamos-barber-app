# 🔌 Conexión a Supabase VPS mediante MCP

Documentación para trabajar con la instancia de Supabase self-hosted en el VPS mediante MCP (Model Context Protocol).

## 📊 Información de la Instancia

**Tipo:** Self-hosted en VPS con Coolify  
**Proyecto:** Chamos Barber App  
**Base de Datos:** PostgreSQL 15  
**URL API:** http://supabase.chamosbarber.com  
**Studio URL:** http://supabase.chamosbarber.com/

## 🔑 Credenciales Configuradas

Las credenciales están almacenadas en `.env.local`:

```bash
# API URL
NEXT_PUBLIC_SUPABASE_URL=http://supabase.chamosbarber.com

# Anon Key (acceso público limitado)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# Service Role Key (acceso completo - ADMIN)
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# JWT Secret
SUPABASE_JWT_SECRET=2O3K1P4dP4SxFjWBXye61DojrD3JVKo3

# Studio Password
SUPABASE_STUDIO_PASSWORD=IGnWZHipT8IeSI7j
```

## 🗄️ Schema de la Base de Datos

### Tablas Activas (con datos)

#### 1. **admin_users** (3 registros)
```
Columnas:
  - id (string)
  - email (string)
  - nombre (string)
  - rol (string)
  - activo (boolean)
  - telefono (string)
  - avatar_url (object)
  - ultimo_acceso (object)
  - created_at (string)
  - updated_at (string)
```

#### 2. **barberos** (4 registros)
```
Columnas:
  - id (string)
  - nombre (string)
  - apellido (string)
  - email (string)
  - telefono (string)
  - especialidad (string)
  - imagen_url (object)
  - activo (boolean)
  - descripcion (string)
  - instagram (string)
  - experiencia_anos (number)
  - calificacion (number)
  - precio_base (number)
  - orden_display (number)
  - created_at (string)
  - updated_at (string)
```

#### 3. **servicios** (15 registros)
```
Columnas:
  - id (string)
  - nombre (string)
  - descripcion (string)
  - precio (number)
  - duracion_minutos (number)
  - activo (boolean)
  - categoria (string)
  - imagen_url (object)
  - popular (boolean)
  - orden_display (number)
  - created_at (string)
  - updated_at (string)
```

#### 4. **citas** (3 registros)
```
Columnas:
  - id (string)
  - cliente_nombre (string)
  - cliente_email (string)
  - cliente_telefono (string)
  - barbero_id (string)
  - servicio_id (string)
  - fecha (string)
  - hora (string)
  - estado (string)
  - notas (string)
  - precio_final (number)
  - metodo_pago (string)
  - confirmada_por (object)
  - fecha_confirmacion (object)
  - created_at (string)
  - updated_at (string)
```

#### 5. **horarios_trabajo** (21 registros)
```
Columnas:
  - id (string)
  - barbero_id (string)
  - dia_semana (number)
  - hora_inicio (string)
  - hora_fin (string)
  - activo (boolean)
  - descanso_inicio (string)
  - descanso_fin (string)
  - created_at (string)
  - updated_at (string)
```

#### 6. **sitio_configuracion** (8 registros)
```
Columnas:
  - id (string)
  - clave (string)
  - valor (string)
  - tipo (string)
  - descripcion (string)
  - categoria (string)
  - publico (boolean)
  - created_at (string)
  - updated_at (string)
```

### Tablas Vacías (sin datos)

- **barbero_portfolio** (0 registros)
- **portfolio_galerias** (0 registros)
- **estadisticas** (0 registros)

## 🛠️ Scripts Disponibles

### 1. Test de Conexión
Prueba la conexión con ambas keys (anon y service role):

```bash
node scripts/test-supabase-connection.js
```

**Salida esperada:**
```
🔧 Configuración de Supabase VPS
================================
URL: http://supabase.chamosbarber.com
Anon Key: ✅ Configurado
Service Key: ✅ Configurado

📡 Probando conexión con Anon Key...
✅ Conexión con Anon Key exitosa

📡 Probando conexión con Service Role Key...
✅ Conexión con Service Role Key exitosa
📊 Base de datos accesible

📋 Tablas disponibles en la base de datos:
  ✅ admin_users: 3 registros
  ✅ barberos: 4 registros
  ✅ servicios: 15 registros
  ✅ citas: 3 registros
  ✅ horarios_trabajo: 21 registros
  ✅ barbero_portfolio: 0 registros
  ✅ portfolio_galerias: 0 registros
  ✅ sitio_configuracion: 8 registros
  ✅ estadisticas: 0 registros
```

### 2. Explorar Schema
Explora la estructura completa de la base de datos:

```bash
node scripts/supabase-schema.js
```

### 3. Ejecutar Consultas SQL (Preparado para futuro)
Para ejecutar consultas SQL directas:

```bash
node scripts/supabase-query.js "SELECT * FROM barberos WHERE activo = true"
```

## 🔐 Niveles de Acceso

### Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
- ✅ Lectura de datos públicos
- ✅ Operaciones permitidas por RLS (Row Level Security)
- ❌ No puede realizar operaciones administrativas
- ✅ Seguro para exponer al cliente

### Service Role Key (SUPABASE_SERVICE_ROLE_KEY)
- ✅ Acceso completo a todas las tablas
- ✅ Bypass de Row Level Security
- ✅ Operaciones administrativas
- ⚠️ **NUNCA** exponer al cliente
- ⚠️ Solo usar en backend/scripts

## 📡 Endpoints de la API

### API REST
```
Base URL: http://supabase.chamosbarber.com/rest/v1/
```

Ejemplo de uso:
```bash
curl http://supabase.chamosbarber.com/rest/v1/barberos \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Supabase Studio (Panel Web)
```
URL: http://supabase.chamosbarber.com/
Password: IGnWZHipT8IeSI7j
```

## 🔌 Uso en Código JavaScript/TypeScript

### Conexión Básica (Cliente)
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Leer datos
const { data, error } = await supabase
  .from('barberos')
  .select('*')
  .eq('activo', true);
```

### Conexión Administrativa (Backend/Server)
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Acceso completo sin restricciones RLS
const { data, error } = await supabaseAdmin
  .from('admin_users')
  .select('*');
```

## 🚀 Casos de Uso con MCP

### 1. Backup de Datos
Crear backup de todas las tablas:
```bash
node scripts/backup-database.js
```

### 2. Migración de Datos
Migrar datos desde otra base de datos:
```bash
node scripts/migrate-data.js --source=local --target=vps
```

### 3. Análisis de Datos
Generar reportes y estadísticas:
```bash
node scripts/analyze-data.js --table=citas --period=monthly
```

### 4. Sync Bidireccional
Sincronizar datos entre local y VPS:
```bash
node scripts/sync-database.js --mode=bidirectional
```

## 📦 Configuración de MCP

Archivo de configuración: `supabase-mcp-config.json`

```json
{
  "name": "Chamos Barber - Supabase VPS",
  "instance_type": "self-hosted",
  "connection": {
    "api_url": "http://supabase.chamosbarber.com",
    "studio_url": "http://supabase.chamosbarber.com/",
    "anon_key": "...",
    "service_role_key": "...",
    "jwt_secret": "..."
  },
  "database": {
    "host": "supabase.chamosbarber.com",
    "port": 5432,
    "database": "postgres",
    "user": "postgres"
  }
}
```

## 🔒 Seguridad

### ⚠️ IMPORTANTE

1. **NUNCA** commitear `.env.local` a Git
2. **NUNCA** exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente
3. Usar `NEXT_PUBLIC_SUPABASE_ANON_KEY` solo para operaciones públicas
4. Implementar Row Level Security (RLS) en todas las tablas
5. Validar todos los inputs antes de queries

### Verificación de .gitignore
```bash
# Verificar que .env.local está ignorado
git check-ignore .env.local
# Debe devolver: .env.local
```

## 📝 Próximos Pasos

### Scripts a Crear
- [ ] `backup-database.js` - Backup completo de datos
- [ ] `restore-database.js` - Restaurar desde backup
- [ ] `migrate-data.js` - Migración de datos
- [ ] `sync-database.js` - Sincronización bidireccional
- [ ] `analyze-data.js` - Análisis y reportes
- [ ] `seed-database.js` - Poblar base de datos de prueba

### Mejoras de Infraestructura
- [ ] Configurar backups automáticos diarios
- [ ] Implementar monitoreo de base de datos
- [ ] Configurar alertas de errores
- [ ] Crear réplicas de lectura

### Optimizaciones
- [ ] Índices para queries frecuentes
- [ ] Caché de queries repetitivas
- [ ] Optimización de RLS policies
- [ ] Implementar connection pooling

## 🆘 Solución de Problemas

### Error: Connection Refused
```bash
# Verificar que Supabase está corriendo en el VPS
curl http://supabase.chamosbarber.com/health
```

### Error: Invalid API Key
```bash
# Verificar que las keys están correctamente configuradas
node scripts/test-supabase-connection.js
```

### Error: RLS Policy Violation
```bash
# Usar Service Role Key para operaciones administrativas
# O ajustar las políticas RLS en Supabase Studio
```

## 📚 Referencias

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Self-Hosting Supabase](https://supabase.com/docs/guides/self-hosting)

---

**Última actualización:** 2025-10-28  
**Rama:** `experimental/local-mcp-database`  
**Estado:** ✅ Conexión verificada y funcionando
