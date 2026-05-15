# Guía: Activar Cuentas para Barberos Existentes

## 📊 Barberos Actuales

Tienes 3 barberos en la base de datos **sin cuentas de usuario**:

| ID | Nombre | Email | Estado |
|----|--------|-------|--------|
| ddee5407-2b69-4275-96c4-09e9203783b5 | Carlos Pérez | carlos@chamosbarber.com | Activo ⚠️ Sin cuenta |
| 82b2218c-e6ef-4440-bb3b-4dc4d7afe864 | Luis González | luis@chamosbarber.com | Activo ⚠️ Sin cuenta |
| 28fdc033-f8a0-4cf7-8ec7-4952fc98d27e | Miguel Rodríguez | miguel@chamosbarber.com | Activo ⚠️ Sin cuenta |

---

## 🎯 OPCIÓN 1: Crear Cuentas Manualmente (RÁPIDO)

### Paso 1: Crear Usuarios en Supabase Auth

1. Ve a tu **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecciona el proyecto **Chamos Barber**
3. Click en **Authentication** (menú izquierdo)
4. Click en **Users**
5. Click en **"Add user"** (botón verde superior derecho)

Para **cada barbero**, crea un usuario:

#### Usuario 1: Carlos Pérez
- **Email**: `carlos@chamosbarber.com`
- **Password**: `ChamosBarbero2024!`
- **Auto Confirm User**: ✅ **IMPORTANTE**
- **Email Confirm**: ✅ **IMPORTANTE**
- Click **"Create user"**

#### Usuario 2: Luis González
- **Email**: `luis@chamosbarber.com`
- **Password**: `ChamosBarbero2024!`
- **Auto Confirm User**: ✅
- **Email Confirm**: ✅
- Click **"Create user"**

#### Usuario 3: Miguel Rodríguez
- **Email**: `miguel@chamosbarber.com`
- **Password**: `ChamosBarbero2024!`
- **Auto Confirm User**: ✅
- **Email Confirm**: ✅
- Click **"Create user"**

### Paso 2: Vincular con admin_users

Después de crear los 3 usuarios en Auth, ejecuta este SQL en **SQL Editor**:

```sql
-- Vincular barberos con sus cuentas de Auth
INSERT INTO admin_users (id, email, nombre, rol, barbero_id, activo)
SELECT 
  au.id,
  b.email,
  b.nombre || ' ' || b.apellido,
  'barbero',
  b.id,
  true
FROM barberos b
INNER JOIN auth.users au ON au.email = b.email
WHERE b.email IN (
  'carlos@chamosbarber.com',
  'luis@chamosbarber.com',
  'miguel@chamosbarber.com'
)
ON CONFLICT (id) DO UPDATE 
SET barbero_id = EXCLUDED.barbero_id, rol = 'barbero', activo = true;
```

### Paso 3: Verificar

```sql
-- Ver barberos con sus cuentas
SELECT 
  b.nombre || ' ' || b.apellido as barbero,
  b.email,
  au.rol,
  au.barbero_id,
  'Cuenta creada ✅' as estado
FROM barberos b
INNER JOIN admin_users au ON au.barbero_id = b.id
WHERE b.email IN (
  'carlos@chamosbarber.com',
  'luis@chamosbarber.com',
  'miguel@chamosbarber.com'
);
```

**Resultado esperado**: 3 filas mostrando "Cuenta creada ✅"

---

## 🎯 OPCIÓN 2: Usar el Panel Admin (RECOMENDADO PARA FUTUROS)

Para **nuevos barberos**, usa el panel admin:

1. Ve a: https://chamosbarber.com/admin
2. Tab **"Barberos"**
3. Click **"Nuevo Barbero"**
4. Llenar datos + email
5. ✅ Marcar **"Crear cuenta de usuario para este barbero"**
6. Click **"Crear Barbero + Cuenta"**
7. Copiar credenciales del modal que aparece

---

## 🧪 PROBAR LAS CUENTAS

### Test 1: Login de Carlos
1. Ve a: https://chamosbarber.com/login
2. Email: `carlos@chamosbarber.com`
3. Password: `ChamosBarbero2024!`
4. Click **"Iniciar Sesión"**
5. Deberías acceder a `/barbero-panel`

### Test 2: Reset Password desde Admin
1. Login como admin: https://chamosbarber.com/admin
2. Tab **"Barberos"**
3. Buscar a **Carlos Pérez**
4. Click en botón **🔑** (azul)
5. Debería aparecer modal con nueva contraseña
6. Copiar nueva contraseña
7. Probar login con nueva contraseña

### Test 3: Cambio de Password desde Panel Barbero
1. Login como Carlos: https://chamosbarber.com/login
2. Ve a `/barbero-panel`
3. Tab **"Seguridad"**
4. Cambiar contraseña
5. Logout y login con nueva contraseña

