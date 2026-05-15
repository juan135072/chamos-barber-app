# Plan de Implementación - Panel de Administración Completo

## Estado Actual del Proyecto

### ✅ Completado:
1. **Datos Demo**: Portfolio (11 imágenes), Galerías (4), Estadísticas (30 días), Citas (10)
2. **Sistema de Reservas**: `/reservar` (funcional con 5 pasos)
3. **Estructura Base**: Admin básico con dashboard y tabs
4. **Autenticación**: Login funcional con Supabase Auth
5. **Base de Datos**: 9 tablas con relaciones y RLS

### 🔄 En Progreso:
- Panel de administración completo con CRUD

### ⏳ Pendiente:
- CRUD de Barberos (formularios, edición, eliminación)
- CRUD de Servicios
- CRUD de Horarios
- Configuración del Sitio (maps, redes sociales)
- Gestión de Cuentas de Barberos
- Sección de Portfolio para Barberos
- Documentación completa

---

## Funcionalidades Requeridas por el Usuario

### 1. Panel de Administración (Dueño)

#### A. Gestión de Barberos
- ✅ Listar barberos activos/inactivos
- ⏳ Crear nuevo barbero
- ⏳ Editar información del barbero
- ⏳ Desactivar/Activar barbero
- ⏳ Eliminar barbero
- ⏳ Asignar imagen de perfil
- ⏳ Configurar especialidades

**Campos del Barbero**:
```typescript
{
  nombre: string
  apellido: string
  email: string | null
  telefono: string | null
  especialidad: string
  imagen_url: string | null
  activo: boolean
  descripcion: string | null
  instagram: string | null
  experiencia_anos: number
  calificacion: number
  precio_base: number
  orden_display: number
}
```

#### B. Gestión de Servicios
- ✅ Listar servicios por categoría
- ⏳ Crear nuevo servicio
- ⏳ Editar servicio existente
- ⏳ Desactivar/Activar servicio
- ⏳ Eliminar servicio
- ⏳ Configurar precios y duraciones
- ⏳ Marcar servicios populares
- ⏳ Ordenar servicios

**Campos del Servicio**:
```typescript
{
  nombre: string
  descripcion: string | null
  precio: number
  duracion_minutos: number
  activo: boolean
  categoria: string
  imagen_url: string | null
  popular: boolean
  orden_display: number
}
```

#### C. Gestión de Horarios
- ⏳ Configurar horarios por barbero
- ⏳ Definir días de trabajo
- ⏳ Establecer horas de inicio/fin
- ⏳ Configurar descansos
- ⏳ Activar/Desactivar días específicos
- ⏳ Vista semanal de horarios

**Campos de Horario**:
```typescript
{
  barbero_id: string
  dia_semana: number (0=Domingo, 6=Sábado)
  hora_inicio: string (HH:MM)
  hora_fin: string (HH:MM)
  descanso_inicio: string | null
  descanso_fin: string | null
  activo: boolean
}
```

#### D. Configuración del Sitio
- ⏳ Editar información del negocio
- ⏳ Configurar ubicación en Google Maps
- ⏳ Enlaces a redes sociales
- ⏳ Información de contacto
- ⏳ Configuración general

**Configuraciones Disponibles**:
```typescript
{
  sitio_nombre: string
  sitio_telefono: string
  sitio_email: string
  sitio_direccion: string
  google_maps_url: string
  facebook_url: string
  instagram_url: string
  whatsapp_numero: string
}
```

#### E. Gestión de Usuarios/Permisos
- ⏳ Crear cuenta para barberos
- ⏳ Asignar roles (admin, barbero, recepcionista)
- ⏳ Configurar permisos por rol
- ⏳ Activar/Desactivar cuentas
- ⏳ Resetear contraseñas

**Tabla admin_users**:
```typescript
{
  email: string
  nombre: string
  rol: string ('admin' | 'barbero' | 'recepcionista')
  activo: boolean
  telefono: string | null
  avatar_url: string | null
}
```

### 2. Panel del Barbero (Acceso Limitado)

#### A. Portfolio Personal
- ⏳ Subir fotos de trabajos realizados
- ⏳ Agregar título y descripción
- ⏳ Etiquetar trabajos (tags)
- ⏳ Ordenar portfolio
- ⏳ Activar/Desactivar imágenes
- ⏳ Ver estadísticas de likes

**Tabla barbero_portfolio**:
```typescript
{
  barbero_id: string
  titulo: string
  descripcion: string | null
  imagen_url: string
  activo: boolean
  orden: number
  likes: number
  tags: string[] | null
  fecha_trabajo: string | null
}
```

#### B. Mis Citas
- ✅ Ver citas asignadas
- ⏳ Filtrar por fecha/estado
- ⏳ Ver detalles del cliente
- ⏳ Agregar notas internas

#### C. Mis Estadísticas
- ⏳ Citas completadas
- ⏳ Ingresos generados
- ⏳ Calificación promedio
- ⏳ Clientes atendidos

---

## Arquitectura de Componentes

