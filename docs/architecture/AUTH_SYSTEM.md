# Authentication System - Chamos Barber

## 🔐 Descripción General

Sistema de autenticación multi-rol basado en Supabase Auth con verificación de permisos personalizada.

## 🏗️ Arquitectura de Autenticación

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE AUTENTICACIÓN                    │
└─────────────────────────────────────────────────────────────┘

1. Usuario ingresa credenciales en /login
             ↓
2. Supabase Auth valida credenciales
             ↓
3. Se genera JWT Token y Session
             ↓
4. Verificación en tabla admin_users
             ↓
5. ┌────────────────────────────────┐
   │  ¿Usuario existe en admin_users│
   │  y está activo?                │
   └───┬────────────────────────┬───┘
       │ NO                     │ SÍ
       ↓                        ↓
   ❌ Error                 ┌───────────────┐
   "No autorizado"          │ Verificar ROL │
                            └───┬───────┬───┘
                                │       │
                        ┌───────┘       └────────┐
                        ↓                        ↓
                  rol = 'admin'           rol = 'barbero'
                        ↓                        ↓
                   /admin                 /barbero-panel
```

## 🔑 Componentes del Sistema

### 1. Supabase Auth (auth.users)

**Responsabilidad**: Gestión básica de autenticación

- Hash de contraseñas con bcrypt
- Generación y validación de JWT tokens
- Gestión de sesiones
- Recuperación de contraseñas
- Confirmación de email

**⚠️ NO TOCAR**: Tabla gestionada por Supabase, no modificar directamente

### 2. Tabla admin_users (Autorización)

**Responsabilidad**: Gestión de roles y permisos

```sql
CREATE TABLE admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  rol text NOT NULL CHECK (rol IN ('admin', 'barbero')),
  activo boolean DEFAULT true,
  barbero_id uuid REFERENCES barberos(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);
```

**Estados de Usuario**:
- ✅ `activo = true`: Puede acceder al panel
- ❌ `activo = false`: No puede acceder (desactivado)

**Relación con barberos**:
```sql
-- Admin principal (sin barbero_id)
INSERT INTO admin_users (id, email, rol) 
VALUES ('uuid', 'admin@chamosbarber.com', 'admin');

-- Barbero con acceso al panel
INSERT INTO admin_users (id, email, rol, barbero_id) 
VALUES ('uuid', 'barbero@chamosbarber.com', 'barbero', 'barbero-uuid');
```

### 3. Página de Login (/pages/login.tsx)

**Flujo de Login Completo**:

```typescript
const handleLogin = async (e: FormEvent) => {
  e.preventDefault()
  setError('')
  setLoading(true)

  // PASO 1: Autenticación con Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    console.error('❌ Error de autenticación:', authError.message)
    setError('Credenciales inválidas')
    setLoading(false)
    return
  }

  console.log('✅ Autenticación exitosa:', authData.user.email)

  // PASO 2: Verificar permisos en admin_users
  await checkAdminAccess(authData.session)
}

const checkAdminAccess = async (session: Session) => {
  console.log('🔍 Verificando acceso para:', session.user.email)
  console.log('🆔 User ID:', session.user.id)

  // CRÍTICO: Buscar por ID, no por email
  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', session.user.id)  // ← Usar ID del token JWT
    .eq('activo', true)
    .single()

  if (error || !adminUser) {
    console.error('❌ Error al verificar admin_users:', error)
    await supabase.auth.signOut()
    setError('No tienes permisos para acceder al panel de administración')
    setLoading(false)
    return
  }

  console.log('✅ Usuario autorizado:', adminUser.rol)

  // PASO 3: Redireccionar según rol
  if (adminUser.rol === 'admin') {
    console.log('🔀 Redirigiendo a /admin')
    router.push('/admin')
  } else if (adminUser.rol === 'barbero') {
    console.log('🔀 Redirigiendo a /barbero-panel')
    router.push('/barbero-panel')
  }
}
```

## 🛡️ Protección de Rutas

### Middleware de Autenticación

Cada página protegida debe verificar sesión:

```typescript
// src/pages/admin.tsx
const Admin = () => {
  const router = useRouter()
  const session = useSession()
  const supabase = useSupabaseClient()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Verificar sesión
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      // 2. Verificar rol
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('rol')
        .eq('id', session.user.id)
        .eq('activo', true)
        .single()

      if (!adminUser || adminUser.rol !== 'admin') {
        router.push('/login')
        return
      }

      setLoading(false)
    }

    checkAuth()
  }, [])

  if (loading) return <div>Cargando...</div>

  return (
    // Contenido del panel admin
  )
}
```

### Patrón de Verificación de Rol

```typescript
// Hook personalizado para verificar rol
const useRoleCheck = (requiredRole: 'admin' | 'barbero') => {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = useSupabaseClient()

  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('rol, activo')
        .eq('id', session.user.id)
        .single()

      if (!adminUser || !adminUser.activo || adminUser.rol !== requiredRole) {
        router.push('/login')
        return
      }

      setAuthorized(true)
      setLoading(false)
    }

    checkRole()
  }, [requiredRole])

  return { authorized, loading }
}

