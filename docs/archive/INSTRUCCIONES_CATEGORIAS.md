# 📋 Instrucciones: Gestión de Categorías de Servicios

## ✅ Lo que se ha implementado

Se ha agregado un **sistema completo de gestión de categorías** que permite al administrador modificar dinámicamente las categorías de servicios desde el panel de administración.

### 🎯 Características principales

1. **Nueva pestaña "Categorías"** en el panel de administración
2. **CRUD completo** (Crear, Leer, Actualizar, Eliminar) de categorías
3. **Iconos emoji** personalizables para cada categoría
4. **Orden ajustable** con botones arriba/abajo
5. **Estado activo/inactivo** para cada categoría
6. **Protección de eliminación**: No se puede eliminar una categoría que tiene servicios asociados
7. **Filtros dinámicos** en la pestaña de Servicios con iconos

---

## 🚀 Pasos para activar la funcionalidad

### Paso 1: Ejecutar el script SQL en Supabase

**⚠️ IMPORTANTE**: Antes de usar la nueva funcionalidad, debes ejecutar el script SQL que crea la tabla en la base de datos.

#### Usando Supabase Dashboard (Más fácil):

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto **Chamos Barber**
3. En el menú lateral, haz clic en **SQL Editor**
4. Haz clic en **+ New Query**
5. Abre el archivo `sql/create_categorias_servicios.sql` de este proyecto
6. **Copia todo el contenido** del archivo
7. **Pégalo** en el editor de SQL de Supabase
8. Haz clic en el botón **Run** (▶️)
9. Deberías ver un mensaje de éxito: "Success. No rows returned"

#### Usando Supabase CLI (Alternativa):

```bash
# Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# Conectar con tu proyecto
supabase link --project-ref TU_PROJECT_REF

# Ejecutar el script
supabase db execute -f sql/create_categorias_servicios.sql
```

### Paso 2: Verificar que funcionó

Ejecuta esta consulta en el SQL Editor de Supabase:

```sql
SELECT * FROM categorias_servicios ORDER BY orden;
```

Deberías ver **5 categorías predeterminadas**:
- ✂️ cortes
- 🧔 barbas
- 🎨 tintes
- 💆 tratamientos
- ⭐ combos

### Paso 3: Usar la nueva funcionalidad

1. Inicia sesión en el panel de administración: `https://tu-dominio.com/login`
2. Verás una nueva pestaña **"Categorías"** en la navegación
3. Haz clic en **"Categorías"**
4. ¡Ahora puedes gestionar las categorías!

---

## 🎨 Cómo usar el sistema de categorías

### Crear nueva categoría

1. Haz clic en **"Nueva Categoría"**
2. Completa el formulario:
   - **Nombre**: Ej: "peinados" (se guardará en minúsculas automáticamente)
   - **Icono**: Selecciona uno de los sugeridos o escribe tu propio emoji
   - **Descripción**: Opcional, breve descripción
   - **Estado**: Marca si quieres que esté activa desde el inicio
3. Haz clic en **"Crear"**

### Editar categoría existente

1. En la tabla de categorías, haz clic en el icono **✏️ Editar**
2. Modifica los campos necesarios
3. Haz clic en **"Actualizar"**

### Cambiar orden de visualización

- Usa los botones **⬆️ Arriba** y **⬇️ Abajo** para reorganizar
- El orden se actualiza automáticamente
- Este orden se refleja en los filtros de la pestaña "Servicios"

### Activar/Desactivar categoría

- Haz clic en el badge **Activa** o **Inactiva** en la tabla
- Las categorías inactivas no aparecen en los filtros públicos
- Los servicios con categorías inactivas siguen existiendo

### Eliminar categoría

1. Haz clic en el icono **🗑️ Eliminar**
2. Si hay servicios usando esa categoría, verás un error
3. Debes reasignar o eliminar esos servicios primero
4. Luego podrás eliminar la categoría

---

## 📊 Integración con Servicios

### Antes (Categorías fijas en código)

```typescript
const categorias = ['cortes', 'barbas', 'tintes', 'tratamientos', 'combos']
```

### Después (Categorías dinámicas desde BD)

- Los filtros se cargan automáticamente desde la base de datos
- Cada categoría muestra su icono personalizado
- Solo se muestran categorías activas
- El orden se respeta según lo configurado

---

## 🔒 Seguridad (Row Level Security)

El sistema incluye políticas de seguridad RLS:

| Operación | Permiso |
|-----------|---------|
| **Leer** (SELECT) | ✅ Todos (solo categorías activas) |
| **Crear** (INSERT) | ⚠️ Solo administradores |
| **Editar** (UPDATE) | ⚠️ Solo administradores |
| **Eliminar** (DELETE) | ⚠️ Solo administradores |

---

## 📂 Archivos modificados/creados

### Nuevos archivos:
- ✅ `src/components/admin/tabs/CategoriasTab.tsx` - Vista de gestión
- ✅ `src/components/admin/modals/CategoriaModal.tsx` - Modal crear/editar
- ✅ `sql/create_categorias_servicios.sql` - Script de creación de tabla
- ✅ `sql/README.md` - Documentación del script SQL
- ✅ `INSTRUCCIONES_CATEGORIAS.md` - Este archivo

### Archivos modificados:
- ✅ `src/pages/admin.tsx` - Agregado tab de Categorías
- ✅ `src/components/admin/tabs/ServiciosTab.tsx` - Categorías dinámicas
- ✅ `lib/database.types.ts` - Tipos de la nueva tabla

---

## 🐛 Solución de problemas

### Error: "relation categorias_servicios does not exist"

**Causa**: No se ha ejecutado el script SQL.
**Solución**: Ve al Paso 1 y ejecuta el script en Supabase.

### No puedo eliminar una categoría

**Causa**: Hay servicios usando esa categoría.
**Solución**: 
1. Ve a la pestaña "Servicios"
2. Filtra por esa categoría
3. Elimina o reasigna los servicios
4. Intenta eliminar la categoría nuevamente

### Las categorías no se cargan

**Causa**: Error de conexión o permisos RLS.
**Solución**: 
1. Verifica que el usuario admin esté en `admin_users` con `rol = 'admin'`
2. Verifica que las categorías tengan `activa = true`
3. Revisa la consola del navegador para errores

### No aparece la pestaña "Categorías"

**Causa**: Caché del navegador o código no actualizado.
**Solución**: 
1. Haz hard refresh (Ctrl + Shift + R)
2. Verifica que el código esté actualizado
3. Reinicia el servidor de desarrollo

---

## 📱 URL del servidor de desarrollo

**Servidor activo en**: https://3000-ipv83x9w638fd3sxre87s-8f57ffe2.sandbox.novita.ai

---

## 🎉 ¡Listo!

Una vez ejecutado el script SQL, el sistema de categorías estará completamente funcional. Podrás:

- ✨ Crear categorías personalizadas con iconos
- 🎨 Organizar tus servicios por categorías dinámicas
- 📊 Visualizar mejor tu catálogo de servicios
- 🔄 Adaptar las categorías según las necesidades del negocio

## 📞 Soporte

Si tienes alguna duda o problema:
1. Revisa la sección "Solución de problemas" arriba
2. Verifica los logs en la consola del navegador
3. Revisa el archivo `sql/README.md` para más detalles técnicos

---

**Última actualización**: Commit `76ed092`  
**Rama**: `master`  
**Estado**: ✅ Código pusheado al repositorio
