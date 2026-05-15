# 🔑 Credenciales del Sistema - Chamos Barber

**Fecha de Actualización:** 2025-12-15  
**Proyecto:** Chamos Barber App

---

## 👑 ADMINISTRADOR PRINCIPAL

### **Cuenta Admin**
- **Email:** `contacto@chamosbarber.com`
- **UUID en Supabase Auth:** `4ce7e112-12a7-4909-b922-59fa1fdafc0b`
- **Contraseña:** *(La que configuraste originalmente)*
- **Panel de Acceso:** `https://chamosbarber.com/admin`
- **Permisos:** Acceso completo a todos los paneles (Admin, POS, Liquidaciones)

### **Funciones Disponibles:**
- ✅ Gestión de barberos (crear, editar, eliminar, reset password)
- ✅ Gestión de servicios y categorías
- ✅ Gestión de horarios
- ✅ Aprobación de solicitudes de barberos
- ✅ Ver y gestionar citas
- ✅ Gestión de clientes
- ✅ Sistema de comisiones
- ✅ Reportes de ganancias
- ✅ Acceso al POS (Punto de Venta)
- ✅ Sistema de liquidaciones (admin)

---

## 💈 BARBEROS ACTIVOS

### **1. Carlos Pérez**
- **Email:** `carlos@chamosbarber.com`
- **Contraseña:** `ChamosBarbero2024!` *(temporal - se recomienda cambiar)*
- **Barbero ID:** `ddee5407-2b69-4275-96c4-09e9203783b5`
- **Panel de Acceso:** `https://chamosbarber.com/barbero-panel`
- **Estado:** ✅ Cuenta activa

**Funciones Disponibles:**
- ✅ Ver y gestionar sus citas
- ✅ Ver sus ganancias y comisiones
- ✅ Editar su perfil (descripción, foto, Instagram, teléfono)
- ✅ Cambiar su contraseña (Pestaña Seguridad)
- ✅ Ver sus liquidaciones

---

### **2. Luis González**
- **Email:** `luis@chamosbarber.com`
- **Contraseña:** `ChamosBarbero2024!` *(temporal - se recomienda cambiar)*
- **Barbero ID:** `82b2218c-e6ef-4440-bb3b-4dc4d7afe864`
- **Panel de Acceso:** `https://chamosbarber.com/barbero-panel`
- **Estado:** ✅ Cuenta activa

**Funciones Disponibles:**
- ✅ Ver y gestionar sus citas
- ✅ Ver sus ganancias y comisiones
- ✅ Editar su perfil (descripción, foto, Instagram, teléfono)
- ✅ Cambiar su contraseña (Pestaña Seguridad)
- ✅ Ver sus liquidaciones

---

### **3. Miguel Rodríguez**
- **Email:** `miguel@chamosbarber.com`
- **Contraseña:** `ChamosBarbero2024!` *(temporal - se recomienda cambiar)*
- **Barbero ID:** `28fdc033-f8a0-4cf7-8ec7-4952fc98d27e`
- **Panel de Acceso:** `https://chamosbarber.com/barbero-panel`
- **Estado:** ✅ Cuenta activa

**Funciones Disponibles:**
- ✅ Ver y gestionar sus citas
- ✅ Ver sus ganancias y comisiones
- ✅ Editar su perfil (descripción, foto, Instagram, teléfono)
- ✅ Cambiar su contraseña (Pestaña Seguridad)
- ✅ Ver sus liquidaciones

---

## 🔐 RECUPERACIÓN DE CONTRASEÑAS

### **Si olvidaste la contraseña del Admin:**

**Opción 1: Supabase Dashboard (Recomendado)**
1. Ve a `https://supabase.com/dashboard`
2. Selecciona tu proyecto Chamos Barber
3. Ve a **Authentication** → **Users**
4. Busca `contacto@chamosbarber.com`
5. Clic en (...) → **"Send Password Recovery"**
6. Revisa tu email para el link de recuperación

**Opción 2: Cambiar Contraseña Directamente**
1. Ve a **Authentication** → **Users**
2. Busca `contacto@chamosbarber.com`
3. Clic en (...) → **"Reset Password"**
4. Ingresa una nueva contraseña directamente

### **Para Resetear Contraseña de Barberos:**

