# 👤 Crear Usuario Cajero - Guía Completa

## 📋 Opción 1: Desde Supabase Dashboard (Recomendado)

### Paso 1: Crear usuario en Supabase Auth

1. **Abre Supabase Dashboard:**
   ```
   https://supabase.chamosbarber.com/
   ```

2. **Ve a Authentication → Users**

3. **Click en "Add user" o "Invite user"**

4. **Completa el formulario:**
   - **Email:** `cajero@chamos.com`
   - **Password:** `Cajero123!` (o la que prefieras)
   - **Auto Confirm User:** ✅ Marcar (para que no necesite confirmar email)

5. **Click en "Create user"**

6. **Copia el User ID** que se generó (lo necesitarás para el siguiente paso)

---

### Paso 2: Crear usuario en tabla admin_users

1. **Ve a SQL Editor en Supabase**

2. **Ejecuta este SQL** (reemplaza `USER_ID_AQUI` con el ID del paso anterior):

```sql
-- Insertar usuario cajero
INSERT INTO public.admin_users (
  id,                    -- ⚠️ IMPORTANTE: Usar el mismo ID de Supabase Auth
  email,
  nombre,
  rol,
  activo,
  telefono
) VALUES (
  'USER_ID_AQUI',       -- ⚠️ Reemplazar con el ID de Supabase Auth
  'cajero@chamos.com',
  'Cajero Principal',
  'cajero',
  true,
  '+58412-1234567'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nombre = EXCLUDED.nombre,
  rol = EXCLUDED.rol,
  activo = EXCLUDED.activo,
  telefono = EXCLUDED.telefono;

-- Verificar que se creó correctamente
SELECT * FROM public.usuarios_con_permisos WHERE email = 'cajero@chamos.com';
```

---

## 📋 Opción 2: SQL Completo (Si ya tienes el User ID)

Si ya conoces el User ID de Supabase Auth, ejecuta esto directamente:

```sql
-- Reemplazar 'USER_ID_DE_SUPABASE_AUTH' con el ID real
INSERT INTO public.admin_users (
  id,
  email,
  nombre,
  rol,
  activo,
  telefono
) VALUES (
  'USER_ID_DE_SUPABASE_AUTH',
  'cajero@chamos.com',
  'Cajero Principal',
  'cajero',
  true,
  '+58412-1234567'
);
```

---

## ✅ Credenciales del Cajero

Una vez creado, las credenciales serán:

```
Email:    cajero@chamos.com
Password: Cajero123!  (o la que hayas configurado)
Rol:      cajero
Acceso:   Solo /pos (Punto de Venta)
```

---

## 🔐 Permisos del Cajero

El usuario cajero tiene estos permisos:

✅ **POS:**
- Cobrar ventas
- Cerrar caja al final del día
- Ver resumen del día

❌ **No puede:**
- Anular facturas
- Ver reportes completos
- Acceder al panel admin
- Editar configuración
- Ver comisiones de otros barberos

---

## 🧪 Probar el Login

1. **Ve a tu app:** `https://tu-dominio.com/login`

2. **Ingresa credenciales:**
   - Email: `cajero@chamos.com`
   - Password: `Cajero123!`

3. **Debería redirigir automáticamente a:** `/pos`

4. **Si intenta acceder a `/admin`:** Será redirigido a `/pos`

---

## 🔄 Alternativa: Usar Admin Existente para Probar

Si no quieres crear el cajero todavía, puedes:

1. **Loguear con tu usuario admin**
2. **Ir manualmente a:** `/pos`
3. **Probar todas las funcionalidades**
4. **Como admin, tendrás acceso a TODO**

---

## 📝 Crear Más Usuarios Cajero

Para crear más usuarios cajero, repite el proceso pero cambia:

```sql
INSERT INTO public.admin_users (
  id,
  email,
  nombre,
  rol,
  activo,
  telefono
) VALUES (
  'OTRO_USER_ID',
  'cajero2@chamos.com',    -- ⬅️ Cambiar email
  'Cajero Turno Tarde',     -- ⬅️ Cambiar nombre
  'cajero',
  true,
  '+58414-9876543'          -- ⬅️ Cambiar teléfono
);
```

---

## ⚠️ Notas Importantes

1. **ID debe coincidir:** El `id` en `admin_users` DEBE ser el mismo que en Supabase Auth

2. **Email único:** No puede haber dos usuarios con el mismo email

3. **Rol correcto:** Asegúrate de usar `'cajero'` como rol (exactamente así, en minúsculas)

4. **Usuario activo:** `activo = true` para que pueda hacer login

5. **Sin auth en Supabase:** Si NO creas el usuario en Supabase Auth, NO podrá hacer login

---

## 🐛 Solución de Problemas

### Error: "User already exists"
- El email ya está en uso en Supabase Auth
- Usa otro email o elimina el usuario existente

### Error: "duplicate key value violates unique constraint"
- El ID ya existe en admin_users
- Verifica que estés usando un ID nuevo de Supabase Auth

### Usuario no puede hacer login
- Verifica que existe en Supabase Auth (Authentication → Users)
- Verifica que `activo = true` en admin_users
- Verifica que el email coincide exactamente

### Usuario hace login pero es redirigido a "/"
- Verifica que `rol = 'cajero'` en admin_users
- Verifica que existe en la tabla roles_permisos
- Revisa la consola del navegador para errores

---

## 📞 Siguiente Paso

Una vez creado el usuario cajero, puedes:

1. ✅ **Probar el login** con las credenciales
2. ✅ **Acceder a /pos** automáticamente
3. ✅ **Empezar a usar** el punto de venta
4. ✅ **Crear más cajeros** si lo necesitas

---

**¿Necesitas ayuda para crear el usuario? Avísame y te guío paso a paso.** 🚀
