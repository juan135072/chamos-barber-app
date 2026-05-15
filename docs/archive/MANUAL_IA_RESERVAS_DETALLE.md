# 🧠 Manual Técnico para Agente de IA - Gestión de Reservas Chamos Barber

Este documento es una guía técnica ultra-detallada diseñada para alimentar el contexto de un sistema de Inteligencia Artificial que gestionará las reservas de la barbería. Contiene reglas de negocio, esquemas de datos y flujos lógicos críticos.

---

## 🏛️ 1. Esquema de Base de Datos (Relacional)

La base de datos reside en **Supabase (PostgreSQL)**. Las tablas clave para la gestión de reservas son:

### 📅 Tabla: `citas`
Es el núcleo del sistema.
- **`id`**: UUID (Primary Key).
- **`cliente_id`**: UUID (Relación con usuarios).
- **`barbero_id`**: UUID (Relación con barberos).
- **`servicio_id`**: UUID (Relación con servicios).
- **`fecha`**: DATE (Fecha de la cita).
- **`hora`**: TIME (Hora de inicio).
- **`estado`**: Enum (`pendiente`, `confirmada`, `cancelada`, `completada`).
- **`notas`**: TEXT. *IMPORTANTE: La IA debe leer aquí los servicios extra seleccionados.*

### ✂️ Tabla: `servicios`
- **`nombre`**: Nombre del servicio (ej: "Corte Senior").
- **`duracion_minutos`**: Clave para el cálculo de disponibilidad.
- **`precio`**: Precio base.
- **`categoria`**: Categoría del servicio.

### 🧔 Tabla: `barberos`
- **`id`**: UUID.
- **`nombre`**, **`apellido`**: Datos de identidad.
- **`activo`**: BOOLEAN (Solo barberos activos pueden recibir citas).

### ⏰ Tabla: `horarios_trabajo`
- **`dia_semana`**: 0 (Dom) a 6 (Sáb).
- **`hora_inicio`**, **`hora_fin`**: Rango de jornada laboral.

---

## ⚙️ 2. Lógica de Negocio y Reglas Críticas

La IA debe adherirse estrictamente a estas reglas para evitar errores de agenda:

### 🕒 Cálculo de Disponibilidad Inteligente
El sistema usa una función RPC llamada `get_horarios_disponibles(barbero_id, fecha)`.
- **Regla de Duración:** No basta con que el slot de inicio esté libre. La IA debe sumar la duración de **todos** los servicios solicitados.
- **Bloqueo Secuencial:** Si un servicio dura 60 minutos, la IA debe bloquear el slot actual (ej: 10:00) y el siguiente (10:30).
- **Buffer Time:** El sistema asume bloques de **30 minutos** como unidad mínima (slot).

### 📝 Estructura de Notas para Multi-Servicios
Cuando un cliente elige más de un servicio, la IA debe registrarlo en el campo `notas` con este formato exacto para que el sistema lo procese:
`[SERVICIOS SOLICITADOS: Corte Senior, Lavado Premium, Barba]`

### 🚦 Gestión de Estados
1. **Nueva Reserva:** Siempre entra como `pendiente` (a menos que se configure auto-confirmación).
2. **Prevenir Solapamiento:** Solo se consideran "ocupadas" las citas en estado `pendiente` y `confirmada`. Las `canceladas` liberan el horario inmediatamente.

---

## 🤖 3. Flujo de Interacción del Agente IA

Para gestionar una reserva con éxito, el agente debe seguir este flujo:

1. **Identificación:** Obtener nombre y teléfono del cliente (buscar en la tabla `usuarios`).
2. **Preferencia:** Preguntar por un barbero específico o asignar según disponibilidad general.
3. **Selección de Servicios:** Listar servicios disponibles y sumar sus duraciones.
4. **Validación de Horario:**
   - Llamar a `get_horarios_disponibles`.
   - Verificar que existan suficientes slots contiguos para la duración total.
5. **Confirmación de Datos:** Resumir: "Corte + Barba con [Barbero] el [Fecha] a las [Hora]".
6. **Ejecución:** Realizar la inserción en la tabla `citas`.

---

## ⚠️ 4. Restricciones Técnicas Importantes

- **Zonificación Horaria:** El servidor opera en horario local (Santiago, Chile). La IA debe ajustar cualquier entrada UTC.
- **Pasado:** Nunca permitir agendar citas en fechas o horas que ya pasaron.
- **Feriados/Bloqueos:** Consultar la tabla `horarios_bloqueados` antes de confirmar.

---

## 🧾 5. Integración con el Sistema POS (Opcional para la IA)

Si la IA gestiona cancelaciones o cambios, debe saber que:
- Una cita `completada` suele tener una **Factura (Ticket)** asociada en la tabla `facturas`. 
- No se deben modificar citas que ya han sido facturadas (cobradas) sin intervención de un administrador.

---
**Nota de Privacidad:** Este manual es de uso exclusivo para la configuración del Agente IA y contiene secretos de lógica interna. No subir a repositorios públicos.
