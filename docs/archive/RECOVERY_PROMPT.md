# 🆘 PROMPT DE RECUPERACIÓN - Sistema de Cobro y Facturación

## 📋 Contexto del Proyecto

Soy un desarrollador trabajando en el sistema POS de **Chamos Barbería** (aplicación Next.js 14 con Supabase PostgreSQL). Recientemente implementamos un sistema completo de **cobro y facturación** que incluye:

1. ✅ Marcar citas como "pagadas" con tracking de pagos
2. ✅ Generar facturas térmicas en formato PDF 80mm
3. ✅ Imprimir automáticamente en impresora térmica POS-8250
4. ✅ Descargar PDF de facturas

**Algo se rompió y necesito tu ayuda para recuperar el estado funcional.**

---

## 🗂️ Estructura del Proyecto

```
chamos-barber-app/
├── src/
│   └── components/
│       └── pos/
│           ├── ModalCobrarCita.tsx       # Modal para cobrar citas
│           ├── FacturaTermica.tsx        # Generación PDF térmico 80mm
│           ├── ListaVentas.tsx           # Lista ventas y citas pendientes
│           ├── CobrarForm.tsx            # Form ventas walk-in
│           └── ResumenDia.tsx            # Resumen del día
├── supabase/
│   └── migrations/
│       ├── add_pago_citas.sql                    # Columnas de pago en citas
│       └── fix_cobrar_cita_ambiguity.sql         # Función RPC corregida
├── printer-service/                              # Servicio impresión directa
│   ├── package.json
│   ├── server.js                                 # Express + ESC/POS
│   ├── README.md
│   ├── install.bat
│   └── install.sh
├── DOCUMENTACION_FUNCIONALIDAD_COBRO.md          # Documentación completa
└── RECOVERY_PROMPT.md                            # Este archivo
```

---

## 🗄️ Estado de la Base de Datos

### Tabla `citas` - Columnas de Pago

```sql
-- Estas columnas fueron agregadas a la tabla citas:
estado_pago TEXT DEFAULT 'pendiente' 
  CHECK (estado_pago IN ('pendiente', 'pagado', 'parcial'))
monto_pagado DECIMAL(10,2) DEFAULT 0
metodo_pago TEXT
factura_id UUID REFERENCES facturas(id) ON DELETE SET NULL
fecha_pago TIMESTAMP WITH TIME ZONE
cobrado_por UUID REFERENCES admin_users(id) ON DELETE SET NULL

-- Índice:
CREATE INDEX idx_citas_estado_pago ON citas(estado_pago, fecha);
```

### Función RPC `cobrar_cita()`

**⚠️ IMPORTANTE:** Esta función debe estar exactamente como está en el archivo:
`supabase/migrations/fix_cobrar_cita_ambiguity.sql`

**Firma de la función:**
```sql
cobrar_cita(
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
```

**Características clave:**
- ✅ Usa columnas EXPLÍCITAS en lugar de `c.*` (evita ambigüedad)
- ✅ Especifica `facturas.numero_factura` en RETURNING
- ✅ Calcula comisiones barbero/casa
- ✅ Maneja cambio para efectivo
- ✅ Transacción atómica

---

## 🔑 Puntos Críticos del Sistema

### 1. Nombre de Columnas en `citas`

**❌ ERROR COMÚN:** Usar `hora_inicio` (no existe)  
**✅ CORRECTO:** Usar `hora`

**Archivos afectados:**
- `src/components/pos/ListaVentas.tsx`
- `src/components/pos/ModalCobrarCita.tsx`

**Query correcta para citas:**
```typescript
.select(`
  id,
  cliente_nombre,
  cliente_telefono,
  fecha,
  hora,                    // ⬅️ NO hora_inicio
  estado_pago,
  barbero:barberos!citas_barbero_id_fkey (nombre, apellido),
  servicio:servicios!citas_servicio_id_fkey (nombre, precio, duracion_minutos)
`)
```

### 2. Ambigüedad de `numero_factura`

