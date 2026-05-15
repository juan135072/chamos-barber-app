# 📱 BARBER APP - Guía Completa de Implementación

## 🎯 **¿Qué es Barber App?**

**Barber App** es una aplicación móvil PWA (Progressive Web App) diseñada **exclusivamente para barberos** para gestionar sus citas del día de forma rápida y eficiente desde sus teléfonos móviles.

---

## ✨ **Características Principales**

### 📅 **Agenda en Tiempo Real**
- ✅ Ver todas las citas del día en una lista ordenada
- ✅ Actualizaciones instantáneas con Supabase Realtime
- ✅ Notificaciones cuando llega una nueva cita
- ✅ Estados: Pendiente, Confirmada, Completada, Cancelada

### 🎛️ **Control de Citas**
- ✅ **Check-in:** Marcar cuando el cliente llegó
- ✅ **Completar:** Marcar cuando terminó el corte
- ✅ **Cancelar:** Cancelar citas si es necesario
- ✅ Acciones rápidas con un solo toque

### 📊 **Métricas del Día**
- ✅ Ganancia total del día
- ✅ Número de citas completadas
- ✅ Citas restantes
- ✅ Actualización en tiempo real

### 🔄 **Toggle de Disponibilidad**
- ✅ Botón en el header para marcar "Disponible" o "Ocupado"
- ✅ Cambio instantáneo con feedback visual
- ✅ Los clientes pueden ver tu disponibilidad

### 📱 **PWA Instalable**
- ✅ Se instala como app nativa (sin Play Store)
- ✅ Funciona offline (caché de páginas)
- ✅ Icono en la pantalla de inicio
- ✅ Sin barra de navegador del navegador

### 🎨 **Diseño Mobile-First**
- ✅ Dark mode elegante
- ✅ Botones grandes (optimizados para dedos)
- ✅ Navegación inferior fija
- ✅ Animaciones fluidas
- ✅ Compatible con notch (iPhone)

---

## 🗂️ **Estructura del Proyecto**

```
chamos-barber-app/
├── sql/
│   └── barber-app-setup.sql          # ⚠️ EJECUTAR PRIMERO
├── src/
│   ├── types/
│   │   └── barber-app.ts             # Tipos TypeScript
│   ├── hooks/
│   │   ├── useBarberAppAuth.ts       # Autenticación de barberos
│   │   ├── useCitasRealtime.ts       # Supabase Realtime
│   │   ├── useDisponibilidad.ts      # Toggle disponibilidad
│   │   └── useMetricasDiarias.ts     # Métricas del día
│   ├── components/
│   │   └── barber-app/
│   │       ├── layout/
│   │       │   ├── BarberAppLayout.tsx
│   │       │   ├── Header.tsx
│   │       │   └── BottomNav.tsx
│   │       ├── citas/
│   │       │   ├── CitaCard.tsx      # Tarjeta individual
│   │       │   └── CitasList.tsx     # Lista completa
│   │       ├── dashboard/
│   │       │   └── MetricasRapidas.tsx
│   │       └── shared/
│   │           ├── LoadingSpinner.tsx
│   │           └── EmptyState.tsx
│   └── pages/
│       └── barber-app/
│           └── index.tsx              # Página principal
├── public/
│   ├── manifest.json                  # Manifest PWA actualizado
│   ├── sw.js                          # Service Worker
│   └── offline.html                   # Página sin conexión
├── ONESIGNAL_SETUP.md                 # Guía de notificaciones
└── BARBER_APP_README.md               # Este archivo
```

---

## 🚀 **Pasos de Implementación**

### **PASO 1: Configurar Base de Datos** ⚠️ **OBLIGATORIO**

1. Abrir Supabase SQL Editor:
   ```
   https://supabase.chamosbarber.com/
   → SQL Editor → New Query
   ```

2. Copiar TODO el contenido de `sql/barber-app-setup.sql`

3. Pegar y **Ejecutar** (tarda ~30 segundos)

4. Verificar en la consola que aparezca:
   ```
   ✅ Campos agregados correctamente a tabla barberos
   ✅ Índices creados correctamente
   ✅ Configuración de Barber App completada exitosamente
   ```

