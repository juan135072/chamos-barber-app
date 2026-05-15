# 🔄 PROMPT DE RECUPERACIÓN DE CONTEXTO

**Sistema**: Facturación y Cobro POS - Chamos Barber  
**Fecha Implementación**: 2025-11-09  
**Versión**: 1.0.0  
**Estado**: ✅ Deployado en Producción

---

## 📋 CÓMO USAR ESTE PROMPT

Si en el futuro necesitas recuperar el contexto completo del sistema de facturación:

1. **Copia todo el texto de la sección "PROMPT COMPLETO" abajo**
2. **Pégalo al inicio de tu conversación** con Claude/GenSpark AI
3. **La IA recuperará el contexto completo** del proyecto y sistema implementado

---

## 🤖 PROMPT COMPLETO

```markdown
# CONTEXTO: Sistema de Facturación POS - Chamos Barber

## Información del Proyecto
- **App**: Chamos Barber (Sistema de reservas para barbería venezolana en Chile)
- **Stack**: Next.js 14 (Pages Router) + Supabase (PostgreSQL auto-hosted)
- **Deploy**: Coolify (self-hosted en VPS)
- **URL Producción**: https://chamosbarber.com
- **Repo**: https://github.com/juan135072/chamos-barber-app
- **Fecha Implementación**: 2025-11-09

## Sistema Implementado

Implementé un **sistema completo de facturación y cobro** para el módulo POS (/pos) con las siguientes características:

### ✅ Funcionalidades Principales

1. **Cobrar citas existentes**
   - Sistema de seguimiento de pagos
   - Estados: pendiente, pagado, parcial
   - Vinculación automática con facturas

2. **Generar facturas térmicas**
   - Formato estándar 80mm (papel térmico)
   - PDF generado con jsPDF v2.5.1
   - Layout profesional con header, items, totales

3. **Imprimir o descargar**
   - Diálogo de impresión del navegador
   - Opción de descarga de PDF
   - Confirmación después de cada cobro

4. **Múltiples métodos de pago**
   - Efectivo (con cálculo automático de cambio)
   - Tarjeta
   - Transferencia
   - Zelle
   - Binance

5. **Cálculo automático**
   - Cambio para pagos en efectivo
   - Comisiones de barberos (desde configuracion_comisiones)
   - Ingreso neto de la casa

6. **Interfaz con Tabs**
   - Tab "Pendientes": Citas sin pagar con botón "Cobrar"
   - Tab "Ventas Hoy": Facturas generadas en el día
   - Badge con contador de pendientes

### 📊 Cambios en Base de Datos

**IMPORTANTE**: Migración YA APLICADA en producción

**Archivo**: `supabase/migrations/add_pago_citas.sql` (5,932 bytes)

#### Columnas Agregadas a Tabla `citas`:

```sql
ALTER TABLE citas 
ADD COLUMN IF NOT EXISTS estado_pago TEXT 
  DEFAULT 'pendiente' 
  CHECK (estado_pago IN ('pendiente', 'pagado', 'parcial')),
