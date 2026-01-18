# 💈 Chamos Barber - Sistema de Gestión Integral

Este repositorio contiene el ecosistema completo de **Chamos Barber**, una solución de software de vanguardia diseñada específicamente para transformar la gestión y operación de barberías profesionales. El sistema combina una experiencia de usuario premium con una arquitectura técnica robusta y segura.

---

## 🎯 Visión General

**Chamos Barber** no es solo un sistema de reservas; es una plataforma de gestión empresarial que conecta a clientes, barberos y administradores en un entorno unificado. Desarrollado con tecnologías modernas y auto-alojado para un control total de los datos.

---

## 🚀 Características Principales

### 💎 Experiencia del Cliente
- **Reservas 24/7:** Sistema inteligente de consulta y agendamiento con validación de disponibilidad en tiempo real.
- **Consultas Públicas:** Capacidad de ver horarios disponibles sin necesidad de registro previo.
- **Panel Personalizado:** Historial de citas y gestión de perfil personal.
- **Interfaz Premium:** Diseño unificado en **Modo Oscuro** con acentos dorados, optimizado para una navegación fluida.

### ✂️ Herramientas para Barberos
- **Agenda Personalizada:** Vista detallada de su día a día con estadísticas de ganancias y rendimiento.
- **Gestión de Perfil:** Control sobre su biografía, especialidades y foto de perfil (integrado con Supabase Storage).
- **Control de Estado:** Capacidad para marcar citas como completadas, confirmadas o canceladas directamente desde el panel móvil.

### 🛠️ Centro de Control (Admin)
- **Dashboard de Métricas:** Visualización en tiempo real del rendimiento de la barbería.
- **Gestión de Personal:** CRUD completo de barberos, incluyendo configuración de horarios individuales.
- **Catálogo de Servicios:** Gestión flexible de precios, duraciones y categorías.
- **Auditoría de Citas:** Visibilidad total de todas las transacciones y movimientos de la agenda.

---

## 🛠️ Stack Tecnológico

El sistema utiliza lo último en desarrollo web y gestión de servidores:

- **Frontend:** [Next.js](https://nextjs.org/) (React) con TypeScript para una aplicación rápida y escalable.
- **Backend & DB:** [Supabase](https://supabase.com/) (PostgreSQL) para auth, base de datos y almacenamiento de archivos.
- **Estilos:** CSS Vanilla con variables dinámicas para el tema DARK.
- **Automatización:** [n8n](https://n8n.io/) para flujos de trabajo inteligentes.
- **Comunicación:** [Chatwoot](https://www.chatwoot.com/) + WhatsApp para soporte y notificaciones.

---

## 🛡️ Seguridad y Arquitectura

La seguridad es el pilar central de la **v1.6.0**:
- **Row-Level Security (RLS):** Cada fila de la base de datos está protegida a nivel de motor, asegurando que los usuarios solo vean lo que les corresponde.
- **Validación de Roles:** Sistema estricto que impide accesos no autorizados a paneles administrativos.
- **Infraestructura Privada:** Desplegado en un VPS propio mediante **Coolify**, garantizando privacidad y soberanía de los datos.
- **Certificados SSL:** HTTPS habilitado en todos los subdominios (App, API, Paneles).

---

## 📈 Monitoreo y Salud del Sistema

Implementamos monitoreo de grado profesional para garantizar el 99.9% de disponibilidad:
- **Uptime Kuma:** Vigilancia constante de la disponibilidad web y latencia de respuesta.
- **Beszel:** Monitoreo detallado de los recursos del servidor (CPU, RAM, Disco) y salud de los contenedores Docker.
- **Sentinel:** Integración nativa con Coolify para métricas de rendimiento interno.

---

## 📱 Notificaciones Inteligentes

El sistema mantiene a todos informados automáticamente:
- **Confirmación WhatsApp:** Notificación instantánea al realizar una reserva.
- **Recordatorios:** Flujos automáticos para reducir el ausentismo (No-Show).
- **Alertas de Sistema:** Notificaciones a administración en caso de saturación o caídas de servicios críticos.

---

## 📂 Organización del Proyecto

El proyecto sigue una estructura limpia y documentada:
- `/src`: Lógica de la aplicación y componentes UI.
- `/supabase`: Scripts de base de datos y políticas de seguridad.
- `/scripts`: Herramientas de utilidad y pruebas de API.
- `/docs`: Documentación técnica exhaustiva para mantenimiento.

---
**Desarrollado con ❤️ para Chamos Barber - 2025**