**Este paso agrega:**
- Campo `disponibilidad` a tabla `barberos`
- Campo `ultima_conexion` a tabla `barberos`
- Funciones RPC optimizadas
- Índices para queries rápidas
- Políticas RLS
- Realtime en tabla `citas`

---

### **PASO 2: Redeploy en Coolify**

1. Ir a: `https://coolify.app`

2. Seleccionar: `chamos-barber-app`

3. Clic en **"Redeploy"**

4. Esperar 3-5 minutos

5. Verificar que el deploy sea exitoso

---

### **PASO 3: Probar la App**

#### **En Desktop (para probar):**

1. Ir a: `https://chamosbarber.com/barber-app`

2. Iniciar sesión con una cuenta de barbero:
   - Email: `carlos@chamosbarber.com`
   - Password: `ChamosBarbero2024!`

3. Verificar que se vean:
   - Header con nombre del barbero y toggle de disponibilidad
   - Métricas rápidas (ganancia y citas restantes)
   - Lista de citas del día (si hay)
   - Navegación inferior (Agenda, Perfil, Historial)

#### **En Móvil (experiencia real):**

1. Abrir en Chrome/Safari móvil: `https://chamosbarber.com/barber-app`

2. Iniciar sesión con cuenta de barbero

3. **Instalar como PWA:**
   - **Android Chrome:** Menú → "Agregar a pantalla de inicio"
   - **iOS Safari:** Compartir (🔗) → "Agregar a pantalla de inicio"

4. Abrir la app desde el ícono en la pantalla de inicio

5. **¡Se verá como app nativa!** Sin barra del navegador

---

### **PASO 4: Configurar Notificaciones (Opcional)**

Seguir la guía completa en: `ONESIGNAL_SETUP.md`

**Resumen rápido:**

1. Crear cuenta en: https://onesignal.com/
2. Crear nueva app Web Push
3. Obtener App ID y REST API Key
4. Agregar variables de entorno en Coolify:
   ```
   NEXT_PUBLIC_ONESIGNAL_APP_ID=tu-app-id
   ONESIGNAL_REST_API_KEY=tu-rest-api-key
   ```
5. Redeploy
6. Integrar con n8n para notificaciones automáticas

---

## 📲 **Cómo Usar la App (Para Barberos)**

### **1. Inicio de Sesión**

1. Abrir la app instalada
2. Ingresar email y contraseña
3. La app verifica que seas un barbero
4. Redirige a la agenda del día

### **2. Cambiar Disponibilidad**

- En el **header** (arriba), ver el botón circular verde/rojo
- **Verde:** Disponible para citas
- **Rojo:** Ocupado/En descanso
- Tocar para cambiar de estado
- El cambio se guarda automáticamente

### **3. Ver Métricas del Día**

- **Ganancia de Hoy:** Suma de todas las citas completadas
- **Citas Restantes:** Pendientes + Confirmadas

### **4. Gestionar Citas**

#### Ver detalles de una cita:
- Tocar la tarjeta de la cita
- Se expande mostrando acciones

#### Check-in (cuando llega el cliente):
1. Tocar la cita
2. Tocar botón **"Check-in"** (azul)
3. El estado cambia a "Confirmada"

#### Completar (después del corte):
1. Tocar la cita
2. Tocar botón **"Completar"** (verde)
3. El estado cambia a "Completada"
4. Se suma a la ganancia del día

#### Cancelar:
1. Tocar la cita
2. Tocar botón **"Cancelar"** (rojo)
3. Confirmar
4. El estado cambia a "Cancelada"

### **5. Refrescar Lista**

- Tocar botón **"Actualizar"** arriba de la lista
- O hacer scroll hacia abajo (pull-to-refresh)

### **6. Navegación**

- **Agenda:** Ver citas del día actual
- **Perfil:** Ver y editar perfil (próximamente)
- **Historial:** Ver citas de días anteriores (próximamente)

---

## 🎨 **Diseño y UX**

### **Colores Principales**

```css
--background: #0a0a0a a #1a1a1a (gradiente)
--primary: #D4AF37 (dorado)
--text: #ffffff
--success: #10b981 (verde)
--warning: #f59e0b (amarillo)
--error: #ef4444 (rojo)
--info: #3b82f6 (azul)
```

### **Elementos Interactivos**