---

## 📋 CHECKLIST COMPLETO

### Para Carlos Pérez:
- [ ] Usuario creado en Supabase Auth
- [ ] Entrada creada en admin_users
- [ ] Login exitoso en /login
- [ ] Acceso a /barbero-panel
- [ ] Puede cambiar contraseña en Tab "Seguridad"
- [ ] Admin puede resetear contraseña con botón 🔑

### Para Luis González:
- [ ] Usuario creado en Supabase Auth
- [ ] Entrada creada en admin_users
- [ ] Login exitoso en /login
- [ ] Acceso a /barbero-panel
- [ ] Puede cambiar contraseña en Tab "Seguridad"
- [ ] Admin puede resetear contraseña con botón 🔑

### Para Miguel Rodríguez:
- [ ] Usuario creado en Supabase Auth
- [ ] Entrada creada en admin_users
- [ ] Login exitoso en /login
- [ ] Acceso a /barbero-panel
- [ ] Puede cambiar contraseña en Tab "Seguridad"
- [ ] Admin puede resetear contraseña con botón 🔑

---

## 📧 CREDENCIALES TEMPORALES

Después de completar los pasos 1 y 2:

### Carlos Pérez
```
Email: carlos@chamosbarber.com
Password: ChamosBarbero2024!
Login: https://chamosbarber.com/login
```

### Luis González
```
Email: luis@chamosbarber.com
Password: ChamosBarbero2024!
Login: https://chamosbarber.com/login
```

### Miguel Rodríguez
```
Email: miguel@chamosbarber.com
Password: ChamosBarbero2024!
Login: https://chamosbarber.com/login
```

**⚠️ IMPORTANTE:** Estas son contraseñas temporales. Puedes:
1. Usar el botón 🔑 en el panel admin para generar contraseñas más seguras
2. Pedirles a los barberos que las cambien desde su panel

---

## 🔄 SIGUIENTE PASO DESPUÉS DE ACTIVAR

Una vez que los 3 barberos tengan cuentas:

### Entrega de Credenciales

**Opción A: Password Temporal**
```
Envía por email/WhatsApp:

Hola [Nombre],

Tu cuenta en Chamos Barber ha sido activada:

Email: [email]
Contraseña temporal: ChamosBarbero2024!
Link de acceso: https://chamosbarber.com/login

Por seguridad, te recomendamos cambiar tu contraseña:
1. Inicia sesión
2. Ve a la pestaña "Seguridad"
3. Cambia tu contraseña

¡Bienvenido al equipo!
```

**Opción B: Password Segura (Usar Reset desde Admin)**
```
1. Admin → Barberos → Click 🔑 en el barbero
2. Copiar la contraseña generada
3. Enviar por email/WhatsApp:

Hola [Nombre],

Tu cuenta en Chamos Barber ha sido activada:

Email: [email]
Contraseña: [contraseña segura generada]
Link de acceso: https://chamosbarber.com/login

Puedes cambiar tu contraseña desde la pestaña "Seguridad"
en tu panel de control.

¡Bienvenido al equipo!
```

---

## ❓ PROBLEMAS COMUNES

### Error: "Email already exists"
**Causa**: El email ya está registrado en Supabase Auth  
**Solución**: 
1. Ve a Authentication → Users
2. Busca el email
3. Si existe, solo ejecuta el paso 2 (vincular con admin_users)

### Error: "Invalid login credentials"
**Causa**: Usuario no confirmado o password incorrecto  
**Solución**: 
1. Verifica que marcaste "Auto Confirm User" al crear
2. O en Users → busca el usuario → Click en menú → "Confirm email"

### Error: "No tienes permisos" al resetear password
**Causa**: El barbero no tiene entrada en admin_users  
**Solución**: Ejecuta el query del Paso 2 nuevamente

### El botón 🔑 no aparece
**Causa**: El barbero no tiene email configurado  
**Solución**: 
1. Admin → Barberos → Editar barbero
2. Agregar email válido
3. Guardar
4. El botón 🔑 debería aparecer

---

## 📊 RESULTADO FINAL

Después de completar todos los pasos:

```
✅ 3 Barberos activos con cuentas de usuario
✅ Pueden hacer login en /login
✅ Acceden a /barbero-panel
✅ Ven sus citas programadas
✅ Pueden ver sus ganancias
✅ Pueden cambiar su contraseña
✅ Admin puede resetear sus contraseñas con botón 🔑
```

---

## 🚀 PRÓXIMOS PASOS

1. **Completa Paso 1 y 2** de la Opción 1
2. **Verifica** con el query del Paso 3
3. **Prueba login** de al menos un barbero
4. **Prueba botón 🔑** de reset password desde admin
5. **Comparte** el resultado aquí

¿Necesitas ayuda con algún paso específico? 🤝
