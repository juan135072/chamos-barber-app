-- ============================================
-- SCRIPT: Sistema de Roles y Permisos
-- ============================================
-- Este script implementa un sistema completo de autenticación
-- basado en roles para administradores y barberos
-- ============================================

-- ====================
-- PASO 1: Crear tabla de usuarios del sistema
-- ====================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'barbero')),
  barbero_id UUID REFERENCES barberos(id) ON DELETE CASCADE,
  activo BOOLEAN DEFAULT true,
  ultimo_acceso TIMESTAMPTZ,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_rol ON admin_users(rol);
CREATE INDEX IF NOT EXISTS idx_admin_users_barbero_id ON admin_users(barbero_id);

-- Comentarios
COMMENT ON TABLE admin_users IS 'Usuarios del sistema con roles (admin o barbero)';
COMMENT ON COLUMN admin_users.rol IS 'Rol del usuario: admin (dueño) o barbero (empleado)';
COMMENT ON COLUMN admin_users.barbero_id IS 'ID del barbero asociado (solo para rol barbero)';

-- ====================
-- PASO 2: Agregar campo user_id a barberos
-- ====================

-- Relacionar barbero con su usuario del sistema
ALTER TABLE barberos 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_barberos_user_id ON barberos(user_id);

-- ====================
-- PASO 3: RLS para admin_users
-- ====================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Política: Admins pueden ver todos los usuarios
DROP POLICY IF EXISTS "admin_users_admin_select" ON admin_users;
CREATE POLICY "admin_users_admin_select" 
ON admin_users FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.id = auth.uid() 
    AND au.rol = 'admin' 
    AND au.activo = true
  )
);

-- Política: Barberos solo pueden ver su propio usuario
DROP POLICY IF EXISTS "admin_users_barbero_select" ON admin_users;
CREATE POLICY "admin_users_barbero_select" 
ON admin_users FOR SELECT 
TO authenticated
USING (id = auth.uid());

-- Política: Solo admins pueden insertar usuarios
DROP POLICY IF EXISTS "admin_users_admin_insert" ON admin_users;
CREATE POLICY "admin_users_admin_insert" 
ON admin_users FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.id = auth.uid() 
    AND au.rol = 'admin' 
    AND au.activo = true
  )
);

-- Política: Solo admins pueden actualizar usuarios
DROP POLICY IF EXISTS "admin_users_admin_update" ON admin_users;
CREATE POLICY "admin_users_admin_update" 
ON admin_users FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.id = auth.uid() 
    AND au.rol = 'admin' 
    AND au.activo = true
  )
);

-- Política: Service role tiene acceso completo
DROP POLICY IF EXISTS "admin_users_service_all" ON admin_users;
CREATE POLICY "admin_users_service_all" 
ON admin_users FOR ALL 
TO service_role 
USING (true);

-- ====================
-- PASO 4: RLS actualizado para barberos
-- ====================

-- Barberos pueden actualizar solo su propio perfil
DROP POLICY IF EXISTS "barberos_barbero_update" ON barberos;
CREATE POLICY "barberos_barbero_update" 
ON barberos FOR UPDATE 
TO authenticated
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.id = auth.uid() 
    AND au.rol = 'admin' 
    AND au.activo = true
  )
);

-- ====================
-- PASO 5: RLS actualizado para barbero_portfolio
-- ====================

-- Barberos pueden ver solo su propio portfolio (no aprobado)
DROP POLICY IF EXISTS "portfolio_barbero_select" ON barbero_portfolio;
CREATE POLICY "portfolio_barbero_select" 
ON barbero_portfolio FOR SELECT 
TO authenticated
USING (
  barbero_id IN (
    SELECT b.id FROM barberos b
    JOIN admin_users au ON b.user_id = au.id
    WHERE au.id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.id = auth.uid() 
    AND au.rol = 'admin'
  )
);

-- Barberos pueden insertar en su propio portfolio
DROP POLICY IF EXISTS "portfolio_barbero_insert" ON barbero_portfolio;
CREATE POLICY "portfolio_barbero_insert" 
ON barbero_portfolio FOR INSERT 
TO authenticated
WITH CHECK (
  barbero_id IN (
    SELECT b.id FROM barberos b
    JOIN admin_users au ON b.user_id = au.id
    WHERE au.id = auth.uid()
  )
);

-- Barberos pueden actualizar su propio portfolio
DROP POLICY IF EXISTS "portfolio_barbero_update" ON barbero_portfolio;
CREATE POLICY "portfolio_barbero_update" 
ON barbero_portfolio FOR UPDATE 
TO authenticated
USING (
  barbero_id IN (
    SELECT b.id FROM barberos b
    JOIN admin_users au ON b.user_id = au.id
    WHERE au.id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.id = auth.uid() 
    AND au.rol = 'admin'
  )
);

-- Barberos pueden eliminar su propio portfolio
DROP POLICY IF EXISTS "portfolio_barbero_delete" ON barbero_portfolio;
CREATE POLICY "portfolio_barbero_delete" 
ON barbero_portfolio FOR DELETE 
TO authenticated
USING (
  barbero_id IN (
    SELECT b.id FROM barberos b
    JOIN admin_users au ON b.user_id = au.id
    WHERE au.id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.id = auth.uid() 
    AND au.rol = 'admin'
  )
);

