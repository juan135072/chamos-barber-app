# Chamos Barber — Complete Database Schema

> Extracted from Supabase REST API (`https://api.chamosbarber.com`) on 2026-05-01  
> PostgREST version: v12  

---

## Tables (31 total)

### 1. `comercios` — Tenants / businesses

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `nombre` | `text` | | Business name |
| `tipo` | `text` | | Business type (e.g. "restaurante") |
| `activo` | `boolean` | | Active flag |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `rif` | `text` | | Tax ID (nullable) |
| `direccion` | `text` | | Physical address |
| `moneda` | `text` | | Currency (e.g. "USD") |
| `slug` | `text` | | URL-friendly identifier |
| `dominio_custom` | `text` | | Custom domain name |
| `logo_url` | `text` | | Logo image path |
| `favicon_url` | `text` | | Favicon path (nullable) |
| `color_primario` | `text` | | Theme primary color |
| `color_secundario` | `text` | | Theme secondary color |
| `color_fondo` | `text` | | Background color |
| `descripcion` | `text` | | Description |
| `telefono` | `text` | | Phone number |
| `email_contacto` | `text` | | Contact email |
| `pais` | `text` | | Country code (e.g. "CL") |
| `timezone` | `text` | | Timezone (e.g. "America/Santiago") |
| `plan` | `text` | | Plan tier (e.g. "enterprise") |
| `trial_ends_at` | `timestamptz` | | Trial expiration (nullable) |
| `stripe_customer_id` | `text` | | Stripe customer (nullable) |
| `stripe_subscription_id` | `text` | | Stripe subscription (nullable) |
| `max_barberos` | `integer` | | Max barbers allowed |

**Sample row:** 1 row — "Bejuma", plan `enterprise`, slug `chamos`, timezone `America/Santiago`.

---

### 2. `barberos` — Barbers / stylists

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `nombre` | `varchar` | | First name |
| `apellido` | `varchar` | | Last name |
| `telefono` | `varchar` | | Phone |
| `email` | `varchar` | | Email |
| `instagram` | `varchar` | | Instagram handle |
| `descripcion` | `text` | | Bio / description |
| **`especialidades`** | **`array`** | **`text[]`** | Array of specialties |
| `imagen_url` | `text` | | Profile photo URL |
| `activo` | `boolean` | | Active flag |
| `slug` | `varchar` | | URL identifier |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `porcentaje_comision` | `numeric` | | Commission percentage (e.g. 60.00 = 60%) |
| `banco` | `varchar` | | Bank name (nullable) |
| `tipo_cuenta` | `varchar` | | Account type (nullable) |
| `numero_cuenta` | `varchar` | | Account number (nullable) |
| `titular_cuenta` | `varchar` | | Account holder name (nullable) |
| `rut` | `varchar` | | National ID (nullable) |
| `rut_titular` | `varchar` | | Account holder's national ID (nullable) |
| `comercio_id` | `uuid` | | FK → comercios |
| `color` | `text` | | Display color (e.g. "#000000") |

**Sample row:** 13 barbers, all with `porcentaje_comision: 60.00`.

---

### 3. `servicios` — Services offered

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `nombre` | `varchar` | | Service name |
| `descripcion` | `text` | | Description |
| `duracion_minutos` | `integer` | | Duration in minutes |
| `precio` | `numeric` | | Price |
| `categoria_id` | `uuid` | | FK → categorias_servicios |
| `imagen_url` | `text` | | Image |
| `activo` | `boolean` | | Active flag |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `categoria` | `varchar` | | Category name (denormalized) |
| `tiempo_buffer` | `integer` | | Buffer time in minutes |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 4. `categorias_servicios` — Service categories

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `nombre` | `varchar` | | Category name |
| `descripcion` | `text` | | Description |
| `orden` | `integer` | | Display order |
| `activo` | `boolean` | | Active flag |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 5. `citas` — Appointments

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `barbero_id` | `uuid` | | FK → barberos |
| `servicio_id` | `uuid` | | FK → servicios |
| `cliente_nombre` | `varchar` | | Client name |
| `cliente_email` | `varchar` | | Client email (nullable) |
| `cliente_telefono` | `varchar` | | Client phone |
| `estado` | `varchar` | | Status (e.g. "confirmada") |
| `notas` | `text` | | Notes |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `fecha` | `date` | | Appointment date |
| `hora` | `time` | | Appointment time |
| `estado_pago` | `varchar` | | Payment status (e.g. "pendiente") |
| `foto_resultado_url` | `text` | | Result photo URL (nullable) |
| `notas_tecnicas` | `text` | | Technical notes (nullable) |
| **`items`** | **`jsonb`** | | Array of service items with `nombre`, `precio`, `cantidad`, `subtotal`, `servicio_id` |
| `precio_final` | `numeric` | | Total price |
| `metodo_pago` | `varchar` | | Payment method (e.g. "efectivo") |
| `comercio_id` | `uuid` | | FK → comercios (nullable) |

