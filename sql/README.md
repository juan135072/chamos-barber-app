# Scripts SQL - Chamos Barber

Este directorio contiene los scripts SQL necesarios para la base de datos del proyecto.

## Script: create_categorias_servicios.sql

Este script crea la tabla `categorias_servicios` que permite gestionar dinámicamente las categorías de servicios desde el panel de administración.

### Funcionalidades

- ✅ Tabla `categorias_servicios` con soporte para:
  - Nombre único de categoría
  - Descripción opcional
  - Icono (emoji) opcional
  - Orden de visualización
  - Estado activo/inactivo
- ✅ Categorías predeterminadas incluidas (cortes, barbas, tintes, tratamientos, combos)
- ✅ Row Level Security (RLS) configurado:
  - Lectura pública para categorías activas
  - Solo administradores pueden crear/editar/eliminar
- ✅ Índices para consultas optimizadas
- ✅ Trigger para actualizar `updated_at` automáticamente

### Cómo ejecutar el script

#### Opción 1: Usando Supabase Dashboard (Recomendado)

1. Inicia sesión en [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a la sección **SQL Editor** en el menú lateral
4. Haz clic en **New Query**
5. Copia y pega el contenido del archivo `create_categorias_servicios.sql`
6. Haz clic en **Run** para ejecutar el script

#### Opción 2: Usando Supabase CLI

```bash
# Asegúrate de tener Supabase CLI instalado
# npm install -g supabase

# Conecta con tu proyecto
supabase link --project-ref YOUR_PROJECT_REF

# Ejecuta el script
supabase db execute -f sql/create_categorias_servicios.sql
```

#### Opción 3: Usando psql

```bash
# Conecta a tu base de datos de Supabase
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Ejecuta el script
\i sql/create_categorias_servicios.sql
```

### Verificación

Después de ejecutar el script, puedes verificar que funcionó correctamente:

```sql
-- Ver todas las categorías
SELECT * FROM categorias_servicios ORDER BY orden;

-- Debería mostrar 5 categorías predeterminadas
```

### Integración con la aplicación

Una vez ejecutado el script, el panel de administración tendrá una nueva pestaña **"Categorías"** donde podrás:

- ✨ Crear nuevas categorías
- ✏️ Editar categorías existentes
- 🗑️ Eliminar categorías (si no tienen servicios asociados)
- ↕️ Cambiar el orden de visualización
- 👁️ Activar/desactivar categorías

### Notas importantes

⚠️ **Antes de eliminar una categoría**: El sistema verificará que no haya servicios usando esa categoría. Si existen servicios asociados, deberás reasignarlos o eliminarlos primero.

⚠️ **Nombres en minúsculas**: Los nombres de categorías se guardan automáticamente en minúsculas para mantener consistencia.

⚠️ **RLS habilitado**: Las policies de Row Level Security están configuradas para que solo usuarios admin puedan modificar categorías.

### Estructura de la tabla

```sql
categorias_servicios (
  id UUID PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  icono TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
```

### Políticas de acceso (RLS)

| Operación | Quién puede hacerlo |
|-----------|---------------------|
| SELECT    | Todos (solo categorías activas) |
| INSERT    | Solo administradores |
| UPDATE    | Solo administradores |
| DELETE    | Solo administradores |

## Soporte

Si encuentras algún problema al ejecutar el script, verifica:

1. ✅ Que tienes permisos de administrador en Supabase
2. ✅ Que la tabla `admin_users` existe y tiene registros con `rol = 'admin'`
3. ✅ Que el usuario autenticado está en la tabla `admin_users`

Para más información, consulta la [documentación de Supabase](https://supabase.com/docs).
