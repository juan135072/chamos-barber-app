# 📅 Gestión de Horarios de Barbería

## Descripción General

El módulo de **Gestión de Horarios** permite a los administradores configurar los horarios de atención de cada barbero y gestionar bloqueos de horarios específicos (vacaciones, permisos, eventos, etc.).

---

## 🎯 Funcionalidades

### 1. Horarios de Atención

Configura los horarios semanales de cada barbero:

- **Por día de la semana**: Lunes a Domingo
- **Hora de inicio y fin**: Rango horario completo
- **Estado activo/inactivo**: Habilitar o deshabilitar días específicos
- **Un horario por día**: Cada día tiene un único rango horario

**Casos de uso**:
- Configurar horario de trabajo semanal del barbero
- Cambiar horarios según temporadas
- Deshabilitar días sin afectar la configuración (ej: cerrar los domingos)

### 2. Horarios Bloqueados

Crea bloqueos de horarios específicos:

- **Rango de fechas**: Desde una fecha/hora hasta otra
- **Motivo del bloqueo**: Nota interna (opcional)
- **Acciones rápidas**: 
  - "Todo el día hoy"
  - "Próxima semana"

**Casos de uso**:
- Vacaciones del barbero
- Permisos médicos
- Eventos especiales
- Mantenimiento del local
- Días festivos

---

## 🖥️ Interfaz de Usuario

### Acceso

1. Panel Admin (`/admin`)
2. Pestaña **"Horarios"**

### Vista Principal

**Header**:
- Selector de barbero (dropdown)
- Título: "Gestión de Horarios"

**Tabs**:
1. **Horarios de Atención** (por defecto)
2. **Horarios Bloqueados**

---

## 📋 Horarios de Atención

### Tabla de Horarios

| Columna | Descripción |
|---------|-------------|
| **Día de la Semana** | Lunes a Domingo con icono identificador |
| **Horario** | Rango de horas (Ej: 09:00 - 19:00) |
| **Estado** | Activo / Inactivo (clickeable para toggle) |
| **Acciones** | Editar, Eliminar, o Agregar (si no existe) |

### Estados Posibles

**Día CON horario**:
- Muestra hora inicio - hora fin
- Badge verde/rojo según estado activo/inactivo
- Botones: Editar (✏️) y Eliminar (🗑️)

**Día SIN horario**:
- Texto: "Sin horario configurado"
- Badge gris: "No disponible"
- Botón: Agregar (➕)

### Modal de Horario

**Campos**:
1. **Día de la semana**: Dropdown (solo en creación)
2. **Hora de inicio**: Time picker (HH:MM)
3. **Hora de fin**: Time picker (HH:MM)
4. **Horario activo**: Checkbox

**Validaciones**:
- Hora de fin debe ser mayor a hora de inicio
- Todos los campos son requeridos
- No se puede cambiar el día de un horario existente (solo eliminando y creando nuevo)

**Acciones**:
- **Guardar**: Crea o actualiza el horario
- **Cancelar**: Cierra sin guardar

---

## 🚫 Horarios Bloqueados

### Tabla de Bloqueos

| Columna | Descripción |
|---------|-------------|
| **Fecha y Hora Inicio** | Fecha (DD/MM/YYYY) y Hora (HH:MM) |
| **Fecha y Hora Fin** | Fecha (DD/MM/YYYY) y Hora (HH:MM) |
| **Motivo** | Descripción del bloqueo o "Sin motivo" |
| **Acciones** | Editar (✏️) y Eliminar (🗑️) |

### Estados Posibles

**Sin bloqueos**:
- Mensaje: "No hay horarios bloqueados"
- Botón centrado: "Crear Primer Bloqueo"

**Con bloqueos**:
- Lista ordenada por fecha (más recientes primero)
- Botón superior derecho: "Nuevo Bloqueo"

### Modal de Bloqueo

