# 📄 Sistema de Facturación y Cobro - POS

## 🎯 Funcionalidades Implementadas

### Fecha: 2025-11-09

---

## 📋 RESUMEN

Se implementó un sistema completo de cobro y facturación en el POS que permite:

1. ✅ **Cobrar citas** directamente desde el sistema
2. ✅ **Marcar citas como pagadas** con registro de método de pago
3. ✅ **Generar facturas térmicas** en formato PDF (80mm)
4. ✅ **Imprimir o descargar facturas** automáticamente después del cobro

---

## 🗄️ CAMBIOS EN BASE DE DATOS

### Nuevas Columnas en Tabla `citas`

```sql
-- Columnas agregadas
estado_pago        TEXT      DEFAULT 'pendiente'  -- Estado: pendiente, pagado, parcial
monto_pagado       DECIMAL   DEFAULT 0            -- Monto ya pagado
metodo_pago        TEXT                           -- Método: efectivo, tarjeta, transferencia, etc.
factura_id         UUID      REFERENCES facturas(id)
fecha_pago         TIMESTAMP                      -- Cuándo se cobró
cobrado_por        UUID      REFERENCES usuarios(id)  -- Quién cobró
```

### Nueva Columna en Tabla `facturas`

```sql
cita_id  UUID  REFERENCES citas(id)  -- Relación con la cita que originó la factura
```

### Nueva Función RPC: `cobrar_cita()`

```sql
cobrar_cita(
  p_cita_id UUID,
  p_metodo_pago TEXT,
  p_monto_recibido DECIMAL DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
)
```

**Retorna:**
- `success`: boolean
- `factura_id`: UUID
- `numero_factura`: TEXT
- `mensaje`: TEXT

**Qué hace:**
1. Valida que la cita existe y no está pagada
2. Calcula comisiones del barbero
3. Crea una factura automáticamente
4. Marca la cita como pagada
5. Registra método de pago y usuario que cobró

---

## 📱 COMPONENTES NUEVOS

### 1. **ModalCobrarCita.tsx**

Modal para cobrar una cita individual.

**Ubicación:** `src/components/pos/ModalCobrarCita.tsx`

**Props:**
```typescript
{
  cita: Cita          // Datos de la cita a cobrar
  usuario: Usuario    // Usuario que está cobrando
  onClose: () => void // Callback para cerrar modal
  onCobrado: () => void // Callback después de cobrar
}
```

**Características:**
- 💰 Selección de método de pago
- 💵 Cálculo de cambio (para efectivo)
- 🔒 Validación de permisos
- ✅ Confirmación y generación de factura
- 🖨️ Opción de imprimir factura automáticamente

---

### 2. **FacturaTermica.tsx**

Generador de facturas térmicas en formato PDF (80mm).

**Ubicación:** `src/components/pos/FacturaTermica.tsx`

**Clase Principal:**
```typescript
class FacturaTermica {
  generarFactura(datos: DatosFactura): void
  descargar(nombreArchivo?: string): void
  imprimir(): void
  obtenerBase64(): string
  obtenerBlob(): Blob
}
```

**Funciones Helper:**
```typescript
// Generar e imprimir factura
generarEImprimirFactura(
  datos: DatosFactura,
  accion: 'imprimir' | 'descargar' | 'ambos'
): Promise<boolean>

// Obtener datos de Supabase
obtenerDatosFactura(
  facturaId: string,
  supabase: any
): Promise<DatosFactura | null>
```

**Formato de Factura:**
```
┌─────────────────────────────┐
│    CHAMOS BARBERÍA          │
│   Barbería Profesional      │
│                             │
│   RIF: J-12345678-9        │
│   Telf: +58 412-XXX-XXXX   │
│   Valencia, Carabobo        │
│                             │
├─────────────────────────────┤
│                             │
│      FACTURA/BOLETA         │
│    No. FAC-2025-00001      │
│                             │
│ Fecha: 09/11/2025          │
│ Hora: 14:30                │
│                             │
├─────────────────────────────┤
│                             │
│ CLIENTE                     │
│ Juan Pérez                  │
│                             │
│ Atendido por: Alexander T.  │
│                             │
├─────────────────────────────┤
│                             │
│ SERVICIOS                   │
│                             │
│ Corte de Cabello            │
│   1 x $15.00 = $15.00      │
│                             │
│ Barba Completa              │
│   1 x $10.00 = $10.00      │
│                             │
├─────────────────────────────┤
│                             │
│ TOTAL:            $25.00    │
│                             │
│ Método de pago:             │
│ 💵 Efectivo                 │
│                             │
│ Recibido:         $30.00    │
│ Cambio:           $5.00     │
│                             │
├─────────────────────────────┤
│                             │
│ ¡Gracias por su preferencia!│
│  Esperamos volver a verlo   │
│                             │
│ Síguenos en redes sociales: │
│    @chamosbarberia          │
│                             │
└─────────────────────────────┘
```

