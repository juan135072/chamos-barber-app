# 🧪 Guía de Testing - Chamos Barber App

## 📋 Resumen Rápido

Esta guía te ayudará a preparar la aplicación con datos de prueba para testing completo.

---

## 🎯 Datos de Prueba Incluidos

### 👥 Usuarios (3)
| Rol | Email | Password |
|-----|-------|----------|
| **Admin** | admin@chamosbarber.com | Admin123456! |
| **Barbero** | carlos@chamosbarber.com | Carlos123456! |
| **Cliente** | cliente@test.com | Cliente123456! |

### ✂️ Servicios (6)

#### Cortes
- **Corte Clásico** - $8.000 (30 min)
- **Fade Moderno** - $12.000 (45 min)

#### Barba
- **Arreglo de Barba** - $6.000 (20 min)
- **Barba Premium** - $10.000 (35 min)

#### Tratamientos
- **Tratamiento Capilar** - $15.000 (40 min)
- **Limpieza Facial** - $18.000 (50 min)

### 💈 Barberos (2)

**Carlos Pérez**
- Experiencia: 8 años
- Especialidad: Cortes clásicos y modernos
- Instagram: @carlos_barber_chile
- Calificación: 4.8⭐

**Miguel Rodríguez**
- Experiencia: 3 años
- Especialidad: Barba y tratamientos
- Instagram: @miguel_barbershop
- Calificación: 4.5⭐

### 🕐 Horarios
- **Días:** Lunes a Sábado
- **Horario:** 9:00 AM - 7:00 PM
- **Ambos barberos** tienen el mismo horario

### 📅 Citas de Ejemplo (2)
1. **Mañana 10:00 AM** - Juan Pérez con Carlos (Fade Moderno) - ✅ Confirmada
2. **Pasado mañana 3:00 PM** - Pedro González con Miguel (Barba Premium) - ⏳ Pendiente

---

## 🚀 Instalación Rápida (3 pasos)

### Paso 1: Ejecutar SQL en Supabase

1. Abre **Supabase Dashboard**
2. Ve a **SQL Editor**
3. Copia y pega el contenido de: **`DATOS_PRUEBA_TESTING.sql`**
4. Haz clic en **"Run"**

### Paso 2: Crear Usuarios en Authentication

1. Ve a **Authentication → Users**
2. Crea 3 usuarios (ver tabla arriba)
3. Copia los UUIDs y ejecuta SQL adicional para Admin y Barbero

### Paso 3: ¡Listo para Testear!

Accede a: **https://chamosbarber.com**

---

## 🧪 Escenarios de Testing

### Como Cliente (cliente@test.com)

✅ **Flujo de Reserva Completa:**
1. Entrar a la web
2. Ver catálogo de servicios
3. Seleccionar servicio
4. Elegir barbero
5. Seleccionar fecha/hora
6. Completar formulario
7. Confirmar reserva
8. Recibir notificación

### Como Barbero (carlos@chamosbarber.com)

✅ **Dashboard de Barbero:**
1. Login
2. Ver agenda del día
3. Ver citas próximas
4. Marcar cita como completada
5. Ver historial
6. Actualizar disponibilidad

### Como Admin (admin@chamosbarber.com)

✅ **Panel de Administración:**
1. Login
2. Gestionar barberos (crear/editar/desactivar)
3. Gestionar servicios (crear/editar precios)
4. Ver todas las citas
5. Gestionar categorías
6. Ver estadísticas

---

## 📊 Testing por Funcionalidad

### ✅ Gestión de Citas

- [ ] Cliente puede ver horarios disponibles
- [ ] Cliente puede reservar cita
- [ ] Barbero ve sus citas asignadas
- [ ] Barbero puede confirmar/cancelar citas
- [ ] Admin ve todas las citas del sistema
- [ ] Notificaciones funcionan correctamente
- [ ] No se permiten reservas duplicadas

### ✅ Gestión de Servicios

- [ ] Servicios se muestran por categoría
- [ ] Precios se muestran correctamente
- [ ] Duración se refleja en calendario
- [ ] Imágenes de servicios cargan
- [ ] Admin puede crear nuevos servicios
- [ ] Admin puede editar precios

