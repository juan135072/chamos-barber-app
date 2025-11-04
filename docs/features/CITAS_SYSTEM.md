# Sistema de Gestión de Citas - Chamos Barber

## 📋 Descripción General

Sistema completo de gestión de citas con tres vistas principales:
1. **Vista Pública**: Clientes pueden reservar citas desde la landing page
2. **Vista Admin**: Administradores ven y gestionan TODAS las citas
3. **Vista Barbero**: Cada barbero ve y gestiona SOLO sus propias citas

## 🏗️ Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE CITAS                             │
└────────────────────────────────────────────────────────────────┘

┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Landing Page   │         │   Admin Panel   │         │  Barbero Panel  │
│  (Pública)      │         │  (/admin)       │         │  (/barbero)     │
├─────────────────┤         ├─────────────────┤         ├─────────────────┤
│ • Ver barberos  │         │ • Ver TODAS     │         │ • Ver PROPIAS   │
│ • Ver servicios │         │ • Filtrar       │         │ • Ver estadísticas│
│ • Reservar cita │         │ • Buscar        │         │ • Cambiar estado│
│ • Formulario    │         │ • Cambiar estado│         │ • Vista cards   │
│   de contacto   │         │ • Eliminar      │         │                 │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         │ INSERT                    │ SELECT ALL                │ SELECT WHERE
         │                           │                           │ barbero_id = X
         ▼                           ▼                           ▼
    ┌────────────────────────────────────────────────────────────┐
    │                    tabla: citas                            │
    │  • id                    • cliente_telefono                │
    │  • barbero_id            • fecha                           │
    │  • servicio_id           • hora                            │
    │  • cliente_nombre        • estado                          │
    │  • cliente_email         • notas                           │
    └────────────────────────────────────────────────────────────┘
```

## 📁 Componentes Principales

### 1. ReservaModal.tsx (Vista Pública)

**Ubicación**: `src/components/ReservaModal.tsx`

**Propósito**: Modal para que clientes reserven citas desde la landing page.

#### Flujo de Reserva

```typescript
1. Usuario hace clic en "Reservar Cita" → Modal se abre
2. Selecciona Barbero → Lista de barberos activos
3. Selecciona Servicio → Lista de servicios activos
4. Selecciona Fecha → DatePicker (solo fechas futuras)
5. Selecciona Hora → Horarios disponibles (9 AM - 6 PM)
6. Ingresa Datos → Nombre, email, teléfono, notas
7. Confirma → INSERT en tabla citas
8. Feedback → Mensaje de confirmación
```

#### Código Clave

```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()
  setLoading(true)

  // Validaciones
  if (!selectedBarbero || !selectedServicio || !fecha || !hora) {
    alert('Por favor completa todos los campos obligatorios')
    setLoading(false)
    return
  }

  // Verificar disponibilidad (opcional)
  const { data: existingCita } = await supabase
    .from('citas')
    .select('id')
    .eq('barbero_id', selectedBarbero)
    .eq('fecha', fecha)
    .eq('hora', hora)
    .neq('estado', 'cancelada')
    .single()

  if (existingCita) {
    alert('Este horario ya está ocupado. Por favor selecciona otro.')
    setLoading(false)
    return
  }

  // Insertar cita
  const { data, error } = await supabase
    .from('citas')
    .insert({
      barbero_id: selectedBarbero,
      servicio_id: selectedServicio,
      cliente_nombre: nombre,
      cliente_email: email,
      cliente_telefono: telefono,
      fecha: fecha,
      hora: hora,
      notas: notas || null,
      estado: 'pendiente',
    })
    .select()

  if (error) {
    console.error('Error creando cita:', error)
    alert('Error al crear la cita. Por favor intenta de nuevo.')
    setLoading(false)
    return
  }

  // Éxito
  alert('¡Cita reservada exitosamente! Te contactaremos pronto.')
  onClose()
  resetForm()
}
```

#### Horarios Disponibles

```typescript
const horarios = [
  '09:00', '09:30',
  '10:00', '10:30',
  '11:00', '11:30',
  '12:00', '12:30',
  '13:00', '13:30',
  '14:00', '14:30',
  '15:00', '15:30',
  '16:00', '16:30',
  '17:00', '17:30',
]

