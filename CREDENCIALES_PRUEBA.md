# 🔑 CREDENCIALES DE PRUEBA - Chamos Barber

## 📋 Información General

Todas las cuentas están confirmadas y listas para usar.  
Puedes cambiar las contraseñas después del primer login.

---

## 👨‍💼 ADMINISTRADOR PRINCIPAL

### Acceso Admin
```
URL: https://chamosbarber.com/admin
     o
     https://chamosbarber.com/login

Email: admin@chamosbarber.com
Password: ChamosAdmin2024!
Rol: administrador
```

**Permisos:**
- ✅ Acceso completo al panel de administración
- ✅ Gestión de todos los barberos
- ✅ Gestión de todos los servicios
- ✅ Ver todas las citas del sistema
- ✅ Configuración general del sitio
- ✅ Gestión de usuarios admin
- ✅ Estadísticas completas

---

## 💈 BARBEROS (Panel Individual)

Todos los barberos tienen acceso a su panel personalizado en:
```
URL: https://chamosbarber.com/barbero-panel
     o
     https://chamosbarber.com/login
```

### 1. Carlos Ramírez

```
Email: carlos@chamosbarber.com
Password: Temporal123!
Rol: barbero
```

**Información del Barbero:**
- **Nombre Completo:** Carlos Ramírez
- **Apodo:** El Chamo
- **Especialidades:** Cortes clásicos, Fades modernos
- **Experiencia:** 8 años
- **Barbero ID (UUID):** 0d268607-78fa-49b6-9efe-2ab78735be83

**Permisos en su panel:**
- ✅ Ver solo sus propias citas
- ✅ Actualizar estado de sus citas
- ✅ Ver su perfil personal
- ✅ Gestionar su portfolio de trabajos
- ❌ No puede ver citas de otros barberos
- ❌ No tiene acceso al panel de admin

---

### 2. Miguel Torres

```
Email: miguel@chamosbarber.com
Password: Temporal123!
Rol: barbero
```

**Información del Barbero:**
- **Nombre Completo:** Miguel Torres
- **Apodo:** Migue
- **Especialidades:** Barba y bigote, Afeitado clásico
- **Experiencia:** 6 años
- **Barbero ID (UUID):** [Consultar en BD si necesario]

**Permisos en su panel:**
- ✅ Ver solo sus propias citas
- ✅ Actualizar estado de sus citas
- ✅ Ver su perfil personal
- ✅ Gestionar su portfolio de trabajos

---

### 3. Luis Mendoza

```
Email: luis@chamosbarber.com
Password: Temporal123!
Rol: barbero
```

**Información del Barbero:**
- **Nombre Completo:** Luis Mendoza
- **Apodo:** Lucho
- **Especialidades:** Cortes modernos, Diseños creativos
- **Experiencia:** 5 años
- **Barbero ID (UUID):** [Consultar en BD si necesario]

**Permisos en su panel:**
- ✅ Ver solo sus propias citas
- ✅ Actualizar estado de sus citas
- ✅ Ver su perfil personal
- ✅ Gestionar su portfolio de trabajos

---

### 4. Jorge Silva

```
Email: jorge@chamosbarber.com
Password: Temporal123!
Rol: barbero
```

**Información del Barbero:**
- **Nombre Completo:** Jorge Silva
- **Apodo:** Jorgito
- **Especialidades:** Cortes infantiles, Estilos casuales
- **Experiencia:** 4 años
- **Barbero ID (UUID):** [Consultar en BD si necesario]

**Permisos en su panel:**
- ✅ Ver solo sus propias citas
- ✅ Actualizar estado de sus citas
- ✅ Ver su perfil personal
- ✅ Gestionar su portfolio de trabajos

---

## 🔐 ACCESO A SUPABASE (Administración BD)

### Supabase Studio
```
URL: https://supabase.chamosbarber.com/
Email: [Email del propietario de la cuenta Supabase]
Password: [Ver en .env.local - SUPABASE_STUDIO_PASSWORD]
```

**Funciones:**
- ✅ Acceso a la base de datos PostgreSQL
- ✅ SQL Editor para ejecutar queries
- ✅ Gestión de usuarios de autenticación
- ✅ Configuración de políticas RLS
- ✅ Gestión de tablas y datos

---

## 🧪 PRUEBAS RECOMENDADAS

### Test 1: Login Admin
1. Ve a: https://chamosbarber.com/login
2. Email: `admin@chamosbarber.com`
3. Password: `ChamosAdmin2024!`
4. ✅ Deberías ver el panel completo de administración

### Test 2: Login Barbero (Carlos)
1. Ve a: https://chamosbarber.com/login
2. Email: `carlos@chamosbarber.com`
3. Password: `Temporal123!`
4. ✅ Deberías ver solo el panel de barbero con sus citas