### ✅ Gestión de Barberos

- [ ] Perfil de barbero se muestra completo
- [ ] Horarios de barbero se respetan en reservas
- [ ] Portfolio de barbero visible
- [ ] Calificaciones se muestran
- [ ] Instagram link funciona
- [ ] Admin puede gestionar barberos

### ✅ Autenticación y Seguridad

- [ ] Login funciona para 3 roles
- [ ] Roles tienen accesos diferenciados
- [ ] Usuario no puede acceder a rutas no autorizadas
- [ ] Logout funciona correctamente
- [ ] Sesión persiste en recargas
- [ ] Rate limiting funciona en APIs

---

## 🐛 Checklist de Bugs Comunes

### Frontend
- [ ] Imágenes cargan correctamente
- [ ] Responsive en móvil/tablet/desktop
- [ ] Formularios validan correctamente
- [ ] Mensajes de error son claros
- [ ] Loading states funcionan
- [ ] Fechas se muestran en formato correcto

### Backend
- [ ] APIs responden en <2 segundos
- [ ] Errores 500 no ocurren
- [ ] Validación de inputs funciona
- [ ] RLS policies funcionan correctamente
- [ ] Transacciones atómicas
- [ ] Logs de seguridad se generan

### UX/UI
- [ ] Navegación es intuitiva
- [ ] Colores y tipografía consistentes
- [ ] Botones tienen hover states
- [ ] Transiciones son suaves
- [ ] Feedback visual en acciones
- [ ] Accesibilidad (ARIA labels)

---

## 📞 URLs de Testing

| Página | URL | Testing |
|--------|-----|---------|
| **Home** | `/` | Ver servicios, hero, equipo |
| **Servicios** | `/servicios` | Ver catálogo completo |
| **Equipo** | `/equipo` | Ver barberos |
| **Reservar** | `/reservar` | Flujo completo de reserva |
| **Login Admin** | `/admin/login` | Acceso admin |
| **Dashboard Barbero** | `/barbero/dashboard` | Panel barbero |
| **Admin Panel** | `/admin` | Gestión completa |

---

## 🆘 Solución de Problemas

### "No puedo hacer login"
- Verifica que el usuario existe en Supabase Auth
- Confirma la contraseña (distingue mayúsculas)
- Revisa que `NEXTAUTH_SECRET` esté configurado

### "No veo los servicios"
- Verifica que el SQL se ejecutó correctamente
- Revisa tabla `servicios` en Supabase
- Confirma que `activo = true`

### "Barbero no aparece"
- Verifica tabla `barberos`
- Confirma que `activo = true`
- Revisa que tenga horarios configurados

### "No puedo reservar"
- Verifica que el barbero tenga horarios
- Confirma que la fecha es futura
- Revisa RLS policies de `citas`
- Verifica rate limiting no está bloqueando

---

## 📈 Métricas de Testing

### Performance
- ⏱️ **Tiempo de carga inicial:** < 3 segundos
- ⏱️ **Tiempo de respuesta API:** < 2 segundos
- ⏱️ **First Contentful Paint:** < 1.5 segundos

### Funcionalidad
- ✅ **Tasa de éxito de reservas:** > 95%
- ✅ **Errores en producción:** 0 críticos
- ✅ **Cobertura de testing:** > 80%

---

## 🎉 ¡Testing Completo!

Cuando hayas validado todos los checkboxes, la aplicación está lista para:

- ✅ **Producción**
- ✅ **Demo a clientes**
- ✅ **Onboarding de usuarios reales**

---

## 📚 Documentación Adicional

- **Audit de Seguridad:** `SECURITY_AUDIT_COMPREHENSIVE_REPORT.md`
- **Implementación de Seguridad:** `SECURITY_IMPLEMENTATION.md`
- **SQL de Datos:** `DATOS_PRUEBA_TESTING.sql`
- **Instrucciones Detalladas:** `INSTRUCCIONES_DATOS_PRUEBA.md`

---

**¿Encontraste un bug? ¿Tienes sugerencias?**  
Repórtalo con detalles: URL, acción realizada, error esperado vs obtenido.

**¡Feliz testing! 🚀**
