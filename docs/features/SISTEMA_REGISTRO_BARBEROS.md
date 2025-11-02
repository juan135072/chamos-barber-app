# 💈 Sistema de Registro y Aprobación de Barberos

## 📋 Resumen

Sistema completo que permite a barberos registrarse en la aplicación y al administrador aprobar o rechazar solicitudes, generando automáticamente credenciales de acceso.

---

## 🎯 Funcionalidades Implementadas

### 1. **Página de Registro Público** (`/registro-barbero`)

Los barberos pueden registrarse completando un formulario con:

**Información Personal:**
- Nombre y apellido
- Email (único, validado)
- Teléfono de contacto

**Información Profesional:**
- Años de experiencia
- Especialidades (separadas por comas)
- Biografía profesional

**Portfolio (Opcional):**
- URL de foto de perfil
- URLs de trabajos realizados

**Características:**
- ✅ Validación de email duplicado
- ✅ Formulario responsive (móvil, tablet, desktop)
- ✅ Mensaje de confirmación después del envío
- ✅ Diseño consistente con la aplicación

---

### 2. **Enlace en Página de Login**

- Enlace destacado: **"¿Eres barbero? Regístrate aquí"**
- Ubicado debajo del formulario de login
- Redirige a `/registro-barbero`

---

### 3. **Panel de Administración - Tab Solicitudes**

El admin tiene una nueva tab "Solicitudes" con:

**Filtros:**
- Todas las solicitudes
- Solo pendientes
- Solo aprobadas
- Solo rechazadas

**Vista de Solicitudes:**
- Tarjetas con información completa
- Estados con colores (pendiente: amarillo, aprobada: verde, rechazada: rojo)
- Fecha de solicitud
- Información del barbero solicitante

**Acciones para Solicitudes Pendientes:**
- ✅ **Botón "Aprobar"**: Crea barbero y genera credenciales
- ❌ **Botón "Rechazar"**: Solicita motivo de rechazo

---

### 4. **Sistema de Aprobación Automático**

Cuando el admin aprueba una solicitud:

1. **Crea registro en tabla `barberos`**
   - Con toda la información proporcionada
   - Estado activo por defecto

2. **Crea usuario en tabla `admin_users`**
   - Email del barbero
   - Rol: "barbero"
   - Asociado al `barbero_id`

3. **Genera contraseña segura automáticamente**
   - Formato: `Chamos{8caracteres}!`
   - Mostrada al admin para enviarla al barbero

4. **Actualiza solicitud**
   - Estado: "aprobada"
   - Guarda quién la revisó (`revisada_por`)
   - Fecha de revisión
   - Asocia `barbero_id` creado

**⚠️ Importante:** La contraseña solo se muestra una vez al admin. Debe guardarla y enviársela al barbero.

---

### 5. **Sistema de Rechazo**

Cuando el admin rechaza una solicitud:

1. **Solicita motivo obligatorio**
2. **Actualiza solicitud**
   - Estado: "rechazada"
   - Guarda motivo de rechazo
   - Guarda quién la revisó
   - Fecha de revisión

El motivo queda registrado y visible en la solicitud rechazada.

---

## 🗄️ Estructura de Base de Datos

### Tabla: `solicitudes_barberos`

```sql
CREATE TABLE solicitudes_barberos (
  id UUID PRIMARY KEY,
  
  -- Información personal
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  telefono VARCHAR(20) NOT NULL,
  
  -- Información profesional
  anos_experiencia INTEGER NOT NULL,
  especialidades TEXT,
  biografia TEXT,
  
  -- Portfolio
  foto_perfil_url TEXT,
  portfolio_urls TEXT,
  
  -- Estado y revisión
  estado VARCHAR(20) DEFAULT 'pendiente',
  motivo_rechazo TEXT,
  revisada_por UUID REFERENCES admin_users(id),
  fecha_revision TIMESTAMP,
  
  -- Barbero creado (si aprobada)
  barbero_id UUID REFERENCES barberos(id),
  
  -- Notas internas
  notas_admin TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 Seguridad (RLS Policies)

### Políticas Implementadas:

1. **`anon_insert_solicitudes`**
   - Usuarios anónimos pueden INSERT (registrarse)
   - Permite registro sin necesidad de login

2. **`authenticated_select_solicitudes`**
   - Usuarios autenticados pueden SELECT (admins ven todas)
   - Para gestión en panel de admin

3. **`authenticated_update_solicitudes`**
   - Usuarios autenticados pueden UPDATE (aprobar/rechazar)
   - Solo admins pueden modificar estados

4. **`service_role_all_solicitudes`**
   - Service role tiene acceso completo
   - Para operaciones del sistema

---

## 🚀 Flujo Completo del Sistema

### Flujo del Barbero:

```
1. Barbero visita /login
   ↓
