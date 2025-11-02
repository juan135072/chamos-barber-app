# 🎨 Database Viewer - Visualizador de Base de Datos

Interfaz web interactiva para visualizar y explorar la base de datos de Supabase VPS.

## 🚀 Inicio Rápido

```bash
# Opción 1: Usar npm script
npm run db:viewer

# Opción 2: Ejecutar directamente
node scripts/start-db-viewer.js
```

El servidor se iniciará en **http://localhost:3001** y se abrirá automáticamente en tu navegador.

## ✨ Características

### 📊 Visualización de Tablas
- **9 tablas disponibles** con íconos identificativos
- Vista de todas las columnas y tipos de datos
- Contador de registros en tiempo real
- Navegación intuitiva entre tablas

### 🔍 Búsqueda en Tiempo Real
- Busca en todos los campos de la tabla activa
- Filtrado instantáneo mientras escribes
- Resaltado de resultados

### 📥 Exportación de Datos
- Exporta cualquier tabla a formato JSON
- Descarga directa al navegador
- Nombre de archivo con timestamp

### 🎨 Interfaz Moderna
- Diseño responsive (móvil y desktop)
- Gradiente morado moderno
- Tablas con hover effects
- Estados visuales (conectado/desconectado)

### 🔄 Acciones Rápidas
- **Refrescar**: Recarga los datos de la tabla actual
- **Exportar JSON**: Descarga la tabla en JSON
- **Abrir en Studio**: Acceso directo al Supabase Studio

## 🗂️ Estructura de Archivos

```
scripts/db-viewer/
├── index.html      # Interfaz principal
├── app.js          # Lógica de la aplicación
└── README.md       # Esta documentación
```

## 📊 Tablas Disponibles

1. **👤 admin_users** (3 registros)
2. **✂️ barberos** (4 registros)
3. **💈 servicios** (15 registros)
4. **📅 citas** (3 registros)
5. **🕐 horarios_trabajo** (21 registros)
6. **🎨 barbero_portfolio** (0 registros)
7. **🖼️ portfolio_galerias** (0 registros)
8. **⚙️ sitio_configuracion** (8 registros)
9. **📊 estadisticas** (0 registros)

## 🔌 Conexión

El visualizador se conecta a tu instancia de Supabase VPS usando:
- **URL**: http://supabase.chamosbarber.com
- **Anon Key**: Configurada en el código
- **Acceso**: Solo lectura (RLS activo)

## 💡 Uso

### 1. Iniciar el servidor
```bash
npm run db:viewer
```

### 2. Explorar tablas
- Haz clic en cualquier tabla del menú lateral
- Los datos se cargarán automáticamente

### 3. Buscar datos
- Usa el campo de búsqueda en la parte superior
- Escribe cualquier término para filtrar resultados

### 4. Exportar datos
- Haz clic en "📥 Exportar JSON"
- El archivo se descargará automáticamente

### 5. Ver en Studio
- Haz clic en "🎨 Abrir en Studio"
- Se abrirá Supabase Studio en una nueva pestaña

## 🛠️ Personalización

### Cambiar puerto
Edita `scripts/start-db-viewer.js`:
```javascript
const PORT = 3001; // Cambia a tu puerto preferido
```

### Modificar estilos
Edita los estilos CSS en `index.html`:
```css
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Agregar funcionalidades
Edita `app.js` para agregar:
- Edición de registros
- Eliminación de datos
- Creación de nuevos registros
- Filtros avanzados

## 🔒 Seguridad

⚠️ **Importante:**
- Solo usa en **desarrollo local**
- El Anon Key está hardcoded (solo lectura)
- **NO expongas** en producción sin autenticación
- RLS está activo para proteger datos sensibles

## 🐛 Solución de Problemas

### El servidor no inicia
```bash
# Verifica que el puerto 3001 esté libre
lsof -i :3001

# Cierra el proceso si está en uso
kill -9 <PID>
```

### No se muestran datos
1. Verifica que Supabase esté accesible
2. Revisa las políticas RLS en Studio
3. Comprueba la consola del navegador (F12)

### Error de conexión
```javascript
// Verifica la URL en app.js
const SUPABASE_URL = 'http://supabase.chamosbarber.com';
```

## 🎯 Ventajas sobre otras opciones

| Característica | DB Viewer | Terminal | Studio |
|----------------|-----------|----------|--------|
| Interfaz visual | ✅ | ❌ | ✅ |
| Local en VS Code | ✅ | ✅ | ❌ |
| Búsqueda rápida | ✅ | ⚠️ | ✅ |
| Exportación | ✅ | ❌ | ✅ |
| Sin instalación | ✅ | ❌ | ✅ |
| Offline | ⚠️ | ✅ | ❌ |

## 📚 Alternativas

### Opción 1: Visualizador en Terminal
```bash
npm run db:view barberos
```
- Más rápido
- Sin interfaz gráfica
- Solo lectura de datos

### Opción 2: Supabase Studio
```bash
npm run db:studio
```
- Interfaz oficial completa
- Edición de datos
- Gestión de tablas y relaciones

### Opción 3: VS Code Extensions
- **PostgreSQL Explorer**
- **Database Client**
- Requiere instalación manual

## 🔗 Enlaces Relacionados

- [SUPABASE-VPS-MCP.md](../../SUPABASE-VPS-MCP.md) - Documentación completa
- [scripts/README.md](../README.md) - Guía de scripts
- [Supabase Studio](http://supabase.chamosbarber.com/) - Panel oficial

---

**Rama:** `experimental/local-mcp-database`  
**Puerto:** 3001  
**Última actualización:** 2025-10-28
