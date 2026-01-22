# 📅 Vista de Calendario en Dashboard

## Descripción General

Se ha implementado una **vista de calendario semanal** en el dashboard principal del panel de administración, que permite visualizar todas las reservas organizadas por barbero y por día de la semana.

## 🎯 Objetivo

Proporcionar una vista panorámica y clara de las citas de todos los barberos en una semana, facilitando:
- Identificar horarios ocupados y disponibles
- Comparar la carga de trabajo entre barberos
- Detectar patrones de reserva
- Navegar entre semanas de forma intuitiva

## 📊 Estructura de la Vista

### Organización de la Tabla

```
┌──────────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│   Barbero    │   LUN   │   MAR   │   MIÉ   │   JUE   │   VIE   │   SÁB   │   DOM   │
├──────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Juan Pérez   │ [citas] │ [citas] │ [citas] │ [citas] │ [citas] │ [citas] │ [citas] │
│ María López  │ [citas] │ [citas] │ [citas] │ [citas] │ [citas] │ [citas] │ [citas] │
│ Carlos Ruiz  │ [citas] │ [citas] │ [citas] │ [citas] │ [citas] │ [citas] │ [citas] │
└──────────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

### Columnas

1. **Barbero** (Columna fija/sticky):
   - Avatar con ícono
   - Nombre completo del barbero
   - Apellido en texto secundario

2. **Días de la Semana** (7 columnas):
   - Nombre del día (LUN, MAR, etc.)
   - Número del día del mes
   - Resaltado especial para el día actual

### Tarjetas de Citas

Cada cita se muestra en una tarjeta compacta con:
- **Hora**: Formato HH:MM (ej: 14:30)
- **Estado**: Badge con icono y color
- **Cliente**: Nombre del cliente
- **Servicio**: Nombre del servicio (si disponible)

## 🎨 Diseño Visual

### Paleta de Colores

#### Estados de Citas
- 🟢 **Confirmada**: `#10B981` (Verde)
- 🟡 **Pendiente**: `#F59E0B` (Amarillo/Ámbar)
- 🔴 **Cancelada**: `#EF4444` (Rojo)
- 🔵 **Completada**: `#3B82F6` (Azul)

#### Elementos de UI
- **Fondo principal**: `#0A0A0A` (Negro ultra oscuro)
- **Fondo secundario**: `#111` (Negro oscuro)
- **Acento dorado**: `#D4AF37` (Oro)
- **Texto primario**: `#FFF` (Blanco)
- **Texto secundario**: `#888` (Gris medio)
- **Texto terciario**: `#666` (Gris oscuro)

### Características Visuales

#### Día Actual
- Fondo de columna: `rgba(212, 175, 55, 0.03)`
- Badge del día: Fondo dorado `#D4AF37` con texto negro
- Más prominente visualmente

#### Tarjetas de Citas
- Borde izquierdo coloreado según estado (2px)
- Fondo con transparencia del color del estado (10% opacity)
- Bordes sutiles `rgba(255, 255, 255, 0.05)`
- Efecto hover: Escala al 102%
- Transiciones suaves (0.2s)

#### Interacciones
- **Hover en filas**: Ligero cambio de fondo
- **Hover en citas**: Escala y elevación visual
- **Botones de navegación**: Bordes sutiles con hover effects
- **Botón "Hoy"**: Estilo destacado con fondo dorado semi-transparente

## 🛠️ Funcionalidad

### Navegación

#### Controles Disponibles
1. **Botón "Hoy"**: Salta a la semana actual
2. **Flecha izquierda**: Semana anterior
3. **Flecha derecha**: Semana siguiente

#### Comportamiento
- La semana comienza en **Lunes**
- Al navegar, se recargan automáticamente las citas
- El mes y año se actualizan en el encabezado

### Carga de Datos

```typescript
// Query a Supabase
const { data } = await supabase
  .from('citas')
  .select(`
    *,
    barberos (nombre, apellido),
    servicios (nombre, duracion_minutos)
  `)
  .gte('fecha', startDate)  // Inicio de semana
  .lte('fecha', endDate)    // Fin de semana
  .order('hora')
```

#### Optimización
- Se cargan solo las citas de la semana visible
- Los datos se agrupan por barbero para acceso rápido
- Indicador de carga durante la consulta

### Interacción con Citas

Al hacer click en una cita:
- Se puede implementar un modal con detalles completos
- Opción de editar o cambiar estado
- Ver información del cliente

## 📱 Responsividad

### Desktop (≥1024px)
- Tabla completa visible
- Todas las columnas mostradas
- Sin scroll horizontal necesario

### Tablet (768px - 1023px)
- Scroll horizontal activado
- Columna de barbero fija (sticky)
- Ancho mínimo de tabla: 800px

### Mobile (<768px)
- Scroll horizontal necesario
- Tabla optimizada para gestos táctiles
- Botones de navegación ajustados

## 📂 Estructura de Archivos

### Componentes

```
src/
├── components/
│   └── admin/
│       └── dashboard/
│           └── CalendarView.tsx    # Componente principal
└── pages/
    └── admin.tsx                   # Integración en dashboard
```

### CalendarView.tsx

```typescript
interface CalendarViewProps {
  barberos: Barbero[]           // Lista de barberos
  onDateSelect?: (date: Date) => void  // Callback al click en cita
}
```

#### Estados Internos
- `currentDate`: Fecha de la semana actual
- `weekDays`: Array de 7 fechas (Lun-Dom)
- `citasPorBarbero`: Object con citas agrupadas por barbero
- `loading`: Indicador de carga