**❌ ERROR:** `column reference 'numero_factura' is ambiguous`

**Causa:** La función RPC usa `SELECT c.*` y luego `RETURNING numero_factura`

**✅ SOLUCIÓN:** La migración `fix_cobrar_cita_ambiguity.sql` resuelve esto:
- Usa columnas explícitas en SELECT
- Especifica `facturas.numero_factura` en RETURNING

**⚠️ Esta migración debe ejecutarse MANUALMENTE en Supabase SQL Editor**

### 3. PDF en Blanco

**❌ PROBLEMA:** El PDF se genera pero está vacío

**Causa:** Código intentaba redimensionar PDF y lo dejaba vacío

**✅ SOLUCIÓN (FacturaTermica.tsx):**
```typescript
// ❌ NO HACER ESTO:
const finalHeight = this.yPos + MARGIN
this.pdf.deletePage(1)
this.pdf = new jsPDF({ format: [TICKET_WIDTH, finalHeight] })

// ✅ HACER ESTO:
// Ya no intentamos ajustar el tamaño del PDF
// El contenido ya está generado correctamente en this.pdf
```

### 4. Emojis en PDF (Símbolos Extraños)

**❌ PROBLEMA:** Los emojis aparecen como `Ø=Üp` en el PDF

**Causa:** jsPDF con fuente Helvetica no soporta emojis Unicode

**✅ SOLUCIÓN:** Usar texto simple sin emojis

```typescript
// ❌ NO:
const metodoPagoLabels = {
  efectivo: '💵 Efectivo',
  tarjeta: '💳 Tarjeta'
}

// ✅ SÍ:
const metodoPagoLabels = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta Debito/Credito',
  transferencia: 'Transferencia Bancaria',
  zelle: 'Zelle',
  binance: 'Binance Pay'
}
```

### 5. Impresión Directa

**Flujo de impresión (ModalCobrarCita.tsx):**

```typescript
const handleImprimirPDF = async () => {
  // 1. Obtener datos
  const datosFactura = await obtenerDatosFactura(...)
  
  // 2. Intentar impresión directa (servicio local)
  try {
    const response = await fetch('http://localhost:3001/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factura: datosFactura }),
      signal: AbortSignal.timeout(5000)
    })
    
    if (response.ok) {
      alert('✅ Factura impresa correctamente')
      return
    }
  } catch (error) {
    // 3. Fallback: Ventana del navegador
    await generarEImprimirFactura(datosFactura, 'imprimir')
  }
}
```

---

## 🐛 Errores Conocidos y Soluciones

### Error 1: "column citas.hora_inicio does not exist"

**Solución:**
```bash
# Buscar y reemplazar en todo el proyecto:
hora_inicio → hora
```

**Commits de referencia:** `df0e7ed`, `5eee15c`

### Error 2: "column reference 'numero_factura' is ambiguous"

**Solución:**
```bash
# Ejecutar en Supabase SQL Editor:
# Contenido del archivo: supabase/migrations/fix_cobrar_cita_ambiguity.sql
```

**Commit de referencia:** `725ba19`

### Error 3: PDF generado en blanco

**Solución:**
```typescript
// En FacturaTermica.tsx, eliminar líneas 216-227
// (código que borra y recrea el PDF)
```

**Commit de referencia:** `3fa8095`

### Error 4: Símbolos extraños en PDF

**Solución:**
```typescript
// Eliminar TODOS los emojis en metodoPagoLabels
// Usar solo texto plano
```

**Commit de referencia:** `b3c8aa4`

### Error 5: Ventas no aparecen en "Ventas Hoy"

**Causas posibles:**
1. Query de citas falla → detiene setVentas()
2. Nombre de columna incorrecto
3. Relación barbero incorrecta

**Solución:**
```typescript
// En ListaVentas.tsx verificar:
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
```

---

## 📦 Últimos Commits Importantes

