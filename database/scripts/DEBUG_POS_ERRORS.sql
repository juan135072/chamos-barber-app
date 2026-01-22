-- ================================================================
-- 🔍 DIAGNÓSTICO: Problemas con POS
-- ================================================================

-- 1. Verificar si la función calcular_comisiones_factura existe
SELECT 
  proname as function_name,
  proargnames as argument_names,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'calcular_comisiones_factura';

-- 2. Verificar permisos de la función
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'calcular_comisiones_factura';

-- 3. Probar la función manualmente
DO $$
DECLARE
  barbero_id UUID;
  resultado RECORD;
BEGIN
  -- Obtener ID de Carlos
  SELECT id INTO barbero_id FROM barberos WHERE nombre = 'Carlos' LIMIT 1;
  
  -- Probar función
  SELECT * INTO resultado FROM calcular_comisiones_factura(barbero_id, 15000);
  
  RAISE NOTICE 'Porcentaje: %', resultado.porcentaje;
  RAISE NOTICE 'Comisión Barbero: %', resultado.comision_barbero;
  RAISE NOTICE 'Ingreso Casa: %', resultado.ingreso_casa;
END $$;

-- 4. Ver estructura completa de tabla facturas
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'facturas'
ORDER BY ordinal_position;

-- 5. Ver constraints de facturas
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.facturas'::regclass;

-- 6. Intentar INSERT de prueba
DO $$
DECLARE
  barbero_id UUID;
  admin_id UUID;
BEGIN
  SELECT id INTO barbero_id FROM barberos WHERE nombre = 'Carlos' LIMIT 1;
  SELECT id INTO admin_id FROM admin_users WHERE email = 'contacto@chamosbarber.com' LIMIT 1;
  
  BEGIN
    INSERT INTO facturas (
      numero_factura,
      cliente_nombre,
      cliente_telefono,
      barbero_id,
      cajero_id,
      subtotal,
      total,
      metodo_pago,
      porcentaje_comision,
      comision_barbero,
      ingreso_casa
    ) VALUES (
      'TEST-001',
      'Cliente Prueba',
      '+56900000000',
      barbero_id,
      admin_id,
      15000,
      15000,
      'efectivo',
      50.00,
      7500,
      7500
    );
    
    RAISE NOTICE 'INSERT exitoso!';
    
    -- Eliminar registro de prueba
    DELETE FROM facturas WHERE numero_factura = 'TEST-001';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error en INSERT: %', SQLERRM;
  END;
END $$;
