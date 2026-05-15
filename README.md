# 🇻🇪💈 Chamos Barber - Sistema de Reservas

Sistema completo de gestión de citas y reservas para barbería, desarrollado con Next.js 14 y Supabase.

## 🎯 Descripción

Chamos Barber es una aplicación web moderna que permite:
- ✂️ **Reservar citas online** - Los clientes pueden agendar fácilmente
- 👨‍💼 **Panel de administración** - Gestión completa del negocio
- 💈 **Panel de barberos** - Cada barbero ve sus propias citas
- 📊 **Estadísticas en tiempo real** - Métricas del negocio
- 🎨 **Portfolio de trabajos** - Galería de cortes realizados

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 14.0.4 (Pages Router)
- **Backend**: Supabase (Self-hosted en VPS)
- **Base de Datos**: PostgreSQL 15
- **Autenticación**: Supabase Auth con JWT
- **Estilos**: CSS personalizado con diseño responsive
- **Deploy**: Coolify en VPS propio

## 📁 Estructura del Proyecto

```
chamos-barber-app/
├── docs/                          # 📚 Documentación organizada
│   ├── archive/                   # Historial de cambios y reportes antiguos
│   ├── guides/                    # Guías de desarrollo y administración
│   ├── architecture/              # Arquitectura del sistema
│   ├── deployment/                # Guías de despliegue (Coolify/VPS)
│   └── testing/                   # Guías de pruebas y calidad
├── database/                      # 🗄️ Scripts de base de datos
│   └── scripts/                   # Migraciones y utilidades SQL
├── src/                           # 💻 Código fuente (Next.js)
│   ├── components/                # Componentes React (Admin, POS, Barberos)
│   ├── pages/                     # Rutas y API Endpoints
│   ├── lib/                       # Utilidades y configuración de Supabase
│   └── styles/                    # Estilos globales y módulos CSS
├── public/                        # 📄 Archivos estáticos y activos
├── printer-service/               # 🖨️ Microservicio local para impresión térmica
└── scripts/                       # 🛠️ Scripts de automatización y setup

```

## 🔑 Características Principales

### Para Clientes
- 🗓️ Sistema de reservas online intuitivo
- 📱 Diseño responsive (móvil, tablet, desktop)
- ✉️ Confirmación por email
- 🔍 Consulta de estado de citas

### Para Barberos
- 📊 Panel personalizado con sus citas
- ✂️ Vista de trabajos del día
- 🎨 Gestión de portfolio personal
- ✅ Actualización de estados de citas

### Para Administradores
- 👥 Gestión completa de barberos
- 📅 Vista de todas las citas del sistema
- 💼 CRUD de servicios y horarios
- 📈 Estadísticas del negocio
- ⚙️ Configuración del sistema

## 📚 Documentación

### Para Empezar
- [Instalación y Setup](docs/guides/SETUP.md)
- [Variables de Entorno](docs/guides/ENV_VARIABLES.md)
- [Base de Datos](docs/architecture/DATABASE.md)

### Desarrollo
- [Arquitectura del Sistema](docs/architecture/SYSTEM_OVERVIEW.md)
- [Sistema de Autenticación](docs/architecture/AUTH_SYSTEM.md)
- [Gestión de Citas](docs/features/CITAS_SYSTEM.md)
- [Sistema de Roles](docs/features/ROLES_SYSTEM.md)

### Deployment
- [Deploy con Coolify](docs/deployment/COOLIFY_DEPLOY.md)
- [Troubleshooting](docs/deployment/TROUBLESHOOTING.md)

## 🛠️ Instalación Rápida

```bash
# Clonar repositorio
git clone https://github.com/juan135072/chamos-barber-app.git
cd chamos-barber-app

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build
npm run start
```

## 🔐 Credenciales de Acceso

### Panel de Administración
```
Email: juan@chamosbarber.com
Password: (Configurada por el administrador)
```

### Panel de Barberos (Ejemplo)
```
Email: barbero@chamosbarber.com
Password: (Configurada en el registro)
```

## 🌐 URLs del Proyecto

- **Producción**: [https://chamosbarber-antigravity-3112.coolify.tg-cl.cl](https://chamosbarber-antigravity-3112.coolify.tg-cl.cl)
- **Panel Admin**: [https://chamosbarber-antigravity-3112.coolify.tg-cl.cl/admin](https://chamosbarber-antigravity-3112.coolify.tg-cl.cl/admin)
- **Panel Barbero**: [https://chamosbarber-antigravity-3112.coolify.tg-cl.cl/barbero-panel](https://chamosbarber-antigravity-3112.coolify.tg-cl.cl/barbero-panel)
- **API/Supabase**: Directo a través de la configuración de cliente

## 📝 Estado del Proyecto

### ✅ Completado
- [x] Sistema de autenticación multi-rol
- [x] Panel de administración completo
- [x] Panel de barberos y gestión de citas
- [x] Sistema de reservas online e IA (Gustavo)
- [x] Microservicio de impresión térmica v7.0 PRO EX
- [x] Organización profesional del repositorio (2026-01-22)
- [x] Deploy automático con Coolify desde rama `main`

### 🚀 Último Deploy Exitoso

**Fecha**: 2026-01-22 10:16:00  
**Commit**: [`641e988`](https://github.com/juan135072/chamos-barber-app/commit/641e988)  
**Estado**: ✅ **EXITOSO** - En producción  
**Rama**: `main`

## 🤝 Contribución

Para contribuir al proyecto:

1. Lee la [Guía de Contribución](CONTRIBUTING.md)
2. Crea una rama descriptiva
3. Haz tus cambios y verifica con `npm run build`
4. Crea un Pull Request a `main`

## 🎖️ Créditos

Desarrollado con ❤️ por **Juan Díaz** y venezolanos en Chile 🇻🇪🇨🇱

---

**Última actualización**: 2026-01-22  
**Versión**: 1.2.1 (Seguridad)  
**Deploy Status**: 🚀 En Producción (rama `main`)
