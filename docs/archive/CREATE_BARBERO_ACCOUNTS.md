# Crear Cuentas de Barberos Existentes

## Problema
Los barberos existen en la tabla `barberos` pero no tienen cuentas de usuario (`admin_users` + Supabase Auth).

## Barberos Afectados
- Carlos Pérez (carlos@chamosbarber.com)
- Luis González (luis@chamosbarber.com)
- Miguel Rodríguez (miguel@chamosbarber.com)

## Solución Manual Rápida

### Paso 1: Crear Usuarios en Supabase Auth

Ve a **Supabase Dashboard** → **Authentication** → **Users** → **"Add user"**

Para cada barbero, crea un usuario con:
- **Email**: (email del barbero)
- **Password**: `ChamosBarbero2024!` (temporal, ellos podrán cambiarla)
- **Auto Confirm User**: ✅ Marcado
- **Email Confirm**: ✅ Marcado

Usuarios a crear:
1. carlos@chamosbarber.com
2. luis@chamosbarber.com
3. miguel@chamosbarber.com

### Paso 2: Crear Entradas en admin_users

Ejecuta en **Supabase SQL Editor**:

```sql
-- Crear entradas en admin_users vinculadas a barberos
INSERT INTO admin_users (email, nombre, rol, barbero_id, activo)
VALUES
  (
    'carlos@chamosbarber.com', 
    'Carlos Pérez', 
    'barbero', 
    'ddee5407-2b69-4275-96c4-09e9203783b5'::UUID, 
    true
  ),
  (
    'luis@chamosbarber.com', 
    'Luis González', 
    'barbero', 
    '82b2218c-e6ef-4440-bb3b-4dc4d7afe864'::UUID, 
    true
  ),
  (
    'miguel@chamosbarber.com', 
    'Miguel Rodríguez', 
    'barbero', 
    '28fdc033-f8a0-4cf7-8ec7-4952fc98d27e'::UUID, 
    true
  )
ON CONFLICT (email) DO UPDATE 
SET 
  barbero_id = EXCLUDED.barbero_id,
  rol = 'barbero',
  activo = true;
```

### Paso 3: Verificar Creación

```sql
-- Verificar que se crearon correctamente
SELECT 
  b.nombre,
  b.apellido,
  b.email as barbero_email,
  au.id as admin_user_id,
  au.email as admin_email,
  au.rol,
  au.barbero_id,
  au.activo,
  au.created_at
FROM barberos b
INNER JOIN admin_users au ON au.barbero_id = b.id
WHERE au.rol = 'barbero'
ORDER BY b.nombre;
```

Deberías ver 3 filas con todos los datos completos.

### Paso 4: Probar Reset Password

1. Redeploy (si no lo has hecho): https://coolify.app
2. Login como admin en: https://chamosbarber.com/admin
3. Ir a tab "Barberos"
4. Click en botón 🔑 junto a cualquier barbero
5. Debería aparecer modal con nueva contraseña

### Paso 5: Entregar Credenciales

Una vez que funcione el reset, puedes:
- Usar el botón 🔑 para generar contraseñas seguras
- O usar las contraseñas temporales (`ChamosBarbero2024!`) y pedir que las cambien desde `/barbero-panel` → Tab "Seguridad"

## Credenciales Temporales Iniciales

Si usaste `ChamosBarbero2024!` para todos:

**Carlos Pérez:**
- Email: carlos@chamosbarber.com
- Password: ChamosBarbero2024!
- Login: https://chamosbarber.com/login

**Luis González:**
- Email: luis@chamosbarber.com
- Password: ChamosBarbero2024!
- Login: https://chamosbarber.com/login

**Miguel Rodríguez:**
- Email: miguel@chamosbarber.com
- Password: ChamosBarbero2024!
- Login: https://chamosbarber.com/login

## Alternativa: Usar Panel de Solicitudes (Futuro)

Para nuevos barberos, usa el flujo correcto:
1. Barbero se registra en: https://chamosbarber.com/registro-barbero
2. Admin aprueba desde: https://chamosbarber.com/admin → Tab "Solicitudes"
3. Sistema crea todo automáticamente:
   - Usuario en Auth
   - Entrada en admin_users
   - Vinculación con barberos
   - Email con credenciales (si RESEND_API_KEY configurada)

## Verificación Final

Después de crear las cuentas, verifica que el reset funciona:

```bash
# En consola del navegador (F12), después de hacer click en botón 🔑:
# Deberías ver:
✅ [Reset Password] Usuario verificado como admin: tu_email@admin.com
✅ [Reset Password] Barbero encontrado: carlos@chamosbarber.com
✅ [Reset Password] auth_user_id del barbero: [UUID]
✅ [Reset Password] Contraseña reseteada exitosamente
```

## Troubleshooting

### Error: "Usuario no encontrado en admin_users"
- Verifica que TU usuario admin tenga entrada en `admin_users` con `rol='admin'`
```sql
SELECT * FROM admin_users WHERE email = 'TU_EMAIL_ADMIN';
```

### Error: "Barbero no tiene cuenta de usuario"
- Verifica que el barbero tenga entrada en `admin_users`:
```sql
SELECT * FROM admin_users WHERE barbero_id = 'ID_DEL_BARBERO';
```

### Error: "Barbero no tiene cuenta de autenticación"
- Verifica en Supabase Dashboard → Authentication → Users
- El email del barbero debe aparecer en la lista