---

## 🔄 COMPONENTES MODIFICADOS

### 1. **ListaVentas.tsx**

**Cambios:**
- ✅ Agregado sistema de tabs (Pendientes / Ventas Hoy)
- ✅ Muestra citas pendientes de pago
- ✅ Botón "Cobrar" para cada cita pendiente
- ✅ Integración con ModalCobrarCita
- ✅ Recarga automática después de cobrar

**Tabs:**
1. **Pendientes**: Citas con `estado_pago = 'pendiente'`
2. **Ventas Hoy**: Facturas generadas hoy

**Vista de Cita Pendiente:**
```
┌──────────────────────────────────────┐
│ 🏷️ PENDIENTE     10 Nov - 14:00    │
│                                      │
│ 👤 Juan Pérez                       │
│ ✂️ Alexander Taborda                │
│ ✂️ Corte de Cabello                 │
│                                      │
│                    $15.00            │
│                    [Cobrar]          │
└──────────────────────────────────────┘
```

---

### 2. **CobrarForm.tsx**

**Cambios:**
- ✅ Integración con generador de facturas
- ✅ Confirmación con opción de imprimir
- ✅ Impresión automática después de registrar venta

**Flujo actualizado:**
1. Usuario completa formulario
2. Se crea la factura en BD
3. Sistema pregunta: "¿Deseas imprimir la factura?"
4. Si acepta → Se abre diálogo de impresión
5. Formulario se limpia y se recargan datos

---

## 📄 MIGRACIÓN DE BASE DE DATOS

### Archivo: `supabase/migrations/add_pago_citas.sql`

**Aplicar en Supabase Dashboard:**

1. Abrir SQL Editor
2. Copiar contenido del archivo
3. Ejecutar (Run)

**Qué hace:**
- ✅ Agrega columnas de pago a `citas`
- ✅ Agrega columna `cita_id` a `facturas`
- ✅ Crea función `cobrar_cita()`
- ✅ Crea índices para optimización
- ✅ Migra datos existentes (citas pasadas → pagadas)

---

## 🧪 PRUEBAS DE VERIFICACIÓN

### Prueba 1: Cobrar una cita desde POS

```sql
-- 1. Crear cita de prueba
INSERT INTO citas (
  barbero_id,
  cliente_nombre,
  cliente_telefono,
  servicio_id,
  fecha,
  hora,
  estado,
  estado_pago
) VALUES (
  '1fb21ce6-5225-48a7-941b-5aeaa5f7e1ca'::uuid,
  'Cliente Prueba',
  '555-1234',
  (SELECT id FROM servicios LIMIT 1),
  CURRENT_DATE,
  '14:00'::time,
  'confirmada',
  'pendiente'
);

-- 2. Verificar que aparece en POS
SELECT * FROM citas WHERE estado_pago = 'pendiente';

-- 3. Cobrar desde POS (hacer click en "Cobrar")

-- 4. Verificar que se marcó como pagada
SELECT estado_pago, factura_id, metodo_pago 
FROM citas 
WHERE cliente_nombre = 'Cliente Prueba';

-- 5. Verificar que se creó factura
SELECT * FROM facturas WHERE cita_id = (
  SELECT id FROM citas WHERE cliente_nombre = 'Cliente Prueba'
);

-- 6. Limpiar
DELETE FROM facturas WHERE cita_id IN (
  SELECT id FROM citas WHERE cliente_nombre = 'Cliente Prueba'
);
DELETE FROM citas WHERE cliente_nombre = 'Cliente Prueba';
```

### Prueba 2: Generar factura desde venta nueva

1. Ir a POS → Registrar Venta
2. Seleccionar barbero y servicios
3. Completar formulario
4. Click en "Cobrar e Imprimir"
5. Confirmar impresión
6. **Verificar:** Se abre ventana con PDF de factura

### Prueba 3: Factura térmica formato correcto

**Verificar:**
- ✅ Ancho: 80mm
- ✅ Encabezado con logo/nombre
- ✅ Información del negocio
- ✅ Número de factura
- ✅ Fecha y hora
- ✅ Datos del cliente
- ✅ Barbero que atendió
- ✅ Lista de servicios con precios
- ✅ Total destacado
- ✅ Método de pago
- ✅ Cambio (si es efectivo)
- ✅ Footer con mensaje de agradecimiento
- ✅ **NO muestra comisiones**

---

## 🔒 SEGURIDAD

### Permisos RLS

