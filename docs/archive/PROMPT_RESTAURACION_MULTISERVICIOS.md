# 🔄 PROMPT DE RESTAURACIÓN - SISTEMA MÚLTIPLES SERVICIOS
## Sesión 2025-11-09: Implementación Múltiples Servicios y Mejoras POS

---

## 📌 USO DE ESTE PROMPT

**Cuándo usar**: Si el sistema se rompe o necesitas recuperar el contexto completo de esta implementación.

**Cómo usar**: Copia y pega este prompt completo a un nuevo asistente de IA o sesión.

---

## 🎯 CONTEXTO GENERAL

Soy el desarrollador AI trabajando en **Chamos Barber App**, una aplicación Next.js 14 para gestión de barbería. Durante la sesión del 9 de noviembre de 2025, implementamos un sistema completo de **múltiples servicios** en reservas, consultas y POS.

**Repositorio**: https://github.com/juan135072/chamos-barber-app  
**Usuario GitHub**: juan135072  
**Branches activos**: `master`, `main`, `genspark_ai_developer`  
**Deploy**: Coolify (auto-deploy desde branch `master`)

---

## 🔧 STACK TECNOLÓGICO

- **Framework**: Next.js 14 (Pages Router)
- **Backend**: Supabase PostgreSQL
- **Lenguaje**: TypeScript
- **Styling**: CSS Variables con tema oscuro
- **Auth**: Supabase Auth
- **Deploy**: Coolify

---

## 📦 ESTADO ACTUAL DEL PROYECTO

### Commit Actual: `2d0de21`

```bash
git log --oneline -6
# 2d0de21 feat(pos): permitir selección múltiple de servicios con checkboxes
# 00c5c12 feat(pos): agregar selección de tipo de documento (Boleta/Factura)
# e91e0bc feat(consultar): mostrar precios y duraciones individuales
# aad7d52 fix(consultar): improve regex to handle whitespace
# dd5372a feat(consultar): add multiple services display support
# a4a0187 feat(reservar): implement multiple service selection
```

### Branches Sincronizados:
- `master` → `2d0de21` (Producción Coolify)
- `main` → `2d0de21` (GitHub principal)
- `genspark_ai_developer` → `2d0de21` (Desarrollo actual)

---

## 🎯 FUNCIONALIDADES IMPLEMENTADAS

### 1. MÚLTIPLES SERVICIOS EN RESERVAS

**Archivo**: `/src/pages/reservar.tsx`

**Cambios principales**:
- Cambió de radio buttons (un servicio) a checkboxes (múltiples)
- Agregó `serviciosSeleccionados: string[]` state
- Panel de resumen con contador, duración total y precio total
- Validación: al menos un servicio requerido
- Paso de confirmación con lista detallada

**Estado clave**:
```typescript
const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([])

const toggleServicio = (servicioId: string) => {
  setServiciosSeleccionados(prev => {
    if (prev.includes(servicioId)) {
      return prev.filter(id => id !== servicioId)
    } else {
      return [...prev, servicioId]
    }
  })
}

const calcularTotales = () => {
  const serviciosInfo = serviciosSeleccionados.map(id => 
    servicios.find(s => s.id === id)
  ).filter(Boolean)

  const duracionTotal = serviciosInfo.reduce((sum, s) => sum + s.duracion_minutos, 0)
  const precioTotal = serviciosInfo.reduce((sum, s) => sum + s.precio, 0)

  return { duracionTotal, precioTotal, serviciosInfo }
}
```

**API**: `/src/pages/api/crear-cita.ts`

Acepta `servicios_ids: string[]` y guarda múltiples servicios así:
```typescript
// Extrae array de servicios
const serviciosIds: string[] = citaData.servicios_ids || 
                               (citaData.servicio_id ? [citaData.servicio_id] : [])

// Valida TODOS los servicios
const { data: servicios } = await supabase
  .from('servicios')
  .select('id, nombre, activo')
  .in('id', serviciosIds)

// Guarda en notas (compatibilidad BD)
if (serviciosIds.length > 1) {
  const nombresServicios = servicios.map(s => s.nombre).join(', ')
  notasCompletas = `${citaData.notas}\n\n[SERVICIOS SOLICITADOS: ${nombresServicios}]`
}

// Insert con primer servicio
const citaInsert = {
  servicio_id: serviciosIds[0],
  notas: notasCompletas,
  // ...
}
```

