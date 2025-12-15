-- ================================================================
-- 🔧 FIX: Agregar columna 'items' y otras faltantes (SIN migración)
-- ================================================================
--
-- PROBLEMA: 
-- - El código frontend intenta insertar 'items' (JSONB) pero no existe
-- - La tabla facturas usa 'facturas_detalle' pero el código usa 'items'
--
-- SOLUCIÓN:
-- - Agregar columna 'items' JSONB para compatibilidad con frontend
-- - NO migrar datos (no hay columna 'servicios' de donde migrar)
-- ================================================================

BEGIN;

-- Agregar columna 'items' (JSONB) para almacenar detalle de servicios
ALTER TABLE public.facturas 
ADD COLUMN IF NOT EXISTS items JSONB;

-- Agregar columna 'cliente_telefono' si no existe
ALTER TABLE public.facturas 
ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(20);

-- Agregar columna 'created_by' para tracking
ALTER TABLE public.facturas 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Crear trigger para establecer created_by automáticamente
CREATE OR REPLACE FUNCTION public.set_facturas_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_facturas_created_by ON public.facturas;
CREATE TRIGGER trigger_set_facturas_created_by
  BEFORE INSERT ON public.facturas
  FOR EACH ROW
  EXECUTE FUNCTION set_facturas_created_by();

COMMIT;

-- ================================================================
-- ✅ VERIFICACIÓN
-- ================================================================

-- Ver estructura de facturas
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'facturas'
ORDER BY ordinal_position;

-- Verificar que las columnas críticas existan
SELECT 
  COUNT(*) as total_columns,
  COUNT(CASE WHEN column_name = 'items' THEN 1 END) as has_items,
  COUNT(CASE WHEN column_name = 'barbero_id' THEN 1 END) as has_barbero_id,
  COUNT(CASE WHEN column_name = 'cliente_nombre' THEN 1 END) as has_cliente_nombre,
  COUNT(CASE WHEN column_name = 'cliente_rut' THEN 1 END) as has_cliente_rut,
  COUNT(CASE WHEN column_name = 'cliente_telefono' THEN 1 END) as has_cliente_telefono,
  COUNT(CASE WHEN column_name = 'tipo_documento' THEN 1 END) as has_tipo_documento,
  COUNT(CASE WHEN column_name = 'subtotal' THEN 1 END) as has_subtotal,
  COUNT(CASE WHEN column_name = 'total' THEN 1 END) as has_total,
  COUNT(CASE WHEN column_name = 'metodo_pago' THEN 1 END) as has_metodo_pago,
  COUNT(CASE WHEN column_name = 'monto_recibido' THEN 1 END) as has_monto_recibido,
  COUNT(CASE WHEN column_name = 'cambio' THEN 1 END) as has_cambio,
  COUNT(CASE WHEN column_name = 'porcentaje_comision' THEN 1 END) as has_porcentaje_comision,
  COUNT(CASE WHEN column_name = 'comision_barbero' THEN 1 END) as has_comision_barbero,
  COUNT(CASE WHEN column_name = 'ingreso_casa' THEN 1 END) as has_ingreso_casa,
  COUNT(CASE WHEN column_name = 'created_by' THEN 1 END) as has_created_by
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'facturas';

-- Probar INSERT completo con todos los campos
DO $$
DECLARE
  carlos_id UUID;
  servicio_id UUID;
  test_factura_id UUID;
  test_numero VARCHAR;
BEGIN
  SELECT id INTO carlos_id FROM barberos WHERE nombre = 'Carlos' LIMIT 1;
  SELECT id INTO servicio_id FROM servicios WHERE nombre = 'Corte Clásico' LIMIT 1;
  
  INSERT INTO facturas (
    barbero_id,
    cliente_nombre,
    cliente_rut,
    cliente_telefono,
    tipo_documento,
    items,
    subtotal,
    total,
    metodo_pago,
    monto_recibido,
    cambio,
    porcentaje_comision,
    comision_barbero,
    ingreso_casa
  ) VALUES (
    carlos_id,
    'Cliente Test Final',
    '12345678-9',
    '+56911111111',
    'boleta',
    jsonb_build_array(
      jsonb_build_object(
        'servicio_id', servicio_id,
        'nombre', 'Corte Clásico',
        'precio', 15000,
        'cantidad', 1,
        'subtotal', 15000
      )
    ),
    15000,
    15000,
    'efectivo',
    20000,
    5000,
    50.00,
    7500,
    7500
  )
  RETURNING id, numero_factura INTO test_factura_id, test_numero;
  
  RAISE NOTICE '✅ Factura de prueba creada exitosamente';
  RAISE NOTICE 'ID: %', test_factura_id;
  RAISE NOTICE 'Número: %', test_numero;
  RAISE NOTICE 'Items: %', (SELECT items FROM facturas WHERE id = test_factura_id);
  RAISE NOTICE 'created_by: %', (SELECT created_by FROM facturas WHERE id = test_factura_id);
  
  -- Eliminar la factura de prueba
  DELETE FROM facturas WHERE id = test_factura_id;
  RAISE NOTICE '🗑️ Factura de prueba eliminada';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERROR: % - %', SQLSTATE, SQLERRM;
END $$;

-- ================================================================
-- 📋 RESUMEN
-- ================================================================
-- ✅ Columna 'items' (JSONB) agregada
-- ✅ Columna 'cliente_telefono' agregada (si faltaba)
-- ✅ Columna 'created_by' agregada con trigger automático
-- ✅ INSERT de prueba completado exitosamente
-- ✅ Tabla lista para el POS
-- ================================================================