**Sección: Inicio del Bloqueo** (fondo verde claro)
- **Fecha**: Date picker
- **Hora**: Time picker

**Sección: Fin del Bloqueo** (fondo rojo claro)
- **Fecha**: Date picker
- **Hora**: Time picker

**Campo adicional**:
- **Motivo**: Textarea (opcional)

**Acciones Rápidas**:
- **Todo el día hoy**: Fecha de hoy, 00:00 a 23:59
- **Próxima semana**: 7 días desde hoy, 00:00 a 23:59

**Validaciones**:
- Fecha/hora de fin debe ser mayor a fecha/hora de inicio
- Fechas y horas son requeridas
- Motivo es opcional

---

## 🔄 Flujos de Trabajo

### Configurar Horario Semanal

1. Selecciona el barbero del dropdown
2. Ve a tab "Horarios de Atención"
3. Para cada día:
   - Click en "Agregar" si no tiene horario
   - O click en "Editar" (✏️) si ya existe
4. Define hora de inicio y fin
5. Marca el checkbox "Horario activo"
6. Click en "Guardar"
7. Repite para todos los días laborales

**Resultado**: El barbero tiene configurado su horario semanal y los clientes pueden reservar en esos horarios.

### Bloquear Vacaciones

1. Selecciona el barbero del dropdown
2. Ve a tab "Horarios Bloqueados"
3. Click en "Nuevo Bloqueo"
4. O usa "Próxima semana" para un bloqueo rápido
5. Ajusta fechas de inicio y fin
6. Escribe motivo: "Vacaciones"
7. Click en "Guardar"

**Resultado**: Durante ese período, los clientes NO pueden reservar citas con ese barbero.

### Deshabilitar un Día Temporalmente

1. Selecciona el barbero
2. Tab "Horarios de Atención"
3. Encuentra el día a deshabilitar
4. Click en el badge "Activo" (cambiará a "Inactivo")

**Resultado**: El horario se conserva pero ese día no estará disponible para reservas.

---

## 💾 Estructura de Base de Datos

### Tabla: `horarios_atencion`

```sql
CREATE TABLE horarios_atencion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbero_id UUID NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL, -- 0=Domingo, 1=Lunes, ..., 6=Sábado
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(barbero_id, dia_semana)
);
```

**Índices**:
- `barbero_id` (para queries rápidas por barbero)
- `(barbero_id, dia_semana)` (constraint único)

### Tabla: `horarios_bloqueados`

```sql
CREATE TABLE horarios_bloqueados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbero_id UUID NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
  fecha_hora_inicio TIMESTAMPTZ NOT NULL,
  fecha_hora_fin TIMESTAMPTZ NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (fecha_hora_fin > fecha_hora_inicio)
);
```

**Índices**:
- `barbero_id` (para queries por barbero)
- `fecha_hora_inicio`, `fecha_hora_fin` (para búsqueda de rangos)

---

## 🧪 Casos de Prueba

### Test 1: Crear Horario de Atención

**Pasos**:
1. Selecciona barbero "Juan Pérez"
2. Tab "Horarios de Atención"
3. Click "Agregar" en Lunes
4. Hora inicio: 09:00, Hora fin: 19:00
5. Checkbox "Horario activo" marcado
6. Click "Guardar"

**Resultado esperado**:
- ✅ Toast: "Horario creado correctamente"
- ✅ Tabla muestra "09:00 - 19:00"
- ✅ Badge: "Activo" (verde)

### Test 2: Validación de Horarios

**Pasos**:
1. Crear horario con hora fin = 08:00, hora inicio = 09:00
2. Intentar guardar

**Resultado esperado**:
- ❌ Error: "La hora de fin debe ser mayor a la hora de inicio"
- ❌ No se guarda el horario

### Test 3: Toggle Estado Activo

**Pasos**:
1. Horario de Lunes está "Activo"
2. Click en badge "Activo"