**JSONB column: `items`** — Structure: `[{"nombre": "...", "precio": N, "cantidad": N, "subtotal": N, "servicio_id": "uuid"}]`

---

### 6. `clientes` — Registered clients

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `comercio_id` | `uuid` | | FK → comercios |
| `nombre` | `text` | | Client name |
| `telefono` | `text` | | Phone |
| `email` | `text` | | Email |
| `activo` | `boolean` | | Active flag |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |

---

### 7. `walk_in_clients` — Walk-in (unregistered) clients

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `nombre` | `text` | | Name |
| `telefono` | `text` | | Phone |
| `email` | `text` | | Email |
| `notas` | `text` | | Notes |
| `origen` | `text` | | Origin (e.g. "pickup", "delivery") |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 8. `notas_clientes` — Client notes per barber

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `barbero_id` | `uuid` | | FK → barberos |
| `cliente_email` | `varchar` | | Client email |
| `cliente_nombre` | `varchar` | | Client name |
| `cliente_telefono` | `varchar` | | Client phone |
| `notas` | `text` | | Notes about the client |
| `cita_id` | `uuid` | | FK → citas |
| **`tags`** | **`array`** | **`text[]`** | Array of tags |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `imagen_url` | `text` | | Image URL |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 9. `facturas` — Invoices / bills

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `numero_factura` | `varchar` | | Invoice number (e.g. "B-0882") |
| `tipo_documento` | `varchar` | | Document type (e.g. "boleta", "factura") |
| `cliente_nombre` | `varchar` | | Client name |
| `cliente_rut` | `varchar` | | Client tax ID (nullable) |
| `cliente_email` | `varchar` | | Client email (nullable) |
| `cliente_telefono` | `varchar` | | Client phone (nullable) |
| `barbero_id` | `uuid` | | FK → barberos |
| `cajero_id` | `uuid` | | Cashier user ID (nullable) |
| `subtotal` | `numeric` | | Subtotal |
| `descuento` | `numeric` | | Discount |
| `total` | `numeric` | | Total |
| `metodo_pago` | `varchar` | | Payment method |
| `monto_recibido` | `numeric` | | Amount received |
| `cambio` | `numeric` | | Change given |
| `porcentaje_comision` | `numeric` | | Commission % at time of sale |
| `comision_barbero` | `numeric` | | Barber's commission amount |
| `ingreso_casa` | `numeric` | | House income (total - commission) |
| `anulada` | `boolean` | | Voided flag |
| `motivo_anulacion` | `text` | | Void reason (nullable) |
| `anulada_por` | `uuid` | | Voided by user ID (nullable) |
| `fecha_anulacion` | `timestamptz` | | Void timestamp (nullable) |
| `notas` | `text` | | Notes (nullable) |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `created_by` | `uuid` | | Created by user ID |
| **`items`** | **`jsonb`** | | Array of line items with `nombre`, `precio`, `cantidad`, `subtotal`, `servicio_id` |
| `liquidacion_id` | `uuid` | | FK → liquidaciones (nullable) |
| `cita_id` | `uuid` | | FK → citas (nullable) |
| `cierre_caja_id` | `uuid` | | FK → cierres_caja (nullable) |
| `comercio_id` | `uuid` | | FK → comercios (nullable) |

**JSONB column: `items`** — Same structure as citas: `[{"nombre", "precio", "cantidad", "subtotal", "servicio_id"}]`

---

