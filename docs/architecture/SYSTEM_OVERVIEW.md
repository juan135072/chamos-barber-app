# System Overview - Chamos Barber

## 📋 Descripción General

Chamos Barber es una aplicación web completa para la gestión de una barbería, permitiendo a los clientes reservar citas y a los administradores/barberos gestionar el negocio de manera eficiente.

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND (Next.js)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Public     │  │    Admin     │  │   Barbero    │      │
│  │   Landing    │  │    Panel     │  │    Panel     │      │
│  │   Booking    │  │  Dashboard   │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                          │                                   │
│                   Supabase Client                            │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │ HTTPS
                           │
┌──────────────────────────┼──────────────────────────────────┐
│               BACKEND (Supabase Self-hosted)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                      │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐   │   │
│  │  │ citas  │ │barberos│ │servicio│ │admin_users │   │   │
│  │  └────────┘ └────────┘ └────────┘ └────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Supabase Auth (JWT)                      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Supabase Storage                         │   │
│  │              (Portfolio Images)                       │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

## 🔐 Sistema de Autenticación

### Flujo de Autenticación

```
Usuario → Login Page → Supabase Auth → JWT Token
                                          │
                          ┌───────────────┼───────────────┐
                          ▼               ▼               ▼
                    Check admin_users   Yes?        barberos
                          │               │               │
                    ┌─────┴─────┐         │               │
                    ▼           ▼         │               │
               rol=admin   rol=barbero    │               │
                    │           │         │               │
                    ▼           ▼         ▼               ▼
              /admin    /barbero-panel  /admin   /barbero-panel
```

### Niveles de Acceso

1. **Usuario Público**: Acceso a landing page y sistema de reservas
2. **Barbero**: Acceso a panel de barbero (citas propias, portfolio)
3. **Admin**: Acceso total al panel de administración

## 🎯 Componentes Principales

### Frontend Pages

```
src/pages/
├── index.tsx           # Landing page con sistema de reservas
├── login.tsx           # Página de login con auth multi-rol
├── admin.tsx           # Panel de administración completo
└── barbero-panel.tsx   # Panel específico para barberos
```

### Admin Components

```
src/components/admin/
├── layout/
│   ├── Header.tsx      # Header con perfil y logout
│   └── Sidebar.tsx     # Navegación principal (tabs)
└── tabs/
    ├── BarberosTab.tsx     # CRUD de barberos
    ├── ServiciosTab.tsx    # CRUD de servicios
    ├── CitasTab.tsx        # Gestión de TODAS las citas
    └── PortfolioTab.tsx    # Gestión de galería de imágenes
```

### Barbero Components

```
src/components/barbero/
├── ProfileSection.tsx   # Perfil del barbero
├── PortfolioSection.tsx # Portfolio personal
└── CitasSection.tsx     # Vista de citas PROPIAS del barbero
```

### Public Components

```
src/components/
├── Hero.tsx             # Hero section con CTA
├── Servicios.tsx        # Lista de servicios ofrecidos
├── Barberos.tsx         # Galería de barberos
├── ReservaModal.tsx     # Modal de reserva de citas
└── Footer.tsx           # Footer con info de contacto
```

## 🗄️ Modelo de Datos Simplificado

```
┌─────────────┐         ┌─────────────┐
│   barberos  │◄────────│    citas    │
│             │1      n │             │
│ • id        │         │ • barbero_id│
│ • nombre    │         │ • cliente   │
│ • apellido  │         │ • fecha     │
│ • email     │         │ • hora      │
│ • telefono  │         │ • estado    │
│ • slug      │         │ • servicio_id│
└─────────────┘         └─────────────┘
                               │
                               │ n
                               │
                               │ 1
                        ┌──────▼──────┐
                        │  servicios  │
                        │             │
                        │ • id        │
                        │ • nombre    │
                        │ • precio    │
                        │ • duracion  │
                        └─────────────┘

┌──────────────┐
│ admin_users  │  (Tabla separada de auth.users)
│              │
│ • id         │  (FK a auth.users)
│ • email      │
│ • rol        │  ('admin' | 'barbero')
│ • activo     │
│ • barbero_id │  (nullable, FK a barberos)
└──────────────┘
```

## 🔄 Flujos de Usuario Principales

### 1. Cliente Reserva una Cita

```
Landing Page → Click "Reservar" → Modal de Reserva
     ↓
Selecciona Barbero → Selecciona Servicio → Selecciona Fecha/Hora
     ↓
Ingresa Datos de Contacto → Confirma Reserva
     ↓
Inserción en tabla 'citas' → Confirmación Visual
```

### 2. Admin Gestiona Citas

```
Login → Verificación en admin_users (rol=admin) → /admin
     ↓
Tab "Citas" → Ver TODAS las citas del sistema
     ↓
Puede: Filtrar, Buscar, Cambiar Estado, Eliminar
```

### 3. Barbero Ve Sus Citas

```
Login → Verificación en admin_users (rol=barbero) → /barbero-panel
     ↓
Tab "Mis Citas" → Ver SOLO sus citas (filtrado por barbero_id)
     ↓
Puede: Ver Detalles, Cambiar Estado de sus citas
```