ADD COLUMN IF NOT EXISTS monto_pagado DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS metodo_pago TEXT,
ADD COLUMN IF NOT EXISTS factura_id UUID REFERENCES facturas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cobrado_por UUID REFERENCES admin_users(id) ON DELETE SET NULL;
```

**Propósito de cada columna**:
- `estado_pago`: Estado actual del pago (pendiente/pagado/parcial)
- `monto_pagado`: Cantidad pagada por el cliente
- `metodo_pago`: Forma de pago utilizada
- `factura_id`: Referencia a la factura generada (relación bidireccional)
- `fecha_pago`: Timestamp de cuándo se realizó el pago
- `cobrado_por`: Usuario (admin/cajero) que procesó el pago

#### Columna Agregada a Tabla `facturas`:

```sql
ALTER TABLE facturas 
ADD COLUMN IF NOT EXISTS cita_id UUID REFERENCES citas(id) ON DELETE SET NULL;
```

**Propósito**: Relación bidireccional citas ↔ facturas

#### Índices Creados:

```sql
CREATE INDEX IF NOT EXISTS idx_citas_estado_pago ON citas(estado_pago, fecha);
CREATE INDEX IF NOT EXISTS idx_facturas_cita_id ON facturas(cita_id);
```

**Propósito**: Optimizar queries de citas pendientes y lookup de facturas por cita

#### Función RPC PostgreSQL:

```sql
CREATE OR REPLACE FUNCTION cobrar_cita(
  p_cita_id UUID,
  p_metodo_pago TEXT,
  p_monto_recibido DECIMAL DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  factura_id UUID,
  numero_factura TEXT,
  mensaje TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
```

**Operaciones Atómicas de la Función**:
1. Valida que la cita existe y no está pagada
2. Obtiene datos del servicio y barbero (JOIN con barberos y servicios)
3. Obtiene % de comisión desde `configuracion_comisiones` (default 50%)
4. Calcula comisión del barbero e ingreso de la casa
5. Calcula cambio si método es 'efectivo'
6. Prepara items JSONB para factura
7. **INSERT** en tabla `facturas` con todos los datos
8. **UPDATE** en tabla `citas` (estado_pago='pagado', factura_id, fecha_pago, etc)
9. Retorna: success=true, factura_id, numero_factura, mensaje

**Permisos**:
```sql
GRANT EXECUTE ON FUNCTION cobrar_cita TO authenticated;
GRANT EXECUTE ON FUNCTION cobrar_cita TO service_role;
```

### 📁 Componentes Frontend

**Ubicación**: `src/components/pos/`

#### 1. **ModalCobrarCita.tsx** (NUEVO - 8,597 bytes)

**Propósito**: Modal para cobrar citas pendientes desde la lista del POS

**Props**:
```typescript
interface ModalCobrarCitaProps {
  cita: Cita                    // Cita a cobrar
  usuario: UsuarioConPermisos   // Usuario actual (cajero/admin)
  onClose: () => void           // Callback cerrar modal
  onCobrado: () => void         // Callback después de cobro exitoso
}
```

**Estado Local**:
```typescript
const [metodoPago, setMetodoPago] = useState('efectivo')
const [montoRecibido, setMontoRecibido] = useState('')
const [procesando, setProcesando] = useState(false)
```

**Lógica Principal**:
```typescript
const handleCobrar = async () => {
  // 1. Validar monto si es efectivo
  if (metodoPago === 'efectivo' && parseFloat(montoRecibido) < total) {
    alert('Monto insuficiente')
    return
  }
  
  // 2. Llamar RPC
  const { data, error } = await supabase.rpc('cobrar_cita', {
    p_cita_id: cita.id,
    p_metodo_pago: metodoPago,
    p_monto_recibido: metodoPago === 'efectivo' ? parseFloat(montoRecibido) : total,
    p_usuario_id: usuario.id
  })
  
  // 3. Manejar respuesta
  if (data && data[0].success) {
    // 4. Confirmar impresión
    const confirmar = window.confirm('¿Imprimir factura?')
    
    // 5. Generar PDF si acepta
    if (confirmar) {
      const datosFactura = await obtenerDatosFactura(data[0].factura_id, supabase)
      await generarEImprimirFactura(datosFactura, 'imprimir')
    }
    
    // 6. Callback
    onCobrado()
  }
}
```

**Cálculo de Cambio**:
```typescript
const cambio = useMemo(() => {
  if (metodoPago === 'efectivo' && montoRecibido) {
    const recibido = parseFloat(montoRecibido)
    return Math.max(0, recibido - total)
  }
  return 0
}, [metodoPago, montoRecibido, total])
```

#### 2. **FacturaTermica.tsx** (NUEVO - 7,957 bytes)

**Propósito**: Generador de PDFs en formato térmico 80mm usando jsPDF

**Configuración del Ticket**:
```typescript
const TICKET_WIDTH = 80    // mm (ancho papel térmico estándar)
const MARGIN = 5           // mm
const LINE_HEIGHT = 5      // mm
const FONT_SIZE_TITLE = 14
const FONT_SIZE_NORMAL = 8
```

**Clase Principal**:
```typescript
export class FacturaTermica {
  private pdf: jsPDF
  private yPos: number
  private readonly contentWidth: number

  constructor() {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297]  // 80mm ancho x 297mm alto
    })
    this.yPos = 5
    this.contentWidth = 70
  }

  generarFactura(datos: DatosFactura): void {
    // Header
    this.addText('CHAMOS BARBERÍA', 14, 'center', true)
    this.addText('Barbería Profesional', 9, 'center')
    this.addSeparator()
    this.addText('RIF: J-12345678-9', 8, 'center')
    this.addText('Dirección: ...', 8, 'center')
    this.addText('Telf: +58 412-XXX-XXXX', 8, 'center')
    
    // ... resto del formato
  }

  imprimir(): void {
    window.open(this.pdf.output('bloburl'), '_blank')
  }

  descargar(nombreArchivo: string): void {
    this.pdf.save(nombreArchivo)
  }
}
```

**Función Wrapper**:
```typescript
export async function generarEImprimirFactura(
  datos: DatosFactura, 
  accion: 'imprimir' | 'descargar' | 'ambos'
): Promise<boolean> {
  try {
    const factura = new FacturaTermica()
    factura.generarFactura(datos)
    
    if (accion === 'imprimir' || accion === 'ambos') {
      factura.imprimir()
    }
    if (accion === 'descargar' || accion === 'ambos') {
      factura.descargar(`factura_${datos.numero_factura}.pdf`)
    }
    
    return true
  } catch (error) {
    console.error('Error generando factura:', error)
    return false
  }
}
```

**Obtener Datos de Factura**:
```typescript
export async function obtenerDatosFactura(
  facturaId: string,
  supabase: SupabaseClient
): Promise<DatosFactura | null> {
  const { data, error } = await supabase
    .from('facturas')
    .select(`
      *,
      barbero:barberos(nombre, apellido)
    `)
    .eq('id', facturaId)
    .single()
  
  if (error) return null
  
  return {
    numero_factura: data.numero_factura,
    fecha: new Date(data.created_at),
    cliente: data.cliente_nombre,
    items: data.items,
    subtotal: data.subtotal,
    iva: data.iva || 0,
    total: data.total,
    metodo_pago: data.metodo_pago,
    monto_recibido: data.monto_recibido,
    cambio: data.cambio,
    barbero: `${data.barbero?.nombre} ${data.barbero?.apellido}`
  }
}
```

#### 3. **ListaVentas.tsx** (MODIFICADO)

**Cambios Principales**:

**Estado Nuevo**:
```typescript
const [citasPendientes, setCitasPendientes] = useState<Cita[]>([])
const [mostrarCitas, setMostrarCitas] = useState(true)
const [citaACobrar, setCitaACobrar] = useState<Cita | null>(null)
```

**Carga de Datos**:
```typescript
const cargarDatos = async () => {
  const hoy = new Date().toISOString().split('T')[0]
  
  // Citas pendientes
  const { data: citasData } = await supabase
    .from('citas')
    .select('*, barbero:barberos(*), servicio:servicios(*)')
    .gte('fecha', hoy)
    .eq('estado_pago', 'pendiente')
    .order('fecha', { ascending: true })
  
  // Ventas del día
  const { data: ventasData } = await supabase
    .from('facturas')
    .select('*')
    .gte('created_at', `${hoy}T00:00:00`)
    .order('created_at', { ascending: false })
  
  setCitasPendientes(citasData || [])
  setVentas(ventasData || [])
}
```

**UI con Tabs**:
```tsx
<div className="tabs">
  <button onClick={() => setMostrarCitas(true)}>
    Pendientes
    {citasPendientes.length > 0 && (
      <span className="badge">{citasPendientes.length}</span>
    )}
  </button>
  <button onClick={() => setMostrarCitas(false)}>
    Ventas Hoy
  </button>