- **Botones grandes:** Min 48x48px (recomendación Apple/Google)
- **Feedback táctil:** Escala al tocar (transform: scale(0.95))
- **Animaciones:** Transiciones suaves de 0.3s
- **Ripple effect:** En botones principales

### **Responsive**

- **Mínimo:** 360px de ancho (iPhone SE)
- **Óptimo:** 375-428px (iPhones modernos)
- **Máximo:** 600px (tabletas se ven como móvil grande)

---

## 🔔 **Notificaciones**

### **Eventos que Generan Notificaciones:**

1. **Nueva Cita Creada**
   - Título: "Nueva Cita Agendada"
   - Mensaje: "Cliente: [Nombre] - Hora: [HH:MM]"
   - Sonido: ✅
   - Vibración: ✅

2. **Cita Cancelada**
   - Título: "Cita Cancelada"
   - Mensaje: "La cita con [Nombre] fue cancelada"

3. **Recordatorio (30 min antes)**
   - Título: "Próxima Cita en 30 Minutos"
   - Mensaje: "Cliente: [Nombre] - Hora: [HH:MM]"

### **Solicitar Permisos**

La app solicita permisos al abrir por primera vez. Opciones:

- **Permitir:** Recibirás notificaciones ✅
- **Bloquear:** No recibirás notificaciones ❌
- **Cambiar después:** Configuración del navegador → Notificaciones

---

## 🗄️ **Base de Datos: Funciones Disponibles**

### **1. `obtener_citas_hoy_barbero(barbero_uuid)`**

Obtiene todas las citas de hoy para un barbero específico.

**Uso:**
```typescript
const { data } = await supabase.rpc('obtener_citas_hoy_barbero', {
  barbero_uuid: 'uuid-del-barbero'
})
```

**Retorna:**
```typescript
{
  id: string
  cliente_nombre: string
  cliente_telefono: string
  cliente_email: string
  fecha_hora: timestamp
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada'
  servicio_nombre: string
  servicio_precio: number
  duracion: number
  notas: string | null
}[]
```

---

### **2. `obtener_metricas_diarias_barbero(barbero_uuid)`**

Calcula las métricas del día actual.

**Uso:**
```typescript
const { data } = await supabase.rpc('obtener_metricas_diarias_barbero', {
  barbero_uuid: 'uuid-del-barbero'
})
```

**Retorna:**
```typescript
{
  total_citas: number
  citas_completadas: number
  citas_pendientes: number
  ganancia_total: number
  promedio_por_cita: number
}
```

---

### **3. `toggle_disponibilidad_barbero(barbero_uuid, nueva_disponibilidad)`**

Cambia el estado de disponibilidad del barbero.

**Uso:**
```typescript
const { data } = await supabase.rpc('toggle_disponibilidad_barbero', {
  barbero_uuid: 'uuid-del-barbero',
  nueva_disponibilidad: true // o false
})
```

**Retorna:**
```typescript
{
  id: string
  nombre: string
  disponibilidad: boolean
  updated_at: timestamp
}
```

---

### **4. `cambiar_estado_cita(cita_uuid, nuevo_estado, barbero_uuid)`**

Cambia el estado de una cita.

**Uso:**
```typescript
const { data } = await supabase.rpc('cambiar_estado_cita', {
  cita_uuid: 'uuid-de-la-cita',
  nuevo_estado: 'completada',
  barbero_uuid: 'uuid-del-barbero'
})
```

**Retorna:**
```typescript
{
  id: string
  estado: string
  updated_at: timestamp
  success: boolean
  message: string
}
```

---

### **5. `actualizar_ultima_conexion(barbero_uuid)`**

Actualiza el timestamp de última conexión.

**Uso:**
```typescript
await supabase.rpc('actualizar_ultima_conexion', {
  barbero_uuid: 'uuid-del-barbero'
})
```

---

## 🔐 **Seguridad (RLS Policies)**

### **Políticas Implementadas:**

1. **Barberos solo ven sus propias citas**
   ```sql
   barbero_id = barbero_id del usuario autenticado
   ```

2. **Barberos solo actualizan sus propias citas**
   ```sql
   WHERE barbero_id = barbero_id del usuario
   ```

