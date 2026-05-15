# 👁️ Visualización de Base de Datos en VS Code

Guía completa para visualizar tu base de datos Supabase VPS directamente desde VS Code.

## 🎯 3 Formas de Visualizar tu Base de Datos

### 1. 🌐 **Visualizador Web Interactivo** (RECOMENDADO)

La forma más visual y completa de explorar tu base de datos.

**Iniciar:**
```bash
npm run db:viewer
```

**URL de Acceso:**
- **Local**: http://localhost:3001
- **Sandbox**: https://3001-ipv83x9w638fd3sxre87s-8f57ffe2.sandbox.novita.ai

**Características:**
- ✅ Interfaz web moderna con gradiente morado
- ✅ Lista de 9 tablas con contadores
- ✅ Clic en tabla para ver todos sus datos
- ✅ Búsqueda en tiempo real (filtra mientras escribes)
- ✅ Exportar tabla a JSON con un botón
- ✅ Botones de acción: Refrescar, Exportar, Abrir Studio
- ✅ Responsive (funciona en móvil y desktop)
- ✅ No requiere extensiones de VS Code

**Capturas Conceptuales:**
```
┌─────────────────────────────────────────────────────────┐
│ 🗄️ Chamos Barber - Database Viewer    ● Conectado    │
│ Rama experimental/local-mcp-database                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📋 TABLAS (9)           │  📊 Tabla: barberos         │
│  ┌──────────────────┐    │  ┌───────────────────┐     │
│  │ 👤 admin_users   │    │  │ 🔄 Refrescar     │     │
│  │ ✂️ barberos ◄──┤    │  │ 📥 Exportar JSON │     │
│  │ 💈 servicios     │    │  │ 🎨 Abrir Studio  │     │
│  │ 📅 citas         │    │  └───────────────────┘     │
│  │ 🕐 horarios...   │    │                            │
│  │ ...              │    │  🔍 [Buscar...]            │
│  └──────────────────┘    │                            │
│                          │  ┌─────────────────────┐  │
│                          │  │ Tabla de Datos      │  │
│                          │  │ ┌────┬────┬────┐   │  │
│                          │  │ │id  │nom │act │   │  │
│                          │  │ ├────┼────┼────┤   │  │
│                          │  │ │1   │Car │✅  │   │  │
│                          │  │ │2   │Lui │✅  │   │  │
│                          │  │ └────┴────┴────┘   │  │
│                          │  └─────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Detener el servidor:**
```bash
# Presiona Ctrl+C en la terminal
# O cierra la terminal donde está corriendo
```

---

### 2. 💻 **Visualizador en Terminal**

Forma rápida de ver datos sin abrir navegador.

**Uso:**
```bash
# Ver lista de tablas disponibles
npm run db:view

# Ver tabla específica (primeros 10 registros)
npm run db:view barberos

# Ver con límite personalizado
npm run db:view servicios 20
```

**Ejemplo de salida:**
```
📊 Visualizando tabla: barberos
================================================================================

📈 Total de registros: 4
👁️  Mostrando: 4 registros
📝 Columnas (16): id, nombre, apellido, email, telefono...

================================================================================
┌─────────┬──────────┬─────────────┬───────────────────────────┐
│ (index) │ nombre   │ apellido    │ email                     │
├─────────┼──────────┼─────────────┼───────────────────────────┤
│ 0       │ 'Carlos' │ 'Mendoza'   │ 'carlos@chamosbarber.com' │
│ 1       │ 'Luis'   │ 'Rodríguez' │ 'luis@chamosbarber.com'   │
│ 2       │ 'Miguel' │ 'García'    │ 'miguel@chamosbarber.com' │
│ 3       │ 'Andrés' │ 'Silva'     │ 'andres@chamosbarber.com' │
└─────────┴──────────┴─────────────┴───────────────────────────┘
```

**Ventajas:**
- ⚡ Más rápido (no carga navegador)
- 📊 Formato tabla ASCII limpio
- 🎯 Ideal para consultas rápidas
- 💾 No consume recursos del navegador

---

### 3. 🎨 **Supabase Studio Oficial**

Panel completo con todas las funcionalidades de Supabase.

**Abrir:**
```bash
npm run db:studio
```

**Acceso Manual:**
- **URL**: http://supabase.chamosbarber.com/
- **Password**: IGnWZHipT8IeSI7j

**Características:**
- ✅ Interfaz oficial de Supabase
- ✅ Editor SQL completo
- ✅ Editar registros (insert, update, delete)
- ✅ Ver relaciones entre tablas
- ✅ Gestionar políticas RLS
- ✅ Configurar Auth y Storage
- ✅ Ver logs y estadísticas

**Cuándo usar:**
- Necesitas editar datos
- Quieres ejecutar SQL personalizado
- Configurar permisos y políticas
- Ver estadísticas y métricas

---

## 📊 Comparación de Opciones

| Característica | 🌐 Web Viewer | 💻 Terminal | 🎨 Studio |
|----------------|---------------|-------------|-----------|
| Interfaz visual | ✅ Moderna | ⚠️ ASCII | ✅ Completa |
| Velocidad | ⚡⚡ | ⚡⚡⚡ | ⚡ |
| Búsqueda | ✅ Tiempo real | ❌ | ✅ Avanzada |
| Exportar datos | ✅ JSON | ❌ | ✅ CSV/JSON |
| Editar registros | ❌ | ❌ | ✅ |
| SQL queries | ❌ | ❌ | ✅ |
| Local en VS Code | ✅ | ✅ | ❌ |
| Sin instalación | ✅ | ✅ | ✅ |
| Filtrado | ✅ | ⚠️ Limitado | ✅ |

## 🚀 Flujo de Trabajo Recomendado

### Para Exploración Rápida
```bash
# 1. Ver qué tablas tienes
npm run db:view