```sql
-- Función cobrar_cita tiene SECURITY DEFINER
-- Solo usuarios autenticados pueden ejecutarla
GRANT EXECUTE ON FUNCTION cobrar_cita TO authenticated;
GRANT EXECUTE ON FUNCTION cobrar_cita TO service_role;
```

### Validaciones

1. ✅ Cita debe existir
2. ✅ Cita no debe estar ya pagada
3. ✅ Usuario debe estar autenticado
4. ✅ Solo cajeros y admins acceden al POS

---

## 📊 ESTADÍSTICAS Y REPORTES

### Consultas Útiles

**Ventas del día por método de pago:**
```sql
SELECT 
  metodo_pago,
  COUNT(*) as cantidad,
  SUM(total) as total_vendido
FROM facturas
WHERE DATE(created_at) = CURRENT_DATE
  AND anulada = false
GROUP BY metodo_pago;
```

**Citas pendientes de pago:**
```sql
SELECT COUNT(*) 
FROM citas 
WHERE estado_pago = 'pendiente' 
  AND fecha >= CURRENT_DATE;
```

**Total cobrado hoy:**
```sql
SELECT SUM(total) 
FROM facturas 
WHERE DATE(created_at) = CURRENT_DATE 
  AND anulada = false;
```

---

## 🎨 PERSONALIZACIÓN DE FACTURA

### Cambiar información del negocio

Editar en `FacturaTermica.tsx`:

```typescript
// HEADER - Logo/Nombre del negocio
this.addText('CHAMOS BARBERÍA', 14, 'center', true)
this.addText('Barbería Profesional', 9, 'center')
this.addSpace(0.5)

// Información del negocio
this.addText('RIF: J-12345678-9', 8, 'center')
this.addText('Telf: +58 412-XXX-XXXX', 8, 'center')
this.addText('Dirección: Valencia, Carabobo', 8, 'center')
```

### Agregar logo

```typescript
// Agregar antes del texto
const logo = 'data:image/png;base64,...'
this.pdf.addImage(logo, 'PNG', 25, 5, 30, 30)
this.yPos += 35
```

---

## 🐛 TROUBLESHOOTING

### Problema: Factura no se imprime

**Solución:**
1. Verificar que jsPDF está instalado: `npm list jspdf`
2. Verificar permisos del navegador para abrir ventanas
3. Revisar consola del navegador para errores

### Problema: Cita no aparece en "Pendientes"

**Verificar:**
```sql
SELECT estado_pago, fecha FROM citas WHERE id = 'CITA_ID';
```

**Solución:**
- Debe tener `estado_pago = 'pendiente'`
- Debe tener `fecha >= CURRENT_DATE`

### Problema: Error al cobrar cita

**Verificar:**
1. Función `cobrar_cita()` existe en Supabase
2. Usuario tiene permisos
3. Cita no está ya pagada

```sql
-- Verificar función existe
SELECT * FROM pg_proc WHERE proname = 'cobrar_cita';

-- Verificar permisos
SELECT has_function_privilege('cobrar_cita(uuid,text,numeric,uuid)', 'EXECUTE');
```

---

## 📦 DEPENDENCIAS NUEVAS

### Paquetes NPM

```json
{
  "jspdf": "^2.5.1"
}
```

**Instalar:**
```bash
npm install jspdf
```

---

## 🚀 PRÓXIMAS MEJORAS SUGERIDAS

1. 📧 **Enviar factura por email** automáticamente
2. 📱 **Enviar factura por WhatsApp** con enlace al PDF
3. 🔢 **Generador de códigos QR** para pagos digitales
4. 📊 **Dashboard de ventas** con gráficos
5. 🖨️ **Integración con impresoras térmicas** directas (sin PDF)
6. 💾 **Guardar facturas en Supabase Storage** automáticamente
7. 📝 **Notas en facturas** (comentarios, descuentos especiales)
8. 🎁 **Sistema de descuentos y cupones**

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

- [x] ✅ Migración de base de datos aplicada
- [x] ✅ Componente ModalCobrarCita creado
- [x] ✅ Componente FacturaTermica creado
- [x] ✅ ListaVentas actualizado con tabs
- [x] ✅ CobrarForm actualizado con impresión
- [x] ✅ jsPDF instalado
- [x] ✅ Función cobrar_cita() creada
- [x] ✅ Tests manuales realizados
- [x] ✅ Documentación completa

---

## 👥 CRÉDITOS

**Desarrollador:** Claude AI (Anthropic)  
**Fecha:** 2025-11-09  
**Cliente:** juan135072  
**Estado:** ✅ Completado y funcional

---

**🎯 Sistema de facturación completamente implementado y documentado.**
