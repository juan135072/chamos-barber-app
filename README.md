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
├── docs/                          # 📚 Documentación completa
│   ├── architecture/              # Arquitectura del sistema
│   ├── features/                  # Documentación de funcionalidades
│   ├── guides/                    # Guías de desarrollo
│   ├── api/                       # Documentación de APIs
│   └── deployment/                # Guías de deployment
├── src/
│   ├── components/                # Componentes React
│   │   ├── admin/                 # Componentes del admin
│   │   │   └── tabs/              # Tabs del panel admin
│   │   └── barbero/               # Componentes de barberos
│   ├── pages/                     # Páginas Next.js
│   │   ├── admin.tsx              # Panel de administración
│   │   ├── barbero-panel.tsx      # Panel de barberos
│   │   ├── login.tsx              # Login multi-rol
│   │   └── api/                   # API Routes
│   └── lib/                       # Utilidades y helpers
├── scripts/                       # Scripts de utilidad
│   ├── SQL/                       # Scripts SQL
│   └── setup/                     # Scripts de configuración
└── public/                        # Archivos estáticos

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

## 🔐 Credenciales de Prueba

### Admin Principal
```
Email: admin@chamosbarber.com
Password: ChamosAdmin2024!
```

### Barberos
```
Email: carlos@chamosbarber.com
Password: Temporal123!
```

## 🌐 URLs del Proyecto

- **Producción**: https://chamosbarber.com
- **Panel Admin**: https://chamosbarber.com/admin
- **Panel Barbero**: https://chamosbarber.com/barbero-panel
- **Supabase**: https://supabase.chamosbarber.com

## 📝 Estado del Proyecto

### ✅ Completado
- [x] Sistema de autenticación multi-rol
- [x] Panel de administración completo
- [x] Panel de barberos
- [x] Sistema de reservas
- [x] Gestión de citas (admin y barberos)
- [x] CRUD de barberos
- [x] CRUD de servicios
- [x] Portfolio de barberos
- [x] URLs amigables (slugs)
- [x] Sistema de roles y permisos
- [x] Row Level Security (RLS) configurado
- [x] Deploy automático con Coolify
- [x] **Documentación completa del proyecto** 🎉
- [x] **Deploy exitoso en producción** (2025-11-02)

### 🚧 En Desarrollo
- [ ] Notificaciones por email
- [ ] Sistema de pagos
- [ ] Vista de calendario
- [ ] Reportes avanzados

### 🚀 Último Deploy Exitoso

**Fecha**: 2025-11-02 17:39:15 UTC  
**Commit**: [`2d91c6f`](https://github.com/juan135072/chamos-barber-app/commit/2d91c6f4bebe8ed0388dad6ed8e35bbfd11b00a5)  
**Estado**: ✅ **EXITOSO** - En producción  
**Build Time**: 2 min 30 seg  
**Cambios**: Fix import path en CitasSection.tsx

Ver [historial completo de deployments](docs/deployment/COOLIFY_DEPLOY.md#-historial-de-deployments)

## 🤝 Contribución

Para contribuir al proyecto:

1. Lee la [Guía de Contribución](docs/guides/CONTRIBUTING.md)
2. Crea una rama desde `master`
3. Haz tus cambios
4. Crea un Pull Request

## 📞 Soporte

- **Issues**: https://github.com/juan135072/chamos-barber-app/issues
- **Email**: admin@chamosbarber.com

## 📄 Licencia

Este proyecto es privado y propietario.

## 🎖️ Créditos

Desarrollado con ❤️ por venezolanos en Chile 🇻🇪🇨🇱

---

**Última actualización**: 2025-11-02 17:39:15 UTC  
**Versión**: 1.0.1  
**Deploy Status**: 🚀 En Producción (commit `2d91c6f`)
