# 📋 Instrucciones: Sistema de Consulta de Citas

**Fecha:** 2025-11-02  
**Commit:** `c13e4bd`  
**Estado:** ⏳ Pendiente ejecución de SQL

---

## 🎯 Objetivo

Habilitar el sistema de consulta de citas con datos de prueba para que los clientes puedan:
1. **Buscar sus citas** ingresando su número de teléfono
2. **Ver próximas citas** separadas del historial
3. **Consultar detalles** completos (barbero, servicio, fecha, hora, estado, precio)

---

## ⚠️ ACCIÓN REQUERIDA: Ejecutar SQL

### Paso 1: Acceder a Supabase Studio

1. Ve a: `https://supabase.chamosbarber.com`
2. Inicia sesión con tus credenciales
3. Navega a: **SQL Editor** (icono `</>` en el menú lateral)

### Paso 2: Ejecutar el Script SQL

1. Abre el archivo: `scripts/insert-demo-citas.sql`
2. **Copia TODO el contenido** del archivo
3. **Pega** en el SQL Editor de Supabase
4. Haz clic en **"Run"** (▶️) o presiona `Ctrl+Enter`

### Paso 3: Verificar Resultados

Al final del script verás una tabla con las citas insertadas:

```
id  | fecha      | hora  | estado     | cliente_nombre    | cliente_telefono | barbero         | servicio
----|------------|-------|------------|-------------------|------------------|-----------------|------------------
... | 2025-11-03 | 10:00 | confirmada | Juan Pérez        | +56912345678     | Carlos Ramírez  | Corte Clásico
... | 2025-11-09 | 15:30 | pendiente  | María González    | +56987654321     | Miguel Torres   | Fade
... | 2025-10-30 | 12:00 | completada | Carlos Rodríguez  | +56911223344     | Luis Mendoza    | Barba
... | 2025-11-02 | 16:00 | confirmada | Ana Martínez      | +56922334455     | Jorge Silva     | Corte Infantil
```

**Total esperado:** 4 citas

---

## ✨ Lo Que Se Implementó

### 1. API Route `/api/consultar-citas`

Nueva ruta para buscar citas por teléfono del cliente:

```typescript
GET /api/consultar-citas?telefono=+56912345678
```

**Características:**
- ✅ Busca citas por número de teléfono exacto
- ✅ Incluye datos relacionados (barbero completo + servicio)
- ✅ Ordenadas por fecha descendente (más recientes primero)
- ✅ Manejo de errores y respuestas vacías

**Respuesta:**
```json
{
  "citas": [
    {
      "id": "...",
      "fecha": "2025-11-03",
      "hora": "10:00",
      "estado": "confirmada",
      "notas": "Cliente frecuente, prefiere corte clásico con navaja",
      "servicio_nombre": "Corte Clásico",
      "barbero_nombre": "Carlos Ramírez",
      "precio": 15000
    }
  ]
}
```

### 2. Citas de Prueba (4 en total)

#### 📅 Cita 1: Confirmada - Mañana
- **Cliente:** Juan Pérez
- **Teléfono:** `+56912345678`
- **Barbero:** Carlos Ramírez
- **Servicio:** Corte Clásico
- **Fecha:** Mañana a las 10:00
- **Estado:** ✅ Confirmada
- **Notas:** Cliente frecuente, prefiere corte clásico con navaja

#### ⏳ Cita 2: Pendiente - Próxima Semana
- **Cliente:** María González
- **Teléfono:** `+56987654321`
- **Barbero:** Miguel Torres
- **Servicio:** Fade
- **Fecha:** En 7 días a las 15:30
- **Estado:** ⏳ Pendiente
- **Notas:** Primera vez en la barbería, quiere fade medio

#### ✅ Cita 3: Completada - Hace 3 Días
- **Cliente:** Carlos Rodríguez
- **Teléfono:** `+56911223344`
- **Barbero:** Luis Mendoza
- **Servicio:** Barba
- **Fecha:** Hace 3 días a las 12:00
- **Estado:** ✅ Completada
- **Notas:** Perfilado de barba y tratamiento hidratante

#### 📅 Cita 4: Confirmada - Hoy
- **Cliente:** Ana Martínez
- **Teléfono:** `+56922334455`
- **Barbero:** Jorge Silva
- **Servicio:** Corte Infantil
- **Fecha:** Hoy a las 16:00
- **Estado:** ✅ Confirmada
- **Notas:** Corte para niño de 8 años, primera vez