```bash
f8cd0ea - feat(printer): servicio impresión directa POS-8250
eeea9b3 - feat(pos): separar botones imprimir/descargar + handle Instagram
b3c8aa4 - fix(pos): eliminar emojis en PDF
3fa8095 - fix(pos): corregir PDF en blanco
725ba19 - fix(database): corregir ambigüedad numero_factura
5eee15c - fix(types): corregir interfaz Cita
df0e7ed - fix: corregir nombre de columna hora
```

---

## 🔍 Checklist de Verificación

Si algo está roto, verifica estos puntos:

### Base de Datos
- [ ] Tabla `citas` tiene columnas: `estado_pago`, `monto_pagado`, `metodo_pago`, `factura_id`, `fecha_pago`, `cobrado_por`
- [ ] Función `cobrar_cita()` existe y usa columnas explícitas (no `c.*`)
- [ ] Función `cobrar_cita()` especifica `facturas.numero_factura` en RETURNING
- [ ] Índice `idx_citas_estado_pago` existe

### Frontend - Queries
- [ ] Todas las queries usan `hora` (no `hora_inicio`)
- [ ] Query de facturas especifica `facturas.numero_factura` (no solo `numero_factura`)
- [ ] Relación barbero usa `barberos!facturas_barbero_id_fkey`

### Frontend - Componentes
- [ ] `ModalCobrarCita.tsx` tiene estado `cobroExitoso`
- [ ] `ModalCobrarCita.tsx` muestra pantalla de éxito con 3 botones
- [ ] `FacturaTermica.tsx` NO intenta redimensionar PDF al final
- [ ] `FacturaTermica.tsx` NO usa emojis en `metodoPagoLabels`
- [ ] `FacturaTermica.tsx` usa `@chamosbarber` (no `@chamosbarberia`)

### Servicio de Impresión
- [ ] Carpeta `printer-service/` existe
- [ ] Archivo `server.js` tiene endpoints `/health`, `/print`, `/test`
- [ ] `package.json` tiene dependencias: `escpos`, `escpos-usb`, `express`, `cors`

---

## 🚀 Comandos de Recuperación Rápida

### 1. Verificar Estado del Código

```bash
cd /home/user/webapp

# Ver últimos commits
git log --oneline -10

# Ver estado actual
git status

# Ver cambios en archivo específico
git diff src/components/pos/ModalCobrarCita.tsx
```

### 2. Restaurar a Último Estado Funcional

```bash
# Si todo está roto, volver al último commit funcional
git reset --hard f8cd0ea

# O solo archivos específicos
git checkout f8cd0ea -- src/components/pos/ModalCobrarCita.tsx
```

### 3. Verificar Base de Datos

```sql
-- En Supabase SQL Editor:

-- 1. Verificar columnas de citas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'citas' 
  AND column_name IN ('estado_pago', 'monto_pagado', 'metodo_pago', 'factura_id');

-- 2. Verificar función RPC
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'cobrar_cita';

-- 3. Ver definición de función
\df+ cobrar_cita
```

### 4. Rebuild y Deploy

```bash
# Build local para verificar
npm run build

# Si hay errores, ver output completo
npm run build 2>&1 | tee build.log

# Deploy (si usa Coolify, push a master)
git push origin master
```

### 5. Verificar Servicio de Impresión

```bash
cd printer-service

# Instalar dependencias
npm install

# Iniciar servicio
npm start

# En otra terminal, probar
curl http://localhost:3001/health
curl -X POST http://localhost:3001/test
```

---

## 💡 Información Adicional Útil

### Interfaces TypeScript Clave

```typescript
// ModalCobrarCita.tsx
interface Cita {
  id: string
  cliente_nombre: string
  cliente_telefono: string
  fecha: string
  hora: string              // ⬅️ NO hora_inicio
  estado_pago: string
  barbero: {
    nombre: string
    apellido: string
  }
  servicio: {
    nombre: string
    precio: number
    duracion_minutos: number
  }
}

// FacturaTermica.tsx
interface DatosFactura {
  id: string
  numero_factura: string
  cliente_nombre: string
  cliente_rut?: string
  tipo_documento: 'boleta' | 'factura'
  items: ItemFactura[]
  subtotal: number
  total: number
  metodo_pago: string
  monto_recibido?: number
  cambio?: number
  created_at: string
  barbero?: {
    nombre: string
    apellido: string
  }
}
```