3. **Barberos solo ven su propio perfil**
   ```sql
   id = barbero_id del usuario autenticado
   ```

4. **Barberos solo actualizan su propia disponibilidad**
   ```sql
   WHERE id = barbero_id del usuario
   ```

---

## 🧪 **Testing**

### **Test 1: Autenticación**

1. Ir a `/barber-app` sin estar logueado
2. Debe redirigir a `/login`
3. Loguear con cuenta de barbero
4. Debe redirigir a `/barber-app`

### **Test 2: Toggle de Disponibilidad**

1. En el header, ver estado actual (verde o rojo)
2. Tocar el botón
3. Debe cambiar de color
4. Verificar en Supabase que el campo `disponibilidad` cambió

### **Test 3: Realtime**

1. Abrir `/barber-app` en el móvil
2. En desktop, crear una nueva cita para ese barbero
3. **La cita debe aparecer automáticamente en el móvil**
4. Sin necesidad de refrescar

### **Test 4: Cambiar Estado de Cita**

1. Tocar una cita pendiente
2. Tocar "Check-in"
3. El estado debe cambiar a "Confirmada"
4. La tarjeta debe actualizarse visualmente

### **Test 5: PWA Installation**

1. Abrir en Chrome móvil
2. Menú → "Agregar a pantalla de inicio"
3. Abrir desde el ícono
4. **No debe verse la barra del navegador**

---

## 🐛 **Troubleshooting**

### **Problema: No se ven las citas**

**Causas posibles:**
- No se ejecutó `sql/barber-app-setup.sql`
- El barbero no tiene citas para hoy
- Error en autenticación

**Solución:**
1. Verificar en Supabase que existan funciones RPC
2. Crear una cita de prueba para hoy
3. Verificar consola del navegador (F12)

---

### **Problema: No funciona Realtime**

**Causas posibles:**
- Realtime no habilitado en tabla `citas`
- Error en suscripción al canal

**Solución:**
1. En Supabase: Settings → API → Realtime
2. Verificar que `citas` esté en la lista
3. Si no, ejecutar:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.citas;
   ```

---

### **Problema: Toggle de disponibilidad no funciona**

**Causas posibles:**
- Función RPC no existe
- Permisos RLS incorrectos

**Solución:**
1. Verificar función: `toggle_disponibilidad_barbero`
2. Verificar políticas RLS en tabla `barberos`
3. Verificar consola del navegador

---

### **Problema: Error "User not allowed"**

**Causa:**
- El usuario no es un barbero
- No tiene `barbero_id` en `admin_users`

**Solución:**
1. Verificar en Supabase tabla `admin_users`
2. El campo `rol` debe ser `'barbero'`
3. El campo `barbero_id` debe existir y ser válido

---

## 📈 **Roadmap / Futuras Mejoras**

### **Fase 2 (Próximamente):**

- [ ] Página de perfil del barbero
- [ ] Edición de disponibilidad por horario
- [ ] Historial de citas (más de 7 días)
- [ ] Estadísticas semanales/mensuales
- [ ] Chat con clientes
- [ ] Notas personalizadas por cliente
- [ ] Galería de trabajos (fotos)

### **Fase 3 (Futuro):**

- [ ] Modo offline completo (SQLite local)
- [ ] Sincronización automática
- [ ] Recordatorios personalizables
- [ ] Integración con calendario del teléfono
- [ ] Escaneo de QR para check-in
- [ ] Firma digital del cliente

---

## 📞 **Soporte**

### **Documentación:**
- Este archivo: `BARBER_APP_README.md`
- Setup SQL: `sql/barber-app-setup.sql`
- OneSignal: `ONESIGNAL_SETUP.md`

### **Contacto:**
- Email: contacto@chamosbarber.com
- Sitio: https://chamosbarber.com

---

## 🎉 **Conclusión**

**¡Barber App está lista para producción!** 🚀

La aplicación está completamente funcional, optimizada para móviles, y preparada para instalarse como PWA. Los barberos pueden gestionar sus citas de forma rápida e intuitiva.

**Próximo paso:** Ejecutar el SQL y hacer redeploy.

---

**Versión:** 1.0.0  
**Fecha:** 2024-12-15  
**Estado:** ✅ Producción Ready