---

## 💻 Página `/consultar` - Funcionamiento

### Sección 1: Búsqueda
```
┌─────────────────────────────────────┐
│   🔍 Buscar mis Citas               │
│                                     │
│   📱 Número de Teléfono             │
│   [+56 9 1234 5678]                 │
│                                     │
│   [🔍 Buscar mis Citas]             │
└─────────────────────────────────────┘
```

### Sección 2: Resultados - Próximas Citas
```
📅 Próximas Citas (2)
┌─────────────────────────────────────┐
│ 📅 sábado, 3 de noviembre 10:00     │
│ Servicio: Corte Clásico             │
│ Barbero: Carlos Ramírez             │
│ Estado: Confirmada ✅               │
│ Precio: $15,000                     │
│ Notas: Cliente frecuente...         │
└─────────────────────────────────────┘
```

### Sección 3: Historial
```
📜 Historial (1)
┌─────────────────────────────────────┐
│ 📅 miércoles, 30 de octubre 12:00   │
│ Servicio: Barba                     │
│ Barbero: Luis Mendoza               │
│ Estado: Completada ✅               │
│ Precio: $8,000                      │
└─────────────────────────────────────┘
```

---

## 🧪 Cómo Probar

### Después de Ejecutar el SQL:

1. **Espera el deployment de Coolify** (ya está pusheado, ~5 minutos)

2. **Accede a la página de consulta:**
   ```
   https://chamosbarber.com/consultar
   ```

3. **Prueba con los teléfonos de demo:**

   **Opción 1 - Juan (Cita mañana confirmada):**
   ```
   Teléfono: +56912345678
   Resultado: 1 próxima cita con Carlos Ramírez
   ```

   **Opción 2 - María (Cita pendiente):**
   ```
   Teléfono: +56987654321
   Resultado: 1 próxima cita con Miguel Torres (pendiente)
   ```

   **Opción 3 - Carlos (Cita pasada):**
   ```
   Teléfono: +56911223344
   Resultado: 1 cita en historial con Luis Mendoza
   ```

   **Opción 4 - Ana (Cita hoy):**
   ```
   Teléfono: +56922334455
   Resultado: 1 próxima cita con Jorge Silva (hoy)
   ```

4. **Verifica que se muestren:**
   - ✅ Fecha formateada en español
   - ✅ Nombre completo del barbero
   - ✅ Nombre del servicio
   - ✅ Estado con color (confirmada=dorado, pendiente=naranja, completada=verde)
   - ✅ Precio del servicio
   - ✅ Notas adicionales
   - ✅ Separación entre próximas citas e historial

---

## 🎨 Estados de Citas

### Color Coding:
| Estado | Color | Emoji | Significado |
|--------|-------|-------|-------------|
| **Pendiente** | 🟠 Naranja | ⏳ | Esperando confirmación |
| **Confirmada** | 🟡 Dorado | ✅ | Confirmada por la barbería |
| **Completada** | 🟢 Verde | ✅ | Servicio finalizado |
| **Cancelada** | 🔴 Rojo | ❌ | Cita cancelada |

### Clasificación Automática:
- **Próximas Citas:** Futuras + estado `pendiente` o `confirmada`
- **Historial:** Pasadas + estado `completada` o `cancelada`

---

## 🔧 Arquitectura Técnica

### Frontend (`/consultar`)
```typescript
// Buscar citas por teléfono
const response = await fetch(`/api/consultar-citas?telefono=${telefono}`)
const data = await response.json()

// Clasificar automáticamente
const upcomingCitas = citas.filter(cita => 
  !isPastDate(cita.fecha, cita.hora) && 
  cita.estado !== 'cancelada' && 
  cita.estado !== 'completada'
)

const historyCitas = citas.filter(cita => 
  isPastDate(cita.fecha, cita.hora) || 
  cita.estado === 'cancelada' || 
  cita.estado === 'completada'
)
```

### Backend (`/api/consultar-citas`)
```typescript
// Query con JOIN para obtener datos relacionados
const { data: citas } = await supabase
  .from('citas')
  .select(`
    id,
    fecha,
    hora,
    estado,
    notas,
    servicios (nombre, precio),
    barberos (nombre, apellido)
  `)
  .eq('cliente_telefono', telefono)
  .order('fecha', { ascending: false })
```