2. Click en "¿Eres barbero? Regístrate aquí"
   ↓
3. Completa formulario en /registro-barbero
   ↓
4. Submit → Solicitud guardada como 'pendiente'
   ↓
5. Ve mensaje de confirmación
   ↓
6. Espera aprobación del admin
```

### Flujo del Admin:

```
1. Admin login en /admin
   ↓
2. Ve tab "Solicitudes" (con contador si hay pendientes)
   ↓
3. Click en tab "Solicitudes"
   ↓
4. Filtra por "Pendientes"
   ↓
5. Revisa información del barbero
   ↓
6a. APROBAR:
    - Click en "Aprobar"
    - Confirma en modal
    - Sistema crea barbero y usuario
    - Ve contraseña generada
    - Copia y envía al barbero
    
6b. RECHAZAR:
    - Click en "Rechazar"
    - Escribe motivo
    - Confirma
    - Solicitud marcada como rechazada
```

---

## 📁 Archivos del Sistema

### Frontend:

```
src/pages/registro-barbero.tsx
├── Formulario de registro
├── Validaciones
└── Mensaje de confirmación

src/pages/login.tsx
├── Enlace de registro
└── Redirección a /registro-barbero

src/pages/admin.tsx
├── Nueva tab "Solicitudes"
└── Integración con SolicitudesTab

src/components/admin/tabs/SolicitudesTab.tsx
├── Vista de solicitudes
├── Filtros
├── Modales de aprobación/rechazo
└── Gestión de estados
```

### Backend/Database:

```
lib/database.types.ts
└── Tipos TypeScript para solicitudes_barberos

lib/supabase-helpers.ts
├── getSolicitudesBarberos()
├── getSolicitudBarbero()
├── createSolicitudBarbero()
├── updateSolicitudBarbero()
├── aprobarSolicitudBarbero()
└── rechazarSolicitudBarbero()

scripts/SQL/create-solicitudes-barberos-table.sql
├── CREATE TABLE
├── Índices
├── Trigger updated_at
└── RLS Policies
```

---

## 🔧 Instalación y Configuración

### Paso 1: Crear Tabla en Supabase

1. Ir a: **https://supabase.chamosbarber.com/**
2. Login con credenciales de admin
3. Ir a: **SQL Editor** (menú lateral)
4. Click en **"New query"**
5. Copiar contenido completo de:
   ```
   scripts/SQL/create-solicitudes-barberos-table.sql
   ```
6. Pegar en el editor SQL
7. Click en **"RUN"** (botón verde)
8. Verificar resultados:
   - ✅ Tabla `solicitudes_barberos` creada
   - ✅ 4 políticas RLS activas
   - ✅ Índices creados
   - ✅ 1 solicitud de prueba insertada

### Paso 2: Deployment (Automático)

El código ya está pusheado a `master`. Coolify debería:
1. Detectar el push automáticamente
2. Iniciar build
3. Deployar en ~2-3 minutos

### Paso 3: Verificación

1. **Verificar página de registro:**
   ```
   https://chamosbarber.com/registro-barbero
   ```

2. **Verificar enlace en login:**
   ```
   https://chamosbarber.com/login
   ```
   (Debe aparecer el enlace de registro)

3. **Verificar tab en panel admin:**
   ```
   https://chamosbarber.com/admin
   ```
   (Debe aparecer tab "Solicitudes")

---

## 🧪 Testing

### Test 1: Registro de Barbero

```bash
1. Ir a: /registro-barbero
2. Llenar formulario:
   - Nombre: Andrés
   - Apellido: Pérez
   - Email: andres.perez@test.com
   - Teléfono: +58 424 555 9999
   - Años experiencia: 7
   - Especialidades: Fades, Cortes modernos
   - Biografía: [Cualquier texto]
3. Submit
4. ✅ Debe mostrar mensaje de confirmación
```

### Test 2: Aprobar Solicitud

```bash
1. Login como admin
2. Ir a tab "Solicitudes"
3. Filtrar por "Pendientes"
4. Debe aparecer solicitud de Andrés Pérez
5. Click en "Aprobar"
6. Confirmar en modal
7. ✅ Debe mostrar:
   - "Solicitud aprobada"
   - Email: andres.perez@test.com
   - Contraseña: Chamos{random}!
8. Copiar contraseña
9. Solicitud debe pasar a "Aprobada"
```

### Test 3: Login del Nuevo Barbero

```bash
1. Cerrar sesión de admin
2. Ir a /login
3. Usar credenciales del paso anterior:
   - Email: andres.perez@test.com
   - Password: [la generada]
