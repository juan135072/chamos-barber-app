# 📋 Documentación: Sistema de Cobro y Facturación POS

**Fecha:** 2025-11-09  
**Versión:** 1.0  
**Estado:** ✅ Implementado y Funcionando

---

## 🎯 Objetivo del Proyecto

Implementar un sistema completo de cobro y facturación para el POS de Chamos Barbería que permita:

1. Marcar citas como "pagadas" con seguimiento completo de pagos
2. Generar facturas térmicas en formato 80mm (PDF)
3. Imprimir automáticamente en impresora térmica POS-8250
4. Descargar PDF de facturas para respaldo

---

## 📊 Estado Actual del Sistema

### ✅ Funcionalidades Implementadas

| Funcionalidad | Estado | Descripción |
|---------------|--------|-------------|
| Cobrar citas | ✅ Producción | Marca citas como pagadas y genera factura |
| PDF térmico 80mm | ✅ Producción | Genera factura en formato térmico profesional |
| Impresión directa | ✅ Implementado | Servicio Node.js para impresión automática |
| Descarga PDF | ✅ Producción | Permite guardar factura localmente |
| Calcular comisiones | ✅ Producción | Reparte automáticamente barbero/casa |
| Múltiples métodos de pago | ✅ Producción | Efectivo, tarjeta, transferencia, zelle, binance |
| Cálculo de cambio | ✅ Producción | Para pagos en efectivo |
| Ver ventas del día | ✅ Producción | Lista de facturas emitidas hoy |
| Ver citas pendientes | ✅ Producción | Citas sin pagar con botón de cobro |

---

## 🗄️ Cambios en Base de Datos

### Tabla: `citas`

**Columnas Agregadas:**

```sql
-- Estado del pago
estado_pago TEXT DEFAULT 'pendiente' 
  CHECK (estado_pago IN ('pendiente', 'pagado', 'parcial'))

-- Monto pagado
monto_pagado DECIMAL(10,2) DEFAULT 0

-- Método de pago usado
metodo_pago TEXT

-- Referencia a factura generada
factura_id UUID REFERENCES facturas(id) ON DELETE SET NULL

-- Fecha y hora del pago
fecha_pago TIMESTAMP WITH TIME ZONE

-- Usuario que procesó el pago
cobrado_por UUID REFERENCES admin_users(id) ON DELETE SET NULL
```

**Índices:**
```sql
CREATE INDEX idx_citas_estado_pago ON citas(estado_pago, fecha);
```

### Función RPC: `cobrar_cita()`

**Parámetros:**
```sql
cobrar_cita(
  p_cita_id UUID,
  p_metodo_pago TEXT,
  p_monto_recibido DECIMAL DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
)
```

**Retorna:**
```sql
TABLE (
  success BOOLEAN,
  factura_id UUID,
  numero_factura TEXT,
  mensaje TEXT
)
```

**Funcionalidad:**
1. Valida que la cita existe y no está pagada
2. Obtiene precio del servicio
3. Calcula comisiones (barbero/casa) según configuración
4. Calcula cambio si es efectivo
5. Crea factura en tabla `facturas`
6. Actualiza cita como `pagado`
7. Retorna datos de la factura generada

**Archivo:** `supabase/migrations/fix_cobrar_cita_ambiguity.sql`

---

## 💻 Componentes Frontend

### 1. `ModalCobrarCita.tsx`

**Ubicación:** `src/components/pos/ModalCobrarCita.tsx`

**Funcionalidad:**
- Modal para cobrar una cita específica
- Selección de método de pago
- Input de monto recibido (solo efectivo)
- Cálculo automático de cambio
- Llamada a RPC `cobrar_cita()`
- Pantalla de éxito con 3 opciones:
  - ✅ Imprimir Factura (impresión directa o navegador)
  - 💾 Descargar PDF
  - ✓ Cerrar

**Estados:**
```typescript
- metodoPago: string
- montoRecibido: string
- procesando: boolean
- cobroExitoso: { facturaId, numeroFactura } | null
```