// Uso en componente
const AdminPage = () => {
  const { authorized, loading } = useRoleCheck('admin')
  
  if (loading) return <div>Verificando permisos...</div>
  if (!authorized) return null

  return <div>Panel Admin</div>
}
```

## 🔐 Seguridad a Nivel de Datos

### Filtrado por Rol en Queries

#### Admin: Ve TODAS las citas

```typescript
// src/components/admin/tabs/CitasTab.tsx
const loadCitas = async () => {
  const { data, error } = await supabase
    .from('citas')
    .select(`
      *,
      barberos:barbero_id (nombre, apellido),
      servicios:servicio_id (nombre, precio)
    `)
    .order('fecha', { ascending: false })
  
  // NO HAY FILTRO - Admin ve todo
  if (error) {
    console.error('Error cargando citas:', error)
    return
  }
  
  setCitas(data || [])
}
```

#### Barbero: Ve SOLO sus citas

```typescript
// src/components/barbero/CitasSection.tsx
const loadCitas = async () => {
  // barberoId viene de props (verificado en barbero-panel.tsx)
  const { data, error } = await supabase
    .from('citas')
    .select(`
      *,
      servicios:servicio_id (nombre, precio)
    `)
    .eq('barbero_id', barberoId)  // ← FILTRO CRÍTICO
    .order('fecha', { ascending: false })
  
  if (error) {
    console.error('Error cargando citas:', error)
    return
  }
  
  setCitas(data || [])
}
```

### Doble Verificación en Updates

```typescript
// Barbero solo puede actualizar SUS citas
const handleUpdateEstado = async (citaId: string, nuevoEstado: string) => {
  const { error } = await supabase
    .from('citas')
    .update({ estado: nuevoEstado })
    .eq('id', citaId)
    .eq('barbero_id', barberoId)  // ← Doble verificación
  
  if (error) {
    console.error('Error actualizando cita:', error)
    alert('Error al actualizar cita')
    return
  }
  
  // Recargar citas
  loadCitas()
}
```

## 🔄 Gestión de Sesiones

### Obtener Usuario Actual

```typescript
// Método 1: Usar hook de Supabase
const session = useSession()
const user = session?.user

// Método 2: Query directa
const { data: { session } } = await supabase.auth.getSession()
const user = session?.user

// Método 3: Obtener user directamente
const { data: { user } } = await supabase.auth.getUser()
```

### Verificar Estado de Sesión

```typescript
useEffect(() => {
  // Listener para cambios de sesión
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log('Auth event:', event)
      
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
      
      if (event === 'SIGNED_IN') {
        console.log('Usuario logueado:', session?.user.email)
      }
    }
  )

  // Cleanup
  return () => subscription.unsubscribe()
}, [])
```

### Logout

```typescript
const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('Error al cerrar sesión:', error)
    return
  }
  
  router.push('/login')
}
```

## 🔧 JWT Tokens

### Estructura del Token

```javascript
// Decodificado de JWT
{
  "aud": "authenticated",
  "exp": 1234567890,  // Timestamp de expiración
  "iat": 1234567800,  // Timestamp de creación
  "iss": "supabase",
  "sub": "uuid-del-usuario",  // User ID
  "email": "admin@chamosbarber.com",
  "role": "authenticated",
  "session_id": "session-uuid"
}
```

### Acceso al Token

```typescript
// Obtener token actual
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

// Usar token en headers (ejemplo)
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### Renovación Automática

Supabase renueva automáticamente los tokens cuando expiran:

```typescript
// Configuración en _app.tsx
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'

const [supabaseClient] = useState(() => 
  createBrowserSupabaseClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options: {
      auth: {
        autoRefreshToken: true,  // ← Auto-renovación
        persistSession: true,    // ← Persistir sesión
      }
    }
  })
)
```

## ⚠️ Row Level Security (RLS)

### Estado de RLS en admin_users

```sql
-- RLS DESHABILITADO para evitar recursión infinita
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Todas las políticas eliminadas:
DROP POLICY IF EXISTS "admin_users_select_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_authenticated_select" ON admin_users;
DROP POLICY IF EXISTS "admin_users_select_own" ON admin_users;
```

