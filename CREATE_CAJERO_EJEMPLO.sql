-- ================================================
-- CREAR USUARIO CAJERO DE EJEMPLO
-- ================================================

-- Insertar usuario cajero en la tabla admin_users
INSERT INTO public.admin_users (
  email,
  nombre,
  rol,
  activo,
  telefono
) VALUES (
  'cajero@chamosbarber.com',
  'Cajero Principal',
  'cajero',
  true,
  '+58412-1234567'
)
ON CONFLICT (email) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rol = EXCLUDED.rol,
  activo = EXCLUDED.activo,
  telefono = EXCLUDED.telefono;

-- Verificar que se creó correctamente
SELECT 
  id,
  email,
  nombre,
  rol,
  activo,
  telefono
FROM public.admin_users
WHERE email = 'cajero@chamosbarber.com';

-- Ver el usuario con sus permisos
SELECT 
  id,
  email,
  nombre,
  rol,
  rol_nombre,
  activo,
  permisos
FROM public.usuarios_con_permisos
WHERE email = 'cajero@chamosbarber.com';

-- ================================================
-- RESULTADO ESPERADO
-- ================================================
-- Email: cajero@chamosbarber.com
-- Nombre: Cajero Principal
-- Rol: cajero
-- Activo: true
-- ================================================

-- NOTA IMPORTANTE:
-- Este usuario está en la tabla admin_users, pero NO en Supabase Auth.
-- Para que pueda hacer login, necesitas crear el usuario en Supabase Auth.
-- 
-- Opciones:
-- 1. Desde Supabase Dashboard → Authentication → Add user
-- 2. Usar el panel admin para crear usuarios (cuando esté implementado)
-- 3. Por ahora, usa el admin existente para probar el POS
-- ================================================