-- ====================
-- PASO 6: Funciones de ayuda
-- ====================

-- Función para verificar si un usuario es admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = user_id 
    AND rol = 'admin' 
    AND activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario es barbero
CREATE OR REPLACE FUNCTION is_barbero(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = user_id 
    AND rol = 'barbero' 
    AND activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener barbero_id de un usuario
CREATE OR REPLACE FUNCTION get_barbero_id(user_id UUID)
RETURNS UUID AS $$
DECLARE
  barbero_uuid UUID;
BEGIN
  SELECT barbero_id INTO barbero_uuid
  FROM admin_users 
  WHERE id = user_id AND rol = 'barbero' AND activo = true;
  
  RETURN barbero_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================
-- PASO 7: Insertar usuario admin por defecto
-- ====================

DO $$
DECLARE
  admin_auth_id UUID;
BEGIN
  -- Buscar el auth.users ID del admin existente
  SELECT id INTO admin_auth_id 
  FROM auth.users 
  WHERE email = 'admin@chamosbarber.com'
  LIMIT 1;
  
  IF admin_auth_id IS NOT NULL THEN
    -- Insertar en admin_users si no existe
    INSERT INTO admin_users (id, email, rol, activo)
    VALUES (admin_auth_id, 'admin@chamosbarber.com', 'admin', true)
    ON CONFLICT (email) DO UPDATE
    SET rol = 'admin', activo = true, actualizado_en = NOW();
    
    RAISE NOTICE '✅ Usuario admin configurado: admin@chamosbarber.com';
  ELSE
    RAISE NOTICE '⚠️ No se encontró usuario admin@chamosbarber.com en auth.users';
    RAISE NOTICE '   Debes crearlo primero en Supabase Auth';
  END IF;
END $$;

-- ====================
-- PASO 8: Crear usuarios de ejemplo para barberos
-- ====================

DO $$
DECLARE
  carlos_id UUID;
  miguel_id UUID;
  luis_id UUID;
  jorge_id UUID;
  
  carlos_auth_id UUID;
  miguel_auth_id UUID;
  luis_auth_id UUID;
  jorge_auth_id UUID;
BEGIN
  -- Obtener IDs de barberos
  SELECT id INTO carlos_id FROM barberos WHERE slug = 'carlos-ramirez' LIMIT 1;
  SELECT id INTO miguel_id FROM barberos WHERE slug = 'miguel-torres' LIMIT 1;
  SELECT id INTO luis_id FROM barberos WHERE slug = 'luis-mendoza' LIMIT 1;
  SELECT id INTO jorge_id FROM barberos WHERE slug = 'jorge-silva' LIMIT 1;
  
  -- Crear usuarios en auth.users (esto debe hacerse manualmente o via API)
  -- Por ahora, solo preparamos la estructura
  
  RAISE NOTICE '📝 Para crear usuarios de barberos:';
  RAISE NOTICE '   1. Ve a Supabase → Authentication → Users';
  RAISE NOTICE '   2. Crea usuarios con estos emails:';
  RAISE NOTICE '      - carlos@chamosbarber.com (Carlos Ramírez)';
  RAISE NOTICE '      - miguel@chamosbarber.com (Miguel Torres)';
  RAISE NOTICE '      - luis@chamosbarber.com (Luis Mendoza)';
  RAISE NOTICE '      - jorge@chamosbarber.com (Jorge Silva)';
  RAISE NOTICE '   3. Luego ejecuta el script de asociación';
  
END $$;

-- ====================
-- PASO 9: Trigger para actualizar updated_at
-- ====================

CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_admin_users_updated_at ON admin_users;
CREATE TRIGGER trigger_update_admin_users_updated_at
BEFORE UPDATE ON admin_users
FOR EACH ROW
EXECUTE FUNCTION update_admin_users_updated_at();

-- ====================
-- VERIFICACIÓN
-- ====================

-- Verificar estructura de admin_users
SELECT 
  email,
  rol,
  CASE 
    WHEN barbero_id IS NOT NULL THEN (SELECT nombre || ' ' || apellido FROM barberos WHERE id = barbero_id)
    ELSE 'N/A'
  END as barbero,
  activo,
  creado_en
FROM admin_users
ORDER BY creado_en;

-- Contar usuarios por rol
SELECT 
  rol,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE activo = true) as activos
FROM admin_users
GROUP BY rol;

-- ====================
-- RESULTADO ESPERADO:
-- ====================
-- ✅ Tabla admin_users creada
-- ✅ RLS configurado para admin_users, barberos, barbero_portfolio
-- ✅ Funciones de ayuda creadas (is_admin, is_barbero, get_barbero_id)
-- ✅ Usuario admin configurado
-- ✅ Sistema listo para crear usuarios de barberos
-- ====================

-- ====================
-- NOTAS IMPORTANTES:
-- ====================
-- 1. Los barberos deben crearse PRIMERO en Supabase Auth (Authentication → Users)
-- 2. Usa la contraseña temporal que ellos cambiarán en primer login
-- 3. Después de crear en Auth, ejecuta el script de asociación
-- 4. El admin puede gestionar usuarios desde el panel admin
-- ====================