**Formato en BD**:
```
Notas del cliente...

[SERVICIOS SOLICITADOS: Corte Clásico, Barba Completa, Cejas Masculinas]
```

---

### 2. VISUALIZACIÓN MÚLTIPLES SERVICIOS EN CONSULTA

**Archivo**: `/src/pages/consultar.tsx`

**Interfaces agregadas**:
```typescript
interface ServicioDetalle {
  nombre: string
  precio: number
  duracion_minutos: number
}

interface Cita {
  // ... campos existentes
  duracion_total?: number
  servicios_detalle?: ServicioDetalle[]
}
```

**Funciones helper**:
```typescript
// Extrae servicios desde notas
const extraerServicios = (cita: Cita): ServicioInfo[] => {
  const servicios: ServicioInfo[] = [
    { nombre: cita.servicio_nombre, esAdicional: false }
  ]

  if (cita.notas) {
    const match = cita.notas.match(/\[SERVICIOS SOLICITADOS:\s*([^\]]+)\]/)
    if (match) {
      const serviciosTexto = match[1].trim()
      const nombresServicios = serviciosTexto.split(',').map(s => s.trim())
      
      if (nombresServicios.length > 1) {
        return nombresServicios.map((nombre, idx) => ({
          nombre,
          esAdicional: idx > 0
        }))
      }
    }
  }

  return servicios
}

// Limpia notas del marcador
const limpiarNotas = (notas?: string): string | null => {
  if (!notas) return null
  const notasLimpias = notas.replace(/\s*\[SERVICIOS SOLICITADOS:\s*[^\]]+\]\s*/g, '').trim()
  return notasLimpias || null
}
```

**API**: `/src/pages/api/consultar-citas.ts`

Query actualizado:
```typescript
const { data: citas } = await supabase
  .from('citas')
  .select(`
    id, fecha, hora, estado, notas,
    servicios (
      nombre,
      precio,
      duracion_minutos  // ← IMPORTANTE: Agregado
    ),
    barberos (nombre, apellido, imagen_url, especialidad)
  `)
```

Cálculo de totales:
```typescript
const calcularDatosServicios = async (cita: any) => {
  let precioTotal = cita.servicios?.precio || 0
  let duracionTotal = cita.servicios?.duracion_minutos || 0
  let serviciosDetalle: any[] = []

  if (cita.notas) {
    const match = cita.notas.match(/\[SERVICIOS SOLICITADOS:\s*([^\]]+)\]/)
    if (match) {
      const serviciosTexto = match[1].trim()
      const nombresServicios = serviciosTexto.split(',').map((s: string) => s.trim())
      
      if (nombresServicios.length > 1) {
        // Buscar TODOS los servicios en BD
        const { data: serviciosData } = await supabase
          .from('servicios')
          .select('nombre, precio, duracion_minutos')
          .in('nombre', nombresServicios)
        
        if (serviciosData && serviciosData.length > 0) {
          precioTotal = serviciosData.reduce((sum: number, s: any) => sum + (s.precio || 0), 0)
          duracionTotal = serviciosData.reduce((sum: number, s: any) => sum + (s.duracion_minutos || 0), 0)
          serviciosDetalle = serviciosData
        }
      }
    }
  }

  return { precioTotal, duracionTotal, serviciosDetalle }
}
```

Mapeo final:
```typescript
const mappedCitas = await Promise.all(citas.map(async (cita: any) => {
  const { precioTotal, duracionTotal, serviciosDetalle } = await calcularDatosServicios(cita)
  
  return {
    id: cita.id,
    // ... otros campos
    precio: precioTotal,
    duracion_total: duracionTotal,
    servicios_detalle: serviciosDetalle
  }
}))
```