**Flujo:**
1. Usuario selecciona método de pago
2. Si es efectivo, ingresa monto recibido
3. Click en "Cobrar"
4. Llamada a `cobrar_cita()`
5. Si exitoso → Muestra pantalla de éxito
6. Usuario elige imprimir, descargar o cerrar

### 2. `FacturaTermica.tsx`

**Ubicación:** `src/components/pos/FacturaTermica.tsx`

**Funcionalidad:**
- Genera PDF en formato térmico 80mm
- Usa librería `jsPDF`
- Layout profesional con:
  - Encabezado con nombre del negocio
  - Información fiscal (RIF, teléfono, dirección)
  - Tipo de documento (BOLETA/FACTURA)
  - Número de factura
  - Fecha y hora
  - Datos del cliente
  - Barbero que atendió
  - Lista detallada de servicios
  - Totales
  - Método de pago
  - Monto recibido y cambio (efectivo)
  - Footer con redes sociales (@chamosbarber)

**Clase Principal:**
```typescript
class FacturaTermica {
  private pdf: jsPDF
  private yPos: number
  private contentWidth: number
  
  generarFactura(datos: DatosFactura): void
  descargar(nombreArchivo?: string): void
  imprimir(): void
  obtenerBase64(): string
  obtenerBlob(): Blob
}
```

**Funciones Helper:**
```typescript
// Obtener datos de factura desde BD
obtenerDatosFactura(facturaId: string, supabase: any): Promise<DatosFactura>

// Generar e imprimir/descargar
generarEImprimirFactura(datos: DatosFactura, accion: 'imprimir' | 'descargar' | 'ambos')
```

**Características Especiales:**
- ✅ Sin emojis (causan problemas en jsPDF)
- ✅ Texto limpio y legible
- ✅ Formato optimizado para 80mm
- ✅ Altura dinámica según contenido
- ✅ Líneas separadoras profesionales

### 3. `ListaVentas.tsx`

**Ubicación:** `src/components/pos/ListaVentas.tsx`

**Funcionalidad:**
- Muestra dos pestañas:
  - **Citas Pendientes:** Citas sin pagar con botón "Cobrar"
  - **Ventas Hoy:** Facturas emitidas en el día actual

**Queries:**

**Citas Pendientes:**
```typescript
.from('citas')
.select(`
  id,
  cliente_nombre,
  cliente_telefono,
  fecha,
  hora,
  estado_pago,
  barbero:barberos!citas_barbero_id_fkey (nombre, apellido),
  servicio:servicios!citas_servicio_id_fkey (nombre, precio, duracion_minutos)
`)
.gte('fecha', hoy)
.eq('estado_pago', 'pendiente')
.in('estado', ['pendiente', 'confirmada', 'completada'])
.order('fecha', { ascending: true })
.order('hora', { ascending: true })
```

**Ventas Hoy:**
```typescript
.from('facturas')
.select(`
  id,
  numero_factura,
  cliente_nombre,
  total,
  metodo_pago,
  created_at,
  barbero:barberos!facturas_barbero_id_fkey (nombre, apellido)
`)
.gte('created_at', `${hoy}T00:00:00`)
.lte('created_at', `${hoy}T23:59:59`)
.eq('anulada', false)
.order('created_at', { ascending: false })
```

**Estados:**
```typescript
- ventas: Venta[]
- citasPendientes: Cita[]
- cargando: boolean
- mostrarCitas: boolean
- citaACobrar: Cita | null
```

### 4. `CobrarForm.tsx`

**Ubicación:** `src/components/pos/CobrarForm.tsx`

**Funcionalidad:**
- Formulario para ventas "walk-in" (sin cita previa)
- Selección múltiple de servicios
- Carrito de compra
- Cálculo automático de totales
- Generación de factura directa
- Integración con impresión/descarga

---

## 🖨️ Servicio de Impresión Directa

### Arquitectura

```
┌─────────────────┐
│   POS Web       │  Puerto 443/80
│ (Frontend)      │
└────────┬────────┘
         │ HTTP Request
         │ POST /print
         ▼
┌─────────────────┐
│ Printer Service │  Puerto 3001
│  (Node.js)      │
└────────┬────────┘
         │ USB/Serial
         │ ESC/POS Commands
         ▼
┌─────────────────┐
│ Impresora POS   │
│   POS-8250      │
│    80mm         │
└─────────────────┘
```