// Filtrar horarios ocupados
const horariosDisponibles = horarios.filter(h => {
  // Consultar si el horario está ocupado
  // Implementación según necesidad
  return true
})
```

### 2. CitasTab.tsx (Vista Admin)

**Ubicación**: `src/components/admin/tabs/CitasTab.tsx`

**Propósito**: Panel completo para que el admin gestione TODAS las citas del sistema.

#### Características

- ✅ Ver todas las citas (sin filtro de barbero)
- ✅ Estadísticas globales
- ✅ Búsqueda por cliente o barbero
- ✅ Filtro por estado
- ✅ Filtro por rango de fechas
- ✅ Actualizar estado de cualquier cita
- ✅ Eliminar citas con confirmación
- ✅ Vista en tabla responsive

#### Estructura de Datos

```typescript
interface Cita {
  id: string
  barbero_id: string
  servicio_id: string
  cliente_nombre: string
  cliente_email: string
  cliente_telefono: string
  fecha: string
  hora: string
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada'
  notas: string | null
  created_at: string
  
  // Datos relacionados (JOIN)
  barberos: {
    nombre: string
    apellido: string
  }
  servicios: {
    nombre: string
    precio: number
  }
}
```

#### Query Principal

```typescript
const loadCitas = async () => {
  setLoading(true)
  
  const { data, error } = await supabase
    .from('citas')
    .select(`
      *,
      barberos:barbero_id (
        nombre,
        apellido
      ),
      servicios:servicio_id (
        nombre,
        precio
      )
    `)
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false })

  if (error) {
    console.error('Error cargando citas:', error)
    setLoading(false)
    return
  }

  setCitas(data || [])
  setLoading(false)
}
```

#### Estadísticas

```typescript
const stats = {
  total: citas.length,
  pendientes: citas.filter(c => c.estado === 'pendiente').length,
  confirmadas: citas.filter(c => c.estado === 'confirmada').length,
  completadas: citas.filter(c => c.estado === 'completada').length,
  canceladas: citas.filter(c => c.estado === 'cancelada').length,
}
```

#### Filtros

```typescript
const citasFiltradas = citas.filter(cita => {
  // Filtro de búsqueda (cliente o barbero)
  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    const matchesCliente = cita.cliente_nombre.toLowerCase().includes(term)
    const matchesBarbero = 
      `${cita.barberos.nombre} ${cita.barberos.apellido}`
        .toLowerCase().includes(term)
    
    if (!matchesCliente && !matchesBarbero) return false
  }

  // Filtro de estado
  if (filtroEstado && cita.estado !== filtroEstado) return false

  // Filtro de fecha desde
  if (filtroFechaDesde && cita.fecha < filtroFechaDesde) return false

  // Filtro de fecha hasta
  if (filtroFechaHasta && cita.fecha > filtroFechaHasta) return false

  return true
})
```

#### Actualizar Estado

```typescript
const handleUpdateEstado = async (citaId: string, nuevoEstado: string) => {
  const { error } = await supabase
    .from('citas')
    .update({ estado: nuevoEstado })
    .eq('id', citaId)

  if (error) {
    console.error('Error actualizando cita:', error)
    alert('Error al actualizar el estado de la cita')
    return
  }

  // Actualizar estado local
  setCitas(prevCitas =>
    prevCitas.map(cita =>
      cita.id === citaId ? { ...cita, estado: nuevoEstado } : cita
    )
  )
}
```

#### Eliminar Cita

```typescript
const handleDeleteCita = async (citaId: string) => {
  if (!confirm('¿Estás seguro de que deseas eliminar esta cita?')) {
    return
  }

  const { error } = await supabase
    .from('citas')
    .delete()
    .eq('id', citaId)

  if (error) {
    console.error('Error eliminando cita:', error)
    alert('Error al eliminar la cita')
    return
  }

  // Actualizar lista local
  setCitas(prevCitas => prevCitas.filter(cita => cita.id !== citaId))
}
```

### 3. CitasSection.tsx (Vista Barbero)

**Ubicación**: `src/components/barbero/CitasSection.tsx`

**Propósito**: Vista para que cada barbero vea SOLO sus propias citas.

#### Características

- ✅ Ver solo citas propias (filtrado por barbero_id)
- ✅ Estadísticas personalizadas
- ✅ Filtro por estado
- ✅ Actualizar estado de sus citas
- ✅ Vista en cards con info del cliente
- ✅ Responsive design

#### Props

```typescript
interface CitasSectionProps {
  barberoId: string  // UUID del barbero desde el perfil
}
```

#### Query con Seguridad

```typescript
const loadCitas = async () => {
  setLoading(true)
  
  const { data, error } = await supabase
    .from('citas')
    .select(`
      *,
      servicios:servicio_id (
        nombre,
        precio
      )
    `)
    .eq('barbero_id', barberoId)  // ← FILTRO CRÍTICO DE SEGURIDAD
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false })

  if (error) {
    console.error('Error cargando citas:', error)
    setLoading(false)
    return
  }

  setCitas(data || [])
  setLoading(false)
}
```

#### Estadísticas del Barbero

```typescript
const hoy = new Date().toISOString().split('T')[0]

