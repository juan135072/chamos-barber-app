# 🛠️ Scripts de Supabase VPS

Scripts de utilidad para gestionar la base de datos Supabase en el VPS mediante MCP.

## 📋 Scripts Disponibles

### 0. 🎨 Database Viewer (NUEVO) - Visualizador Web Interactivo
Interfaz web moderna para explorar tu base de datos visualmente.

**Uso:**
```bash
npm run db:viewer
# o
node scripts/start-db-viewer.js
```

**Qué hace:**
- 🌐 Servidor web en http://localhost:3001
- 📊 Visualización interactiva de todas las tablas
- 🔍 Búsqueda en tiempo real
- 📥 Exportación a JSON con un clic
- 🎨 Interfaz moderna y responsive

**Acceso:**
Se abre automáticamente en tu navegador o visita:
- **Local**: http://localhost:3001
- **Sandbox**: Usa GetServiceUrl para obtener URL pública

**Características destacadas:**
- ✅ No requiere extensiones de VS Code
- ✅ 100% JavaScript vanilla
- ✅ Conexión directa a Supabase VPS
- ✅ Filtrado y búsqueda instantánea
- ✅ Ver todas las 9 tablas con un clic

---

### 1. view-table.js (NUEVO) - Visualizador en Terminal
Muestra datos de una tabla directamente en la terminal.

**Uso:**
```bash
npm run db:view <tabla> [límite]
# o
node scripts/view-table.js barberos 10
```

**Ejemplos:**
```bash
# Ver todas las tablas disponibles
npm run db:view

# Ver primeros 5 barberos
npm run db:view barberos 5

# Ver todos los servicios
npm run db:view servicios 100
```

**Qué hace:**
- 📊 Muestra datos en tabla ASCII
- 📝 Lista columnas y tipos
- 🔢 Cuenta registros totales
- 💡 Sugiere límites si hay más datos

---

### 2. test-supabase-connection.js
Verifica la conexión con la instancia de Supabase VPS.

**Uso:**
```bash
npm run db:test
# o
node scripts/test-supabase-connection.js
```

**Qué hace:**
- ✅ Verifica conexión con Anon Key
- ✅ Verifica conexión con Service Role Key
- ✅ Lista todas las tablas con conteo de registros

**Salida:**
```
🔧 Configuración de Supabase VPS
URL: http://supabase.chamosbarber.com
Anon Key: ✅ Configurado
Service Key: ✅ Configurado

📋 Tablas disponibles:
  ✅ admin_users: 3 registros
  ✅ barberos: 4 registros
  ...
```

---

### 3. open-supabase-studio.js (NUEVO) - Abrir Studio
Abre Supabase Studio en tu navegador.

**Uso:**
```bash
npm run db:studio
# o
node scripts/open-supabase-studio.js
```

**Qué hace:**
- 🎨 Abre http://supabase.chamosbarber.com/
- 🔑 Muestra el password de acceso
- 💡 Tips de características disponibles

---

### 4. supabase-schema.js
Explora la estructura completa de la base de datos.

**Uso:**
```bash
npm run db:schema
# o
node scripts/supabase-schema.js
```

**Qué hace:**
- 📊 Lista todas las tablas
- 📝 Muestra columnas y tipos de datos
- 🔢 Cuenta registros por tabla

**Salida:**
```
🗄️ Explorando Base de Datos de Chamos Barber

📋 Tabla: barberos
==================================================
  Columnas (16):
    - id: string
    - nombre: string
    - apellido: string
    ...
  📊 Registros: 4
```

---

### 5. backup-database.js
Crea un backup completo de todas las tablas.

**Uso:**
```bash
npm run db:backup
# o
node scripts/backup-database.js
```

**Qué hace:**
- 💾 Exporta todas las tablas a JSON
- 📦 Guarda en `/backups/backup-{timestamp}.json`
- 📊 Muestra estadísticas del backup

**Salida:**
```
🗄️ Iniciando Backup de Chamos Barber Database

📦 Haciendo backup de: admin_users
  ✅ 3 registros exportados

✅ Backup completado exitosamente
📊 Total de registros: 54
💾 Archivo: /backups/backup-2025-10-28T01-03-02.json
📦 Tamaño: 25.11 KB
```

**Archivos generados:**
```
backups/
  └── backup-2025-10-28T01-03-02.json
```

---

### 6. supabase-query.js
Ejecuta consultas SQL directas en la base de datos.

**Uso:**
```bash
npm run db:query "SELECT * FROM barberos WHERE activo = true"
# o
node scripts/supabase-query.js "SELECT * FROM barberos"
```

**Qué hace:**
- 🔍 Ejecuta consultas SQL personalizadas
- 📊 Muestra resultados en tabla
- 🔢 Cuenta registros encontrados

**Nota:** Actualmente requiere función `exec_sql` en Supabase. Alternativa:
- Usar Supabase Studio para queries SQL
- Modificar script para usar `.from()` con filtros

---

## 🔧 Configuración

Todos los scripts usan las credenciales de `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 📦 Dependencias

```bash
npm install @supabase/supabase-js dotenv
```

Ya instaladas en el proyecto.

## 🔐 Seguridad

⚠️ **IMPORTANTE:**
- Los scripts usan `SUPABASE_SERVICE_ROLE_KEY` para acceso completo
- **NUNCA** commitear `.env.local` a Git
- **NUNCA** exponer Service Role Key al cliente
- Los backups contienen datos de producción (ignorados en `.gitignore`)

## 🚀 Casos de Uso

### Antes de cambios importantes
```bash
npm run db:backup
```

### Verificar conexión después de cambios
```bash
npm run db:test
```

### Explorar estructura para nuevas features
```bash
npm run db:schema
```

### Inspeccionar datos específicos
```bash
npm run db:query "SELECT * FROM citas WHERE estado = 'pendiente'"
```

## 📚 Documentación Completa

Ver [SUPABASE-VPS-MCP.md](../SUPABASE-VPS-MCP.md) para:
- Configuración detallada de MCP
- Schema completo de la base de datos
- Scripts adicionales planificados
- Solución de problemas
- Referencias y recursos

---

**Rama:** `experimental/local-mcp-database`  
**Última actualización:** 2025-10-28