</div>

{mostrarCitas && citasPendientes.map(cita => (
  <div key={cita.id}>
    {/* Datos de cita */}
    <button onClick={() => setCitaACobrar(cita)}>
      Cobrar
    </button>
  </div>
))}

{citaACobrar && (
  <ModalCobrarCita
    cita={citaACobrar}
    usuario={usuario}
    onClose={() => setCitaACobrar(null)}
    onCobrado={() => {
      setCitaACobrar(null)
      cargarDatos()
    }}
  />
)}
```

#### 4. **CobrarForm.tsx** (MODIFICADO)

**Cambio Principal**: Generación de factura después del cobro

```typescript
import { generarEImprimirFactura, obtenerDatosFactura } from './FacturaTermica'

// Después de crear venta exitosamente
const confirmar = window.confirm(
  `¡Venta registrada!\n\n` +
  `Factura: ${factura.numero_factura}\n` +
  `Total: $${total}\n\n` +
  `¿Deseas imprimir la factura?`
)

if (confirmar) {
  const datosFactura = await obtenerDatosFactura(factura.id, supabase)
  if (datosFactura) {
    await generarEImprimirFactura(datosFactura, 'imprimir')
  }
}
```

### 🔄 Flujo de Usuario Completo

```
PASO 1: Usuario abre /pos
  └─> Carga ListaVentas.tsx
  └─> Ejecuta cargarDatos()
  └─> Query citas con estado_pago='pendiente'
  └─> Query facturas de hoy