4. ✅ Debe redirigir a /barbero-panel
5. ✅ Debe ver su perfil y panel personalizado
```

### Test 4: Rechazar Solicitud

```bash
1. Crear otra solicitud desde /registro-barbero
2. Login como admin
3. Ir a tab "Solicitudes"
4. Click en "Rechazar" en la nueva solicitud
5. Escribir motivo: "Experiencia insuficiente"
6. Confirmar
7. ✅ Solicitud debe pasar a "Rechazada"
8. ✅ Motivo debe ser visible en la tarjeta
```

---

## 🎓 Flujo de Aprobación Detallado

### Qué Hace `aprobarSolicitudBarbero()`:

```typescript
async aprobarSolicitudBarbero(solicitudId, adminId, barberoData) {
  // 1. Crear barbero en tabla 'barberos'
  const barbero = await supabase
    .from('barberos')
    .insert({ ...barberoData, activo: true })
  
  // 2. Generar contraseña segura
  const password = `Chamos${Math.random().toString(36).slice(-8)}!`
  
  // 3. Crear usuario admin con rol 'barbero'
  const adminUser = await supabase
    .from('admin_users')
    .insert({
      email: barberoData.email,
      nombre: `${barberoData.nombre} ${barberoData.apellido}`,
      rol: 'barbero',
      barbero_id: barbero.id,
      activo: true
    })
  
  // 4. Actualizar solicitud
  const solicitud = await supabase
    .from('solicitudes_barberos')
    .update({
      estado: 'aprobada',
      barbero_id: barbero.id,
      revisada_por: adminId,
      fecha_revision: NOW()
    })
    .eq('id', solicitudId)
  
  // 5. Retornar todo (incluyendo password)
  return { barbero, adminUser, solicitud, password }
}
```

---

## ⚠️ Importante para el Admin

### Cuando apruebas una solicitud:

1. **Copia la contraseña generada inmediatamente**
   - Solo se muestra una vez
   - No se puede recuperar después

2. **Envía la contraseña al barbero por canal seguro**
   - WhatsApp
   - Email
   - Llamada telefónica

3. **Incluye estas instrucciones al barbero:**
   ```
   ¡Bienvenido al equipo de Chamos Barber!
   
   Tu cuenta ha sido aprobada:
   - URL: https://chamosbarber.com/login
   - Email: {email_del_barbero}
   - Contraseña: {contraseña_generada}
   
   IMPORTANTE: Cambia tu contraseña después del primer login.
   ```

---

## 📊 Estadísticas y Reportes

El admin puede ver en tiempo real:

- **Total de solicitudes pendientes** (badge en tab)
- **Solicitudes por estado** (filtros)
- **Historial completo** de solicitudes
- **Quién revisó cada solicitud**
- **Motivos de rechazo** de solicitudes no aprobadas

---

## 🔄 Actualizaciones Futuras (Opcional)

Posibles mejoras:

- [ ] Notificación automática por email al barbero cuando es aprobado/rechazado
- [ ] Sistema de reset de contraseña para barberos
- [ ] Upload directo de fotos (en lugar de URLs)
- [ ] Validación de teléfono con código SMS
- [ ] Rating de solicitudes antes de aprobar
- [ ] Comentarios internos entre admins
- [ ] Dashboard de estadísticas de solicitudes

---

## 🆘 Troubleshooting

### "Error al enviar la solicitud"

**Causa:** Problema de conexión o email duplicado  
**Solución:** 
- Verificar internet
- Usar otro email si ya existe una solicitud con ese email

### "No aparece la tab Solicitudes"

**Causa:** Script SQL no ejecutado o deployment pendiente  
**Solución:**
- Ejecutar script SQL en Supabase
- Esperar deployment de Coolify
- Refrescar navegador (Ctrl+F5)

### "Error al aprobar: admin_users violates foreign key"

**Causa:** ID de admin no válido  
**Solución:**
- Verificar que `adminUserId` se pase correctamente
- Verificar que el admin existe en `admin_users`

### "Contraseña no se muestra"

**Causa:** Modal cerrado antes de copiar  
**Solución:**
- Volver a la solicitud
- Click en "Rechazar" y luego "Cancelar"
- NO se puede recuperar la contraseña
- Crear nueva solicitud o resetear manualmente

---

## 📞 Soporte

Para problemas con el sistema de registro de barberos:

1. Revisar este documento primero
2. Verificar que el script SQL fue ejecutado
3. Verificar logs de consola del navegador (F12)
4. Contactar al desarrollador con:
   - Descripción del problema
   - Capturas de pantalla
   - Logs de consola

---

**Fecha de creación:** 2025-11-02  
**Versión:** 1.0.0  
**Estado:** ✅ Implementado y listo para uso  
**Commit:** `1cfc397`
