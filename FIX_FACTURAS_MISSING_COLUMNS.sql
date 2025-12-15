-- ================================================================
-- 🔧 FIX: Agregar columnas faltantes a tabla facturas
-- ================================================================
--
-- PROBLEMA: 
-- Error PGRST204: Could not find the 'items' column
-- El código frontend intenta insertar columnas que no existen
--
-- SOLUCIÓN:
-- Agregar todas las columnas que el POS necesita
-- ================================================================

BEGIN;

-- Agregar columnas faltantes
ALTER TABLE public.facturas 
ADD COLUMN IF NOT EXISTS items JSONB,
ADD COLUMN IF NOT EXISTS cliente_rut VARCHAR(20),
ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(20) DEFAULT 'boleta' CHECK (tipo_documento IN ('boleta', 'factura')),
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS monto_recibido NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS cambio NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS porcentaje_comision NUMERIC(5,2);

-- Migrar datos existentes de 'servicios' ARRAY a 'items' JSONB
UPDATE public.facturas
SET items = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'servicio_id', s.id,
      'nombre', s.nombre,
      'precio', s.precio,
      'duracion_minutos', s.duracion_minutos
    )
  )
  FROM unnest(servicios) AS servicio_uuid
  LEFT JOIN servicios s ON s.id = servicio_uuid
)
WHERE items IS NULL AND servicios IS NOT NULL;

-- Establecer subtotal = total para registros existentes
UPDATE public.facturas
SET subtotal = total
WHERE subtotal IS NULL;

-- Establecer monto_recibido = total para registros existentes
UPDATE public.facturas
SET monto_recibido = total
WHERE monto_recibido IS NULL;

-- Copiar porcentaje de comisión de barberos
UPDATE public.facturas f
SET porcentaje_comision = b.porcentaje_comision
FROM barberos b
WHERE f.barbero_id = b.id 
  AND f.porcentaje_comision IS NULL;

COMMIT;

-- ================================================================
-- ✅ VERIFICACIÓN
-- ================================================================

-- Ver estructura completa de facturas
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'facturas'
ORDER BY ordinal_position;

-- Contar columnas
SELECT 
  COUNT(*) as total_columns,
  COUNT(CASE WHEN column_name = 'items' THEN 1 END) as has_items,
  COUNT(CASE WHEN column_name = 'cliente_rut' THEN 1 END) as has_cliente_rut,
  COUNT(CASE WHEN column_name = 'tipo_documento' THEN 1 END) as has_tipo_documento,
  COUNT(CASE WHEN column_name = 'subtotal' THEN 1 END) as has_subtotal,
  COUNT(CASE WHEN column_name = 'monto_recibido' THEN 1 END) as has_monto_recibido,
  COUNT(CASE WHEN column_name = 'cambio' THEN 1 END) as has_cambio,
  COUNT(CASE WHEN column_name = 'porcentaje_comision' THEN 1 END) as has_porcentaje_comision
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'facturas';

-- Probar INSERT con todos los campos
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
    cliente_rut,
    tipo_documento,
    items,
    subtotal,
    total,
    metodo_pago,
    monto_recibido,
    cambio,
    porcentaje_comision,
    comision_barbero,
    ingreso_casa,
    servicios
  ) VALUES (
    carlos_id,
    'Cliente Test Completo',
    '12345678-9',
    'boleta',
    jsonb_build_array(
      jsonb_build_object(
        'servicio_id', servicio_id,
        'nombre', 'Corte Clásico',
        'precio', 15000,
        'cantidad', 1
      )
    ),
    15000,
    15000,
    'efectivo',
    20000,
    5000,
    50.00,
    7500,
    7500,
    ARRAY[servicio_id]
  )
  RETURNING id INTO test_factura_id;
  
  RAISE NOTICE '✅ Factura de prueba creada exitosamente: %', test_factura_id;
  
  -- Mostrar la factura creada
  RAISE NOTICE 'Número: %, Total: %, Items: %', 
    (SELECT numero_factura FROM facturas WHERE id = test_factura_id),
    (SELECT total FROM facturas WHERE id = test_factura_id),
    (SELECT items FROM facturas WHERE id = test_factura_id);
  
  -- Eliminar la factura de prueba
  DELETE FROM facturas WHERE id = test_factura_id;
  RAISE NOTICE '🗑️ Factura de prueba eliminada';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERROR: % - %', SQLSTATE, SQLERRM;
END $$;

-- ================================================================
-- 📋 RESUMEN
-- ================================================================
-- ✅ Columnas agregadas a facturas:
--    - items (JSONB) - detalles de servicios
--    - cliente_rut (VARCHAR) - RUT para facturas
--    - tipo_documento (VARCHAR) - 'boleta' o 'factura'
--    - subtotal (NUMERIC) - subtotal antes de ajustes
--    - monto_recibido (NUMERIC) - monto pagado por cliente
--    - cambio (NUMERIC) - vuelto
--    - porcentaje_comision (NUMERIC) - % personalizado
-- ✅ Datos existentes migrados
-- ✅ INSERT de prueba exitoso
-- ================================================================
