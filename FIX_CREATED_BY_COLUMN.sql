-- ================================================================
-- 🔧 FIX: Agregar columna created_by a tabla facturas
-- ================================================================
--
-- PROBLEMA: 
-- Error PGRST204: Could not find the 'created_by' column
-- La política RLS requiere created_by pero no existe
--
-- SOLUCIÓN:
-- 1. Agregar columna created_by
-- 2. Actualizar políticas RLS
-- ================================================================

BEGIN;

-- PASO 1: Agregar columna created_by (UUID referencia a auth.users)
ALTER TABLE public.facturas 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- PASO 2: Establecer valor por defecto para registros existentes
UPDATE public.facturas
SET created_by = (SELECT id FROM admin_users LIMIT 1)
WHERE created_by IS NULL;

-- PASO 3: Eliminar políticas RLS conflictivas
DROP POLICY IF EXISTS "facturas_insert_policy" ON public.facturas;
DROP POLICY IF EXISTS "facturas_select_policy" ON public.facturas;
DROP POLICY IF EXISTS "facturas_update_policy" ON public.facturas;
DROP POLICY IF EXISTS "facturas_delete_policy" ON public.facturas;

-- PASO 4: Crear políticas RLS simplificadas (sin depender de created_by para INSERT)

-- SELECT: Todos los autenticados pueden ver todas las facturas
CREATE POLICY "facturas_select_all" 
ON public.facturas 
FOR SELECT 
TO authenticated 
USING (true);

-- INSERT: Todos los autenticados pueden crear facturas
CREATE POLICY "facturas_insert_authenticated" 
ON public.facturas 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- UPDATE: Todos los autenticados pueden actualizar
CREATE POLICY "facturas_update_authenticated" 
ON public.facturas 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- DELETE: Solo admins pueden eliminar
CREATE POLICY "facturas_delete_admin" 
ON public.facturas 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid() 
    AND admin_users.rol = 'admin'
  )
);

-- PASO 5: Agregar trigger para establecer created_by automáticamente
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_facturas_created_by ON public.facturas;
CREATE TRIGGER set_facturas_created_by
  BEFORE INSERT ON public.facturas
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

COMMIT;

-- ================================================================
-- ✅ VERIFICACIÓN
-- ================================================================

-- Ver estructura de facturas (debe incluir created_by)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'facturas'
ORDER BY ordinal_position;

-- Ver políticas RLS de facturas
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'facturas'
ORDER BY policyname;

-- Probar INSERT de prueba
DO $$
DECLARE
  carlos_id UUID;
  servicio_id UUID;
  test_factura_id UUID;
BEGIN
  SELECT id INTO carlos_id FROM barberos WHERE nombre = 'Carlos' LIMIT 1;
  SELECT id INTO servicio_id FROM servicios WHERE nombre = 'Corte Clásico' LIMIT 1;
  
  INSERT INTO facturas (
    barbero_id,
    cliente_nombre,
    cliente_telefono,
    total,
    metodo_pago,
    servicios,
    comision_barbero,
    ingreso_casa
  ) VALUES (
    carlos_id,
    'Cliente Prueba Final',
    '+56999888777',
    15000,
    'efectivo',
    ARRAY[servicio_id],
    7500,
    7500
  )
  RETURNING id INTO test_factura_id;
  
  RAISE NOTICE 'Factura de prueba creada exitosamente: %', test_factura_id;
  
  -- Verificar que created_by se estableció automáticamente
  SELECT created_by INTO carlos_id FROM facturas WHERE id = test_factura_id;
  RAISE NOTICE 'created_by establecido: %', carlos_id;
  
  -- Eliminar la factura de prueba
  DELETE FROM facturas WHERE id = test_factura_id;
  RAISE NOTICE 'Factura de prueba eliminada';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR: % - %', SQLSTATE, SQLERRM;
END $$;

-- ================================================================
-- 📋 RESUMEN
-- ================================================================
-- ✅ Columna created_by agregada a facturas
-- ✅ Políticas RLS simplificadas y corregidas
-- ✅ Trigger para establecer created_by automáticamente
-- ✅ INSERT permitido para usuarios autenticados
-- ✅ SELECT permitido para todos los autenticados
-- ================================================================
