# 💈 Chamos Barber - Sistema de Gestión Integral (Uso Personal)

Este documento contiene el resumen detallado del funcionamiento y las características técnicas del sistema de **Chamos Barber**.

---

## 🎯 Visión General

**Chamos Barber** es una plataforma de gestión integral que conecta a clientes, barberos y administradores. Está diseñada para ser robusta, segura y altamente eficiente, utilizando un stack tecnológico moderno y auto-alojado.

---

## 🚀 Características Principales

### 💎 Experiencia del Cliente
- **Reservas Inteligentes:** Consulta de disponibilidad y agendamiento en tiempo real.
- **Consultas Públicas:** Ver horarios disponibles sin login previo.
- **Panel de Usuario:** Historial de citas y gestión de perfil.
- **Diseño Premium:** Interfaz oscura unificada con estilo elegante (Dorado/Negro).

### ✂️ Panel para Barberos
- **Agenda Diaria:** Vista rápida de citas con estadísticas de rendimiento.
- **Gestión de Perfil:** Control de biografía, especialidades y foto de perfil (Storage).
- **Acciones Rápidas:** Cambio de estado de citas (Completada, Cancelada, etc.) desde el móvil.

### 🛠️ Administración Centralizada
- **Dashboard en Tiempo Real:** Dashboard con métricas clave de la barbería.
- **Gestión de Recursos:** Control total sobre Barberos, Servicios y Horarios.
- **Control de Citas:** Gestión global de la agenda y filtros avanzados.

---

## 🛠️ Stack Tecnológico

- **Frontend:** [Next.js](https://nextjs.org/) (React) + TypeScript.
- **Backend/DB:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage).
- **Estilos:** Vanilla CSS con variables CSS dinámicas para el tema DARK.
- **Automatización:** [n8n](https://n8n.io/) para flujos de trabajo internos.
- **Monitoreo:** [Uptime Kuma](https://github.com/louislam/uptime-kuma) y [Beszel](https://beszel.dev/).
- **Servidor:** VPS administrado mediante **Coolify**.

---

## 🛡️ Seguridad y Arquitectura

- **v1.6.0 (Seguridad Reforzada):** Implementación estricta de validación de roles.
- **Row-Level Security (RLS):** Protección de datos a nivel de base de datos.
- **Privacy First:** Gestión propia de datos sin intermediarios externos.
- **Dominios HTTPS:** Toda la infraestructura está protegida por certificados SSL SSL/TLS automáticos.

---

## 📂 Organización del Proyecto (Local)

- `/src`: Código fuente de la aplicación (React/Next).
- `/supabase`: Políticas de seguridad y estructura de base de datos.
- `/scripts`: Scripts técnicos de prueba y automatización.
- `/docs`: Documentación detallada de cada módulo.

---
**Documento generado para uso personal - 2025**
