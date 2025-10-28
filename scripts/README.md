# 🛠️ Scripts de Supabase VPS

Scripts de utilidad para gestionar la base de datos Supabase en el VPS mediante MCP.

## 📋 Scripts Disponibles

### 1. test-supabase-connection.js
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

### 2. supabase-schema.js
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

### 3. backup-database.js
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

### 4. supabase-query.js
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