**Resultado esperado**:
- ✅ Badge cambia a "Inactivo" (rojo)
- ✅ Toast: "Horario desactivado"
- ✅ Día no disponible para reservas

### Test 4: Crear Bloqueo de Vacaciones

**Pasos**:
1. Tab "Horarios Bloqueados"
2. Click "Nuevo Bloqueo"
3. Click "Próxima semana"
4. Motivo: "Vacaciones"
5. Click "Guardar"

**Resultado esperado**:
- ✅ Toast: "Bloqueo creado correctamente"
- ✅ Tabla muestra el bloqueo con fechas correctas
- ✅ Clientes no pueden reservar en esas fechas

### Test 5: Editar Horario Existente

**Pasos**:
1. Click "Editar" en Lunes
2. Cambiar hora fin a 18:00
3. Click "Guardar"

**Resultado esperado**:
- ✅ Toast: "Horario actualizado correctamente"
- ✅ Tabla muestra "09:00 - 18:00"

### Test 6: Eliminar Bloqueo

**Pasos**:
1. Click "Eliminar" en un bloqueo
2. Confirmar en el diálogo

**Resultado esperado**:
- ✅ Toast: "Bloqueo eliminado"
- ✅ Bloqueo desaparece de la tabla
- ✅ Horarios vuelven a estar disponibles

---

## 🎨 Componentes Técnicos

### `HorariosTab.tsx`

**Props**: Ninguna (componente autónomo)

**Estado**:
- `activeView`: 'atencion' | 'bloqueados'
- `barberos`: Lista de barberos
- `selectedBarbero`: ID del barbero seleccionado
- `horariosAtencion`: Array de horarios del barbero
- `horariosBloqueados`: Array de bloqueos del barbero
- `showHorarioModal`, `showBloqueoModal`: Control de modales
- `editingHorario`, `editingBloqueo`: Horario/bloqueo en edición

**Funciones clave**:
- `loadBarberos()`: Carga barberos activos
- `loadHorariosAtencion()`: Carga horarios del barbero seleccionado
- `loadHorariosBloqueados()`: Carga bloqueos del barbero
- `handleToggleActivo()`: Cambia estado activo/inactivo
- `handleCreateHorario()`: Abre modal para crear
- `handleEditHorario()`: Abre modal para editar
- `handleDeleteHorario()`: Elimina horario
- `handleCreateBloqueo()`: Abre modal de bloqueo
- `handleDeleteBloqueo()`: Elimina bloqueo

### `HorarioModal.tsx`

**Props**:
- `horario`: HorarioAtencion | null
- `barberoId`: string
- `onClose`: () => void
- `onSave`: () => void

**Validaciones**:
- Hora fin > Hora inicio
- Campos requeridos

### `BloqueoModal.tsx`

**Props**:
- `bloqueo`: HorarioBloqueado | null
- `barberoId`: string
- `onClose`: () => void
- `onSave`: () => void

**Validaciones**:
- Fecha/hora fin > Fecha/hora inicio
- Fechas y horas requeridas

**Acciones rápidas**:
- Todo el día hoy
- Próxima semana

---

## 🔐 Permisos y Seguridad

### RLS Policies (Row Level Security)

**Para `horarios_atencion`**:

```sql
-- Lectura pública
CREATE POLICY "Public read access"
ON horarios_atencion FOR SELECT
USING (true);

-- Solo admins pueden modificar
CREATE POLICY "Admins can manage"
ON horarios_atencion FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid()
    AND rol = 'admin'
    AND activo = true
  )
);
```

**Para `horarios_bloqueados`**:

```sql
-- Lectura pública
CREATE POLICY "Public read access"
ON horarios_bloqueados FOR SELECT
USING (true);

-- Solo admins pueden modificar
CREATE POLICY "Admins can manage"
ON horarios_bloqueados FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid()
    AND rol = 'admin'
    AND activo = true
  )
);
```

---

## 📊 Ejemplos de Datos