## 🔒 Seguridad Implementada

### 1. Autenticación
- Supabase Auth con JWT
- Verificación de sesión en cada página protegida
- Redirección automática si no autenticado

### 2. Autorización
- Verificación de rol en `admin_users` después del login
- Redirección basada en rol (admin vs barbero)
- Queries filtradas por `barbero_id` para barberos

### 3. RLS (Row Level Security)
- **DESHABILITADO en `admin_users`** para evitar recursión infinita
- Seguridad implementada a nivel de aplicación (queries)
- Barberos: queries con `.eq('barbero_id', userId)`

### 4. Variables de Entorno Sensibles
```
NEXT_PUBLIC_SUPABASE_URL      # Público
NEXT_PUBLIC_SUPABASE_ANON_KEY # Público (limitado por RLS)
SUPABASE_SERVICE_ROLE_KEY     # Privado (solo backend)
```

## 🚀 Deployment

### Entorno de Desarrollo
```bash
npm run dev  # Puerto 3000
```

### Entorno de Producción
- **Plataforma**: Coolify (self-hosted)
- **Rama monitoreada**: `master`
- **Build**: Nixpacks (automático)
- **URL**: chamosbarber.com

### Pipeline de Deployment
```
git push origin master
     ↓
Coolify detecta cambios
     ↓
Build automático (Next.js)
     ↓
Deploy a producción
     ↓
URL actualizada
```

## 📊 Estadísticas y Métricas

El sistema incluye varios dashboards con estadísticas:

### Admin Dashboard
- Total de citas (todas)
- Citas pendientes, confirmadas, completadas, canceladas
- Filtros por estado y fecha
- Búsqueda por cliente/barbero

### Barbero Dashboard
- Total de citas propias
- Citas de hoy
- Citas pendientes
- Citas confirmadas
- Filtro por estado

## 🔧 Tecnologías Clave

| Categoría | Tecnología | Versión | Propósito |
|-----------|-----------|---------|-----------|
| Framework | Next.js | 14.0.4 | SSR, Routing, Building |
| UI | React | 18 | Components, State |
| Estilo | Tailwind CSS | 3.3 | Utility-first CSS |
| Base de Datos | PostgreSQL | 15 | Datos relacionales |
| Backend | Supabase | Self-hosted | Auth, DB, Storage |
| Hosting | Coolify | Latest | CI/CD, Deployment |
| Lenguaje | TypeScript | 5 | Type safety |

## 📱 Responsive Design

La aplicación está optimizada para:
- 📱 Mobile (320px - 768px)
- 📱 Tablet (768px - 1024px)
- 💻 Desktop (1024px+)

Puntos de quiebre (breakpoints) de Tailwind:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

## 🎨 Sistema de Diseño

### Paleta de Colores Principal
- **Primario**: Gradient amber/orange (#f59e0b → #ea580c)
- **Secundario**: Gris oscuro (#1f2937)
- **Acento**: Amber claro (#fbbf24)
- **Fondo**: Gris muy oscuro (#111827)
- **Texto**: Blanco/Gris claro

### Tipografía
- Font principal: System fonts (-apple-system, BlinkMacSystemFont, etc.)
- Tamaños: text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl, text-4xl

## 🔍 Logging y Debugging

### Logs Implementados
- Login flow: `console.log('🔍 Verificando acceso...')`
- Errores de auth: `console.error('❌ Error de autenticación:')`
- Queries exitosas: `console.log('✅ Citas cargadas:')`

### Debugging en Desarrollo
```javascript
// Verificar usuario actual
const { data: { user } } = await supabase.auth.getUser()
console.log('Usuario actual:', user)

// Verificar datos de tabla
const { data } = await supabase.from('tabla').select('*')
console.log('Datos:', data)
```

## 📝 Próximas Mejoras (No Implementadas)

1. **Notificaciones**
   - Email al cliente al reservar
   - SMS recordatorio 24h antes
   - Notificaciones push

2. **Sistema de Pagos**
   - Integración con Stripe/PayPal
   - Pagos al reservar
   - Historial de pagos

3. **Reportes Avanzados**
   - Ingresos por período
   - Barberos más solicitados
   - Servicios más populares
   - Exportación a PDF/Excel

4. **Vista de Calendario**
   - Calendario mensual
   - Drag & drop para reprogramar
   - Vista semanal para barberos

## 🐛 Problemas Conocidos Resueltos

1. ✅ **RLS Recursion**: Resuelto deshabilitando RLS en admin_users
2. ✅ **Login Redirect**: Corregido usando user.id en lugar de email
3. ✅ **Build Path Error**: Corregido path de imports en CitasTab.tsx
4. ✅ **Seguridad Citas**: Implementado filtrado por barbero_id en queries

## 📚 Referencias Adicionales

- [Database Schema](./DATABASE.md)
- [Auth System Details](./AUTH_SYSTEM.md)
- [Deployment Guide](../deployment/COOLIFY_DEPLOY.md)
- [Troubleshooting](../deployment/TROUBLESHOOTING.md)
