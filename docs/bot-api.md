# Bot API for the WhatsApp agent

The WhatsApp agent ("Chamin") reads business data and books, reschedules and
cancels appointments through `/api/bot/*`. Every write goes through the same
server code as the website booking form (`src/lib/booking/`), so the agent can
never book something the website would refuse.

This document is the contract for the agent's tools. Field names, codes and
messages below are exactly what the server sends.

## Quick path

1. Set `BOT_API_KEY` (32+ characters, e.g. `openssl rand -hex 32`) and
   `BOT_COMERCIO_SLUG` (default `chamos`) on the web server.
2. Send `x-bot-api-key: <BOT_API_KEY>` on every request.
3. Typical conversation:

| Customer wants to… | Calls |
|---|---|
| Know address, hours, links | `GET /api/bot/info` |
| Book | `GET /api/bot/servicios` → `GET /api/bot/barberos` → `POST /api/bot/horarios` → `POST /api/bot/citas` |
| Be greeted / see their bookings | `GET /api/bot/citas?telefono=…` |
| Move a booking | `GET /api/bot/citas?telefono=…` → `POST /api/bot/horarios` → `POST /api/bot/citas/reagendar` |
| Cancel | `GET /api/bot/citas?telefono=…` → `POST /api/bot/citas/cancelar` |

## Conventions

| Topic | Rule |
|---|---|
| Auth | Header `x-bot-api-key` must equal `BOT_API_KEY` (constant-time compare). |
| Tenant | Fixed by `BOT_COMERCIO_SLUG`. Requests cannot choose another business. |
| Body | `Content-Type: application/json`. A body that is not a JSON object → `400 DATOS_INVALIDOS`. |
| Success | `{ "success": true, "data": … }` |
| Error | `{ "success": false, "code": "…", "message": "…" }`. `message` is Spanish and safe to paraphrase to the customer. |
| Dates | `fecha` is `YYYY-MM-DD`; `hora` is `HH:MM` (24 h). Both are wall-clock times in the business timezone (`info.timezone`, usually `America/Santiago`). |
| Booking window | `fecha` must be between today and today + 30 days (business timezone), like the website calendar. |
| Phone | Any of `+56 9 1234 5678`, `+56912345678`, `56912345678`, `912345678` is accepted and stored as `+56912345678`. 8–15 digits. |
| Services | `servicios_ids` is 1–20 service UUIDs. Repeating an id means quantity (`[corte, corte]` = 2× Corte). |
| Prices | Always taken from the catalog. The API ignores any price sent by the client. |
| Caching | Responses carry `Cache-Control: no-store`. |
| Rate limits | No per-IP limit for authenticated bot calls. The per-customer active-booking limit applies (see below). |

Request handling order: key check (`503`/`401`) → method (`405`) → tenant
(`503`) → input validation (`400`) → business rules (`404`/`409`).

## Error codes

| HTTP | `code` | Meaning | What the agent should do |
|---|---|---|---|
| 401 | `NO_AUTORIZADO` | Header missing or wrong. | Configuration problem; do not retry. |
| 503 | `BOT_NO_CONFIGURADO` | `BOT_API_KEY` unset/shorter than 32 chars, or the tenant slug does not exist / is inactive. | Configuration problem; send the customer to the website. |
| 405 | `METODO_NO_PERMITIDO` | Wrong HTTP method (`Allow` header lists the right one). | Bug in the tool. |
| 400 | `DATOS_INVALIDOS` | Input failed validation; `message` names the first invalid field. | Ask the customer for the missing/invalid data. |
| 400 | `BARBERO_NO_DISPONIBLE` | Barber unknown, inactive or from another business. | Offer `GET /api/bot/barberos`. |
| 400 | `SERVICIO_NO_DISPONIBLE` | A service is unknown, inactive or from another business. | Offer `GET /api/bot/servicios`. |
| 404 | `CITA_NO_ENCONTRADA` | No booking with that id for this phone in this business. Also returned when the id belongs to someone else. | Re-read `GET /api/bot/citas`. |
| 409 | `CITA_NO_MODIFICABLE` | Booking is already `cancelada`/`completada`, changed state meanwhile, or has already started / is in the past (message `La cita ya comenzó o ya pasó y no se puede modificar.`). | Explain; offer a new booking. |
| 409 | `FUERA_DE_PLAZO` | **Deprecated — no longer returned.** Older versions sent it for changes close to the start; that cutoff was removed. | Treat it like `CITA_NO_MODIFICABLE`. |
| 409 | `HORARIO_NO_DISPONIBLE` | The time is not offered by availability. | Call `POST /api/bot/horarios` again and offer other times. |
| 409 | `RACE_CONDITION` | Someone took the slot between check and write. | Same as above. |
| 409 | `LIMITE_CITAS_ALCANZADO` | Phone already has 5 upcoming `pendiente`/`confirmada` bookings. | Explain; offer to move or cancel one. |
| 500 | `ERROR_INTERNO` | Unexpected server/database error. No internals are exposed. | Retry once later, then send the customer to the website. |