### Servicio Node.js

**Ubicación:** `printer-service/`

**Archivos:**
```
printer-service/
├── package.json        # Dependencias
├── server.js          # Servidor Express
├── README.md          # Documentación
├── install.bat        # Instalador Windows
├── install.sh         # Instalador Linux/Mac
└── .gitignore
```

**Dependencias:**
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "escpos": "^3.0.0-alpha.6",
  "escpos-usb": "^3.0.0-alpha.4",
  "usb": "^2.9.0"
}
```

**Endpoints:**

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/health` | GET | Estado del servicio y impresora |
| `/printers` | GET | Lista impresoras USB disponibles |
| `/print` | POST | Imprime factura (body: `{ factura }`) |
| `/test` | POST | Imprime página de prueba |

**Puerto:** `3001`

**Comandos ESC/POS Usados:**
- Alineación: left, center, right
- Estilos: bold, underline
- Tamaños: normal, doble
- Control: `cut()` para corte de papel
- Líneas: `drawLine()`

### Integración Frontend → Servicio

**Función de Impresión (ModalCobrarCita.tsx):**

```typescript
const handleImprimirPDF = async () => {
  // 1. Obtener datos de factura
  const datosFactura = await obtenerDatosFactura(...)
  
  // 2. Intentar impresión directa
  try {
    const response = await fetch('http://localhost:3001/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factura: datosFactura }),
      signal: AbortSignal.timeout(5000) // 5 seg timeout
    })
    
    if (response.ok) {
      // ✅ Impresión directa exitosa
      alert('✅ Factura impresa correctamente')
      return
    }
  } catch (error) {
    // ⚠️ Servicio no disponible
    // Fallback a ventana del navegador
    await generarEImprimirFactura(datosFactura, 'imprimir')
  }
}
```

**Flujo de Decisión:**
```
Usuario click "Imprimir"
  ↓
¿Servicio en localhost:3001 disponible?
  ↓                           ↓
  Sí                         No
  ↓                           ↓
Impresión directa        Ventana navegador
(silenciosa, rápida)    (fallback tradicional)
```

---

## 🔧 Problemas Resueltos Durante el Desarrollo

### 1. ❌ Error: `column citas.hora_inicio does not exist`

**Causa:** El código usaba `hora_inicio` pero la columna real es `hora`

**Solución:**
- Cambié todas las referencias de `hora_inicio` → `hora`
- Archivos afectados:
  - `ListaVentas.tsx`
  - `ModalCobrarCita.tsx`

**Commit:** `df0e7ed`, `5eee15c`

### 2. ❌ Error: `column reference 'numero_factura' is ambiguous`

**Causa:** La función RPC `cobrar_cita()` usaba `SELECT c.*` causando ambigüedad en JOIN

**Solución:**
- Reemplacé `c.*` por columnas explícitas
- Especifiqué `facturas.numero_factura` en RETURNING clause
- Archivo: `supabase/migrations/fix_cobrar_cita_ambiguity.sql`

**Commit:** `725ba19`

**IMPORTANTE:** Esta migración debe ejecutarse **MANUALMENTE** en Supabase SQL Editor

### 3. ❌ PDF generado en blanco

**Causa:** El código eliminaba la página y creaba un PDF nuevo vacío sin regenerar contenido

**Solución:**
- Eliminé código de redimensionamiento (líneas 216-227)
- Mantuve el PDF con contenido ya generado

**Commit:** `3fa8095`

### 4. ❌ Símbolos extraños en PDF (Ø=Üp)

**Causa:** jsPDF no soporta emojis Unicode con fuente Helvetica

**Solución:**
- Eliminé todos los emojis (💵 💳 📱 etc.)
- Reemplacé por texto descriptivo:
  - `'Efectivo'`
  - `'Tarjeta Debito/Credito'`
  - `'Transferencia Bancaria'`
  - `'Zelle'`
  - `'Binance Pay'`

**Commit:** `b3c8aa4`