**¿Por qué?**

El problema de recursión infinita ocurría así:

```
1. Usuario hace login → Se genera JWT
2. Query a admin_users para verificar rol
3. RLS policy verifica si user tiene permiso
4. Para verificar permiso, RLS consulta admin_users
5. Para consultar admin_users, RLS verifica permiso
6. ♻️ Loop infinito → Error
```

**Solución**: Deshabilitar RLS en `admin_users` y verificar permisos en código.

### RLS en Otras Tablas

**barberos, servicios, citas, portfolio**: RLS HABILITADO

```sql
-- Ejemplo: Políticas en barberos (NO MODIFICAR)
-- Estas políticas están funcionando correctamente
```

## 🐛 Debugging de Auth

### Logs Útiles

```typescript
// En login.tsx
console.log('🔍 Verificando acceso para:', session.user.email)
console.log('🆔 User ID:', session.user.id)
console.log('✅ Usuario autorizado:', adminUser.rol)
console.log('🔀 Redirigiendo a:', path)

// En páginas protegidas
console.log('🔐 Sesión actual:', session)
console.log('👤 Usuario:', user.email)
console.log('🎭 Rol:', adminUser.rol)
```

### Problemas Comunes

#### 1. Login no redirige

**Síntomas**: Usuario ingresa credenciales correctas pero no redirige

**Causas posibles**:
- Query usa `.eq('email', ...)` en lugar de `.eq('id', ...)`
- Usuario no existe en `admin_users`
- Usuario está desactivado (`activo = false`)
- RLS bloqueando query (ya resuelto)

**Solución**:
```typescript
// INCORRECTO
.eq('email', session.user.email)

// CORRECTO
.eq('id', session.user.id)
```

#### 2. Error "infinite recursion detected"

**Causa**: RLS policies recursivas en `admin_users`

**Solución**: Ya aplicada, RLS deshabilitado en esa tabla

#### 3. Redirect loop

**Síntomas**: Página redirige infinitamente entre login y panel

**Causa**: Verificación de auth dentro de `useEffect` sin dependencias correctas

**Solución**:
```typescript
useEffect(() => {
  checkAuth()
}, [])  // ← Dependencias vacías, solo ejecutar una vez
```

## 📊 Flujo de Creación de Usuario

### 1. Crear Usuario en Supabase Auth

```sql
-- Ejecutar en Supabase Studio SQL Editor
-- Esto crea el usuario en auth.users y genera hash de password
```

O desde código:

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'nuevo@chamosbarber.com',
  password: 'PasswordSeguro123!',
})

if (error) {
  console.error('Error creando usuario:', error)
  return
}

console.log('Usuario creado:', data.user.id)
```

### 2. Insertar en admin_users

```sql
-- Para Admin
INSERT INTO admin_users (id, email, rol, activo) 
VALUES (
  'uuid-del-usuario',  -- Mismo ID de auth.users
  'admin@chamosbarber.com',
  'admin',
  true
);

-- Para Barbero
INSERT INTO admin_users (id, email, rol, activo, barbero_id) 
VALUES (
  'uuid-del-usuario',
  'barbero@chamosbarber.com',
  'barbero',
  true,
  'uuid-del-barbero'  -- Referencia a tabla barberos
);
```

### 3. Confirmar Email (Opcional)

```sql
-- Si Supabase requiere confirmación de email
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE id = 'uuid-del-usuario';
```

## 🔑 Credenciales de Prueba

Ver `README.md` en la raíz del proyecto para credenciales actualizadas.

```
Admin:
- Email: admin@chamosbarber.com
- Password: ChamosAdmin2024!

Barbero (ejemplo):
- Email: barbero@chamosbarber.com
- Password: [definir según necesidad]
```

## 🛠️ Mantenimiento

### Desactivar Usuario

```sql
UPDATE admin_users 
SET activo = false 
WHERE email = 'usuario@chamosbarber.com';
```

### Cambiar Rol

```sql
UPDATE admin_users 
SET rol = 'barbero', barbero_id = 'uuid-barbero' 
WHERE email = 'usuario@chamosbarber.com';
```

### Reset Password

```typescript
// Desde código
const { error } = await supabase.auth.resetPasswordForEmail(
  'usuario@chamosbarber.com',
  { redirectTo: 'https://chamosbarber.com/reset-password' }
)
```

## 📚 Referencias

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [JWT.io](https://jwt.io) - Decodificar tokens
- [Supabase Auth Helpers](https://github.com/supabase/auth-helpers)
