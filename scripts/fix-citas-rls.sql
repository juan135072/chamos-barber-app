-- ============================================
-- FIX: Políticas RLS para Citas Públicas
-- ============================================
-- Permitir que usuarios no autenticados (público)
-- puedan crear citas desde el formulario de reservas
-- ============================================

-- Verificar políticas actuales de citas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'citas'
ORDER BY policyname;

-- Eliminar políticas restrictivas si existen
DROP POLICY IF EXISTS "citas_public_insert" ON citas;
DROP POLICY IF EXISTS "citas_anon_insert" ON citas;

-- Crear política para permitir INSERT público
-- (los clientes pueden crear sus propias citas sin autenticación)
CREATE POLICY "citas_public_insert" 
ON citas FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Política para SELECT público (ver citas por teléfono en /consultar)
DROP POLICY IF EXISTS "citas_public_select" ON citas;
CREATE POLICY "citas_public_select"
ON citas FOR SELECT
TO anon, authenticated
USING (true);

-- Política para UPDATE solo admins y barberos
DROP POLICY IF EXISTS "citas_admin_update" ON citas;
CREATE POLICY "citas_admin_update"
ON citas FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users au
    WHERE au.id = auth.uid()
    AND au.activo = true
  )
);

-- Política para DELETE solo admins
DROP POLICY IF EXISTS "citas_admin_delete" ON citas;
CREATE POLICY "citas_admin_delete"
ON citas FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users au
    WHERE au.id = auth.uid()
    AND au.rol = 'admin'
    AND au.activo = true
  )
);

-- Service role siempre tiene acceso completo
DROP POLICY IF EXISTS "citas_service_all" ON citas;
CREATE POLICY "citas_service_all"
ON citas FOR ALL
TO service_role
USING (true);

-- Habilitar RLS en la tabla
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver todas las políticas de citas
SELECT 
  policyname,
  cmd,
  roles::text,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || pg_get_expr(qual, 'citas'::regclass)
    ELSE 'No USING'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || pg_get_expr(with_check, 'citas'::regclass)
    ELSE 'No WITH CHECK'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'citas'
ORDER BY cmd, policyname;

-- Verificar que RLS está habilitado
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'citas';

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- ✅ citas_public_insert: INSERT para anon y authenticated
-- ✅ citas_public_select: SELECT para anon y authenticated
-- ✅ citas_admin_update: UPDATE solo para admin_users autenticados
-- ✅ citas_admin_delete: DELETE solo para admins
-- ✅ citas_service_all: ALL para service_role
-- ✅ RLS habilitado en tabla citas
-- ============================================

-- ============================================
-- PRUEBA MANUAL (opcional)
-- ============================================
-- Para probar que funciona, puedes intentar insertar una cita de prueba:
/*
INSERT INTO citas (
  barbero_id,
  servicio_id,
  fecha,
  hora,
  cliente_nombre,
  cliente_telefono,
  estado
)
SELECT 
  (SELECT id FROM barberos WHERE slug = 'carlos-mendoza' LIMIT 1),
  (SELECT id FROM servicios WHERE activo = true LIMIT 1),
  CURRENT_DATE + INTERVAL '2 days',
  '10:00',
  'Cliente de Prueba',
  '+56999999999',
  'pendiente';

-- Verificar que se insertó
SELECT 
  c.id,
  c.fecha,
  c.hora,
  c.cliente_nombre,
  c.estado,
  b.nombre || ' ' || b.apellido as barbero,
  s.nombre as servicio
FROM citas c
INNER JOIN barberos b ON c.barbero_id = b.id
INNER JOIN servicios s ON c.servicio_id = s.id
WHERE c.cliente_telefono = '+56999999999';

-- Eliminar la cita de prueba
DELETE FROM citas WHERE cliente_telefono = '+56999999999';
*/
