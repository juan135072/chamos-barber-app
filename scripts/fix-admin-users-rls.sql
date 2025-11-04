-- Verificar políticas actuales en admin_users
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'admin_users';

-- Eliminar políticas conflictivas si existen
DROP POLICY IF EXISTS "admin_users_select_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_authenticated_select" ON admin_users;
DROP POLICY IF EXISTS "Users can read their own admin data" ON admin_users;

-- Crear política que permita a usuarios autenticados leer su propio registro
CREATE POLICY "admin_users_select_own"
ON admin_users FOR SELECT
TO authenticated
USING (id = auth.uid() AND activo = true);

-- Verificar que RLS esté habilitado
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Verificar políticas finales
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'admin_users';