`DATOS_INVALIDOS` messages: `Cuerpo JSON inválido`, `Teléfono inválido`,
`Nombre inválido`, `Selecciona entre 1 y 20 servicios válidos`,
`Barbero inválido`, `Fecha inválida`, `La fecha debe estar entre <hoy> y <hoy+30>`,
`Hora inválida`, `Email inválido`, `Notas inválidas`, `Cita inválida`,
`La cita ya está agendada en ese horario.`

## Business rules

### Change and cancel: allowed until the booking starts

A `pendiente`/`confirmada` booking can be rescheduled or cancelled at any
moment before it starts; there is no earlier cutoff. The server checks the
booking's **current** start time, in the business timezone:

- allowed while `now < start`;
- from the start on (including exactly at the start time) or for a past
  booking → `409 CITA_NO_MODIFICABLE` with the message
  `La cita ya comenzó o ya pasó y no se puede modificar.`

Each booking returned by the API carries `modificable` (state and "not started
yet") and `modificable_hasta` (`YYYY-MM-DD HH:MM`, the booking start: changes
are accepted strictly before it), so the agent can answer before calling.
Times are compared as wall clocks, like the availability function; on a
DST-switch day the comparison can be off by one real hour.

`FUERA_DE_PLAZO` is no longer returned. It stays in the error table as
deprecated so older clients still recognize it.

### Rescheduling inside the booking's own time

Availability (`get_horarios_disponibles`) cannot leave out the booking being
moved. When the customer moves a booking with the **same barber on the same
day** to a time that overlaps its current one (10:00 → 10:15), that time
appears as occupied by the booking itself. The server then accepts it only if:

1. the only active booking overlapping the new time is the one being moved, and
2. no blocked range of the barber overlaps the new time.

Past times, closed hours and breaks are still refused. The database overlap
guard ignores the row itself and remains the final check (`RACE_CONDITION` on
conflict). Consequence for the agent: `POST /api/bot/horarios` may not list such
a time, but `reagendar` can still succeed if the customer asks for it.

### Other rules shared with the website

- New and rescheduled bookings are `pendiente`; the barber confirms them.
- Duration = sum of service durations (with repetitions) + the largest buffer.
- Active-booking limit: 5 upcoming `pendiente`/`confirmada` bookings per phone,
  counting every stored spelling of that phone.
- Rescheduling keeps services, `items` and `precio_final`; only `fecha`, `hora`
  and (optionally) the barber change.
- Every write publishes a realtime event for the dashboards and sends a push to
  the affected barber(s).

## The `Cita` object

Returned by `GET /api/bot/citas` (inside `citas`), `POST /api/bot/citas`,
`reagendar` and `cancelar`.

```json
{
  "id": "7f6c1c1e-2d1b-4f8e-9a51-0c7d0c2b8a11",
  "fecha": "2026-10-23",
  "hora": "10:00",
  "estado": "pendiente",
  "barbero": { "id": "11111111-1111-4111-8111-111111111111", "nombre": "Carlos", "apellido": "Pérez" },
  "servicios": [
    { "id": "22222222-2222-4222-8222-222222222222", "nombre": "Corte", "cantidad": 2, "precio": 10000 }
  ],
  "precio_final": 20000,
  "modificable": true,
  "modificable_hasta": "2026-10-23 10:00"
}
```