const stats = {
  total: citas.length,
  hoy: citas.filter(c => c.fecha === hoy).length,
  pendientes: citas.filter(c => c.estado === 'pendiente').length,
  confirmadas: citas.filter(c => c.estado === 'confirmada').length,
}
```

#### Update con Doble Verificación

```typescript
const handleUpdateEstado = async (citaId: string, nuevoEstado: string) => {
  const { error } = await supabase
    .from('citas')
    .update({ estado: nuevoEstado })
    .eq('id', citaId)
    .eq('barbero_id', barberoId)  // ← Doble verificación de seguridad

  if (error) {
    console.error('Error actualizando cita:', error)
    alert('Error al actualizar el estado de la cita')
    return
  }

  // Actualizar estado local
  setCitas(prevCitas =>
    prevCitas.map(cita =>
      cita.id === citaId ? { ...cita, estado: nuevoEstado } : cita
    )
  )
}
```

#### Vista en Cards

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {citasFiltradas.map(cita => (
    <div key={cita.id} className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-white">
            {cita.cliente_nombre}
          </h3>
          <p className="text-sm text-gray-400">
            {formatFecha(cita.fecha)} - {cita.hora}
          </p>
        </div>
        
        <span className={`px-2 py-1 text-xs rounded ${getEstadoColor(cita.estado)}`}>
          {cita.estado.toUpperCase()}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-300">
        <p>
          <i className="fas fa-cut mr-2"></i>
          {cita.servicios.nombre}
        </p>
        <p>
          <i className="fas fa-envelope mr-2"></i>
          {cita.cliente_email}
        </p>
        <p>
          <i className="fas fa-phone mr-2"></i>
          {cita.cliente_telefono}
        </p>
        {cita.notas && (
          <p className="text-xs text-gray-400 italic">
            Nota: {cita.notas}
          </p>
        )}
      </div>

      <div className="mt-4">
        <select
          value={cita.estado}
          onChange={(e) => handleUpdateEstado(cita.id, e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 rounded"
        >
          <option value="pendiente">Pendiente</option>
          <option value="confirmada">Confirmada</option>
          <option value="completada">Completada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>
    </div>
  ))}
</div>
```

## 🔒 Seguridad

### Principios de Seguridad Implementados

1. **Separación de Permisos**:
   - Admin: Sin filtro, ve todas las citas
   - Barbero: Filtro `.eq('barbero_id', userId)`

2. **Verificación en Queries**:
   - Barberos SIEMPRE filtran por `barbero_id`
   - Updates incluyen verificación de `barbero_id`

3. **No Usar RLS para este caso**:
   - Admin necesita ver todas las citas
   - Filtrado explícito en queries es más claro
   - Evita complejidad de políticas RLS

### Ejemplo de Query Insegura (NO HACER)

```typescript
// ❌ MAL: Sin filtro, barbero podría ver todas
const { data } = await supabase
  .from('citas')
  .select('*')
  .order('fecha', { ascending: false })
```

### Ejemplo de Query Segura (HACER)

```typescript
// ✅ BIEN: Con filtro de barbero_id
const { data } = await supabase
  .from('citas')
  .select('*')
  .eq('barbero_id', barberoId)  // ← Filtro obligatorio
  .order('fecha', { ascending: false })
```

## 📊 Estados de Citas

### Ciclo de Vida de una Cita

```
pendiente → confirmada → completada
    ↓
  cancelada (en cualquier momento)
```

### Definición de Estados

