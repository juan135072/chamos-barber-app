# 🚀 GUÍA RÁPIDA: Configurar Sistema de Roles en 10 Minutos

---

## 📋 LO QUE VAS A HACER

En solo 10 minutos tendrás el sistema completo funcionando:
1. ✅ Ejecutar 1 script SQL (2 min)
2. ✅ Crear 4 usuarios (3 min)
3. ✅ Ejecutar 1 script SQL más (2 min)
4. ✅ Probar el sistema (3 min)

---

## 🔴 MÉTODO 1: TODO DESDE SUPABASE STUDIO (RECOMENDADO)

### PASO 1: Ejecutar Primer SQL (2 minutos)

1. **Abre Supabase Studio:**
   ```
   https://supabase.chamosbarber.com
   ```

2. **Ve a SQL Editor:**
   - Click en el icono `</>` en el menú lateral
   - O navega a: `SQL Editor`

3. **Copia y pega este código:**
   - Abre en tu editor: `scripts/setup-roles-system.sql`
   - Selecciona TODO (Ctrl+A)
   - Copia (Ctrl+C)
   - Pega en SQL Editor de Supabase
   - Click en **RUN** (▶️)

4. **Verifica el resultado:**
   ```
   Deberías ver al final:
   ✅ Usuario admin configurado: admin@chamosbarber.com
   ```

**✅ PASO 1 COMPLETADO**

---

### PASO 2: Crear 4 Usuarios (3 minutos)

1. **Ve a Authentication:**
   - Click en **Authentication** en el menú lateral
   - Click en **Users**

2. **Crear Usuario 1 - Carlos:**
   - Click en **"Add user"** (botón verde arriba a la derecha)
   - Click en **"Create new user"**
   
   Llena el formulario:
   ```
   Email: carlos@chamosbarber.com
   Password: Temporal123!
   ```
   
   ⚠️ IMPORTANTE: Marca la casilla:
   ```
   ☑️ Auto Confirm User
   ```
   
   - Click en **"Create user"**
   - Espera confirmación

3. **Repetir para Usuario 2 - Miguel:**
   ```
   Email: miguel@chamosbarber.com
   Password: Temporal123!
   ☑️ Auto Confirm User
   ```

4. **Repetir para Usuario 3 - Luis:**
   ```
   Email: luis@chamosbarber.com
   Password: Temporal123!
   ☑️ Auto Confirm User
   ```

5. **Repetir para Usuario 4 - Jorge:**
   ```
   Email: jorge@chamosbarber.com
   Password: Temporal123!
   ☑️ Auto Confirm User
   ```

6. **Verificar que los 4 aparecen en la lista:**
   ```
   Deberías ver:
   - carlos@chamosbarber.com
   - miguel@chamosbarber.com
   - luis@chamosbarber.com
   - jorge@chamosbarber.com
   ```

**✅ PASO 2 COMPLETADO**

---

### PASO 3: Ejecutar Segundo SQL (2 minutos)

1. **Ve de nuevo a SQL Editor:**
   - Click en `</>` (SQL Editor)

2. **Copia y pega este código:**
   - Abre: `scripts/associate-barberos-users.sql`
   - Selecciona TODO (Ctrl+A)
   - Copia (Ctrl+C)
   - Pega en SQL Editor
   - Click en **RUN** (▶️)

3. **Verifica el resultado:**
   ```
   Deberías ver:
   ✅ Carlos Ramírez asociado: carlos@chamosbarber.com
   ✅ Miguel Torres asociado: miguel@chamosbarber.com
   ✅ Luis Mendoza asociado: luis@chamosbarber.com
   ✅ Jorge Silva asociado: jorge@chamosbarber.com
   
   ════════════════════════════════════════
     RESUMEN DE ASOCIACIÓN
   ════════════════════════════════════════
   Usuarios asociados: 4 de 4
   ✅ ¡Todos los barberos fueron asociados!
   ```

**✅ PASO 3 COMPLETADO**

---

### PASO 4: Probar el Sistema (3 minutos)

1. **Espera el deployment de Coolify:**
   - Debería completarse automáticamente en ~5 minutos
   - Puedes continuar mientras se deploya

2. **Prueba como Barbero (Carlos):**
   ```
   URL: https://chamosbarber.com/login
   Email: carlos@chamosbarber.com
   Password: Temporal123!
   ```
   
   - Deberías ver redirección a: `/barbero-panel`
   - Tab "Mi Perfil" debe estar visible
   - Tab "Mi Portfolio" debe mostrar sus trabajos

3. **Prueba actualizar perfil:**
   - Cambia el teléfono a: `+56999888777`
   - Click "Guardar Cambios"
   - Deberías ver notificación verde de éxito
   - Recarga la página
   - El cambio debe persistir

