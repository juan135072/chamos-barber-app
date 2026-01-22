# 🚀 MVP: Sistema de Punto de Venta (POS)

## 📋 Funcionalidades Implementadas

### ✅ FASE 1: Base de Datos (COMPLETADO)

#### **Tablas Creadas:**

1. **`facturas`** - Registro de todas las ventas
   - Número de factura auto-generado (F-20251108-0001)
   - Vinculación opcional con cita
   - Items en formato JSON
   - Cálculo automático de comisiones
   - Control de anulación
   - Métodos de pago múltiples

2. **`configuracion_comisiones`** - Porcentaje por barbero
   - Configurable por barbero
   - Default 50/50
   - Historial de cambios

#### **Vistas Creadas:**

1. **`ventas_diarias_por_barbero`**
   - Resumen diario por barbero
   - Total de ventas, ingresos, comisiones

2. **`cierre_caja_diario`**
   - Resumen de caja por método de pago
   - Total cobrado vs comisiones vs ingreso neto

#### **Funciones SQL:**

1. **`generar_numero_factura()`**
   - Auto-incrementa por día
   - Formato: F-YYYYMMDD-NNNN

2. **`calcular_comisiones_factura()`**
   - Calcula % configurado por barbero
   - Retorna: porcentaje, comisión, ingreso casa

---

## 🎯 Próximos Pasos

### **FASE 2: UI - Tab "Crear Cita" en Admin** (2-3 horas)

```
Panel Admin → Nueva opción: "Nueva Cita"

┌─────────────────────────────────────────────────────────┐
│  📅 CREAR CITA - Walk-in                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1️⃣ DATOS DEL CLIENTE                                   │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Nombre: [_____________________________]           │ │
│  │ Teléfono: [______________] (opcional)            │ │
│  │ Email: [______________] (opcional)               │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  2️⃣ DETALLES DE LA CITA                                │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Barbero: [Gustavo ▼]                              │ │
│  │ Servicio: [Corte Rapado ▼]                       │ │
│  │ Fecha: [08/11/2025]                               │ │
│  │ Hora: [10:00 ▼]                                  │ │
│  │ Mesa/Silla: [Barra ▼]                            │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  3️⃣ COBRO (opcional - completar ahora o después)       │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ☑️ Cobrar ahora                                    │ │
│  │                                                    │ │
│  │ Método de pago: [Efectivo ▼]                     │ │
│  │ Monto: $5.00                                     │ │
│  │ Comisión (50%): $2.50 → Barbero                 │ │
│  │ Casa (50%): $2.50                                │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [Cancelar] [Crear Cita] [Crear y Cobrar]             │
└─────────────────────────────────────────────────────────┘
```

#### **Componentes a Crear:**

1. **`CrearCitaModal.tsx`**
   - Formulario completo
   - Validación
   - Opción de cobrar inmediatamente

2. **`API: /api/citas/create-walkin`**
   - Crear cita sin validación de límites
   - Opcional: crear factura al mismo tiempo

---

### **FASE 3: UI - Tab "Cobrar Cita"** (2 horas)

```
Panel Admin → Citas → [Botón Cobrar]

┌─────────────────────────────────────────────────────────┐
│  💰 COBRAR CITA                                         │
├─────────────────────────────────────────────────────────┤
│  Cliente: Juan Pérez                                   │
│  Barbero: Gustavo                                      │
│  Servicio: Corte Rapado                                │
│  Fecha/Hora: 08 Nov 2025, 10:00                        │
│                                                         │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  Precio: $5.00                                         │
│  Descuento: [____] (opcional)                          │
│  Total: $5.00                                          │
│                                                         │
│  Método de pago:                                       │
│  ○ Efectivo  ○ Tarjeta  ○ Transferencia  ○ Zelle     │
│                                                         │
│  Monto recibido: [5.00___]                             │
│  Cambio: $0.00                                         │
│                                                         │
│  ───── DISTRIBUCIÓN ─────                              │
│  Barbero (50%): $2.50                                  │
│  Casa (50%): $2.50                                     │
│                                                         │
│  [Cancelar] [💾 Cobrar] [💾 Cobrar e Imprimir]        │
└─────────────────────────────────────────────────────────┘
```