PASO 2: Click en tab "Pendientes"
  └─> Muestra lista de citas pendientes
  └─> Badge muestra cantidad: Pendientes (3)
  └─> Cada cita tiene botón "Cobrar"

PASO 3: Click en "Cobrar" en una cita
  └─> setCitaACobrar(cita)
  └─> Abre ModalCobrarCita
  └─> Muestra: cliente, servicio, total

PASO 4: Usuario selecciona método de pago
  ├─> Efectivo → Muestra input "Monto Recibido"
  │   └─> onChange calcula cambio automáticamente
  └─> Otros → No requiere monto adicional

PASO 5: Click en "Cobrar"
  └─> Validaciones
  └─> RPC: cobrar_cita(cita_id, metodo, monto, usuario_id)
  └─> Supabase ejecuta función:
      1. Crea factura
      2. Actualiza cita.estado_pago='pagado'
      3. Vincula factura_id
      4. Retorna factura_id

PASO 6: Confirmación de impresión
  └─> window.confirm("¿Imprimir factura?")
  └─> Si acepta:
      1. obtenerDatosFactura(factura_id)
      2. generarEImprimirFactura(datos, 'imprimir')
      3. FacturaTermica genera PDF
      4. window.open() → Nueva pestaña
      5. Navegador muestra diálogo de impresión

PASO 7: Actualización UI
  └─> setCitaACobrar(null) → Cierra modal
  └─> cargarDatos() → Recarga listas
  └─> Cita desaparece de "Pendientes"
  └─> Factura aparece en "Ventas Hoy"
