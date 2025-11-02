# 🔐 Credenciales de Prueba - Chamos Barber

## 📋 Índice
1. [Admin Principal](#admin-principal)
2. [Barberos](#barberos)
3. [Crear Nuevos Usuarios](#crear-nuevos-usuarios)
4. [Verificar Usuarios Existentes](#verificar-usuarios-existentes)

---

## 👨‍💼 Admin Principal

### Acceso Completo al Sistema

```
URL: https://chamosbarber.com/admin
Email: admin@chamosbarber.com
Password: ChamosAdmin2024!
```

**Permisos**:
- ✅ Ver todas las citas del sistema
- ✅ Gestionar barberos (crear, editar, eliminar)
- ✅ Gestionar servicios
- ✅ Gestionar horarios
- ✅ Ver estadísticas completas
- ✅ Configuración del sitio

---

## 💈 Barberos

### Barbero 1: Carlos Mendoza

```
URL: https://chamosbarber.com/barbero-panel
Email: carlos@chamosbarber.com
Password: Temporal123!
```

**Especialidad**: Cortes clásicos y barba  
**Permisos**:
- ✅ Ver solo sus propias citas
- ✅ Actualizar estado de sus citas
- ✅ Gestionar su portfolio personal
- ❌ No puede ver citas de otros barberos
- ❌ No puede gestionar barberos o servicios

---

### Barbero 2: Miguel Torres

```
URL: https://chamosbarber.com/barbero-panel
Email: miguel@chamosbarber.com
Password: Temporal123!
```

**Especialidad**: Fade y diseños  
**Permisos**:
- ✅ Ver solo sus propias citas
- ✅ Actualizar estado de sus citas
- ✅ Gestionar su portfolio personal
- ❌ No puede ver citas de otros barberos

---

### Barbero 3: Andrés Silva

```
URL: https://chamosbarber.com/barbero-panel
Email: andres@chamosbarber.com
Password: Temporal123!
```

**Especialidad**: Cortes modernos  
**Permisos**:
- ✅ Ver solo sus propias citas
- ✅ Actualizar estado de sus citas
- ✅ Gestionar su portfolio personal

---

## 🔍 Verificar Usuarios Existentes

### En Supabase SQL Editor

Ejecuta estos queries para ver qué usuarios existen:

```sql
-- 1. Ver barberos en la tabla barberos
SELECT 
  id,
  nombre,
  apellido,
  email,
  especialidad,
  activo
FROM barberos 
WHERE activo = true
ORDER BY nombre;

-- 2. Ver usuarios de autenticación
SELECT 
  id,
  email,
  created_at,
  confirmed_at
FROM auth.users
WHERE email LIKE '%@chamosbarber.com'
ORDER BY email;

-- 3. Verificar si barbero tiene usuario de auth
SELECT 
  b.nombre || ' ' || b.apellido as barbero,
  b.email as email_barbero,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ Tiene usuario auth'
    ELSE '❌ NO tiene usuario auth'
  END as estado_auth
FROM barberos b
LEFT JOIN auth.users u ON b.id = u.id
WHERE b.activo = true
ORDER BY b.nombre;
```

---

## 🆕 Crear Nuevos Usuarios Barberos

Si los barberos NO tienen usuario de autenticación, ejecuta este script:

### Script para Crear Usuarios de Barberos

```sql
-- IMPORTANTE: Primero necesitas los IDs de los barberos
-- Ejecuta esto para verlos:
SELECT id, nombre, apellido, email FROM barberos WHERE activo = true;

-- Luego, para CADA barbero, ejecuta esto en Supabase Auth:
-- (Reemplaza los valores según corresponda)

-- OPCIÓN A: Desde Supabase Dashboard
-- 1. Ve a Authentication → Users
-- 2. Click "Add User"
-- 3. Email: carlos@chamosbarber.com
-- 4. Password: Temporal123!
-- 5. Auto Confirm User: YES
-- 6. User UID: <copiar el ID del barbero desde la tabla barberos>

-- OPCIÓN B: Desde SQL (requiere extensión)
-- Nota: Esto solo funciona si tienes permisos de service_role

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
VALUES (
  '<ID_DEL_BARBERO_DESDE_TABLA_BARBEROS>',
  '00000000-0000-0000-0000-000000000000',
  'carlos@chamosbarber.com',
  crypt('Temporal123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Carlos Mendoza"}',
  'authenticated',
  'authenticated'
);
```

### Script Alternativo: Reset de Contraseñas

Si los usuarios existen pero no sabes las contraseñas:

```sql
-- Ver usuarios existentes
SELECT email, id FROM auth.users 
WHERE email LIKE '%@chamosbarber.com'
ORDER BY email;

-- Para resetear contraseña manualmente:
-- Ve a Supabase Dashboard → Authentication → Users
-- Busca el usuario → Click en los 3 puntos → "Send password recovery"
-- O usa "Update user" para cambiar la contraseña directamente
```

---

## 🧪 Test de Acceso por Rol

### Test 1: Admin ve todas las citas

1. Login con `admin@chamosbarber.com`
2. Ve a `/admin` → Tab "Citas"
3. ✅ Debe ver TODAS las citas de TODOS los barberos

### Test 2: Barbero ve solo sus citas

1. Login con `carlos@chamosbarber.com`
2. Ve a `/barbero-panel` → Click "Mis Citas"
3. ✅ Debe ver SOLO las citas asignadas a Carlos
4. ❌ NO debe ver citas de Miguel o Andrés

### Test 3: Crear cita para barbero específico

1. Sin login (usuario anónimo)
2. Ve a `/reservar`
3. Selecciona servicio
4. Selecciona barbero: Carlos Mendoza
5. Completa formulario y reserva
6. Login como Carlos
7. ✅ La cita debe aparecer en su panel

---

## 🔐 Seguridad

### Contraseñas por Defecto

**⚠️ IMPORTANTE**: Todas las contraseñas por defecto son:

- **Admin**: `ChamosAdmin2024!`
- **Barberos**: `Temporal123!`

**RECOMENDACIÓN**: En producción, cada usuario debe cambiar su contraseña al primer login.

### Implementar Cambio de Contraseña Obligatorio

```sql
-- Marcar usuarios que deben cambiar contraseña
ALTER TABLE barberos ADD COLUMN IF NOT EXISTS debe_cambiar_password boolean DEFAULT true;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS debe_cambiar_password boolean DEFAULT true;

-- Actualizar usuarios existentes
UPDATE barberos SET debe_cambiar_password = true WHERE email LIKE '%@chamosbarber.com';
UPDATE admin_users SET debe_cambiar_password = true WHERE email = 'admin@chamosbarber.com';
```

---

## 📝 Notas Importantes

### 1. Sincronización de IDs

**CRÍTICO**: El `id` en la tabla `barberos` DEBE coincidir con el `id` en `auth.users`.

Verificar:
```sql
-- Esto debe retornar registros coincidentes
SELECT 
  b.id as barbero_id,
  b.nombre || ' ' || b.apellido as barbero,
  b.email as barbero_email,
  u.id as auth_id,
  u.email as auth_email,
  CASE 
    WHEN b.id = u.id THEN '✅ IDs coinciden'
    ELSE '❌ IDs NO coinciden'
  END as estado
FROM barberos b
INNER JOIN auth.users u ON b.email = u.email
WHERE b.activo = true;
```

### 2. Emails de Prueba

Todos los emails de prueba usan el dominio `@chamosbarber.com`:
- admin@chamosbarber.com
- carlos@chamosbarber.com
- miguel@chamosbarber.com
- andres@chamosbarber.com

### 3. Roles y Permisos

- **admin_users**: Usuarios con rol `admin` o `superadmin`
- **barberos**: Usuarios con acceso limitado a su panel
- **RLS**: Las políticas RLS aseguran que cada barbero solo vea sus datos

---

## 🆘 Troubleshooting

### Problema: "Email no encontrado"

**Causa**: El usuario no existe en `auth.users`

**Solución**:
```sql
-- Ver si el email existe
SELECT email FROM auth.users WHERE email = 'carlos@chamosbarber.com';

-- Si no existe, créalo desde Supabase Dashboard → Authentication → Add User
```

### Problema: "Contraseña incorrecta"

**Causa**: La contraseña fue cambiada o no es la por defecto

**Solución**:
1. Supabase Dashboard → Authentication → Users
2. Buscar el usuario
3. Click en "..." → "Send password recovery"
4. O usar "Update user" para cambiar contraseña directamente

### Problema: "No tienes permisos"

**Causa**: El usuario no está en la tabla correcta (admin_users o barberos)

**Solución**:
```sql
-- Verificar si admin está en admin_users
SELECT * FROM admin_users WHERE email = 'admin@chamosbarber.com';

-- Verificar si barbero está en barberos
SELECT * FROM barberos WHERE email = 'carlos@chamosbarber.com';

-- Si falta, agregarlo manualmente
```

### Problema: Barbero ve citas de otros

**Causa**: El filtro `.eq('barbero_id', barberoId)` no está aplicándose

**Solución**: Verificar que el componente `CitasSection.tsx` está usando el filtro correcto.

---

## 📞 Soporte

Para crear más usuarios de prueba o resolver problemas de acceso:

1. **Verificar usuarios existentes** con los queries de este documento
2. **Crear usuarios faltantes** desde Supabase Dashboard
3. **Consultar logs** en Supabase → Logs
4. **Revisar documentación** de autenticación en `docs/architecture/AUTH_SYSTEM.md`

---

**Última actualización**: 2025-11-02  
**Versión**: 1.0.0
