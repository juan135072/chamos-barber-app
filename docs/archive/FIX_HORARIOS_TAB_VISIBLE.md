# Fix: Panel de Horarios no visible en administración

## 🐛 Problema Reportado

El usuario reportó: **"no veo el panel para controlar los horarios"**

Al revisar la interfaz de administración en `https://chamosbarber.com/admin`, la pestaña "Horarios" no aparecía en el menú de navegación, a pesar de que:
- El componente `HorariosTab.tsx` existía y estaba implementado correctamente
- El componente estaba importado en `admin.tsx`
- El renderizado condicional estaba presente

## 🔍 Análisis del Problema

### Problema 1: Pestaña faltante en el menú
- El componente `HorariosTab` estaba importado (línea 10) y renderizado (línea 467)
- **PERO** el array de navegación (líneas 264-273) **NO incluía la entrada 'horarios'**
- Resultado: El tab existía en el código pero era inaccesible desde la UI

### Problema 2: Referencias a tablas incorrectas
- `supabase-helpers.ts` referenciaba `horarios_trabajo` (tabla inexistente)
- La base de datos real contiene:
  - ✅ `horarios_atencion` (12 registros)
  - ✅ `horarios_bloqueados` (0 registros)
  - ❌ `horarios_trabajo` (NO EXISTE)

## ✅ Solución Implementada

### 1. Agregar pestaña al menú de navegación (`admin.tsx`)

```typescript
// ANTES (línea 264-273)
{[
  { id: 'dashboard', name: 'Dashboard', icon: 'fas fa-chart-pie', shortName: 'Home' },
  { id: 'citas', name: 'Citas', icon: 'fas fa-calendar-alt', shortName: 'Citas' },
  { id: 'clientes', name: 'Clientes', icon: 'fas fa-user-friends', shortName: 'Clientes' },
  { id: 'barberos', name: 'Barberos', icon: 'fas fa-users', shortName: 'Barberos' },
  { id: 'comisiones', name: 'Comisiones', icon: 'fas fa-percentage', shortName: 'Comisiones' },
  { id: 'ganancias', name: 'Ganancias', icon: 'fas fa-chart-line', shortName: 'Ganancias' },
  { id: 'servicios', name: 'Servicios', icon: 'fas fa-cut', shortName: 'Servicios' },
  { id: 'categorias', name: 'Categorías', icon: 'fas fa-tags', shortName: 'Categorías' },
  { id: 'solicitudes', name: 'Solicitudes', icon: 'fas fa-user-plus', shortName: 'Solicitudes' }
  // ❌ FALTA: horarios
].map(tab => (

// DESPUÉS
{[
  { id: 'dashboard', name: 'Dashboard', icon: 'fas fa-chart-pie', shortName: 'Home' },
  { id: 'citas', name: 'Citas', icon: 'fas fa-calendar-alt', shortName: 'Citas' },
  { id: 'clientes', name: 'Clientes', icon: 'fas fa-user-friends', shortName: 'Clientes' },
  { id: 'barberos', name: 'Barberos', icon: 'fas fa-users', shortName: 'Barberos' },
  { id: 'horarios', name: 'Horarios', icon: 'fas fa-clock', shortName: 'Horarios' },  // ✅ AGREGADO
  { id: 'comisiones', name: 'Comisiones', icon: 'fas fa-percentage', shortName: 'Comisiones' },
  { id: 'ganancias', name: 'Ganancias', icon: 'fas fa-chart-line', shortName: 'Ganancias' },
  { id: 'servicios', name: 'Servicios', icon: 'fas fa-cut', shortName: 'Servicios' },
  { id: 'categorias', name: 'Categorías', icon: 'fas fa-tags', shortName: 'Categorías' },
  { id: 'solicitudes', name: 'Solicitudes', icon: 'fas fa-user-plus', shortName: 'Solicitudes' }
].map(tab => (
```

### 2. Actualizar helpers de Supabase (`supabase-helpers.ts`)

#### Funciones nuevas (correctas):
```typescript
// Horarios de atención
getHorariosAtencion: async (barbero_id?: string)
createHorarioAtencion: async (horario)
updateHorarioAtencion: async (id, updates)
deleteHorarioAtencion: async (id)

// Horarios bloqueados
getHorariosBloqueados: async (barbero_id?: string)
createHorarioBloqueado: async (bloqueo)
updateHorarioBloqueado: async (id, updates)
deleteHorarioBloqueado: async (id)
```

#### Funciones legacy (deprecated, para compatibilidad):
```typescript
// Mantienen el nombre antiguo pero llaman a las nuevas
getHorariosTrabajo → getHorariosAtencion
createHorarioTrabajo → createHorarioAtencion
updateHorarioTrabajo → updateHorarioAtencion
deleteHorarioTrabajo → deleteHorarioAtencion
```

## 🧪 Verificación

### Tablas en base de datos:
```bash
# horarios_atencion: ✅ EXISTE (12 registros)
# horarios_bloqueados: ✅ EXISTE (0 registros)
# horarios_trabajo: ❌ NO EXISTE
```

### Componentes:
- `src/components/admin/tabs/HorariosTab.tsx` ✅ Usa tablas correctas
- `src/components/admin/modals/HorarioModal.tsx` ✅ Modal para horarios de atención
- `src/components/admin/modals/BloqueoModal.tsx` ✅ Modal para bloqueos

### Funcionalidad:
- Pestaña visible en el menú de navegación ✅
- Selección de barbero funcional ✅
- Dos pestañas internas:
  - **Horarios de Atención**: Gestión semanal ✅
  - **Horarios Bloqueados**: Bloqueos específicos ✅

## 📋 Archivos Modificados

1. **`src/pages/admin.tsx`** (línea 264-273)
   - Agregar entrada 'horarios' al array de navegación

2. **`lib/supabase-helpers.ts`** (líneas 332-381)
   - Renombrar funciones: `getHorariosTrabajo` → `getHorariosAtencion`
   - Actualizar referencias: `horarios_trabajo` → `horarios_atencion`
   - Agregar funciones CRUD para `horarios_bloqueados`
   - Mantener funciones legacy con advertencias

## 🚀 Deployment

### Commit:
```
commit 2a84d6e
fix: añadir pestaña Horarios al menú de navegación y actualizar helpers
```

### GitHub:
```
https://github.com/juan135072/chamos-barber-app/commit/2a84d6e
```

### Próximos pasos:
1. Esperar despliegue automático (7-10 minutos)
2. Ir a `https://chamosbarber.com/admin`
3. Verificar que la pestaña **"Horarios"** aparece en el menú
4. Probar funcionalidad completa:
   - Seleccionar barbero
   - Ver horarios de atención
   - Crear/editar/eliminar horarios
   - Crear bloqueos (vacaciones, permisos)

## 📚 Documentación Relacionada

- `GESTION_HORARIOS.md` - Documentación completa del sistema de horarios
- `scripts/check-horarios-schema.js` - Script para verificar tablas

## ⚠️ Notas Importantes

1. **Compatibilidad hacia atrás**: Las funciones legacy (`getHorariosTrabajo`, etc.) están mantenidas con advertencias de deprecación para evitar romper código existente.

2. **Nombres de tablas**: Cualquier código nuevo debe usar:
   - `horarios_atencion` (horarios semanales)
   - `horarios_bloqueados` (bloqueos específicos)

3. **HorariosTab.tsx**: Ya usa queries directas a las tablas correctas (no usa helpers).

---

**Estado**: ✅ RESUELTO
**Commit**: `2a84d6e`
**Fecha**: 2025-12-16