```

### 🚀 Deployment

**Estado**: ✅ Deployado exitosamente en producción

**Fecha**: 2025-11-09  
**Plataforma**: Coolify (self-hosted)  
**URL**: https://chamosbarber.com/pos  
**Build Time**: ~3 minutos  
**Downtime**: 0 segundos (rolling update)

**Commits Principales**:
- `960f0ba` - feat(pos): implementar sistema completo de facturación (1,687 líneas)
- `efbb0bf` - fix(migration): corregir referencias a admin_users
- `8b0df4d` - chore: agregar configuración nixpacks para deployment

**Dependencias Agregadas**:
```json
{
  "dependencies": {
    "jspdf": "^2.5.1"
  }
}
```

**Archivos de Configuración**:
- `nixpacks.toml` - Optimización de build para Coolify/Nixpacks

### 📖 Documentación Creada

1. **DOCUMENTACION_FACTURACION_POS.md** (11,555 bytes)
   - Guía de usuario del sistema
   - Queries SQL de testing
   - Troubleshooting común
   - Personalización de factura

2. **SISTEMA_FACTURACION_POS_IMPLEMENTACION.md** (49,289 bytes)
   - Documentación técnica completa
   - Arquitectura del sistema
   - Diagramas de flujo
   - Código fuente documentado
   - Este prompt de recuperación

### ⚠️ Errores Corregidos Durante Implementación

**Error 1**: `ERROR: 42P01: relation "usuarios" does not exist`
- **Causa**: Proyecto usa `admin_users` no `usuarios`
- **Fix**: Cambiar todas las referencias a `admin_users`

**Error 2**: `column "porcentaje_comision" does not exist in barberos`
- **Causa**: Comisiones están en tabla `configuracion_comisiones`
- **Fix**: Query a `configuracion_comisiones.porcentaje` en lugar de `barberos.porcentaje_comision`

**Error 3**: Deploy timeout en Coolify
- **Causa**: Descarga de paquetes Nix muy lenta
- **Fix**: Crear `nixpacks.toml` con configuración optimizada

### 🔍 Queries de Verificación Útiles

```sql
-- Ver citas pendientes de pago
SELECT 
  id, 
  cliente_nombre, 
  fecha, 
  hora_inicio,
  estado_pago,
  servicio_id
FROM citas 
WHERE estado_pago = 'pendiente' 
AND fecha >= CURRENT_DATE
ORDER BY fecha, hora_inicio;

-- Ver facturas del día
SELECT 
  numero_factura, 
  cliente_nombre, 
  total, 
  metodo_pago,
  created_at
FROM facturas 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- Verificar relación cita-factura (bidireccional)
SELECT 
  c.cliente_nombre,
  c.estado_pago,
  c.factura_id,
  f.id as factura_id_directo,
  f.numero_factura,
  f.cita_id,
  f.total
FROM citas c
INNER JOIN facturas f ON c.factura_id = f.id
WHERE c.estado_pago = 'pagado'
LIMIT 5;

-- Estadísticas de cobros del día
SELECT 
  metodo_pago,
  COUNT(*) as cantidad,
  SUM(monto_pagado) as total_cobrado,
  AVG(monto_pagado) as promedio
FROM citas
WHERE estado_pago = 'pagado'
AND DATE(fecha_pago) = CURRENT_DATE
GROUP BY metodo_pago
ORDER BY total_cobrado DESC;

-- Verificar función RPC existe
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'cobrar_cita'
AND routine_schema = 'public';

