# 🏪 Sistema de Punto de Venta (POS) - Documentación Completa

## 📋 Índice
1. [Visión General](#visión-general)
2. [Contexto y Decisiones](#contexto-y-decisiones)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Base de Datos](#base-de-datos)
5. [Sistema de Roles](#sistema-de-roles)
6. [Interfaz de Usuario](#interfaz-de-usuario)
7. [Estado Actual](#estado-actual)
8. [Próximos Pasos](#próximos-pasos)
9. [Casos de Uso](#casos-de-uso)

---

## 🎯 Visión General

### **Objetivo del Proyecto**
Convertir "Chamos Barber App" (sistema de reservas) en un **producto SaaS vendible** para múltiples barberías, con sistema de punto de venta y control de ingresos.

### **MVP Definido**
Sistema de Punto de Venta con 3 funcionalidades principales:

1. ✅ **Crear citas walk-in** desde panel admin (clientes sin reserva previa)
2. ✅ **Cobrar y facturar** con impresión térmica (80mm)
3. ✅ **Dashboard de ingresos** por barbero con comisiones configurables

### **Estrategia de Producto**
- **Fase 1:** MVP funcional para barbería única (ahora)
- **Fase 2:** Modularizar y convertir en multi-tenant SaaS
- **Fase 3:** Agregar módulos premium (Marketing, Analytics avanzado, Multi-sucursal)

---

## 📝 Contexto y Decisiones

### **Conversación Clave con el Usuario:**

**Usuario preguntó:**
> "Ahora quiero implementar una nueva sección donde se puedan crear citas y generar facturas de este tipo que se puedan imprimir en máquinas térmicas. La idea es llevar un control de la intención que realizan los barberos para saber cuánto gana cada uno."

**Mostró:**
- Factura térmica real de "Chamos Barberia"
- Impresora térmica POS-8250 (USB, 80mm, 300mm/sec)

**Contexto adicional:**
> "Quiero vender este proyecto a barberías. ¿De momento veo que es un sitio web de reservas, eso de la facturación creo que debería hacerlo en un módulo aparte?"

**Respuesta:** Sí, modularizar para escalar como SaaS.

**Usuario luego refinó:**
> "Quiero que sea lo más intuitivo posible. Funcionalidades:
> 1. Poder generar citas desde admin para walk-ins
> 2. Control físico mediante facturación térmica
> 3. Ver cuánto produce cada barbero según % configurable
> Eso sería el MVP. Luego transformar en SaaS."

### **Decisión Final de Arquitectura:**

**Usuario eligió:**
> "Me gusta la opción de Panel POS Separado (/pos) tal cual está para que admin acceda cuando quiera. Pero quiero crear un **rol de cajero** que desde login solo acceda a la caja, y que el admin tenga la capacidad de **gestionar las credenciales** de ese rol desde el panel de administración."

---

## 🏗️ Arquitectura del Sistema

### **Estructura General**

```
CHAMOS BARBER APP (Completo)

┌─────────────────────────────────────────────────────┐
│  MÓDULO 1: RESERVAS ONLINE (Ya existe)             │
│  /                  → Sitio público                 │
│  /reservar          → Sistema de reservas           │
│  /consultar         → Consultar citas               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  MÓDULO 2: PANEL ADMINISTRATIVO (Ya existe)        │
│  /admin             → Panel de administración       │
│    ├─ Dashboard     → Estadísticas generales        │
│    ├─ Citas         → Gestión de citas              │
│    ├─ Clientes      → Gestión de clientes           │
│    ├─ Barberos      → Gestión de barberos           │
│    ├─ Servicios     → Gestión de servicios          │
│    ├─ Categorías    → Gestión de categorías         │
│    └─ Solicitudes   → Solicitudes de barberos       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  MÓDULO 3: PANEL BARBERO (Ya existe)               │
│  /barbero-panel     → Vista de barberos             │
│    ├─ Mis Citas     → Citas del día                 │
│    └─ Notas         → Notas de clientes             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  MÓDULO 4: PUNTO DE VENTA (NUEVO - En desarrollo)  │
│  /pos               → Interfaz de caja               │
│    ├─ Cobrar Cita   → Cobrar cita existente         │
│    ├─ Venta Rápida  → Crear cita + cobrar           │
│    ├─ Resumen Día   → Totales del día               │
│    └─ Cerrar Caja   → Cierre de caja diario         │
└─────────────────────────────────────────────────────┘
```

### **Rutas y Accesos**

| Ruta | Rol Requerido | Descripción |
|------|---------------|-------------|
| `/` | Público | Landing page y reservas |
| `/admin` | admin | Panel administrativo completo |
| `/pos` | admin, cajero | Punto de venta |
| `/barbero-panel` | barbero | Panel de barbero |
| `/login` | - | Login unificado (redirige según rol) |

### **Flujo de Login por Rol**

```
Usuario hace login en /login
         ↓
   ¿Qué rol tiene?
         ↓
    ┌────┴────┬─────────┐
    ↓         ↓         ↓
  admin    cajero    barbero
    ↓         ↓         ↓
 /admin    /pos    /barbero-panel
```

### **Navegación entre Módulos**

```
┌─────────────────────────────────────────┐
│  ADMIN logueado en /admin               │
│  ┌─────────────────────────────────┐   │
│  │ Header:                         │   │
│  │ [🏪 Abrir POS] [👤 Admin] [🚪] │   │
│  └─────────────────────────────────┘   │
│        ↓ Click                          │
│  Abre /pos en nueva pestaña            │
│  (hereda sesión automáticamente)        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  CAJERO logueado en /login              │
│        ↓                                │
│  Redirige automáticamente a /pos       │
│  (NO puede acceder a /admin)            │
└─────────────────────────────────────────┘
```

---

## 💾 Base de Datos

### **Tablas Creadas**

#### **1. `facturas` - Registro de ventas**

```sql
CREATE TABLE facturas (
  id UUID PRIMARY KEY,
  numero_factura VARCHAR(50) UNIQUE,  -- F-20251108-0001
  cita_id UUID REFERENCES citas(id),  -- NULL si venta sin cita
  barbero_id UUID REFERENCES barberos(id),
  
  -- Cliente
  cliente_nombre VARCHAR(255),
  cliente_telefono VARCHAR(50),
  cliente_email VARCHAR(255),
  
  -- Items vendidos (JSON)
  items JSONB,  -- [{servicio_id, nombre, precio, cantidad, subtotal}]
  
  -- Montos
  subtotal DECIMAL(10,2),
  descuento DECIMAL(10,2),
  iva DECIMAL(10,2),
  total DECIMAL(10,2),
  
  -- Pago
  metodo_pago VARCHAR(50),  -- efectivo, tarjeta, transferencia, zelle, binance
  monto_recibido DECIMAL(10,2),
  cambio DECIMAL(10,2),
  
  -- Comisiones
  porcentaje_comision DECIMAL(5,2),  -- 50.00 = 50%
  comision_barbero DECIMAL(10,2),    -- Lo que recibe el barbero
  ingreso_casa DECIMAL(10,2),        -- Lo que recibe la barbería
  
  -- Metadata
  mesa_silla VARCHAR(50),
  notas TEXT,
  impresa BOOLEAN,
  
  -- Anulación
  anulada BOOLEAN,
  fecha_anulacion TIMESTAMP,
  motivo_anulacion TEXT,
  anulada_por UUID REFERENCES admin_users(id),
  
  created_at TIMESTAMP,
  created_by UUID REFERENCES admin_users(id),
  updated_at TIMESTAMP
);
```

**Índices:**
- `idx_facturas_barbero_id` → Para reportes por barbero
- `idx_facturas_fecha` → Para reportes por fecha
- `idx_facturas_numero` → Para búsqueda rápida
- `idx_facturas_anulada` → Para filtrar anuladas

#### **2. `configuracion_comisiones` - Porcentaje por barbero**

```sql
CREATE TABLE configuracion_comisiones (
  id UUID PRIMARY KEY,
  barbero_id UUID UNIQUE REFERENCES barberos(id),
  porcentaje DECIMAL(5,2) DEFAULT 50.00,  -- 50% por defecto
  notas TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Datos iniciales:**
- Se auto-inicializa con 50% para todos los barberos existentes
- Admin puede modificar % individualmente

#### **3. `roles_permisos` - Sistema de permisos (NUEVO)**

```sql
CREATE TABLE roles_permisos (
  id UUID PRIMARY KEY,
  rol VARCHAR(50) UNIQUE,  -- admin, cajero, barbero
  nombre_display VARCHAR(100),
  descripcion TEXT,
  permisos JSONB,
  -- Formato:
  -- {
  --   "pos": {"cobrar": true, "anular": false},
  --   "admin": {"ver": false, "editar": false}
  -- }
  created_at TIMESTAMP
);
```

**Roles configurados:**

| Rol | Nombre | POS | Admin | Config |
|-----|--------|-----|-------|--------|
| admin | Administrador | ✅ Todo | ✅ Todo | ✅ Sí |
| cajero | Cajero/POS | ✅ Cobrar<br>✅ Cerrar caja<br>❌ Anular<br>❌ Reportes | ❌ No | ❌ No |
| barbero | Barbero | ✅ Cobrar<br>❌ Cerrar caja<br>❌ Anular | ❌ No | ❌ No |

### **Vistas SQL Creadas**

#### **1. `ventas_diarias_por_barbero`**
```sql
SELECT 
  barbero_id,
  barbero_nombre,
  fecha,
  COUNT(*) as total_ventas,
  SUM(total) as total_ingresos,
  SUM(comision_barbero) as total_comision,
  SUM(ingreso_casa) as total_casa
FROM facturas
WHERE anulada = false
GROUP BY barbero_id, fecha;
```

**Uso:** Dashboard de ingresos por barbero

#### **2. `cierre_caja_diario`**
```sql
SELECT 
  DATE(created_at) as fecha,
  metodo_pago,
  COUNT(*) as cantidad_transacciones,
  SUM(total) as total_cobrado,
  SUM(comision_barbero) as total_comisiones,
  SUM(ingreso_casa) as ingreso_neto_casa
FROM facturas
WHERE anulada = false
GROUP BY fecha, metodo_pago;
```

**Uso:** Cierre de caja al final del día

#### **3. `usuarios_con_permisos` (NUEVO)**
```sql
SELECT 
  u.*,
  r.nombre_display as rol_nombre,
  r.permisos
FROM admin_users u
LEFT JOIN roles_permisos r ON r.rol = u.rol;
```

**Uso:** Listar usuarios con sus permisos en admin

### **Funciones SQL**

#### **1. `generar_numero_factura()`**
Auto-genera número de factura secuencial por día.

**Formato:** `F-YYYYMMDD-NNNN`
- `F-20251108-0001` → Primera factura del 8 de noviembre
- `F-20251108-0023` → Factura 23 del mismo día
- `F-20251109-0001` → Primera del día siguiente (resetea)

#### **2. `calcular_comisiones_factura(barbero_id, total)`**
Calcula comisión según configuración del barbero.

**Input:** 
- `barbero_id`: UUID del barbero
- `total`: Monto total de la venta

**Output:**
```sql
{
  porcentaje: 50.00,
  comision_barbero: 25.00,
  ingreso_casa: 25.00
}
```

#### **3. `verificar_permiso(user_id, modulo, accion)` (NUEVO)**
Verifica si un usuario tiene permiso para una acción.

**Ejemplo:**
```sql
SELECT verificar_permiso(
  'user-uuid', 
  'pos', 
  'anular'
); -- true/false
```

### **Triggers Activos**

1. **`auto_numero_factura`** → Auto-genera número al insertar
2. **`update_facturas_updated_at`** → Actualiza timestamp al modificar
3. **`update_comisiones_updated_at`** → Actualiza timestamp de comisiones

---

## 👥 Sistema de Roles

### **Tabla Comparativa de Permisos**

| Funcionalidad | Admin | Cajero | Barbero |
|---------------|-------|--------|---------|
| **Panel Admin** |
| Ver dashboard | ✅ | ❌ | ❌ |
| Gestionar barberos | ✅ | ❌ | ❌ |
| Gestionar servicios | ✅ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Ver todos los reportes | ✅ | ❌ | ❌ |
| Configurar comisiones | ✅ | ❌ | ❌ |
| **Punto de Venta** |
| Cobrar citas | ✅ | ✅ | ✅ |
| Crear venta rápida | ✅ | ✅ | ❌ |
| Anular facturas | ✅ | ❌ | ❌ |
| Ver resumen del día | ✅ | ✅ Parcial | ❌ |
| Cerrar caja | ✅ | ✅ | ❌ |
| Imprimir ticket | ✅ | ✅ | ✅ |
| **Panel Barbero** |
| Ver mis citas | ✅ | ❌ | ✅ |
| Ver mis comisiones | ✅ | ❌ | ✅ |
| Agregar notas | ✅ | ❌ | ✅ |

### **Gestión de Usuarios Cajero desde Admin**

Admin podrá:
1. ✅ Crear usuario cajero
2. ✅ Asignar email/contraseña
3. ✅ Activar/Desactivar cajero
4. ✅ Ver historial de ventas por cajero
5. ✅ Cambiar contraseña de cajero
6. ✅ Eliminar cajero

**Nueva sección en Admin:**
```
Panel Admin → Nuevo Tab: "Usuarios"
  ├─ Administradores (1)
  ├─ Cajeros (2)
  └─ Barberos (4)
```

---

## 🖥️ Interfaz de Usuario

### **Página: `/pos` (Punto de Venta)**

#### **Layout Principal**

```
┌─────────────────────────────────────────────────────────┐
│  🏪 CHAMOS BARBERIA - PUNTO DE VENTA                    │
│  👤 Usuario: Caja1  |  📅 08 Nov 2025  |  🕐 10:30 AM   │
│  [← Admin] [🚪 Cerrar Sesión]                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ÁREA PRINCIPAL (70%)          │  PANEL LATERAL (30%)  │
│  ┌───────────────────────────┐ │  ┌──────────────────┐ │
│  │  💳 COBRAR                │ │  │  📊 RESUMEN DÍA  │ │
│  │                           │ │  │                  │ │
│  │  Cliente: [__________]    │ │  │  Ventas: 8      │ │
│  │  Barbero: [Gustavo  ▼]   │ │  │  Total: $40.00  │ │
│  │  Servicio: [Corte   ▼]   │ │  │                  │ │
│  │                           │ │  │  💵 Efectivo:   │ │
│  │  ┌─ TICKET ──────────┐   │ │  │     $30.00      │ │
│  │  │ 1 Corte   $5.00   │   │ │  │  💳 Tarjeta:    │ │
│  │  │ ─────────────────  │   │ │  │     $10.00      │ │
│  │  │ TOTAL:    $5.00   │   │ │  │                  │ │
│  │  └───────────────────┘   │ │  │  [Ver Cierre]   │ │
│  │                           │ │  └──────────────────┘ │
│  │  Método: [Efectivo ▼]    │ │                       │
│  │  Recibido: [$5.00__]     │ │  ┌──────────────────┐ │
│  │  Cambio: $0.00           │ │  │  ÚLTIMAS VENTAS  │ │
│  │                           │ │  │  ────────────── │ │
│  │  Comisión (50%):         │ │  │  #23 $5.00 10:15│ │
│  │  • Barbero: $2.50        │ │  │  #22 $8.00 10:05│ │
│  │  • Casa: $2.50           │ │  │  #21 $5.00 09:45│ │
│  │                           │ │  └──────────────────┘ │
│  │  [Limpiar] [💾 Cobrar]   │ │                       │
│  │  [🖨️ Cobrar e Imprimir]  │ │                       │
│  └───────────────────────────┘ │                       │
└─────────────────────────────────────────────────────────┘
```

#### **Modos de Operación**

**Modo 1: Cobrar Cita Existente**
```
1. Cliente dice su nombre/teléfono
2. Cajero busca en input
3. Aparece autocompletado con citas pendientes
4. Selecciona cita
5. Formulario se auto-rellena
6. Solo ingresa método de pago
7. Cobrar e imprimir
```

**Modo 2: Venta Rápida (Walk-in)**
```
1. Toggle "Nueva Venta"
2. Ingresar nombre cliente
3. Seleccionar barbero
4. Seleccionar servicio(s)
5. Ingresar método de pago
6. Cobrar e imprimir
7. Se crea cita + factura simultáneamente
```

### **Modal: Cerrar Caja**

```
┌─────────────────────────────────────────────────────┐
│  💰 CIERRE DE CAJA - 08 Nov 2025                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  RESUMEN DEL DÍA:                                  │
│  ┌───────────────────────────────────────────────┐ │
│  │ Total Ventas:          23                     │ │
│  │ Total Cobrado:         $115.00                │ │
│  │ Total Comisiones:      $57.50                 │ │
│  │ Ingreso Casa:          $57.50                 │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  POR MÉTODO DE PAGO:                               │
│  ┌───────────────────────────────────────────────┐ │
│  │ 💵 Efectivo:      15 ventas →  $75.00        │ │
│  │ 💳 Tarjeta:        6 ventas →  $30.00        │ │
│  │ 📱 Transferencia:  2 ventas →  $10.00        │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  POR BARBERO:                                      │
│  ┌───────────────────────────────────────────────┐ │
│  │ Gustavo:      8 ventas → $40.00 (Com: $20)   │ │
│  │ Alexander:    7 ventas → $35.00 (Com: $17.50)│ │
│  │ Roudith:      5 ventas → $25.00 (Com: $12.50)│ │
│  │ Hingover:     3 ventas → $15.00 (Com: $7.50) │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  EFECTIVO EN CAJA:                                 │
│  Esperado: $75.00                                  │
│  Real: [________]  Diferencia: $_____              │
│                                                     │
│  [Cancelar] [📥 Exportar PDF] [✅ Cerrar Caja]     │
└─────────────────────────────────────────────────────┘
```

### **Panel Admin: Nuevo Tab "Usuarios"**

```
Panel Admin → Usuarios

┌─────────────────────────────────────────────────────┐
│  👥 GESTIÓN DE USUARIOS                             │
│  [+ Nuevo Usuario]                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Filtros: [Todos ▼] [admin] [cajero] [barbero]    │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Usuario     │ Email           │ Rol    │ Estado││
│  ├───────────────────────────────────────────────┤ │
│  │ Admin       │ admin@ch.com    │ admin  │ ✅   ││
│  │ Caja 1      │ caja1@ch.com    │ cajero │ ✅   ││
│  │ Caja 2      │ caja2@ch.com    │ cajero │ ✅   ││
│  │ Gustavo     │ gus@ch.com      │ barbero│ ✅   ││
│  │ Alexander   │ alex@ch.com     │ barbero│ ✅   ││
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Acciones: [✏️ Editar] [🔑 Cambiar Contraseña]      │
│            [🚫 Desactivar] [🗑️ Eliminar]            │
└─────────────────────────────────────────────────────┘
```

### **Modal: Crear Usuario Cajero**

```
┌─────────────────────────────────────────────────────┐
│  ➕ CREAR USUARIO                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Datos Básicos:                                    │
│  Nombre: [___________________________]             │
│  Email:  [___________________________]             │
│  Teléfono: [___________________________]           │
│                                                     │
│  Rol:                                              │
│  ○ Admin  ● Cajero  ○ Barbero                     │
│                                                     │
│  Seguridad:                                        │
│  Contraseña: [___________________________]         │
│  Confirmar:  [___________________________]         │
│  [🔄 Generar contraseña aleatoria]                 │
│                                                     │
│  ☑️ Enviar credenciales por email                  │
│  ☑️ Usuario activo                                 │
│                                                     │
│  [Cancelar] [Crear Usuario]                        │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Estado Actual

### **✅ COMPLETADO (Fase 1 - Backend)**

1. ✅ Base de datos completa
   - Tabla `facturas`
   - Tabla `configuracion_comisiones`
   - Tabla `roles_permisos`
   - Vistas SQL
   - Funciones y triggers

2. ✅ Sistema de roles
   - Roles definidos (admin, cajero, barbero)
   - Permisos configurados
   - Función de verificación

3. ✅ Tipos TypeScript actualizados
   - Interfaces para facturas
   - Interfaces para comisiones
   - Interfaces para roles

4. ✅ Documentación
   - Plan de implementación
   - Guías de arquitectura
   - Esta documentación completa

### **⏳ EN PROGRESO**

- Migración SQL de roles (creada, falta ejecutar)

### **❌ PENDIENTE (Fase 2 - Frontend)**

1. ❌ Página `/pos` (3-4 horas)
   - Layout principal
   - Componente de cobro
   - Búsqueda de citas
   - Panel resumen del día

2. ❌ Gestión de usuarios en Admin (2 horas)
   - Tab "Usuarios"
   - CRUD de cajeros
   - Cambio de contraseñas

3. ❌ Sistema de autenticación por roles (1 hora)
   - Redirect según rol después de login
   - Middleware de protección de rutas

4. ❌ Impresión térmica (1 hora)
   - Función de impresión navegador
   - Template para 80mm
   - CSS optimizado

5. ❌ Dashboard de ingresos en Admin (2-3 horas)
   - Tab "Ingresos"
   - Gráficos por barbero
   - Exportar PDF/Excel

6. ❌ Configuración de comisiones (1 hora)
   - Tab en editar barbero
   - Formulario de %
   - Historial de cambios

---

## 🚀 Próximos Pasos

### **INMEDIATO (Siguiente sesión):**

1. **Ejecutar Migraciones SQL** ⏱️ 15 min
   ```bash
   # En Supabase Dashboard → SQL Editor
   # Ejecutar: supabase/migrations/add_pos_system.sql
   # Ejecutar: supabase/migrations/add_cajero_role.sql
   ```

2. **Crear Helper de Permisos** ⏱️ 30 min
   ```typescript
   // lib/permissions-helper.ts
   - usePermissions() hook
   - can(user, 'pos', 'cobrar')
   - Middleware para rutas protegidas
   ```

3. **Crear Página `/pos`** ⏱️ 3-4 horas
   - Layout básico
   - Componente de cobro
   - API endpoints

### **Sprint 1: MVP Funcional** (6-8 horas total)

- [x] Base de datos ✅
- [x] Sistema de roles ✅
- [ ] Página `/pos`
- [ ] Gestión usuarios cajero
- [ ] Impresión térmica básica
- [ ] Autenticación por roles

**Resultado:** Sistema funcional para empezar a usar en barbería

### **Sprint 2: Dashboard Completo** (4-5 horas)

- [ ] Dashboard de ingresos
- [ ] Configuración de comisiones
- [ ] Reportes exportables
- [ ] Cierre de caja

**Resultado:** Sistema completo listo para vender

### **Sprint 3: Multi-Tenant** (10-15 horas)

- [ ] Tabla `tenants`
- [ ] Tabla `subscriptions`
- [ ] Feature flags
- [ ] Landing page
- [ ] Onboarding

**Resultado:** SaaS multi-barbería

---

## 📖 Casos de Uso Detallados

### **Caso 1: Cliente Walk-in (Sin Reserva)**

**Actor:** Cajero  
**Contexto:** Cliente llega sin cita previa

**Flujo:**
1. Cajero abre `/pos` (ya logueado)
2. Ingresa nombre del cliente: "Juan Pérez"
3. Selecciona barbero disponible: "Gustavo"
4. Selecciona servicio: "Corte Rapado - $5.00"
5. Sistema calcula comisión automáticamente:
   - Barbero (50%): $2.50
   - Casa (50%): $2.50
6. Selecciona método de pago: "Efectivo"
7. Ingresa monto recibido: $10.00
8. Sistema calcula cambio: $5.00
9. Click en "Cobrar e Imprimir"
10. Se crea:
    - Cita en tabla `citas` (estado: completada)
    - Factura en tabla `facturas` (número: F-20251108-0023)
11. Se abre ventana de impresión
12. Impresora térmica imprime ticket 80mm
13. Cajero entrega ticket y cambio
14. Cliente se va feliz

**Resultado:**
- ✅ Cita registrada
- ✅ Factura generada
- ✅ Comisión calculada
- ✅ Ticket impreso
- ✅ Resumen del día actualizado

### **Caso 2: Cliente con Reserva Previa**

**Actor:** Cajero  
**Contexto:** Cliente hizo reserva online y llega a su hora

**Flujo:**
1. Cajero abre `/pos`
2. Cliente dice: "Tengo cita, soy María García"
3. Cajero empieza a escribir "María" en input
4. Aparece autocompletado:
   ```
   María García
   Servicio: Corte + Barba
   Barbero: Alexander
   Hora: 10:30
   Total: $8.00
   ```
5. Cajero selecciona la cita
6. Formulario se auto-rellena con datos de la cita
7. Sistema muestra comisiones:
   - Alexander (50%): $4.00
   - Casa (50%): $4.00
8. Cajero pregunta: "¿Cómo vas a pagar?"
9. Cliente dice: "Tarjeta"
10. Cajero selecciona método: "Tarjeta"
11. Cliente pasa tarjeta (POS externo)
12. Cajero confirma pago exitoso
13. Click en "Cobrar e Imprimir"
14. Sistema:
    - Actualiza cita de "confirmada" a "completada"
    - Crea factura vinculada: `cita_id` = ID de la cita
15. Imprime ticket
16. Cliente recibe ticket y se va

**Resultado:**
- ✅ Cita marcada como completada
- ✅ Factura vinculada a cita
- ✅ Historial completo del cliente preservado
- ✅ Comisión calculada para Alexander

### **Caso 3: Admin Revisa Ingresos del Día**

**Actor:** Admin (dueño)  
**Contexto:** Fin del día, quiere ver cuánto se vendió

**Flujo:**
1. Admin logueado en `/admin`
2. Navega a Tab "Ingresos"
3. Filtro por defecto: "Hoy - 08 Nov 2025"
4. Ve resumen:
   ```
   Total del día: $115.00
   Total ventas: 23
   Comisiones barberos: $57.50
   Ingreso casa: $57.50
   ```
5. Ve desglose por barbero:
   ```
   Gustavo:   8 ventas → $40.00 (Com: $20.00)
   Alexander: 7 ventas → $35.00 (Com: $17.50)
   Roudith:   5 ventas → $25.00 (Com: $12.50)
   Hingover:  3 ventas → $15.00 (Com: $7.50)
   ```
6. Ve métodos de pago:
   ```
   Efectivo: $75.00 (15 transacciones)
   Tarjeta:  $30.00 (6 transacciones)
   Transfer: $10.00 (2 transacciones)
   ```
7. Click en "Exportar PDF"
8. Se genera PDF con todos los detalles
9. Admin lo guarda para contabilidad
10. Compara efectivo real vs esperado
11. Todo cuadra ✅

**Resultado:**
- ✅ Control total de ingresos
- ✅ Transparencia con barberos
- ✅ Reporte para contabilidad
- ✅ Detección de diferencias en efectivo

### **Caso 4: Admin Crea Usuario Cajero**

**Actor:** Admin  
**Contexto:** Contratar nuevo cajero para turno tarde

**Flujo:**
1. Admin en `/admin` → Tab "Usuarios"
2. Click en "+ Nuevo Usuario"
3. Modal se abre
4. Llena formulario:
   - Nombre: "María López"
   - Email: "maria.lopez@chamos.com"
   - Teléfono: "+58424xxxxxxx"
   - Rol: **Cajero** ← Selecciona este
5. Click en "Generar contraseña aleatoria"
   - Sistema genera: "Ch4m0s#2024!Mx7"
6. Marca checkbox: "Enviar credenciales por email"
7. Click en "Crear Usuario"
8. Sistema:
   - Crea usuario en `admin_users`
   - Asigna rol: `cajero`
   - Envía email a María con credenciales
9. Admin le dice a María:
   - "Revisa tu email"
   - "Entra a: chamos.com/pos"
   - "Usa las credenciales que te llegaron"
10. María abre el email:
    ```
    Bienvenida a Chamos Barbería
    
    Usuario: maria.lopez@chamos.com
    Contraseña: Ch4m0s#2024!Mx7
    
    Accede al sistema:
    https://chamos.com/pos
    ```
11. María entra al link
12. Sistema la redirige automáticamente a `/pos`
13. María empieza a trabajar

**Resultado:**
- ✅ Nuevo cajero operativo en minutos
- ✅ Acceso restringido solo a POS
- ✅ No puede ver panel admin
- ✅ No puede anular facturas
- ✅ Admin mantiene control total

### **Caso 5: Cambio de Comisión de Barbero**

**Actor:** Admin  
**Contexto:** Barbero senior pide aumento de comisión

**Flujo:**
1. Admin en `/admin` → Tab "Barberos"
2. Click en "Editar" para "Gustavo"
3. Modal se abre con tabs:
   - Datos Básicos
   - **Comisiones** ← Navega aquí
4. Ve configuración actual:
   ```
   Porcentaje actual: 50%
   
   Historial:
   - 01/11/2025: 50% (actual)
   - 15/10/2025: 45%
   - 01/10/2025: 50%
   ```
5. Admin cambia a: **55%**
6. Agrega nota:
   ```
   "Aumento por antigüedad y buen desempeño.
   Acordado el 08/11/2025 con Gustavo."
   ```
7. Click en "Guardar"
8. Sistema:
   - Actualiza `configuracion_comisiones`
   - Guarda en historial
   - `updated_at` = ahora
9. Admin le dice a Gustavo:
   - "Tu comisión aumentó a 55%"
   - "A partir de ahora, de cada venta de $10"
   - "Tú recibes $5.50 y casa $4.50"
10. Gustavo feliz 😊
11. Siguiente venta de Gustavo:
    - Total: $10.00
    - Gustavo: $5.50 (55%)
    - Casa: $4.50 (45%)

**Resultado:**
- ✅ Comisión actualizada
- ✅ Se aplica inmediatamente
- ✅ Historial preservado
- ✅ Transparencia total

---

## 🔧 Configuración Técnica

### **Variables de Entorno Necesarias**

```bash
# Ya existentes
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Nuevas (futuras)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@chamos.com
SMTP_PASS=xxx
```

### **Dependencias NPM (ya instaladas)**

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "@supabase/auth-helpers-react": "^0.x",
    "next": "14.0.4",
    "react": "^18.x",
    "react-hot-toast": "^2.x"
  }
}
```

### **Nuevas Dependencias (futuras)**

```bash
# Para impresión térmica avanzada (opcional)
npm install escpos escpos-usb

# Para exportar PDF
npm install jspdf jspdf-autotable

# Para gráficos
npm install recharts
```

---

## 📞 Contacto y Soporte

### **Repositorio**
- GitHub: `https://github.com/juan135072/chamos-barber-app`
- Branch principal: `master`

### **Stack Tecnológico**
- Frontend: Next.js 14 (Pages Router)
- Backend: Supabase (PostgreSQL + Auth + Storage)
- Hosting: Vercel
- Base de datos: Supabase PostgreSQL
- Estilos: Tailwind CSS + CSS Modules

### **Commits Importantes**

```bash
# Sistema POS - Base de datos
5dc20e7 - feat: Add POS system foundation

# Sistema de categorización de clientes
9d31029 - feat: Client categorization system

# Sistema de límites de reservas
81fba8f - feat: Smart reservation limits

# Mejoras responsive
64336d4 - feat: Improve mobile responsive design
```

---

## 🎯 Visión a Futuro

### **Roadmap del Producto**

#### **Q1 2025: MVP y Primeros Clientes**
- ✅ Sistema de reservas (ya existe)
- ⏳ Sistema POS completo
- ⏳ 5-10 barberías beta testers
- ⏳ Feedback y ajustes

#### **Q2 2025: Lanzamiento SaaS**
- Multi-tenant completo
- Landing page de ventas
- Sistema de suscripciones
- Pasarela de pagos
- 20-50 clientes pagantes

#### **Q3 2025: Módulos Premium**
- Módulo Marketing (email/SMS)
- Módulo Analytics avanzado
- Módulo Multi-sucursal
- Programa de fidelización
- 100+ clientes

#### **Q4 2025: Expansión**
- App móvil nativa
- Integración con POS hardware
- API pública
- White label
- 500+ clientes

### **Modelo de Negocio Proyectado**

| Plan | Precio/mes | Módulos | Target |
|------|-----------|---------|---------|
| Free | $0 | Reservas | Barbería pequeña |
| Pro | $29 | + POS | Barbería mediana |
| Business | $79 | + Analytics | Barbería grande |
| Enterprise | $149 | Todo + Multi-sucursal | Cadena |

**Proyección con 100 clientes:**
```
50 × Free = $0
30 × Pro ($29) = $870
15 × Business ($79) = $1,185
5 × Enterprise ($149) = $745
─────────────────────────
Total: $2,800/mes
× 12 meses = $33,600/año

Costos:
- Hosting: $100/mes
- Marketing: $500/mes
─────────────────────────
Ganancia neta: $26,400/año
```

---

## 📝 Notas Finales

### **Principios de Diseño**

1. **Simplicidad:** Interfaz intuitiva para cualquier usuario
2. **Velocidad:** Operaciones rápidas (< 2 segundos)
3. **Confiabilidad:** Sin pérdida de datos, todo registrado
4. **Escalabilidad:** Listo para crecer a miles de usuarios
5. **Modularidad:** Fácil de agregar nuevas funcionalidades

### **Decisiones Arquitectónicas Clave**

1. ✅ **Panel POS separado** - No contaminar admin
2. ✅ **Sistema de roles robusto** - Permisos granulares
3. ✅ **Multi-tenant desde el diseño** - Pensando en SaaS
4. ✅ **Comisiones configurables** - Flexibilidad por barbero
5. ✅ **Facturación térmica** - Control físico de ventas

### **Lecciones Aprendidas**

1. **Empezar simple, escalar después** - MVP primero, features después
2. **Separación de responsabilidades** - Admin ≠ POS ≠ Barbero
3. **Base de datos pensada** - Migraciones atómicas, vistas SQL
4. **Documentación continua** - Como esta guía para recuperar contexto

---

## 🔖 Referencias Rápidas

### **Archivos Clave**

```
/home/user/webapp/
├── docs/
│   ├── MVP_POS_IMPLEMENTATION.md          ← Plan de implementación
│   ├── POS_SYSTEM_COMPLETE_GUIDE.md       ← Este documento
│   ├── RESERVATION_LIMITS_GUIDE.md        ← Límites de reservas
│   ├── DATA_RETENTION_STRATEGY.md         ← Retención de datos
│   └── CLIENT_MANAGEMENT_GUIDE.md         ← Gestión de clientes
│
├── supabase/migrations/
│   ├── add_pos_system.sql                 ← Base de datos POS
│   └── add_cajero_role.sql                ← Sistema de roles
│
├── lib/
│   ├── database.types.ts                  ← Tipos TypeScript
│   ├── reservations-config.ts             ← Config límites
│   └── data-retention-policy.ts           ← Config retención
│
└── src/pages/
    ├── admin.tsx                          ← Panel admin
    ├── barbero-panel.tsx                  ← Panel barbero
    └── pos.tsx                            ← ⏳ POR CREAR
```

### **Comandos Útiles**

```bash
# Ejecutar migración SQL
# Supabase Dashboard → SQL Editor → Copiar contenido y ejecutar

# Ver tipos de una tabla
# Supabase Dashboard → Table Editor → Ver estructura

# Build del proyecto
npm run build

# Dev server
npm run dev

# Push a GitHub
git add .
git commit -m "feat: descripción"
git push origin master
```

---

**Última actualización:** 2025-11-08  
**Versión del documento:** 1.0  
**Estado del proyecto:** En desarrollo - Fase 1 completada  
**Próxima acción:** Ejecutar migraciones SQL y crear página /pos

---

## 🚀 Cómo Usar Este Documento

### **Si Estás Empezando una Nueva Sesión:**

1. Lee la sección [Estado Actual](#estado-actual) para ver qué está hecho
2. Revisa [Próximos Pasos](#próximos-pasos) para saber qué sigue
3. Consulta [Casos de Uso](#casos-de-uso-detallados) para entender el flujo
4. Revisa [Base de Datos](#base-de-datos) para entender la estructura

### **Si Necesitas Implementar Algo:**

1. Ve a [Interfaz de Usuario](#interfaz-de-usuario) para ver mockups
2. Consulta [Arquitectura](#arquitectura-del-sistema) para estructura
3. Revisa [Sistema de Roles](#sistema-de-roles) para permisos
4. Usa [Referencias Rápidas](#referencias-rápidas) para archivos

### **Si Algo No Funciona:**

1. Verifica que las migraciones SQL estén ejecutadas
2. Revisa que los tipos TypeScript estén actualizados
3. Consulta la sección de ese módulo en este documento
4. Busca en los commits del GitHub

---

**¡Listo! Este documento preserva TODO el contexto del proyecto POS.** 🎉