### Test 3: Login Barbero (Miguel)
1. Ve a: https://chamosbarber.com/login
2. Email: `miguel@chamosbarber.com`
3. Password: `Temporal123!`
4. ✅ Deberías ver solo el panel de barbero con sus citas

### Test 4: Login Barbero (Luis)
1. Ve a: https://chamosbarber.com/login
2. Email: `luis@chamosbarber.com`
3. Password: `Temporal123!`
4. ✅ Deberías ver solo el panel de barbero con sus citas

### Test 5: Login Barbero (Jorge)
1. Ve a: https://chamosbarber.com/login
2. Email: `jorge@chamosbarber.com`
3. Password: `Temporal123!`
4. ✅ Deberías ver solo el panel de barbero con sus citas

---

## 🔍 VERIFICACIÓN DE ROLES

### En el Panel Admin:
```
admin@chamosbarber.com → Panel de Administración Completo
```

### En el Panel de Barberos:
```
carlos@chamosbarber.com → Panel de Barbero (solo sus citas)
miguel@chamosbarber.com → Panel de Barbero (solo sus citas)
luis@chamosbarber.com → Panel de Barbero (solo sus citas)
jorge@chamosbarber.com → Panel de Barbero (solo sus citas)
```

---

## 🔄 CAMBIAR CONTRASEÑAS

### Desde la Aplicación:
1. Ir a configuración del perfil
2. Opción "Cambiar contraseña"
3. Ingresar contraseña actual
4. Ingresar nueva contraseña

### Desde Supabase Studio:
1. Ir a: Authentication → Users
2. Buscar el usuario
3. Click en los 3 puntos (⋮)
4. "Reset Password"
5. Ingresar nueva contraseña

---

## 📊 VERIFICAR ASOCIACIONES EN BASE DE DATOS

### Query SQL para verificar asociaciones:

```sql
-- Ver todos los usuarios admin con su información
SELECT 
  au.id,
  au.email,
  au.nombre,
  au.rol,
  au.barbero_id,
  b.nombre as nombre_barbero,
  b.apellido as apellido_barbero,
  au.activo,
  au.created_at
FROM admin_users au
LEFT JOIN barberos b ON au.barbero_id = b.id
ORDER BY au.rol, au.nombre;
```

**Resultado esperado:**
| email | nombre | rol | barbero_id | nombre_barbero |
|-------|--------|-----|------------|----------------|
| admin@chamosbarber.com | Administrador | administrador | null | null |
| carlos@chamosbarber.com | Carlos Ramírez | barbero | [UUID] | Carlos |
| miguel@chamosbarber.com | Miguel Torres | barbero | [UUID] | Miguel |
| luis@chamosbarber.com | Luis Mendoza | barbero | [UUID] | Luis |
| jorge@chamosbarber.com | Jorge Silva | barbero | [UUID] | Jorge |

---

## 🆘 TROUBLESHOOTING

### "Credenciales incorrectas"
- ✅ Verifica que copiaste el email exactamente
- ✅ La contraseña es sensible a mayúsculas/minúsculas
- ✅ Verifica que el usuario está confirmado en Supabase

### "No puedo acceder al panel de admin"
- ✅ Verifica que estás usando `admin@chamosbarber.com`
- ✅ Verifica que el rol en la tabla `admin_users` es "administrador"

### "Barbero no ve sus citas"
- ✅ Verifica que el barbero tiene `barbero_id` asignado en `admin_users`
- ✅ Verifica que hay citas asociadas a ese barbero en la tabla `citas`
- ✅ Verifica políticas RLS en la tabla `citas`

### "Usuario no existe"
- ✅ Verifica en Supabase Studio → Authentication → Users
- ✅ Verifica que el usuario está confirmado (columna `confirmed_at`)
- ✅ Crea el usuario manualmente si es necesario

---

## 🔐 SEGURIDAD

### ⚠️ IMPORTANTE PARA PRODUCCIÓN:

1. **Cambiar todas las contraseñas por defecto**
2. **Usar contraseñas fuertes (mín. 12 caracteres)**
3. **Habilitar 2FA para el admin**
4. **No compartir credenciales por canales inseguros**
5. **Revisar logs de acceso periódicamente**

### Política de Contraseñas Recomendada:
```
✅ Mínimo 12 caracteres
✅ Al menos 1 mayúscula
✅ Al menos 1 minúscula
✅ Al menos 1 número
✅ Al menos 1 símbolo especial
```

---

## 📞 SOPORTE

Si tienes problemas con las credenciales:
1. Verifica este documento primero
2. Revisa la guía completa: `docs/GUIA-RAPIDA-SETUP.md`
3. Consulta la documentación de roles: `docs/architecture/AUTH_SYSTEM.md`

---

**Fecha de creación:** 2025-11-02  
**Última actualización:** 2025-11-02  
**Estado:** ✅ Todas las credenciales verificadas y funcionales