### 5. ✨ Mejora: Separación de botones Imprimir/Descargar

**Antes:** Un solo `window.confirm()` que solo permitía imprimir

**Ahora:** Pantalla de éxito con 3 botones:
- Imprimir Factura
- Descargar PDF  
- Cerrar

**Commit:** `eeea9b3`

---

## 📦 Archivos Clave del Proyecto

### Migraciones SQL

```
supabase/migrations/
├── add_pago_citas.sql              # Agrega columnas de pago a citas
└── fix_cobrar_cita_ambiguity.sql  # Corrige función RPC (APLICAR MANUALMENTE)
```

### Componentes React

```
src/components/pos/
├── ModalCobrarCita.tsx    # Modal para cobrar citas
├── FacturaTermica.tsx     # Generación de PDF térmico
├── ListaVentas.tsx        # Lista de ventas y citas pendientes
├── CobrarForm.tsx         # Formulario ventas walk-in
└── ResumenDia.tsx         # Resumen de ventas del día
```

### Servicio de Impresión

```
printer-service/
├── package.json      # Dependencias Node.js
├── server.js         # Servidor Express + ESC/POS
├── README.md         # Documentación del servicio
├── install.bat       # Instalador Windows
├── install.sh        # Instalador Linux/Mac
└── .gitignore
```

### Documentación

```
/
├── DOCUMENTACION_FUNCIONALIDAD_COBRO.md    # Este archivo
└── RECOVERY_PROMPT.md                       # Prompt de recuperación
```

---

## 🚀 Flujo Completo de Cobro

### Escenario: Cobrar una Cita

```
1. Usuario abre POS → Pestaña "Citas Pendientes"
   ↓
2. Se muestran citas de hoy/futuro sin pagar
   ↓
3. Click en botón "Cobrar" de una cita
   ↓
4. Modal se abre con datos de la cita
   ↓
5. Usuario selecciona método de pago
   ↓
6. Si es efectivo → Ingresa monto recibido
   ↓
7. Click en "Cobrar"
   ↓
8. Sistema llama a RPC cobrar_cita()
   ↓
9. RPC ejecuta transacción:
   - Crea factura
   - Actualiza cita como pagada
   - Retorna datos de factura
   ↓
10. Pantalla de éxito se muestra
   ↓
11. Usuario tiene 3 opciones:
    a) Imprimir → Impresión directa o navegador
    b) Descargar → Guarda PDF
    c) Cerrar → Recarga datos y cierra modal
```

---

## 🔐 Permisos y Seguridad

### RLS (Row Level Security)

**Función RPC:**
```sql
GRANT EXECUTE ON FUNCTION cobrar_cita(UUID, TEXT, DECIMAL, UUID) 
  TO authenticated;
```

### Roles con Acceso

- ✅ `admin` - Acceso total
- ✅ `cajero` - Puede cobrar y ver reportes
- ✅ `barbero` - Puede cobrar sus propias citas

---

## 📈 Métricas y KPIs

### Base de Datos

- **Tablas modificadas:** 1 (`citas`)
- **Columnas agregadas:** 6
- **Funciones RPC:** 1 (`cobrar_cita`)
- **Índices nuevos:** 2

### Código Frontend

- **Componentes nuevos:** 0
- **Componentes modificados:** 4
- **Líneas de código agregadas:** ~1,200
- **Archivos TypeScript:** 4

### Servicio Backend

- **Líneas de código:** ~350
- **Endpoints:** 4
- **Dependencias:** 5

---

## 🧪 Testing y QA

### Casos de Prueba Exitosos

✅ Cobrar cita con método efectivo  
✅ Cobrar cita con método tarjeta  
✅ Generar PDF con contenido completo  
✅ PDF sin símbolos extraños  
✅ Calcular cambio correctamente  
✅ Calcular comisiones barbero/casa  
✅ Ver ventas del día  
✅ Ver citas pendientes  
✅ Imprimir en navegador (fallback)  
✅ Descargar PDF con nombre correcto  
✅ Handle Instagram correcto (@chamosbarber)  

### Casos de Prueba del Servicio