# 2. Ver datos de una tabla específica
npm run db:view barberos
```

### Para Análisis Detallado
```bash
# 1. Iniciar visualizador web
npm run db:viewer

# 2. Abrir en navegador (localhost:3001)
# 3. Explorar tablas visualmente
# 4. Buscar y filtrar datos
# 5. Exportar si necesitas
```

### Para Operaciones Avanzadas
```bash
# 1. Abrir Supabase Studio
npm run db:studio

# 2. Usar SQL Editor
# 3. Editar registros
# 4. Configurar políticas
```

## 🛠️ Scripts Adicionales

### Información de Conexión
```bash
# Ver estado de conexión y tablas
npm run db:test
```

**Salida:**
```
🔧 Configuración de Supabase VPS
================================
URL: http://supabase.chamosbarber.com
Anon Key: ✅ Configurado
Service Key: ✅ Configurado

📋 Tablas disponibles:
  ✅ admin_users: 3 registros
  ✅ barberos: 4 registros
  ✅ servicios: 15 registros
  ...
```

### Ver Schema
```bash
# Explorar estructura completa
npm run db:schema
```

### Backup de Datos
```bash
# Crear backup completo
npm run db:backup
```

## 📁 Archivos del Visualizador

```
scripts/
├── db-viewer/              # Visualizador web
│   ├── index.html          # Interfaz HTML
│   ├── app.js              # Lógica JavaScript
│   └── README.md           # Documentación
├── start-db-viewer.js      # Servidor HTTP
├── view-table.js           # Visualizador terminal
├── open-supabase-studio.js # Abrir Studio
└── README.md               # Guía de scripts
```

## 🔒 Seguridad

**⚠️ IMPORTANTE:**
- El visualizador web usa **Anon Key** (solo lectura)
- Row Level Security (RLS) está activo
- **NO modificable** desde el visualizador web
- Para editar: usa Supabase Studio
- Los scripts de terminal usan **Service Key** (acceso completo)

## 💡 Tips y Trucos

### 1. Mantener el Visualizador Abierto
```bash
# Inicia en una terminal separada
npm run db:viewer

# Deja la terminal abierta
# Trabaja normalmente en otra terminal
```

### 2. Búsqueda Eficiente
En el visualizador web:
- Busca por cualquier campo
- Los resultados se filtran en tiempo real
- Case-insensitive

### 3. Exportar para Análisis
```bash
# Opción 1: Desde visualizador web
# Clic en "📥 Exportar JSON"

# Opción 2: Backup completo
npm run db:backup
# Archivo en: backups/backup-YYYY-MM-DD.json
```

### 4. Ver Múltiples Tablas
```bash
# Terminal 1: Visualizador web
npm run db:viewer

# Terminal 2: Ver otra tabla en terminal
npm run db:view citas
```

## 🆘 Solución de Problemas

### El visualizador no carga
```bash
# 1. Verifica que el servidor esté corriendo
npm run db:viewer

# 2. Abre manualmente en el navegador
# http://localhost:3001
```

### Error "Puerto 3001 en uso"
```bash
# Encuentra y mata el proceso
lsof -i :3001
kill -9 <PID>

# O usa otro puerto (edita start-db-viewer.js)
```

### No se muestran datos
```bash
# 1. Verifica conexión
npm run db:test

# 2. Revisa RLS en Studio
npm run db:studio

# 3. Consulta la tabla directamente
npm run db:view <tabla>
```

## 📚 Documentación Adicional

- **[SUPABASE-VPS-MCP.md](SUPABASE-VPS-MCP.md)** - Configuración completa de MCP
- **[scripts/README.md](scripts/README.md)** - Guía de todos los scripts
- **[scripts/db-viewer/README.md](scripts/db-viewer/README.md)** - Detalles del visualizador web

## 🎯 Conclusión

**Para visualización rápida:** Usa `npm run db:view <tabla>`  
**Para exploración visual:** Usa `npm run db:viewer`  
**Para operaciones avanzadas:** Usa `npm run db:studio`

¡Ahora puedes ver tu base de datos de manera visual directamente desde VS Code! 🎉

---

**Rama:** `experimental/local-mcp-database`  
**Última actualización:** 2025-10-28  
**Versión:** 1.0.0