| Field | Notes |
|---|---|
| `estado` | `pendiente`, `confirmada`, `completada` or `cancelada`. |
| `barbero` | `null` only for legacy bookings without barber; `nombre`/`apellido` may be `null` on legacy rows. |
| `servicios[].precio` | Unit price at booking time. |
| `precio_final` | Total agreed for the booking. |
| `modificable` | `true` while the booking is `pendiente`/`confirmada` and has not started yet. |
| `modificable_hasta` | The booking start (`fecha` + `hora`, business timezone). Changes are accepted strictly before it. |

## Routes

### `GET /api/bot/info`

Business data and the general opening hours used by the booking calendar.

```json
{
  "success": true,
  "data": {
    "nombre": "Chamos Barber",
    "direccion": "Av. Ejemplo 123, Santiago",
    "telefono": "+56 9 1234 5678",
    "timezone": "America/Santiago",
    "moneda": "CLP",
    "horarios": {
      "semana":  { "abierto": true,  "apertura": "10:30", "cierre": "20:00" },
      "sabado":  { "abierto": true,  "apertura": "10:30", "cierre": "20:00" },
      "domingo": { "abierto": false, "apertura": "10:30", "cierre": "20:00" }
    },
    "intervalo_citas_minutos": 30,
    "enlaces": {
      "google_maps": "https://maps.google.com/…",
      "instagram": "https://www.instagram.com/…",
      "facebook": null,
      "whatsapp": "+56 9 1234 5678"
    }
  }
}
```

- `semana` is Monday–Friday. Saturday/Sunday fall back to the weekday hours
  when not configured; the defaults (`10:30`–`20:00`, 30 min) match the
  database. `domingo.abierto` is the "Sunday open" switch.
- Text fields and links are `null` when not configured. Individual barbers can
  still be off or on a break: availability is the source of truth.

### `GET /api/bot/servicios`

Active services, ordered by name.

```json
{
  "success": true,
  "data": [
    { "id": "22222222-2222-4222-8222-222222222222", "nombre": "Corte", "descripcion": "Corte clásico", "precio": 10000, "duracion_minutos": 30, "categoria": "cortes" }
  ]
}
```

### `GET /api/bot/barberos`

Active barbers, ordered by name. `especialidades` is always an array.

```json
{
  "success": true,
  "data": [
    { "id": "11111111-1111-4111-8111-111111111111", "nombre": "Carlos", "apellido": "Pérez", "especialidades": ["Fade"], "descripcion": "Especialista en degradados" }
  ]
}
```

### `POST /api/bot/horarios`

Available start times for the requested services on one date.

Request (`barbero_id` optional):

```json
{ "fecha": "2026-10-23", "servicios_ids": ["22222222-2222-4222-8222-222222222222"], "barbero_id": "11111111-1111-4111-8111-111111111111" }
```

Response — always a list of barbers (one when `barbero_id` was sent, every
active barber otherwise; barbers with no free time have `"horarios": []`):

```json
{
  "success": true,
  "data": {
    "fecha": "2026-10-23",
    "duracion_minutos": 35,
    "barberos": [
      { "id": "11111111-1111-4111-8111-111111111111", "nombre": "Carlos", "apellido": "Pérez", "horarios": ["10:30", "11:00", "15:30"] }
    ]
  }
}
```

Only free times are listed; past times, closed days, breaks, blocks and
overlaps are already excluded. Errors: `DATOS_INVALIDOS`,
`SERVICIO_NO_DISPONIBLE`, `BARBERO_NO_DISPONIBLE`.

### `GET /api/bot/citas?telefono=<phone>`

Upcoming bookings and short history of one customer. Only bookings of this
phone (any stored spelling) in this business are read; nothing about other
customers is returned.

```json
{
  "success": true,
  "data": {
    "telefono": "+56912345678",
    "citas": [ { "…": "Cita objects, soonest first" } ],
    "historial": {
      "cliente_nombre": "Ana",
      "visitas_completadas": 3,
      "ultima_visita": "2026-10-13",
      "barberos_recientes": [
        { "id": "11111111-1111-4111-8111-111111111111", "nombre": "Carlos", "apellido": "Pérez", "activo": true, "visitas": 2, "ultima_visita": "2026-10-13" }
      ]
    }
  }
}
```