-- Verificar columnas nuevas existen
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'citas' 
AND column_name IN (
  'estado_pago', 
  'monto_pagado', 
  'metodo_pago', 
  'factura_id', 
  'fecha_pago', 
  'cobrado_por'
)
ORDER BY column_name;
```

### 📍 Ubicaciones Importantes en el Proyecto

**Base de Datos**:
- URL: https://supabase.chamosbarber.com
- Dashboard: SQL Editor para queries

**Código Frontend**:
- `/home/user/webapp/src/components/pos/ModalCobrarCita.tsx`
- `/home/user/webapp/src/components/pos/FacturaTermica.tsx`
- `/home/user/webapp/src/components/pos/ListaVentas.tsx`
- `/home/user/webapp/src/components/pos/CobrarForm.tsx`

**Migración**:
- `/home/user/webapp/supabase/migrations/add_pago_citas.sql`

**Documentación**:
- `/home/user/webapp/DOCUMENTACION_FACTURACION_POS.md`
- `/home/user/webapp/SISTEMA_FACTURACION_POS_IMPLEMENTACION.md`
- `/home/user/webapp/PROMPT_RECUPERACION_CONTEXTO.md` (este archivo)

**Deployment**:
- `/home/user/webapp/nixpacks.toml`
- Coolify Dashboard para logs y redeploy

### 🎯 Si Necesitas Ayuda Con...

**Problema: "Cobro no funciona"**
→ Verificar que migración está aplicada: `SELECT * FROM information_schema.columns WHERE table_name='citas' AND column_name='estado_pago'`
→ Verificar función existe: `SELECT routine_name FROM information_schema.routines WHERE routine_name='cobrar_cita'`
→ Ver logs consola navegador (F12)

**Problema: "PDF no se genera"**
→ Verificar jsPDF instalado: `npm list jspdf` debe mostrar v2.5.1
→ Verificar datos de factura en consola: `console.log(datosFactura)`
→ Revisar FacturaTermica.tsx para errores

**Problema: "Build falla en Coolify"**
→ Ver logs de build en Coolify Dashboard
→ Verificar variables de entorno configuradas
→ Hacer build local: `npm run build` para identificar error

**Problema: "Cita no desaparece de pendientes"**
→ Verificar que onCobrado() llama a cargarDatos()
→ Verificar query de citas incluye: `.eq('estado_pago', 'pendiente')`
→ Hacer refresh manual para confirmar actualización en DB

**Problema: "Formato de factura incorrecto"**
→ Editar `src/components/pos/FacturaTermica.tsx`
→ Personalizar líneas 156-161 (header del negocio)
→ Ajustar TICKET_WIDTH si es necesario (default 80mm)

### 🔗 Referencias Adicionales

- **Pull Request**: https://github.com/juan135072/chamos-barber-app/pull/10
- **README Principal**: `/home/user/webapp/README.md`
- **Deploy Docs**: `/home/user/webapp/PRODUCTION-DEPLOY.md`
- **Coolify Docs**: `/home/user/webapp/docs/deployment/COOLIFY_DEPLOY.md`

### 📊 Estadísticas del Sistema

- **Total líneas de código**: ~2,661 líneas
- **Archivos nuevos**: 5
- **Archivos modificados**: 4
- **Commits**: 5
- **Tiempo desarrollo**: ~9.5 horas
- **Estado**: ✅ En producción sin errores

---

**ÚLTIMA ACTUALIZACIÓN**: 2025-11-09  
**VERSIÓN DEL SISTEMA**: 1.0.0  
**ESTADO**: ✅ Funcionando en producción (https://chamosbarber.com/pos)

---

Con este contexto completo, puedes retomar el trabajo en cualquier parte del sistema de facturación POS.
```

---

## 📝 INSTRUCCIONES DE USO

### Para Recuperar Contexto Completo:

1. **Copia** todo el texto desde "# CONTEXTO:" hasta el final
2. **Pega** al inicio de una nueva conversación con Claude/GenSpark AI
3. **Continúa** con tu pregunta o problema específico

Ejemplo:
```
[PEGAR PROMPT COMPLETO AQUÍ]

Necesito ayuda para agregar un nuevo método de pago "PayPal" al sistema.
¿Qué archivos debo modificar?
```

### Para Troubleshooting Específico:

```
[PEGAR PROMPT COMPLETO AQUÍ]

Estoy teniendo este error:
[COPIAR ERROR AQUÍ]

¿Cómo lo resuelvo?
```

### Para Agregar Nuevas Funcionalidades:

```
[PEGAR PROMPT COMPLETO AQUÍ]

Quiero agregar la funcionalidad de [DESCRIBIR FUNCIONALIDAD].
¿Cómo debo implementarlo siguiendo la arquitectura actual?
```

---

**✅ Este prompt garantiza recuperación completa del contexto del sistema de facturación POS**