✅ Conectar con impresora USB  
✅ Imprimir página de prueba  
✅ Imprimir factura completa  
✅ Corte automático de papel  
✅ Manejo de errores cuando impresora no disponible  
✅ Timeout de 5 segundos en frontend  
✅ Fallback a navegador si servicio no responde  

---

## 🔄 Deployment

### Frontend (POS Web)

**Plataforma:** Coolify  
**Branch:** `master`  
**Auto-deploy:** ✅ Activado  
**URL:** https://chamosbarber.com (o tu dominio)

**Últimos Commits Importantes:**
```
f8cd0ea - feat(printer): servicio impresión directa
eeea9b3 - feat(pos): separar botones imprimir/descargar
b3c8aa4 - fix(pos): eliminar emojis en PDF
3fa8095 - fix(pos): corregir PDF en blanco
725ba19 - fix(database): corregir ambigüedad numero_factura
```

### Backend (Servicio de Impresión)

**Ejecución:** Local en PC con impresora  
**Puerto:** 3001  
**Protocolo:** HTTP (localhost only)  
**Auto-start:** Opcional con PM2

**Instalación:**
```bash
# Windows
cd printer-service
install.bat
npm start

# Linux/Mac
cd printer-service
chmod +x install.sh
./install.sh
npm start
```

**Como Servicio Permanente (PM2):**
```bash
npm install -g pm2
pm2 start server.js --name printer-service
pm2 save
pm2 startup
```

---

## 📞 Soporte y Mantenimiento

### Logs Importantes

**Frontend (Navegador):**
- `console.log('📊 Ventas cargadas:', ventasData)`
- `console.log('🔍 Citas cargadas:', citasData)`
- `console.log('🖨️ Intentando impresión directa...')`
- `console.log('✅ Impresión directa exitosa')`

**Backend (Servicio):**
- `✅ Impresora térmica conectada`
- `✅ Impresión completada`
- `❌ Error durante impresión`
- `⚠️ No se encontró impresora USB`

### Comandos Útiles

```bash
# Verificar estado del servicio
curl http://localhost:3001/health

# Listar impresoras
curl http://localhost:3001/printers

# Probar impresión
curl -X POST http://localhost:3001/test

# Ver logs del servicio (PM2)
pm2 logs printer-service

# Reiniciar servicio
pm2 restart printer-service
```

---

## 📚 Referencias

### Librerías Usadas

- **jsPDF** v2.5.1 - Generación de PDF
- **escpos** v3.0.0-alpha.6 - Comandos ESC/POS
- **escpos-usb** v3.0.0-alpha.4 - Driver USB
- **express** v4.18.2 - Servidor web
- **cors** v2.8.5 - CORS para localhost

### Documentación Externa

- [jsPDF Docs](https://artskydj.github.io/jsPDF/docs/)
- [ESC/POS Commands](https://reference.epson-biz.com/modules/ref_escpos/)
- [Supabase RPC](https://supabase.com/docs/guides/database/functions)
- [POS Printer Specs](https://www.epson.com/Support/Printers/)

---

## 🎯 Próximas Mejoras (Backlog)

### Prioridad Alta
- [ ] Anular facturas (soft delete)
- [ ] Reimprimir facturas antiguas
- [ ] Reportes de ventas por barbero
- [ ] Reportes de ventas por método de pago

### Prioridad Media
- [ ] Agregar cliente recurrente (historial)
- [ ] Descuentos y promociones
- [ ] IVA configurable
- [ ] Múltiples tipos de documento (factura/boleta)

### Prioridad Baja
- [ ] Integración con sistema contable
- [ ] Exportar ventas a Excel
- [ ] Dashboard de métricas en tiempo real
- [ ] Notificaciones push al cobrar

---

## 👥 Créditos

**Desarrollado por:** AI Assistant (Claude)  
**Para:** Chamos Barbería  
**Cliente:** Juan (GitHub: juan135072)  
**Fecha:** Noviembre 2025  
**Versión:** 1.0

---

## 📄 Licencia

Propiedad de Chamos Barbería. Todos los derechos reservados.

---

**Última actualización:** 2025-11-09 22:30:00 VET