### Base de Datos
```sql
-- Tabla citas con relaciones
CREATE TABLE citas (
  id UUID PRIMARY KEY,
  barbero_id UUID REFERENCES barberos(id),
  servicio_id UUID REFERENCES servicios(id),
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  cliente_email TEXT,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estado TEXT NOT NULL,  -- pendiente, confirmada, completada, cancelada
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📱 Formato de Teléfono

### Formatos Aceptados:
- ✅ `+56912345678` (con +)
- ✅ `56912345678` (sin +)
- ✅ `+56 9 1234 5678` (con espacios)
- ✅ `+56-9-1234-5678` (con guiones)

**Nota:** La búsqueda es exacta, debe coincidir con el formato guardado en la BD.

---

## 🚀 Flujo Completo de Reserva

### 1. Cliente Reserva
```
Usuario en /reservar
  ↓
Llena formulario
  ↓
Envía datos
  ↓
Se crea cita con estado "pendiente"
  ↓
Notificación: "Te contactaremos pronto"
```

### 2. Barbería Confirma
```
Admin revisa en panel (futuro)
  ↓
Cambia estado a "confirmada"
  ↓
Contacta cliente por WhatsApp
```

### 3. Cliente Consulta
```
Usuario en /consultar
  ↓
Ingresa teléfono
  ↓
Ve su cita con estado actualizado
  ↓
Recibe detalles completos
```

---

## 🔮 Funcionalidades Futuras (Opcional)

### Para Clientes:
- 📧 **Envío de email** de confirmación automático
- 💬 **Notificaciones WhatsApp** automáticas
- 🔔 **Recordatorios** 24 horas antes
- ❌ **Auto-cancelación** desde la página
- 📅 **Reprogramación** online
- ⭐ **Calificar servicio** después de completada

### Para Admin Panel:
- 📊 **Dashboard de citas** del día
- ✅ **Confirmación rápida** con un clic
- 📞 **Integración WhatsApp** directa
- 📈 **Estadísticas** de citas por barbero
- 🗓️ **Vista de calendario** mensual
- 🔍 **Búsqueda avanzada** de citas

### Para Barberos:
- 📱 **App/Panel propio** para ver su agenda
- ✅ **Marcar como completada** desde móvil
- 💰 **Registro de pagos** y propinas
- 📊 **Estadísticas personales**

---

## 📝 Notas Importantes

### Privacidad
- ✅ Solo muestra citas del teléfono ingresado
- ✅ No hay listado público de todas las citas
- ✅ Búsqueda requiere teléfono exacto (seguridad por oscuridad)
- 💡 Futuro: Agregar código PIN o email de verificación

### Rendimiento
- ✅ Búsqueda indexada por `cliente_telefono`
- ✅ Límite de resultados (últimos 50)
- ✅ Carga rápida con JOINs eficientes

### Mantenimiento
- 🗑️ Opcional: Script para limpiar citas antiguas (>6 meses)
- 📊 Opcional: Backup automático de citas
- 🔄 Opcional: Sincronización con calendario externo

---

## ✅ Checklist Final

Antes de marcar como completado, verifica:

- [ ] SQL ejecutado en Supabase Studio
- [ ] Verificación: 4 citas insertadas correctamente
- [ ] Deployment completado en Coolify
- [ ] Página `/consultar` accesible
- [ ] Búsqueda funciona con teléfonos de prueba
- [ ] Próximas citas separadas del historial
- [ ] Estados se muestran con colores correctos
- [ ] Información completa visible (barbero, servicio, precio)
- [ ] No hay errores en la consola del navegador

---

## 🎉 Resultado Final

Después de ejecutar el SQL, tendrás:

✅ **Sistema de consulta de citas funcional**
✅ **4 citas de prueba con diferentes estados**
✅ **Búsqueda por teléfono operativa**
✅ **Separación automática próximas/historial**
✅ **Información completa y detallada**
✅ **Interfaz amigable con colores por estado**

---

## 📞 Teléfonos de Prueba (Para Referencia Rápida)

| Cliente | Teléfono | Estado | Cuándo |
|---------|----------|--------|--------|
| Juan Pérez | `+56912345678` | Confirmada | Mañana 10:00 |
| María González | `+56987654321` | Pendiente | Próxima semana 15:30 |
| Carlos Rodríguez | `+56911223344` | Completada | Hace 3 días 12:00 |
| Ana Martínez | `+56922334455` | Confirmada | Hoy 16:00 |

---

**¿Listo para ejecutar el SQL y probar el sistema de consulta de citas? 🚀**