### 10. `facturas_detalle` — Invoice detail lines

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `factura_id` | `uuid` | | FK → facturas |
| `servicio_id` | `uuid` | | FK → servicios |
| `descripcion` | `varchar` | | Line description |
| `cantidad` | `integer` | | Quantity |
| `precio_unitario` | `numeric` | | Unit price |
| `subtotal` | `numeric` | | Line subtotal |
| `created_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 11. `liquidaciones` — Barber settlements / payouts

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `numero_liquidacion` | `varchar` | | Settlement number (e.g. "LIQ-000001") |
| `barbero_id` | `uuid` | | FK → barberos |
| `fecha_inicio` | `date` | | Period start date |
| `fecha_fin` | `date` | | Period end date |
| `total_ventas` | `numeric` | | Total sales in period |
| `cantidad_servicios` | `integer` | | Number of services |
| `porcentaje_comision` | `numeric` | | Commission % |
| `total_comision` | `numeric` | | Total commission |
| **`facturas_ids`** | **`array`** | **`uuid[]`** | Array of invoice UUIDs included |
| `estado` | `varchar` | | Status (e.g. "pendiente", "pagada") |
| `metodo_pago` | `varchar` | | Payment method (nullable) |
| `monto_efectivo` | `numeric` | | Cash amount |
| `monto_transferencia` | `numeric` | | Transfer amount |
| `referencia_transferencia` | `varchar` | | Transfer reference (nullable) |
| `fecha_pago` | `timestamptz` | | Payment date (nullable) |
| `creado_por` | `uuid` | | Created by user ID (nullable) |
| `pagado_por` | `uuid` | | Paid by user ID (nullable) |
| `notas` | `text` | | Notes (nullable) |
| `motivo_anulacion` | `text` | | Void reason (nullable) |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 12. `caja_sesiones` — Cash register sessions

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `usuario_id` | `uuid` | | FK → auth.users |
| `comercio_id` | `uuid` | | FK → comercios |
| `fecha_apertura` | `timestamptz` | | Opening time |
| `fecha_cierre` | `timestamptz` | | Closing time (nullable) |
| `monto_inicial` | `numeric` | | Starting cash |
| `monto_final` | `numeric` | | Ending cash (nullable) |
| `estado` | `text` | | Status (e.g. "abierta", "cerrada") |
| `created_at` | `timestamptz` | | |

---

### 13. `movimientos_caja` — Cash register transactions

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `sesion_id` | `uuid` | | FK → caja_sesiones |
| `comercio_id` | `uuid` | | FK → comercios |
| `tipo` | `text` | | Movement type (e.g. "ingreso", "egreso") |
| `monto` | `numeric` | | Amount |
| `descripcion` | `text` | | Description |
| `fecha` | `timestamptz` | | Transaction date |
| `created_at` | `timestamptz` | | |

---

### 14. `cierres_caja` — Cash register closing reports

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `fecha_inicio` | `date` | | Period start |
| `fecha_fin` | `date` | | Period end |
| `cajero_id` | `uuid` | | Cashier user ID |
| `monto_apertura` | `numeric` | | Opening amount |
| `monto_esperado_efectivo` | `numeric` | | Expected cash |
| `monto_real_efectivo` | `numeric` | | Actual cash counted |
| `diferencia` | `numeric` | | Difference |
| `total_ventas` | `numeric` | | Total sales |
| `total_comisiones` | `numeric` | | Total commissions |
| `total_casa` | `numeric` | | House income |
| **`metodos_pago`** | **`jsonb`** | | Breakdown by payment method |
| `notas` | `text` | | Notes |
| `estado` | `text` | | Status (e.g. "cerrada") |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

**JSONB column: `metodos_pago`** — Structure: `{"efectivo": N, "tarjeta": N, "transferencia": N, "otros": N}`

---

### 15. `gastos` — Expenses

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `descripcion` | `text` | | Description |
| `monto` | `numeric` | | Amount |
| `tipo` | `text` | | Expense type (e.g. "GASTO") |
| `categoria_id` | `uuid` | | FK → gastos_categorias |
| `fecha` | `date` | | Expense date |
| `registrado_por` | `uuid` | | User who registered it |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 16. `gastos_categorias` — Expense categories

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `nombre` | `text` | | Category name |
| `tipo` | `text` | | Type |
| `activo` | `boolean` | | Active flag |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 17. `productos` — Inventory products

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `nombre` | `text` | | Product name |
| `descripcion` | `text` | | Description |
| `precio_venta` | `numeric` | | Sale price |
| `precio_costo` | `numeric` | | Cost price |
| `stock_actual` | `integer` | | Current stock |
| `stock_minimo` | `integer` | | Minimum stock |
| `categoria` | `text` | | Product category |
| `imagen_url` | `text` | | Image URL |
| `codigo_barras` | `text` | | Barcode |
| `activo` | `boolean` | | Active flag |
| `comercio_id` | `uuid` | | FK → comercios |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |

---

### 18. `inventario_movimientos` — Inventory movements

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `producto_id` | `uuid` | | FK → productos |
| `tipo` | `text` | | Movement type (e.g. "entrada", "salida") |
| `cantidad` | `integer` | | Quantity |
| `stock_anterior` | `integer` | | Previous stock |
| `stock_nuevo` | `integer` | | New stock |
| `motivo` | `text` | | Reason |
| `referencia_id` | `text` | | Reference ID |
| `created_by` | `uuid` | | Created by user ID |
| `comercio_id` | `uuid` | | FK → comercios |
| `created_at` | `timestamptz` | | |

---

### 19. `horarios_atencion` — Barber working hours

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `barbero_id` | `uuid` | | FK → barberos |
| `dia_semana` | `integer` | | Day of week (0=Sun, 1=Mon, ... 6=Sat) |
| `hora_inicio` | `time` | | Start time |
| `hora_fin` | `time` | | End time |
| `activo` | `boolean` | | Active flag |
| `created_at` | `timestamptz` | | |
| `pausa_inicio` | `time` | | Break start (nullable) |
| `pausa_fin` | `time` | | Break end (nullable) |
| `updated_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 20. `horarios_bloqueados` — Blocked time slots

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `barbero_id` | `uuid` | | FK → barberos |
| `fecha_hora_inicio` | `timestamptz` | | Block start |
| `fecha_hora_fin` | `timestamptz` | | Block end |
| `motivo` | `text` | | Reason |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 21. `asistencias` — Attendance records

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `barbero_id` | `uuid` | | FK → barberos |
| `fecha` | `date` | | Attendance date |
| `hora` | `time` | | Check-in time |
| `clave_usada` | `varchar` | | Daily key used |
| `estado` | `varchar` | | Status (e.g. "presente") |
| `dispositivo` | `text` | | Device info |
| `ip_address` | `inet` | | IP address |
| `created_at` | `timestamptz` | | |
| `latitud_registrada` | `numeric` | | Check-in latitude |
| `longitud_registrada` | `numeric` | | Check-in longitude |
| `distancia_metros` | `integer` | | Distance from barber shop |
| `ubicacion_barberia_id` | `uuid` | | FK → ubicaciones_barberia |
| `hora_salida` | `time` | | Check-out time (nullable) |
| `salida_registrada` | `boolean` | | Check-out registered |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 22. `claves_diarias` — Daily attendance keys

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `clave` | `varchar` | | Secret key |
| `fecha` | `date` | | Date this key is valid |
| `activa` | `boolean` | | Active flag |
| `creada_por` | `uuid` | | Created by user ID |
| `created_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 23. `ubicaciones_barberia` — Barber shop locations (for geo-fencing)

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `nombre` | `varchar` | | Location name |
| `latitud` | `numeric` | | Latitude |
| `longitud` | `numeric` | | Longitude |
| `radio_permitido` | `integer` | | Allowed radius in meters |
| `activa` | `boolean` | | Active flag |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 24. `configuracion_horarios` — Attendance schedule templates

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `nombre` | `varchar` | | Schedule name |
| `hora_entrada_puntual` | `time` | | Required check-in time |
| `hora_salida_minima` | `time` | | Minimum check-out time |
| `activa` | `boolean` | | Active flag |
| `ubicacion_barberia_id` | `uuid` | | FK → ubicaciones_barberia |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 25. `roles_permisos` — Role definitions with permissions

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `rol` | `text` | | Role key (e.g. "admin", "cajero", "barbero") |
| `nombre_display` | `text` | | Display name |
| `descripcion` | `text` | | Role description |
| **`permisos`** | **`jsonb`** | | Permission matrix |
| `created_at` | `timestamptz` | | |

**JSONB column: `permisos`** — Structure:
```json
{
  "pos": { "anular": bool, "cobrar": bool, "cerrar_caja": bool, "ver_reportes": bool },
  "admin": { "ver": bool, "editar": bool, "eliminar": bool },
  "reportes": { "exportar": bool, "ver_todos": bool },
  "configuracion": { "editar": bool }
}
```

**3 defined roles:** `admin` (full access), `cajero` (POS only), `barbero` (POS cobrar only).

---

### 26. `admin_users` — Admin user records (linked to auth.users)

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY (same as auth.users.id) |
| `email` | `varchar` | | Email |
| `nombre` | `varchar` | | Name |
| `telefono` | `varchar` | | Phone |
| `rol` | `varchar` | | Role key (e.g. "admin") |
| `activo` | `boolean` | | Active flag |
| `barbero_id` | `uuid` | | FK → barberos (nullable) |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 27. `usuarios_con_permisos` — Users with resolved permissions (VIEW)

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | |
| `comercio_id` | `uuid` | | FK → comercios |
| `barbero_id` | `uuid` | | FK → barberos (nullable) |
| `email` | `varchar` | | Email |
| `nombre` | `varchar` | | Name |
| `telefono` | `varchar` | | Phone |
| `rol` | `varchar` | | Role key |
| `activo` | `boolean` | | Active flag |
| `rol_display` | `text` | | Role display name |
| **`permisos`** | **`jsonb`** | | Resolved permissions |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |

**JSONB column: `permisos`** — Same structure as `roles_permisos.permisos`. This appears to be a **VIEW** that joins `admin_users` with `roles_permisos`.

---

### 28. `solicitudes_barberos` — Barber job applications

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `nombre` | `text` | | Applicant first name |
| `apellido` | `text` | | Applicant last name |
| `email` | `text` | | Email |
| `telefono` | `text` | | Phone |
| `especialidad` | `text` | | Specialty |
| `descripcion` | `text` | | Description |
| `experiencia_anos` | `integer` | | Years of experience |
| `imagen_url` | `text` | | Photo URL |
| `estado` | `text` | | Status (e.g. "pendiente", "aprobada", "rechazada") |
| `barbero_id` | `uuid` | | FK → barberos (set after approval) |
| `revisada_por` | `uuid` | | Reviewed by user ID |
| `fecha_solicitud` | `timestamptz` | | Application date |
| `fecha_revision` | `timestamptz` | | Review date |
| `notas_revision` | `text` | | Review notes |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

---

### 29. `barberos_resumen` — Barber summary (VIEW)

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | |
| `comercio_id` | `uuid` | | FK → comercios |
| `nombre` | `varchar` | | Name |
| `telefono` | `varchar` | | Phone |
| `email` | `varchar` | | Email |
| `color` | `text` | | Display color |
| `porcentaje_comision` | `numeric` | | Commission % |
| `activo` | `boolean` | | Active flag |
| `citas_pendientes` | `bigint` | | Count of pending appointments |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |

**This appears to be a VIEW** that aggregates barber data with pending appointment counts.

---

### 30. `enlaces_sociales` — Social media links

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `plataforma` | `varchar` | | Platform name |
| `url` | `text` | | Link URL |
| `activo` | `boolean` | | Active flag |
| `orden_display` | `integer` | | Display order |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

**Current data:** Empty (0 rows).

---

### 31. `sitio_configuracion` — Site configuration key-value store

| Column | Type | Format | Notes |
|---|---|---|---|
| `id` | `uuid` | | PRIMARY KEY |
| `clave` | `varchar` | | Configuration key |
| `valor` | `text` | | Configuration value |
| `tipo` | `varchar` | | Value type (e.g. "url", "tel", "text", "email", "time", "number", "select") |
| `descripcion` | `text` | | Description (nullable) |
| `categoria` | `varchar` | | Category (e.g. "general", "redes", "contacto", "seguridad", "sistema", "POS") |
| `publico` | `boolean` | | Publicly visible |
| `created_at` | `timestamptz` | | |
| `updated_at` | `timestamptz` | | |
| `comercio_id` | `uuid` | | FK → comercios |

**Current data:** 23 configuration keys, including:
- `sitio_nombre`, `sitio_telefono`, `sitio_email`, `sitio_direccion`, `sitio_timezone`
- `instagram_url`, `facebook_url`, `google_maps_url`
- `horario_apertura` (09:00), `horario_cierre` (00:00), `intervalo_citas` (30 min)
- `pos_clave_seguridad` (1234), `pos_nombre_negocio`
- `whatsapp_numero`
- `nombre_negocio`, `direccion`, `telefono`, `email`, `whatsapp`, `instagram`, `facebook`, `horario_atencion`, `descripcion`

---

## `auth.users` — Supabase Auth Users (17 users)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PRIMARY KEY |
| `aud` | `varchar` | "authenticated" |
| `role` | `varchar` | Auth role |
| `email` | `varchar` | Email |
| `email_confirmed_at` | `timestamptz` | |
| `phone` | `varchar` | Default "" |
| `confirmed_at` | `timestamptz` | |
| `last_sign_in_at` | `timestamptz` | Nullable |
| `app_metadata` | `jsonb` | `{comercio_id, provider, providers}` |
| `user_metadata` | `jsonb` | `{nombre, apellido, rol, email_verified}` |
| `identities` | `jsonb` | Nullable |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |
| `is_anonymous` | `boolean` | |

**`user_metadata`** typical structure:
```json
{"nombre": "...", "apellido": "...", "email_verified": true, "rol": "barbero"}
```

**`app_metadata`** typical structure:
```json
{"comercio_id": "777d45e2-...", "provider": "email", "providers": "email"}
```

Note: Some users have no `comercio_id` in `app_metadata`.

---

## Views

| View | Description |
|---|---|
| `barberos_resumen` | Barber summary with pending appointment count |
| `usuarios_con_permisos` | Users joined with their resolved role permissions |

---

## RPC Functions / Stored Procedures (21 total)

All invoked via `POST /rest/v1/rpc/<name>` with `{"args": {...}}` body.

| Function | Description |
|---|---|
| `aprobar_solicitud_barbero` | Approves a barber application and creates entries in `barberos` and `admin_users` |
| `calcular_comisiones_factura` | Calculates commission for a given invoice |
| `calcular_comisiones_pendientes` | Calculates pending commissions |
| `calcular_comisiones_proximo_periodo` | Calculates commissions from sales after each barber's last settlement. Uses `created_at` and `anulada` instead of `fecha` and `estado` |
| `calcular_distancia_metros` | Calculates distance in meters between two geo coordinates |
| `crear_liquidacion` | Creates a new settlement for a barber in a specific period. Auto-calculates totals and commissions from invoices |
| `earth` | Haversine distance helper (PostGIS related) |
| `ejecutar_generacion_clave_automatica` | Auto-generates daily attendance key |
| `eliminar_citas_canceladas` | Deletes cancelled appointments |
| `generate_slug` | Generates a URL-friendly slug |
| `generar_numero_factura` | Generates the next invoice number |
| `generar_numero_liquidacion` | Generates the next settlement number |
| `get_active_tenant_id` | Gets the current active tenant/comercio ID |
| `get_barber_dashboard_metrics_v2` | Returns barber dashboard KPIs |
| `get_hora_local_comercio` | Returns the local time for the business timezone |
| `get_horarios_disponibles` | Gets available time slots |
| `get_my_comercio_id` | Returns the comercio_id for the authenticated user |
| `get_user_comercio_id` | Returns comercio_id by user ID |
| `obtener_clave_del_dia` | Gets today's attendance key |
| `pagar_liquidacion` | Marks a settlement as paid |
| `ubicacion_es_valida` | Checks if coordinates are within a location's allowed radius |
| `barbero_marco_hoy` | Checks if a barber clocked in today |

---

## Row-Level Security (RLS) Policies

RLS policies could not be retrieved directly via the REST API (no exposed RPC for `get_policies`). They exist in the Supabase dashboard/CLI but are not queryable from PostgREST.

---

## JSONB Columns Summary

| Table | Column | Structure |
|---|---|---|
| `citas` | `items` | `[{nombre, precio, cantidad, subtotal, servicio_id}]` |
| `facturas` | `items` | `[{nombre, precio, cantidad, subtotal, servicio_id}]` |
| `cierres_caja` | `metodos_pago` | `{efectivo, tarjeta, transferencia, otros}` |
| `roles_permisos` | `permisos` | `{pos: {anular, cobrar, cerrar_caja, ver_reportes}, admin: {ver, editar, eliminar}, reportes: {exportar, ver_todos}, configuracion: {editar}}` |
| `usuarios_con_permisos` | `permisos` | (same as roles_permisos) |

---

## Array Columns Summary

| Table | Column | Type |
|---|---|---|
| `barberos` | `especialidades` | `text[]` |
| `liquidaciones` | `facturas_ids` | `uuid[]` |
| `notas_clientes` | `tags` | `text[]` |

---

## Composite / Multi-tenant Design

- **Multi-tenant** via `comercio_id` — almost every table has this column. The `comercios` table is the tenant registry.
- Auth users are associated with a `comercio_id` in their `app_metadata`.
- The `admin_users` table maps `auth.users.id` to business roles, linking via `barbero_id` when the user is a barber.
- Cash management flows: `caja_sesiones` → `movimientos_caja` → `cierres_caja`
- Sales flow: `citas` → `facturas` → `liquidaciones`
- Service flow: `categorias_servicios` → `servicios` → `citats` / `facturas.items`

---

Extraction completed on 2026-05-01 at 14:36 UTC-4.
