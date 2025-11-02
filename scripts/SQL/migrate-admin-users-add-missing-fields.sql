-- ===================================================================
-- MIGRACIÓN: Agregar campos faltantes a admin_users
-- ===================================================================
-- Esta migración agrega campos que el código espera pero que no
-- existen en el esquema actual de admin_users
-- ===================================================================

-- 1. Agregar campo 'nombre' (REQUERIDO para mostrar nombre del usuario)
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS nombre TEXT;

-- 2. Agregar campo 'telefono' (OPCIONAL)
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS telefono TEXT;

-- 3. Agregar campo 'avatar_url' (OPCIONAL)
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 4. Comentarios para documentar
COMMENT ON COLUMN admin_users.nombre IS 'Nombre completo del usuario (admin o barbero)';
COMMENT ON COLUMN admin_users.telefono IS 'Teléfono de contacto del usuario';
COMMENT ON COLUMN admin_users.avatar_url IS 'URL de la imagen de perfil del usuario';

-- ===================================================================
-- MIGRACIÓN DE DATOS: Poblar nombre para usuarios existentes
-- ===================================================================

-- Para usuarios con rol 'barbero', copiar nombre del barbero asociado
UPDATE admin_users au
SET nombre = COALESCE(
  (SELECT b.nombre || ' ' || b.apellido 
   FROM barberos b 
   WHERE b.id = au.barbero_id),
  au.email  -- Fallback: usar email si no hay barbero asociado
)
WHERE au.nombre IS NULL AND au.rol = 'barbero';

-- Para usuarios con rol 'admin', usar un nombre por defecto si no tienen
UPDATE admin_users au
SET nombre = COALESCE(au.nombre, 'Administrador')
WHERE au.nombre IS NULL AND au.rol = 'admin';

-- ===================================================================
-- VERIFICACIÓN
-- ===================================================================

-- Mostrar estructura actualizada
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;

-- Verificar que todos los usuarios tienen nombre
SELECT 
  email,
  nombre,
  rol,
  barbero_id,
  activo,
  creado_en
FROM admin_users
ORDER BY creado_en DESC;

-- Contar usuarios sin nombre (debería ser 0)
SELECT 
  COUNT(*) as usuarios_sin_nombre
FROM admin_users
WHERE nombre IS NULL;

-- ===================================================================
-- RESULTADO ESPERADO:
-- ===================================================================
-- ✅ Columnas nombre, telefono, avatar_url agregadas
-- ✅ Todos los usuarios existentes tienen nombre poblado
-- ✅ usuarios_sin_nombre = 0
-- ✅ Código de la app ahora puede usar estos campos sin errores
-- ===================================================================