### Horarios de Atención Típicos

```json
[
  {
    "id": "uuid-1",
    "barbero_id": "barbero-123",
    "dia_semana": 1,
    "hora_inicio": "09:00:00",
    "hora_fin": "19:00:00",
    "activo": true
  },
  {
    "id": "uuid-2",
    "barbero_id": "barbero-123",
    "dia_semana": 2,
    "hora_inicio": "09:00:00",
    "hora_fin": "19:00:00",
    "activo": true
  },
  {
    "id": "uuid-3",
    "barbero_id": "barbero-123",
    "dia_semana": 0,
    "hora_inicio": "10:00:00",
    "hora_fin": "14:00:00",
    "activo": false
  }
]
```

### Bloqueo de Vacaciones

```json
{
  "id": "uuid-bloqueo-1",
  "barbero_id": "barbero-123",
  "fecha_hora_inicio": "2025-12-25T00:00:00Z",
  "fecha_hora_fin": "2026-01-05T23:59:59Z",
  "motivo": "Vacaciones de fin de año"
}
```

### Bloqueo de Permiso Médico

```json
{
  "id": "uuid-bloqueo-2",
  "barbero_id": "barbero-123",
  "fecha_hora_inicio": "2025-12-20T14:00:00Z",
  "fecha_hora_fin": "2025-12-20T18:00:00Z",
  "motivo": "Cita médica"
}
```

---

## 🐛 Troubleshooting

### Problema: "No se cargan los horarios"

**Síntomas**: La tabla está vacía o muestra loading infinito

**Soluciones**:
1. Verifica que las tablas existan:
   ```bash
   node scripts/check-horarios-schema.js
   ```
2. Revisa permisos RLS en Supabase
3. Verifica que el barbero seleccionado esté activo
4. Revisa console del navegador para errores

### Problema: "No puedo crear horarios"

**Síntomas**: Error al guardar horarios

**Soluciones**:
1. Verifica que estés autenticado como admin
2. Revisa políticas RLS de las tablas
3. Verifica que no exista ya un horario para ese día
4. Revisa validaciones del formulario

### Problema: "Los bloqueos no impiden reservas"

**Síntomas**: Clientes pueden reservar en horarios bloqueados

**Soluciones**:
1. Verifica que la función `get_horarios_disponibles` considere bloqueos
2. Revisa que las fechas/horas del bloqueo sean correctas
3. Confirma que el barbero_id del bloqueo coincida

---

## 🚀 Próximas Mejoras

- [ ] Copiar horarios de un barbero a otro
- [ ] Plantillas de horarios predefinidas
- [ ] Historial de cambios en horarios
- [ ] Notificaciones automáticas de bloqueos
- [ ] Vista de calendario mensual
- [ ] Exportar horarios a PDF/Excel
- [ ] Bloqueos recurrentes (ej: todos los domingos)
- [ ] Configuración de horario de almuerzo/descanso

---

## ✅ Checklist de Implementación

- [x] Componente HorariosTab.tsx creado
- [x] Modal HorarioModal.tsx creado
- [x] Modal BloqueoModal.tsx creado
- [x] Integración con tablas de BD
- [x] Validaciones de formularios
- [x] Toast notifications
- [x] Diseño responsive
- [x] Info boxes con instrucciones
- [x] Documentación completa
- [ ] Políticas RLS configuradas (pendiente verificar)
- [ ] Tests de integración

---

## 📚 Referencias

- **Componentes**: `src/components/admin/tabs/HorariosTab.tsx`
- **Modales**: 
  - `src/components/admin/modals/HorarioModal.tsx`
  - `src/components/admin/modals/BloqueoModal.tsx`
- **Script verificación**: `scripts/check-horarios-schema.js`
- **Commit**: `9bbbbf2`
- **GitHub**: https://github.com/juan135072/chamos-barber-app

---

¡Gestión de horarios completa y funcional! 🎉📅