#### **Componentes a Crear:**

1. **`CobrarCitaModal.tsx`**
   - Formulario de pago
   - Cálculo automático de cambio
   - Vista previa de comisiones

2. **`API: /api/facturas/create`**
   - Crear factura
   - Actualizar cita a "completada + pagada"
   - Llamar función de impresión

---

### **FASE 4: Impresión Térmica** (1-2 horas)

#### **Opción A: Impresión en Navegador (Recomendado para MVP)**

```typescript
// lib/print-thermal.ts
export function imprimirFactura(factura: Factura) {
  const ventanaImpresion = window.open('', 'PRINT', 'height=600,width=300')
  
  const html = `
    <html>
      <head>
        <style>
          @media print {
            body { 
              width: 80mm;
              font-family: 'Courier New', monospace;
              font-size: 12px;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 5px 0; }
          }
        </style>
      </head>
      <body>
        <div class="center bold">CHAMOS BARBERIA</div>
        <div class="center">San Fernando</div>
        <div class="center">CIF: B-88888888</div>
        <div class="line"></div>
        
        <div>Factura: ${factura.numero_factura}</div>
        <div>Fecha: ${new Date().toLocaleString()}</div>
        <div>Cliente: ${factura.cliente_nombre}</div>
        <div>Barbero: ${factura.barberos.nombre}</div>
        
        <div class="line"></div>
        
        ${factura.items.map(item => `
          <div>
            ${item.cantidad} ${item.nombre} - $${item.precio}
          </div>
        `).join('')}
        
        <div class="line"></div>
        
        <div class="bold">TOTAL: $${factura.total}</div>
        <div>Pago: ${factura.metodo_pago}</div>
        <div>Recibido: $${factura.monto_recibido}</div>
        <div>Cambio: $${factura.cambio}</div>
        
        <div class="line"></div>
        <div class="center">¡GRACIAS POR SU VISITA!</div>
      </body>
    </html>
  `
  
  ventanaImpresion.document.write(html)
  ventanaImpresion.document.close()
  ventanaImpresion.focus()
  ventanaImpresion.print()
  ventanaImpresion.close()
}
```

#### **Opción B: Integración USB (Avanzado - Fase posterior)**

Requiere:
- Driver de impresora instalado
- Librería `escpos` o similar
- Electron app o extensión de navegador

---

### **FASE 5: Dashboard de Ingresos** (3-4 horas)

```
Panel Admin → Nuevo Tab: "Ingresos"

┌─────────────────────────────────────────────────────────┐
│  💰 DASHBOARD DE INGRESOS                               │
│  📅 Período: [Hoy ▼] [Semana] [Mes] [Personalizado]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 RESUMEN DEL DÍA - 08 Nov 2025                       │
│  ┌───────────┬──────────┬───────────┬────────────┐     │
│  │ Ventas    │ Ingresos │ Comisiones│ Casa       │     │
│  │   12      │ $60.00   │  $30.00   │  $30.00    │     │
│  └───────────┴──────────┴───────────┴────────────┘     │
│                                                         │
│  👨‍💼 POR BARBERO                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ Barbero    │ Ventas │ Total  │ Comisión │ %   │    │
│  ├────────────────────────────────────────────────┤    │
│  │ Gustavo    │   5    │ $25.00 │  $12.50  │ 50% │    │
│  │ Alexander  │   4    │ $20.00 │  $10.00  │ 50% │    │
│  │ Roudith    │   3    │ $15.00 │  $7.50   │ 50% │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  💳 POR MÉTODO DE PAGO                                  │
│  ┌────────────────────────────────────────────────┐    │
│  │ Efectivo:       8 ventas → $40.00              │    │
│  │ Tarjeta:        3 ventas → $15.00              │    │
│  │ Transferencia:  1 venta  →  $5.00              │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  📥 [Exportar PDF] [Exportar Excel] [Imprimir Cierre] │
└─────────────────────────────────────────────────────────┘
```