### Variables de Entorno Necesarias

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### Estructura de Datos de Factura

```json
{
  "factura": {
    "numero_factura": "F-20251109-0001",
    "tipo_documento": "boleta",
    "cliente_nombre": "Juan Pérez",
    "items": [
      {
        "servicio_id": "uuid",
        "nombre": "Corte + Barba",
        "precio": 15.00,
        "cantidad": 1,
        "subtotal": 15.00
      }
    ],
    "total": 15.00,
    "metodo_pago": "efectivo",
    "monto_recibido": 20.00,
    "cambio": 5.00,
    "created_at": "2025-11-09T22:00:00Z",
    "barbero": {
      "nombre": "Carlos",
      "apellido": "López"
    }
  }
}
```

---

## 📚 Archivos de Referencia

Para entender completamente el sistema, lee estos archivos en orden:

1. `DOCUMENTACION_FUNCIONALIDAD_COBRO.md` - Documentación completa
2. `supabase/migrations/fix_cobrar_cita_ambiguity.sql` - Función RPC correcta
3. `src/components/pos/ModalCobrarCita.tsx` - Lógica de cobro
4. `src/components/pos/FacturaTermica.tsx` - Generación PDF
5. `printer-service/README.md` - Servicio de impresión
6. `printer-service/server.js` - Implementación ESC/POS

---

## 🆘 Preguntas para Diagnosticar el Problema

Por favor, proporcióname esta información:

1. **¿Qué error específico estás viendo?**
   - Mensaje de error completo
   - Stack trace si está disponible
   - Captura de pantalla

2. **¿Dónde ocurre el error?**
   - [ ] Al cargar el POS
   - [ ] Al hacer click en "Cobrar"
   - [ ] Al generar PDF
   - [ ] Al imprimir
   - [ ] En la base de datos
   - [ ] En el servicio de impresión

3. **¿Qué cambios recientes hiciste?**
   - Commits nuevos
   - Cambios en base de datos
   - Cambios en configuración

4. **Logs relevantes:**
   - Console del navegador (F12)
   - Logs de Coolify
   - Logs del servicio de impresión

---

## ✅ Verificación Post-Recuperación

Después de arreglar, verifica que todo funcione:

### Flujo de Prueba Completo

```
1. Abrir POS → Pestaña "Citas Pendientes"
   ✅ Debe mostrar citas sin pagar

2. Click en "Cobrar" en una cita
   ✅ Modal se abre correctamente

3. Seleccionar "Efectivo" e ingresar $20 para pago de $15
   ✅ Debe calcular cambio: $5

4. Click en "Cobrar"
   ✅ Debe mostrar pantalla de éxito
   ✅ Debe mostrar número de factura
   ✅ Debe mostrar 3 botones

5. Click en "Descargar PDF"
   ✅ Debe descargar PDF con contenido
   ✅ PDF debe tener texto legible (sin símbolos raros)
   ✅ PDF debe decir "@chamosbarber"

6. Click en "Imprimir Factura"
   ✅ Si servicio disponible: imprime directamente
   ✅ Si no: abre ventana del navegador

7. Click en "Cerrar"
   ✅ Modal se cierra
   ✅ Cita desaparece de "Citas Pendientes"
   ✅ Factura aparece en "Ventas Hoy"
```

---

## 📞 Contacto y Soporte

**Repositorio:** https://github.com/juan135072/chamos-barber-app  
**Branch principal:** `master`  
**Documentación:** `/DOCUMENTACION_FUNCIONALIDAD_COBRO.md`

---

**Con esta información, deberías poder recuperar el sistema completamente. ¡Buena suerte! 🚀**
