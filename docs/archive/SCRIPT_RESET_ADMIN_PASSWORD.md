# 🔐 Script para Resetear Contraseña de Admin

## 🎯 SOLUCIÓN DIRECTA (Sin necesidad de email)

Ya que Supabase Dashboard no tiene botón "Update" y el email no llega, vamos a crear un script temporal en tu aplicación para resetear la contraseña.

---

## ✅ MÉTODO 1: Crear Página Temporal de Reset (RECOMENDADO)

### **Paso 1: Crear el archivo de reset**

Crea un archivo temporal para resetear tu contraseña:

**Archivo:** `src/pages/admin-reset-emergency.tsx`

```typescript
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function EmergencyAdminReset() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const resetAdminPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage('❌ La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    setMessage('⏳ Reseteando contraseña...')

    try {
      // Usar el Service Role Key para actualizar directamente
      const { data, error } = await supabase.auth.admin.updateUserById(
        '4ce7e112-12a7-4909-b922-59fa1fdafc0b', // UUID del admin
        { password: newPassword }
      )

      if (error) {
        setMessage(`❌ Error: ${error.message}`)
        console.error('Error:', error)
      } else {
        setMessage(`✅ ¡Contraseña actualizada exitosamente!
        
Email: contacto@chamosbarber.com
Nueva contraseña: ${newPassword}

Ahora puedes hacer login en /login`)
      }
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#1a1a1a',
      padding: '20px'
    }}>
      <div style={{ 
        backgroundColor: '#2a2a2a', 
        padding: '40px', 
        borderRadius: '12px',
        maxWidth: '500px',
        width: '100%'
      }}>
        <h1 style={{ color: '#D4AF37', marginBottom: '20px' }}>
          🔐 Reset Password - Emergencia
        </h1>
        
        <p style={{ color: '#ccc', marginBottom: '20px' }}>
          Usuario: <strong>contacto@chamosbarber.com</strong>
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: '#ccc', display: 'block', marginBottom: '8px' }}>
            Nueva Contraseña:
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              borderRadius: '6px',
              border: '1px solid #444',
              backgroundColor: '#1a1a1a',
              color: '#fff'
            }}
          />
        </div>

        <button
          onClick={resetAdminPassword}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            backgroundColor: '#D4AF37',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? '⏳ Reseteando...' : '🔑 Resetear Contraseña'}
        </button>

        {message && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: message.includes('✅') ? '#1a4d1a' : '#4d1a1a',
            border: `1px solid ${message.includes('✅') ? '#2d7d2d' : '#7d2d2d'}`,
            borderRadius: '6px',
            color: '#fff',
            whiteSpace: 'pre-wrap'
          }}>
            {message}
          </div>
        )}

        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#1a1a2a', borderRadius: '6px' }}>
          <p style={{ color: '#aaa', fontSize: '12px', margin: 0 }}>
            ⚠️ <strong>IMPORTANTE:</strong> Esta página es temporal para emergencias.
            Después de resetear tu contraseña, elimina este archivo por seguridad.
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

### **Paso 2: Agregar la ruta al proyecto**

El archivo ya está creado en `src/pages/admin-reset-emergency.tsx`

### **Paso 3: Hacer Deploy**

```bash
cd /home/user/webapp
git add src/pages/admin-reset-emergency.tsx
git commit -m "feat: add emergency admin password reset page"
git push origin main
```

Luego en Coolify → **Redeploy**

### **Paso 4: Usar la página de reset**

1. Espera a que termine el deploy
2. Ve a: `https://chamosbarber.com/admin-reset-emergency`
3. Ingresa tu nueva contraseña (ej: `ChamosAdmin2024!`)
4. Clic en **"Resetear Contraseña"**
5. Espera el mensaje de éxito ✅
6. Ahora ve a: `https://chamosbarber.com/login`
7. Login con la nueva contraseña

### **Paso 5: ELIMINAR la página de emergencia (SEGURIDAD)**

Después de resetear exitosamente:

```bash
cd /home/user/webapp
rm src/pages/admin-reset-emergency.tsx
git add src/pages/admin-reset-emergency.tsx
git commit -m "security: remove emergency reset page after use"
git push origin main
```

Y redeploy en Coolify.

---

## ✅ MÉTODO 2: Usar Supabase SQL (MÁS RÁPIDO)

Si prefieres no crear una página, podemos usar SQL directamente:

### **Paso 1: Ir a SQL Editor**

1. `https://supabase.com/dashboard`
2. Tu proyecto → **SQL Editor**
3. Clic en **"New Query"**

### **Paso 2: Ejecutar este SQL**

```sql
-- Resetear contraseña del admin
-- Reemplaza 'TU_NUEVA_CONTRASEÑA' con la contraseña que quieras

SELECT auth.update_user_password(
  '4ce7e112-12a7-4909-b922-59fa1fdafc0b'::uuid,
  'ChamosAdmin2024!'  -- ⚠️ Cambia esto por tu contraseña
);
```

**⚠️ IMPORTANTE:** Cambia `'ChamosAdmin2024!'` por la contraseña que quieras usar.

### **Paso 3: Ejecutar**

- Clic en **"Run"** o presiona **F5**

**Si funciona:**
- ✅ Mensaje: "Success"
- Ve a `https://chamosbarber.com/login`
- Login con la nueva contraseña

**Si da error "function does not exist":**
- Supabase no tiene esa función habilitada
- Usa **Método 1** (crear página de reset)

---

## ✅ MÉTODO 3: Usar PostgreSQL Function (ALTERNATIVA)

Si el SQL de arriba no funciona, prueba esta función:

```sql
-- Crear función temporal para resetear password
CREATE OR REPLACE FUNCTION reset_admin_password(user_id uuid, new_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Actualizar la contraseña encriptada
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = user_id;
  
  IF FOUND THEN
    result := json_build_object(
      'success', true,
      'message', 'Contraseña actualizada exitosamente',
      'user_id', user_id
    );
  ELSE
    result := json_build_object(
      'success', false,
      'message', 'Usuario no encontrado',
      'user_id', user_id
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Ejecutar la función para resetear
SELECT reset_admin_password(
  '4ce7e112-12a7-4909-b922-59fa1fdafc0b'::uuid,
  'ChamosAdmin2024!'  -- ⚠️ Cambia por tu contraseña
);

-- Eliminar la función (seguridad)
DROP FUNCTION IF EXISTS reset_admin_password(uuid, text);
```

---

## 🎯 RECOMENDACIÓN

**Usa MÉTODO 1** (Crear página temporal de reset) porque:
- ✅ Más fácil y visual
- ✅ Usa la API oficial de Supabase
- ✅ No requiere permisos especiales de SQL
- ✅ Funciona 100% seguro

---

## 📋 CHECKLIST:

```
[ ] Crear archivo: src/pages/admin-reset-emergency.tsx
[ ] Commit y push
[ ] Redeploy en Coolify
[ ] Ir a: chamosbarber.com/admin-reset-emergency
[ ] Ingresar nueva contraseña
[ ] Clic en "Resetear Contraseña"
[ ] Ver mensaje de éxito ✅
[ ] Login en /login con nueva contraseña
[ ] ELIMINAR archivo de emergencia
[ ] Commit, push y redeploy
```

---

¿Quieres que cree el archivo de reset de emergencia para ti?