#### **Componentes a Crear:**

1. **`IngresosTab.tsx`**
   - Tabla de ventas por barbero
   - Filtros por fecha
   - Resumen de métodos de pago

2. **Query personalizada:**
```typescript
// Usar la vista creada
const { data } = await supabase
  .from('ventas_diarias_por_barbero')
  .select('*')
  .eq('fecha', '2025-11-08')
```

---

### **FASE 6: Configuración de Comisiones** (1 hora)

```
Panel Admin → Barberos → [Editar] → Tab "Comisiones"

┌─────────────────────────────────────────────────────────┐
│  ⚙️ CONFIGURAR COMISIÓN - Gustavo                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Porcentaje actual: [50]% para el barbero              │
│                                                         │
│  Esto significa:                                       │
│  • Barbero recibe: 50% de cada venta                   │
│  • Casa recibe: 50% de cada venta                      │
│                                                         │
│  Ejemplo con venta de $10:                             │
│  • Barbero: $5.00                                      │
│  • Casa: $5.00                                         │
│                                                         │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  Historial de cambios:                                 │
│  • 01/11/2025: 50% (actual)                           │
│  • 15/10/2025: 45% (anterior)                         │
│                                                         │
│  Notas:                                                │
│  [_____________________________________________]        │
│                                                         │
│  [Cancelar] [Guardar Cambios]                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Estimación de Tiempo

| Fase | Tarea | Tiempo Estimado | Estado |
|------|-------|----------------|---------|
| 1 | Base de datos (SQL) | 30 min | ✅ HECHO |
| 1 | Types TypeScript | 15 min | ✅ HECHO |
| 2 | UI Crear Cita | 2-3 horas | ⏳ Pendiente |
| 3 | UI Cobrar Cita | 2 horas | ⏳ Pendiente |
| 4 | Impresión térmica | 1-2 horas | ⏳ Pendiente |
| 5 | Dashboard Ingresos | 3-4 horas | ⏳ Pendiente |
| 6 | Config Comisiones | 1 hora | ⏳ Pendiente |
| **TOTAL** | | **10-13 horas** | **15% completo** |

---

## 🎯 MVP Funcional (Lo Mínimo)

Para tener algo usable YA:

### **Sprint 1 (4-5 horas):**
- [x] Base de datos ✅
- [ ] UI Crear Cita
- [ ] UI Cobrar Cita
- [ ] Impresión simple (navegador)

Con esto ya puedes:
- ✅ Crear citas walk-in
- ✅ Cobrar y generar factura
- ✅ Imprimir ticket
- ✅ Ver ventas en la tabla `facturas`

### **Sprint 2 (3-4 horas):**
- [ ] Dashboard básico de ingresos
- [ ] Configurar comisiones por barbero
- [ ] Exportar PDF

Con esto ya tienes:
- ✅ Control de ingresos por barbero
- ✅ Configuración flexible de comisiones
- ✅ Reporte para cuadre de caja

---

## 🚀 ¿Siguiente Paso?

**Opción 1: Continuar ahora (4-5 horas restantes)**
- Implementar UI Crear Cita
- Implementar UI Cobrar Cita
- Impresión básica

**Opción 2: Revisar y ajustar**
- Revisar si la estructura de BD está correcta
- Ajustar tipos de datos
- Probar queries SQL en Supabase

**Opción 3: Documentar primero**
- Crear mockups detallados
- Definir flujos de usuario
- Lista de validaciones

**¿Cuál prefieres?** 🎯