**Como Admin:**
1. Login en `https://chamosbarber.com/admin`
2. Ve a la pestaña **"Barberos"**
3. Encuentra al barbero
4. Clic en el botón **🔑 "Reset Password"**
5. Se generará una nueva contraseña aleatoria
6. Copia la contraseña y compártela con el barbero

**Como Barbero (Cambiar tu propia contraseña):**
1. Login en `https://chamosbarber.com/login`
2. Ve al **Panel de Barbero**
3. Pestaña **"Seguridad"**
4. Ingresa contraseña actual: `ChamosBarbero2024!`
5. Ingresa nueva contraseña (mínimo 6 caracteres)
6. Clic en **"Cambiar Contraseña"**

---

## ✅ VERIFICACIÓN DE CUENTAS

### **SQL para Verificar Admin:**
```sql
SELECT 
  au.id,
  au.email,
  au.nombre,
  au.rol,
  au.activo,
  CASE 
    WHEN au.activo THEN 'Cuenta activa ✅'
    ELSE 'Cuenta inactiva ❌'
  END as estado
FROM admin_users au
WHERE au.email = 'contacto@chamosbarber.com';
```

### **SQL para Verificar Todos los Barberos:**
```sql
SELECT 
  b.nombre || ' ' || b.apellido as barbero,
  b.email,
  au.rol,
  CASE 
    WHEN au.activo THEN 'Cuenta activa ✅'
    ELSE 'Cuenta inactiva ❌'
  END as estado
FROM barberos b
INNER JOIN admin_users au ON au.barbero_id = b.id
WHERE b.email IN (
  'carlos@chamosbarber.com',
  'luis@chamosbarber.com',
  'miguel@chamosbarber.com'
)
ORDER BY b.nombre;
```

---

## 🚀 ACCESOS RÁPIDOS

| Rol | Usuario | Panel |
|-----|---------|-------|
| Admin | `contacto@chamosbarber.com` | `https://chamosbarber.com/admin` |
| Admin | `contacto@chamosbarber.com` | `https://chamosbarber.com/pos` |
| Admin | `contacto@chamosbarber.com` | `https://chamosbarber.com/admin/liquidaciones` |
| Barbero | `carlos@chamosbarber.com` | `https://chamosbarber.com/barbero-panel` |
| Barbero | `carlos@chamosbarber.com` | `https://chamosbarber.com/barbero/liquidaciones` |
| Barbero | `luis@chamosbarber.com` | `https://chamosbarber.com/barbero-panel` |
| Barbero | `luis@chamosbarber.com` | `https://chamosbarber.com/barbero/liquidaciones` |
| Barbero | `miguel@chamosbarber.com` | `https://chamosbarber.com/barbero-panel` |
| Barbero | `miguel@chamosbarber.com` | `https://chamosbarber.com/barbero/liquidaciones` |

---

## 📝 RECOMENDACIONES DE SEGURIDAD

1. **Cambiar Contraseñas Temporales:**
   - Todos los barberos deben cambiar `ChamosBarbero2024!` por una contraseña personal

2. **Contraseñas Seguras:**
   - Mínimo 8 caracteres
   - Mezcla de mayúsculas, minúsculas, números y símbolos
   - No usar información personal obvia

3. **No Compartir Credenciales:**
   - Cada usuario debe tener sus propias credenciales
   - No compartir contraseñas por email o mensajes no seguros

4. **Revisar Accesos Regularmente:**
   - Verificar usuarios activos en Supabase Dashboard
   - Desactivar cuentas de barberos que ya no trabajen en el negocio

5. **Backup de Credenciales:**
   - Mantén este documento en un lugar seguro
   - Considera usar un gestor de contraseñas profesional

---

## 🆘 SOPORTE

Si tienes problemas con las credenciales o accesos:

1. **Verifica en Supabase Dashboard:**
   - `https://supabase.com/dashboard`
   - Authentication → Users

2. **Ejecuta los scripts SQL de verificación** (arriba)

3. **Usa la función de Reset Password** desde el panel de Admin

4. **Revisa los logs del servidor** en Coolify si hay errores de autenticación

---

**Última Actualización:** 2025-12-15  
**Proyecto:** Chamos Barber App  
**Versión:** 1.0