#### Funciones Principales
- `loadCitas()`: Carga citas de la semana
- `getCitasForDay()`: Filtra citas de un barbero en un día específico
- `previousWeek()` / `nextWeek()`: Navegación
- `goToToday()`: Volver a semana actual
- `getEstadoColor()`: Color según estado de cita

## 🔄 Flujo de Actualización

```
1. Usuario cambia de semana
   ↓
2. useEffect detecta cambio en currentDate
   ↓
3. Se recalculan weekDays (7 días)
   ↓
4. useEffect detecta cambio en weekDays
   ↓
5. loadCitas() consulta Supabase
   ↓
6. Se agrupan citas por barbero
   ↓
7. setCitasPorBarbero actualiza estado
   ↓
8. React re-renderiza la tabla
```

## 🎯 Casos de Uso

### 1. Verificar Disponibilidad
**Escenario**: Cliente llama para pedir cita el Miércoles con Juan
**Acción**: 
- Localizar fila de Juan
- Ver columna de Miércoles
- Identificar huecos entre citas

### 2. Balancear Carga de Trabajo
**Escenario**: Detectar barbero con poca carga
**Acción**:
- Comparar número de citas por barbero
- Identificar días con pocas reservas
- Reasignar o promocionar horarios libres

### 3. Seguimiento Diario
**Escenario**: Revisar citas del día
**Acción**:
- Día actual resaltado automáticamente
- Ver todas las citas de hoy en vertical
- Identificar estados pendientes

### 4. Planificación Semanal
**Escenario**: Preparar la semana siguiente
**Acción**:
- Navegar a semana próxima
- Ver distribución de citas
- Identificar días de mayor demanda

## 🚀 Mejoras Futuras

### Corto Plazo
- [ ] Modal de detalles de cita al hacer click
- [ ] Filtro por estado de cita
- [ ] Búsqueda de cliente
- [ ] Vista de día (detallada por horas)

### Mediano Plazo
- [ ] Drag & drop para reasignar citas
- [ ] Vista mensual
- [ ] Exportar calendario a PDF/Excel
- [ ] Notificaciones de citas próximas

### Largo Plazo
- [ ] Integración con calendario externo (Google Calendar)
- [ ] Sugerencias de horarios óptimos
- [ ] Análisis predictivo de demanda
- [ ] Sincronización en tiempo real

## 🧪 Testing

### Escenarios a Probar

1. **Carga Inicial**
   - ✅ Carga semana actual correctamente
   - ✅ Muestra barberos en orden
   - ✅ Agrupa citas correctamente

2. **Navegación**
   - ✅ Botón "Hoy" funciona
   - ✅ Flechas cambian semana
   - ✅ Datos se actualizan al navegar

3. **Estados**
   - ✅ Colores correctos por estado
   - ✅ Iconos correspondientes
   - ✅ Leyenda precisa

4. **Responsividad**
   - ✅ Desktop sin scroll horizontal
   - ✅ Mobile con scroll habilitado
   - ✅ Columna barbero sticky funciona

5. **Casos Extremos**
   - ✅ Barbero sin citas (muestra "—")
   - ✅ Día sin citas
   - ✅ Múltiples citas en mismo slot

## 📖 Uso del Componente

### Integración Básica

```tsx
import CalendarView from '../components/admin/dashboard/CalendarView'

// En tu componente
<CalendarView 
  barberos={barberos}
  onDateSelect={(date) => {
    console.log('Fecha seleccionada:', date)
    // Implementar acción (abrir modal, filtrar, etc.)
  }}
/>
```

### Props

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `barberos` | `Barbero[]` | ✅ Sí | Array de barberos a mostrar |
| `onDateSelect` | `(date: Date) => void` | ❌ No | Callback al hacer click en una cita |

### Tipos

```typescript
type Barbero = {
  id: string
  nombre: string
  apellido: string
  // ... otros campos
}

type Cita = {
  id: string
  fecha: string          // YYYY-MM-DD
  hora: string           // HH:MM:SS
  estado: 'confirmada' | 'pendiente' | 'cancelada' | 'completada'
  cliente_nombre: string
  barbero_id: string
  servicio_id?: string
  barberos?: {
    nombre: string
    apellido: string
  }
  servicios?: {
    nombre: string
    duracion_minutos: number
  }
}
```

## 🎓 Conceptos Aplicados

### React Hooks
- `useState`: Gestión de estado local
- `useEffect`: Efectos secundarios y carga de datos
- `useSupabaseClient`: Cliente de Supabase

### Optimización
- Queries focalizadas (solo semana visible)
- Agrupación de datos por barbero
- Renderizado condicional

### UX
- Feedback visual inmediato
- Estados de carga claros
- Navegación intuitiva
- Colores semánticos

## 🐛 Troubleshooting

### Problema: No se cargan las citas
**Solución**: Verificar:
- Conexión a Supabase
- RLS policies en tabla `citas`
- Formato de fechas (YYYY-MM-DD)

### Problema: Día actual no se resalta
**Solución**: Verificar zona horaria del servidor vs cliente

### Problema: Tabla no es sticky en mobile
**Solución**: Verificar `position: sticky` y `left: 0` en CSS

### Problema: Citas duplicadas
**Solución**: Verificar que `key={cita.id}` sea único

## 📚 Referencias

- [Supabase Documentation](https://supabase.io/docs)
- [React Hooks](https://react.dev/reference/react)
- [TypeScript](https://www.typescriptlang.org/)

---

**Creado**: 2024-01-XX
**Última actualización**: 2024-01-XX
**Autor**: Chamos Barber Dev Team
**Versión**: 1.0.0