### Admin Panel Structure
```
src/pages/admin.tsx (Main Container)
  ├── components/admin/
  │   ├── Dashboard.tsx (Vista general)
  │   ├── BarberosTab.tsx (CRUD Barberos)
  │   ├── ServiciosTab.tsx (CRUD Servicios)
  │   ├── HorariosTab.tsx (CRUD Horarios)
  │   ├── ConfiguracionTab.tsx (Sitio Config)
  │   ├── UsuariosTab.tsx (Gestión de usuarios)
  │   └── PortfolioTab.tsx (Para barberos)
  │
  ├── components/admin/modals/
  │   ├── BarberoModal.tsx (Create/Edit Barbero)
  │   ├── ServicioModal.tsx (Create/Edit Servicio)
  │   ├── HorarioModal.tsx (Config Horarios)
  │   ├── UsuarioModal.tsx (Create/Edit Usuario)
  │   └── PortfolioModal.tsx (Upload imagen)
  │
  └── components/admin/shared/
      ├── Table.tsx (Tabla reutilizable)
      ├── Modal.tsx (Modal genérico)
      ├── Form.tsx (Formulario base)
      └── Stats.tsx (Tarjetas de stats)
```

---

## Plan de Ejecución (Priorizado)

### Fase 1: Panel Admin - CRUD Básico (Alta Prioridad)
**Tiempo estimado: 2-3 horas**

1. **Crear componentes modales** (30 min)
   - BarberoModal.tsx
   - ServicioModal.tsx
   - HorarioModal.tsx

2. **Implementar CRUD de Barberos** (45 min)
   - Lista con tabla ordenable
   - Formulario crear/editar
   - Validaciones
   - Activar/Desactivar
   - Eliminar con confirmación

3. **Implementar CRUD de Servicios** (45 min)
   - Lista por categorías
   - Formulario crear/editar
   - Precios y duraciones
   - Popular flag
   - Ordenamiento

4. **Implementar CRUD de Horarios** (45 min)
   - Vista semanal por barbero
   - Formulario de horarios
   - Descansos
   - Activar/Desactivar días

### Fase 2: Configuración del Sitio (Alta Prioridad)
**Tiempo estimado: 1 hora**

1. **ConfiguracionTab.tsx** (60 min)
   - Formulario de configuración
   - Integración con Google Maps
   - Enlaces a redes sociales
   - Guardar cambios en sitio_configuracion

### Fase 3: Gestión de Usuarios (Media Prioridad)
**Tiempo estimado: 1-2 horas**

1. **UsuariosTab.tsx** (60 min)
   - Lista de usuarios admin
   - Crear cuenta con Supabase Auth
   - Asignar roles
   - Activar/Desactivar

2. **Sistema de permisos** (30 min)
   - Middleware de permisos
   - RLS policies
   - Validación de roles

### Fase 4: Portfolio de Barberos (Media Prioridad)
**Tiempo estimado: 1-2 horas**

1. **PortfolioTab.tsx** (60 min)
   - Upload de imágenes
   - Formulario de trabajo
   - Tags y categorización
   - Ordenamiento
   - Vista previa

2. **Integración con Storage** (30 min)
   - Supabase Storage bucket
   - Upload de imágenes
   - Compresión de imágenes
   - URLs públicas

### Fase 5: Mejoras UI/UX (Baja Prioridad)
**Tiempo estimado: 1 hora**

1. **Mejoras visuales**
   - Animaciones
   - Loading states
   - Toast notifications
   - Confirmación de acciones

2. **Responsive design**
   - Mobile-first
   - Tablets
   - Desktop

---

## Tecnologías y Librerías

### Existentes:
- ✅ Next.js 14
- ✅ React 18
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ Supabase Client
- ✅ Supabase Auth Helpers

### Necesarias para implementar:
- React Hook Form (formularios)
- Zod (validación)
- React Hot Toast (notificaciones)
- React Icons (iconos adicionales)
- Date-fns (manejo de fechas)

---

## Próximos Pasos Inmediatos

1. ✅ **Crear este documento** - COMPLETADO
2. ⏳ **Instalar dependencias necesarias**
3. ⏳ **Crear estructura de carpetas** (`src/components/admin/`)
4. ⏳ **Implementar BarberoModal + CRUD**
5. ⏳ **Implementar ServicioModal + CRUD**
6. ⏳ **Implementar HorarioModal + CRUD**
7. ⏳ **Implementar ConfiguracionTab**
8. ⏳ **Implementar UsuariosTab**
9. ⏳ **Implementar PortfolioTab**
10. ⏳ **Testing y ajustes finales**

---

## Notas Importantes

- **Row Level Security (RLS)**: Ya configurado en Supabase
- **Autenticación**: Ya funcional con Supabase Auth
- **Service Role Key**: Disponible para operaciones admin
- **Datos Demo**: Ya populados (11 portfolio, 4 galerías, 30 stats, 10 citas)
- **Base de Datos**: PostgreSQL 15 en VPS (supabase.chamosbarber.com)

---

**Última actualización**: 2025-11-02
**Estado**: En Desarrollo Activo