**Visualización en frontend**:
```tsx
{serviciosDetalle.map((servicio, idx) => (
  <li key={idx}>
    <span>{idx + 1}</span>
    <span>{servicio.nombre}</span>
    <span>${servicio.precio}</span>
    <span>{servicio.duracion_minutos} min</span>
  </li>
))}
{/* Línea divisoria */}
<div>TOTAL: ${cita.precio} | {cita.duracion_total} min</div>
```

---

### 3. SELECTOR BOLETA/FACTURA EN POS

**Archivo**: `/src/components/pos/CobrarForm.tsx`

**Estados agregados**:
```typescript
const [tipoDocumento, setTipoDocumento] = useState<'boleta' | 'factura'>('boleta')
const [rut, setRut] = useState('')
```

**UI Selector**:
```tsx
<div className="grid grid-cols-2 gap-3">
  <button
    onClick={() => setTipoDocumento('boleta')}
    style={{
      backgroundColor: tipoDocumento === 'boleta' ? 'var(--accent-color)' : 'var(--bg-primary)',
      borderColor: tipoDocumento === 'boleta' ? 'var(--accent-color)' : 'var(--border-color)'
    }}
  >
    <i className="fas fa-receipt"></i> Boleta
  </button>
  <button
    onClick={() => setTipoDocumento('factura')}
    style={{
      backgroundColor: tipoDocumento === 'factura' ? 'var(--accent-color)' : 'var(--bg-primary)',
      borderColor: tipoDocumento === 'factura' ? 'var(--accent-color)' : 'var(--border-color)'
    }}
  >
    <i className="fas fa-file-invoice-dollar"></i> Factura
  </button>
</div>

{tipoDocumento === 'factura' && (
  <input
    type="text"
    value={rut}
    onChange={(e) => setRut(e.target.value)}
    placeholder="Ej: 12.345.678-9"
  />
)}
```

**Validación**:
```typescript
if (tipoDocumento === 'factura' && !rut.trim()) {
  alert('Para emitir factura, ingresa el RUT del cliente')
  return
}
```

**Insert en BD**:
```typescript
await supabase.from('facturas').insert({
  tipo_documento: tipoDocumento,
  cliente_rut: tipoDocumento === 'factura' ? rut.trim() : null,
  // ... otros campos
})
```

**Migración SQL**: `/supabase/migrations/add_tipo_documento_facturas.sql`

```sql
ALTER TABLE facturas 
ADD COLUMN IF NOT EXISTS tipo_documento TEXT NOT NULL DEFAULT 'boleta'
CHECK (tipo_documento IN ('boleta', 'factura'));

ALTER TABLE facturas 
ADD COLUMN IF NOT EXISTS cliente_rut TEXT;

CREATE INDEX IF NOT EXISTS idx_facturas_tipo_documento ON facturas(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente_rut ON facturas(cliente_rut) WHERE cliente_rut IS NOT NULL;
```

**⚠️ IMPORTANTE**: Esta migración YA FUE EJECUTADA en Supabase.

---

### 4. SELECCIÓN MÚLTIPLE EN POS

**Archivo**: `/src/components/pos/CobrarForm.tsx`

**Estado actualizado**:
```typescript
const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([])
```

**Funciones principales**:
```typescript
const toggleServicio = (servicioId: string) => {
  setServiciosSeleccionados(prev => {
    if (prev.includes(servicioId)) {
      return prev.filter(id => id !== servicioId)
    } else {
      return [...prev, servicioId]
    }
  })
}

const agregarAlCarrito = () => {
  if (serviciosSeleccionados.length === 0) {
    alert('Selecciona al menos un servicio')
    return
  }

  const nuevosItems: ItemCarrito[] = []
  
  serviciosSeleccionados.forEach(servicioId => {
    const servicio = servicios.find(s => s.id === servicioId)
    if (!servicio) return

    const existeIndex = carrito.findIndex(item => item.servicio_id === servicio.id)
    
    if (existeIndex < 0) {
      nuevosItems.push({
        servicio_id: servicio.id,
        nombre: servicio.nombre,
        precio: parseFloat(servicio.precio.toString()),
        cantidad: 1,
        subtotal: parseFloat(servicio.precio.toString())
      })
    }
  })

  if (nuevosItems.length > 0) {
    setCarrito([...carrito, ...nuevosItems])
  }

  setServiciosSeleccionados([])
}

const limpiarSeleccion = () => {
  setServiciosSeleccionados([])
}
```