| Estado | Descripción | Color | Acciones Disponibles |
|--------|-------------|-------|---------------------|
| `pendiente` | Recién creada, esperando confirmación | Amarillo | Confirmar, Cancelar |
| `confirmada` | Confirmada por barbero/admin | Azul | Completar, Cancelar |
| `completada` | Servicio realizado | Verde | Ninguna (final) |
| `cancelada` | Cancelada por cualquier motivo | Rojo | Ninguna (final) |

### Colores por Estado

```typescript
const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'pendiente':
      return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
    case 'confirmada':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    case 'completada':
      return 'bg-green-500/20 text-green-400 border border-green-500/30'
    case 'cancelada':
      return 'bg-red-500/20 text-red-400 border border-red-500/30'
    default:
      return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
  }
}
```

## 🔄 Actualización en Tiempo Real (Futuro)

Actualmente, las vistas se actualizan al recargar. Para tiempo real:

```typescript
// Ejemplo de implementación futura con Supabase Realtime
useEffect(() => {
  const subscription = supabase
    .channel('citas_changes')
    .on(
      'postgres_changes',
      {
        event: '*',  // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'citas',
        filter: `barbero_id=eq.${barberoId}`,  // Para barberos
      },
      (payload) => {
        console.log('Cambio detectado:', payload)
        // Actualizar estado local
        loadCitas()
      }
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}, [barberoId])
```

## 📅 Gestión de Horarios

### Horarios Disponibles

Horario de trabajo: 9:00 AM - 6:00 PM
Intervalos: 30 minutos

```typescript
const generarHorarios = () => {
  const horarios = []
  for (let hour = 9; hour < 18; hour++) {
    horarios.push(`${hour.toString().padStart(2, '0')}:00`)
    horarios.push(`${hour.toString().padStart(2, '0')}:30`)
  }
  return horarios
}
```

### Verificación de Disponibilidad

```typescript
const checkDisponibilidad = async (
  barberoId: string,
  fecha: string,
  hora: string
) => {
  const { data } = await supabase
    .from('citas')
    .select('id')
    .eq('barbero_id', barberoId)
    .eq('fecha', fecha)
    .eq('hora', hora)
    .neq('estado', 'cancelada')
    .single()

  return !data  // true si está disponible
}
```

### Bloqueo de Horarios Pasados

```typescript
const esHorarioPasado = (fecha: string, hora: string) => {
  const ahora = new Date()
  const citaFecha = new Date(`${fecha}T${hora}`)
  return citaFecha < ahora
}

// Deshabilitar en UI
<option 
  value={hora} 
  disabled={esHorarioPasado(fecha, hora)}
>
  {hora}
</option>
```

## 🎨 UI/UX

### Formato de Fechas

```typescript
const formatFecha = (fecha: string) => {
  const date = new Date(fecha)
  return date.toLocaleDateString('es-VE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Resultado: "lunes, 15 de enero de 2024"
```

### Loading States

```tsx
{loading ? (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
  </div>
) : (
  // Contenido
)}
```

### Empty States

```tsx
{citasFiltradas.length === 0 && (
  <div className="text-center py-12">
    <i className="fas fa-calendar-times text-6xl text-gray-600 mb-4"></i>
    <p className="text-gray-400 text-lg">
      No hay citas {filtroEstado && `en estado "${filtroEstado}"`}
    </p>
  </div>
)}
```

## 🐛 Troubleshooting

### Error: "Cannot read property 'nombre' of null"

**Causa**: JOIN no retorna datos relacionados

**Solución**:
```typescript
// Verificar que el barbero/servicio existe y está activo
barberos:barbero_id!inner (nombre, apellido)
```

### Citas duplicadas

**Causa**: No se verifica disponibilidad antes de insertar

**Solución**: Implementar verificación en `handleSubmit` del ReservaModal

### Barbero ve citas de otros

**Causa**: Falta filtro `.eq('barbero_id', barberoId)`

**Solución**: SIEMPRE incluir el filtro en queries de barberos

## 📈 Métricas y Analytics (Futuro)

Posibles métricas a implementar:

- Tasa de cancelación por barbero
- Servicios más solicitados
- Horarios más populares
- Tiempo promedio entre reserva y cita
- Clientes recurrentes

## 📚 Referencias

- [Database Schema](../architecture/DATABASE.md)
- [Auth System](../architecture/AUTH_SYSTEM.md)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