4. **Prueba cerrar sesión:**
   - Click en "Cerrar Sesión" (arriba a la derecha)
   - Deberías volver a `/login`

**✅ PASO 4 COMPLETADO**

---

## 🎉 ¡SISTEMA CONFIGURADO!

Si llegaste hasta aquí, **TODO FUNCIONA** ✅

### 📝 Guarda estas credenciales:

**Para ti (Admin):**
```
URL: https://chamosbarber.com/login
Email: admin@chamosbarber.com
Password: [tu contraseña actual]
Panel: /admin
```

**Para tus barberos:**
```
Carlos: carlos@chamosbarber.com / Temporal123!
Miguel: miguel@chamosbarber.com / Temporal123!
Luis: luis@chamosbarber.com / Temporal123!
Jorge: jorge@chamosbarber.com / Temporal123!
Panel: /barbero-panel
```

---

## 📞 COMPARTE ESTO CON TUS BARBEROS

```
Hola [Nombre],

Ya tienes acceso al panel de Chamos Barber 🎉

🔐 TUS DATOS DE ACCESO:
URL: https://chamosbarber.com/login
Email: [su email]
Password: Temporal123!

⚠️ IMPORTANTE: 
Cambia tu contraseña después del primer login
(Te aparecerá la opción en el panel)

✅ QUÉ PUEDES HACER:
• Actualizar tu teléfono/WhatsApp
• Actualizar tu Instagram
• Actualizar tu descripción
• Ver tu portfolio de trabajos

¿Problemas? Avísame!
```

---

## 🔴 MÉTODO 2: SCRIPT AUTOMATIZADO (AVANZADO)

Si prefieres hacerlo por terminal SSH:

1. **Conecta por SSH a tu servidor:**
   ```bash
   ssh user@tu-servidor.com
   ```

2. **Ve al directorio del proyecto:**
   ```bash
   cd /ruta/a/chamos-barber-app
   ```

3. **Da permisos al script:**
   ```bash
   chmod +x scripts/setup-complete-automated.sh
   ```

4. **Ejecuta el script:**
   ```bash
   ./scripts/setup-complete-automated.sh
   ```

5. **Sigue las instrucciones:**
   - El script te pedirá credenciales de Supabase
   - Ejecutará todo automáticamente
   - Guardará un archivo `credentials.txt` con las credenciales

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### ❌ Error: "email already exists"
**Solución:** El usuario ya fue creado. Continúa con el siguiente.

### ❌ Error: "No se encontró usuario"
**Solución:** 
1. Verifica que marcaste "Auto Confirm User"
2. Espera 30 segundos y ejecuta de nuevo el SQL

### ❌ Error: "No tienes permisos"
**Solución:**
1. Verifica que ejecutaste ambos SQLs
2. Cierra sesión y vuelve a intentar
3. Verifica en SQL Editor:
   ```sql
   SELECT * FROM admin_users WHERE email = 'carlos@chamosbarber.com';
   ```
   Debería retornar 1 fila

### ❌ Panel de barbero vacío
**Solución:**
1. Verifica en SQL Editor:
   ```sql
   SELECT user_id FROM barberos WHERE slug = 'carlos-ramirez';
   ```
2. Si es NULL, ejecuta de nuevo associate-barberos-users.sql

---

## ✅ VERIFICACIÓN RÁPIDA

Ejecuta esto en SQL Editor para verificar todo:

```sql
-- Ver todos los usuarios del sistema
SELECT 
  au.email,
  au.rol,
  b.nombre || ' ' || b.apellido as barbero_nombre,
  au.activo
FROM admin_users au
LEFT JOIN barberos b ON au.barbero_id = b.id
ORDER BY au.rol, au.email;
```

**Resultado esperado:**
```
email                       | rol     | barbero_nombre  | activo
----------------------------|---------|-----------------|--------
admin@chamosbarber.com      | admin   | NULL            | true
carlos@chamosbarber.com     | barbero | Carlos Ramírez  | true
jorge@chamosbarber.com      | barbero | Jorge Silva     | true
luis@chamosbarber.com       | barbero | Luis Mendoza    | true
miguel@chamosbarber.com     | barbero | Miguel Torres   | true
```

---

## 🎊 ¡LISTO!

Tu sistema de roles está funcionando. Ahora:

1. ✅ Los barberos pueden actualizar su información
2. ✅ Puedes gestionar todo desde el admin
3. ✅ El sistema está seguro con RLS
4. ✅ Todo funciona correctamente

**¿Dudas? Revisa la documentación completa en:**
`docs/SISTEMA-ROLES-COMPLETO.md`