| Field | Notes |
|---|---|
| `citas` | `pendiente`/`confirmada` bookings that have not started yet, soonest first. |
| `historial.cliente_nombre` | Name on the customer's most recent booking; `null` for a new customer. |
| `historial.barberos_recientes` | Up to 3 barbers from `completada` bookings, most recent first. Check `activo` before offering one. |
| History scope | Built from the customer's latest 100 bookings. |

Errors: `DATOS_INVALIDOS` (`Teléfono inválido`).

### `POST /api/bot/citas`

Books an appointment.

```json
{
  "telefono": "+56912345678",
  "nombre": "Ana Pérez",
  "servicios_ids": ["22222222-2222-4222-8222-222222222222"],
  "barbero_id": "11111111-1111-4111-8111-111111111111",
  "fecha": "2026-10-23",
  "hora": "10:30",
  "email": "ana@example.com",
  "notas": "Prefiere degradado bajo"
}
```

| Field | Required | Rule |
|---|---|---|
| `telefono` | yes | See phone convention. Stored as `+569…`. |
| `nombre` | yes | 1–150 characters (trimmed). |
| `servicios_ids` | yes | 1–20 active service UUIDs. |
| `barbero_id` | yes | Active barber of this business. |
| `fecha` / `hora` | yes | `hora` must be one of the times from `POST /api/bot/horarios`. |
| `email` | no | Valid email, ≤ 254 characters. |
| `notas` | no | ≤ 2000 characters. Stored as `[RESERVA WHATSAPP/IA] <notas>` (just the marker when empty). |

Response: `201` with the `Cita` object (`estado: "pendiente"`).
Errors: `DATOS_INVALIDOS`, `BARBERO_NO_DISPONIBLE`, `SERVICIO_NO_DISPONIBLE`,
`LIMITE_CITAS_ALCANZADO`, `HORARIO_NO_DISPONIBLE`, `RACE_CONDITION`.

### `POST /api/bot/citas/reagendar`

Moves a booking of this customer.

```json
{ "telefono": "+56912345678", "cita_id": "7f6c1c1e-2d1b-4f8e-9a51-0c7d0c2b8a11", "fecha": "2026-10-24", "hora": "16:00", "barbero_id": "11111111-1111-4111-8111-111111111111" }
```

`barbero_id` is optional (default: keep the current barber). Response: `200`
with the updated `Cita` (`estado: "pendiente"` again).

Checks, in order: ownership (`404 CITA_NO_ENCONTRADA`), state
(`409 CITA_NO_MODIFICABLE`), current start not reached yet
(`409 CITA_NO_MODIFICABLE`), barber (`400 BARBERO_NO_DISPONIBLE`), same slot
(`400 DATOS_INVALIDOS`), availability (`409 HORARIO_NO_DISPONIBLE`), write
(`409 RACE_CONDITION`).

### `POST /api/bot/citas/cancelar`

Cancels a booking of this customer.

```json
{ "telefono": "+56912345678", "cita_id": "7f6c1c1e-2d1b-4f8e-9a51-0c7d0c2b8a11" }
```

Response: `200` with the `Cita` (`estado: "cancelada"`, `modificable: false`).
Allowed until the booking starts. Errors: `DATOS_INVALIDOS`,
`CITA_NO_ENCONTRADA`, `CITA_NO_MODIFICABLE` (also once the booking has started
or is in the past).

## Example

```bash
curl -s https://chamosbarber.com/api/bot/horarios \
  -H "x-bot-api-key: $BOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"fecha":"2026-10-23","servicios_ids":["22222222-2222-4222-8222-222222222222"]}'
```

## Out of scope

- Confirming bookings: only staff confirm (`pendiente` → `confirmada`).
- The old in-site bot (`src/lib/ai-agent.ts`, `/api/chatwoot/webhook`) still
  works until the Chatwoot webhook is pointed at the new agent.