**UI Grid de Cards**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" 
     style={{ maxHeight: '400px', overflowY: 'auto' }}>
  {servicios.map((servicio) => {
    const isSelected = serviciosSeleccionados.includes(servicio.id)
    return (
      <div
        key={servicio.id}
        onClick={() => toggleServicio(servicio.id)}
        className="relative p-4 rounded-lg cursor-pointer border-2"
        style={{
          backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.1)' : 'var(--bg-primary)',
          borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
          boxShadow: isSelected ? '0 0 10px rgba(212, 175, 55, 0.3)' : 'none'
        }}
      >
        {/* Checkbox visual */}
        <div className="absolute top-2 right-2" style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
          border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`
        }}>
          {isSelected && <i className="fas fa-check"></i>}
        </div>

        <h4>{servicio.nombre}</h4>
        <p>{servicio.categoria}</p>
        <span>${servicio.precio}</span>
        <span>{servicio.duracion_minutos} min</span>
      </div>
    )
  })}
</div>

<button onClick={agregarAlCarrito}>
  Agregar al Carrito ({serviciosSeleccionados.length})
</button>
{serviciosSeleccionados.length > 0 && (
  <button onClick={limpiarSeleccion}>Limpiar</button>
)}
```

---

## ⚠️ PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: Servicios No Se Muestran en Consulta

**Síntoma**: Solo aparece el primer servicio

**Causa**: Regex no detecta el marcador por espacios en blanco

**Solución**:
```typescript
// ✅ CORRECTO
const match = cita.notas.match(/\[SERVICIOS SOLICITADOS:\s*([^\]]+)\]/)
//                                                      ^^^ Permite espacios

// ❌ INCORRECTO
const match = cita.notas.match(/\[SERVICIOS SOLICITADOS: ([^\]]+)\]/)
```

### Problema 2: Precio Total Incorrecto

**Síntoma**: Total no suma todos los servicios

**Causa**: API solo devuelve precio del primer servicio

**Solución**: Implementar `calcularDatosServicios()` que busca TODOS los servicios en BD y suma.

### Problema 3: Build Error "Cannot find name"

**Síntoma**: `Cannot find name 'setServicioSeleccionado'`

**Causa**: Estado cambió de `servicioSeleccionado` a `serviciosSeleccionados` pero no se actualizó en limpieza de form

**Solución**:
```typescript
// Actualizar en handleCobrar() o resetForm()
setServiciosSeleccionados([])  // ✅
// setServicioSeleccionado('')  // ❌ Ya no existe
```

---

## 🔄 PASOS PARA RESTAURAR ESTADO

Si el código se rompió o necesitas volver a este estado:

### 1. Verificar Commit Actual
```bash
cd /home/user/webapp
git log --oneline -1
# Debería mostrar: 2d0de21 feat(pos): permitir selección múltiple...
```

### 2. Si Commit Es Diferente, Restaurar
```bash
git checkout 2d0de21
git checkout -b restore-multiservicios
```

### 3. Verificar Archivos Clave
```bash
# Verificar que estos archivos existan y tengan los cambios
ls -la src/pages/reservar.tsx
ls -la src/pages/consultar.tsx
ls -la src/pages/api/crear-cita.ts
ls -la src/pages/api/consultar-citas.ts
ls -la src/components/pos/CobrarForm.tsx
ls -la supabase/migrations/add_tipo_documento_facturas.sql
```

### 4. Verificar Migración SQL
```sql
-- Ejecutar en Supabase SQL Editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'facturas' 
AND column_name IN ('tipo_documento', 'cliente_rut');

-- Si no existen, ejecutar:
-- /supabase/migrations/add_tipo_documento_facturas.sql
```

### 5. Build y Test
```bash
npm run build
# Debe compilar sin errores

npm run dev
# Probar cada funcionalidad
```

---

## 📚 ARCHIVOS IMPORTANTES PARA REVISAR

Si necesitas entender el código:

1. **`/src/pages/reservar.tsx`** (líneas 26-360)
   - Estado `serviciosSeleccionados`
   - Función `toggleServicio`
   - Función `calcularTotales`
   - Renderizado de checkboxes

2. **`/src/pages/consultar.tsx`** (líneas 37-85)
   - Función `extraerServicios`
   - Función `limpiarNotas`
   - Renderizado con `servicios_detalle`

3. **`/src/pages/api/crear-cita.ts`** (líneas 61-187)
   - Extracción de `servicios_ids`
   - Validación de servicios
   - Formato de notas con marcador

4. **`/src/pages/api/consultar-citas.ts`** (líneas 104-145)
   - Función `calcularDatosServicios`
   - Mapeo de citas con totales

5. **`/src/components/pos/CobrarForm.tsx`** (líneas 26-450)
   - Estados `tipoDocumento`, `rut`, `serviciosSeleccionados`
   - Funciones `toggleServicio`, `agregarAlCarrito`
   - Grid de servicios con checkboxes

---

## 🎯 COMANDOS ÚTILES

```bash
# Ver estado de branches
git branch -vv

# Ver commits recientes
git log --oneline --graph -10

# Verificar cambios en archivo
git diff HEAD~1 src/pages/reservar.tsx

# Build proyecto
npm run build

# Dev server
npm run dev

# Ver procesos en puerto 3000
lsof -ti:3000

# Matar proceso
kill -9 $(lsof -ti:3000)
```

---

## 🔑 INFORMACIÓN CLAVE

### Variables de Entorno Requeridas:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Puertos:
- **Dev Server**: 3000, 3001, 3002 (auto-increment)
- **Producción**: Configurado en Coolify

### Branches:
- **master**: Deploy en Coolify
- **main**: Sincronizado con master
- **genspark_ai_developer**: Desarrollo activo

---

## ✅ CHECKLIST DE VERIFICACIÓN

Después de restaurar, verifica:

- [ ] Build sin errores: `npm run build`
- [ ] Dev server inicia: `npm run dev`
- [ ] Reservas muestra checkboxes múltiples
- [ ] Consulta muestra lista numerada de servicios
- [ ] Consulta muestra precios y duraciones individuales
- [ ] Consulta muestra totales correctos
- [ ] POS muestra selector Boleta/Factura
- [ ] POS muestra campo RUT al seleccionar Factura
- [ ] POS muestra grid de servicios con checkboxes
- [ ] POS permite agregar múltiples servicios
- [ ] Migración SQL está en BD
- [ ] Todos los tests pasan

---

## 📞 CONTACTO Y SOPORTE

**Usuario GitHub**: juan135072  
**Repositorio**: https://github.com/juan135072/chamos-barber-app  
**Documentación Completa**: `/SESION_COMPLETA_2025-11-09_MULTISERVICIOS.md`

---

## 🎓 CONTEXTO ADICIONAL

Si eres un nuevo asistente AI leyendo esto:

1. **Lee primero**: `SESION_COMPLETA_2025-11-09_MULTISERVICIOS.md`
2. **Verifica estado**: Commits, branches, archivos
3. **Ejecuta tests**: Build, dev server, funcionalidades
4. **Consulta**: Documentación inline en código
5. **Pregunta**: Si algo no está claro, pide más contexto

**Recuerda**:
- Siempre trabajar en `genspark_ai_developer`
- Hacer commit inmediatamente después de cambios
- Merge a `master` y `main` antes de PR
- Ejecutar `npm run build` antes de commit
- Mantener documentación actualizada

---

**FIN DEL PROMPT DE RESTAURACIÓN**

_Última actualización: 2025-11-09 19:30 UTC_  
_Versión: 1.0_  
_Estado del Sistema: FUNCIONAL Y ESTABLE_
