-- ==================================================================
-- MIGRACIÓN: Agregar sistema de pago a citas
-- ==================================================================
-- Propósito: Permitir cobrar y facturar citas desde el POS
-- Fecha: 2025-11-09
-- ==================================================================

-- 1. Agregar columnas de pago a tabla citas
ALTER TABLE citas 
ADD COLUMN IF NOT EXISTS estado_pago TEXT DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'pagado', 'parcial')),
ADD COLUMN IF NOT EXISTS monto_pagado DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS metodo_pago TEXT,
ADD COLUMN IF NOT EXISTS factura_id UUID REFERENCES facturas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cobrado_por UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- 2. Crear índice para búsquedas por estado de pago
CREATE INDEX IF NOT EXISTS idx_citas_estado_pago ON citas(estado_pago, fecha);

-- 3. Comentarios para documentación
COMMENT ON COLUMN citas.estado_pago IS 'Estado del pago: pendiente, pagado, parcial';
COMMENT ON COLUMN citas.monto_pagado IS 'Monto ya pagado por el cliente';
COMMENT ON COLUMN citas.metodo_pago IS 'Método usado para pagar: efectivo, tarjeta, transferencia, zelle, binance';
COMMENT ON COLUMN citas.factura_id IS 'Referencia a la factura generada al cobrar';
COMMENT ON COLUMN citas.fecha_pago IS 'Fecha y hora en que se cobró la cita';
COMMENT ON COLUMN citas.cobrado_por IS 'Usuario que procesó el pago (cajero o admin)';

-- 4. Migrar datos existentes (todas las citas antiguas se marcan como pagadas)
-- Esto asume que las citas pasadas ya fueron pagadas
UPDATE citas 
SET estado_pago = 'pagado',
    fecha_pago = created_at
WHERE fecha < CURRENT_DATE 
  AND estado = 'completada'
  AND estado_pago = 'pendiente';

-- 5. Crear función para marcar cita como pagada y crear factura
CREATE OR REPLACE FUNCTION cobrar_cita(
  p_cita_id UUID,
  p_metodo_pago TEXT,
  p_monto_recibido DECIMAL DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  factura_id UUID,
  numero_factura TEXT,
  mensaje TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cita RECORD;
  v_factura_id UUID;
  v_numero_factura TEXT;
  v_total DECIMAL;
  v_cambio DECIMAL;
  v_items JSONB;
  v_comision_barbero DECIMAL;
  v_ingreso_casa DECIMAL;
  v_porcentaje_comision DECIMAL;
BEGIN
  -- 1. Obtener información de la cita
  SELECT c.*, 
         b.nombre || ' ' || b.apellido as barbero_nombre,
         s.nombre as servicio_nombre,
         s.precio as servicio_precio
  INTO v_cita
  FROM citas c
  JOIN barberos b ON b.id = c.barbero_id
  JOIN servicios s ON s.id = c.servicio_id
  WHERE c.id = p_cita_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, 'Cita no encontrada';
    RETURN;
  END IF;

  -- 2. Verificar si ya está pagada
  IF v_cita.estado_pago = 'pagado' THEN
    RETURN QUERY SELECT FALSE, v_cita.factura_id, NULL::TEXT, 'Esta cita ya fue pagada';
    RETURN;
  END IF;

  -- 3. Calcular total y comisiones
  v_total := v_cita.servicio_precio;
  
  -- Obtener porcentaje de comisión del barbero
  SELECT COALESCE(porcentaje, 50) 
  INTO v_porcentaje_comision
  FROM configuracion_comisiones 
  WHERE barbero_id = v_cita.barbero_id;
  
  -- Si no existe configuración, usar 50%
  IF v_porcentaje_comision IS NULL THEN
    v_porcentaje_comision := 50;
  END IF;

  v_comision_barbero := v_total * (v_porcentaje_comision / 100);
  v_ingreso_casa := v_total - v_comision_barbero;

  -- 4. Calcular cambio (solo para efectivo)
  IF p_metodo_pago = 'efectivo' AND p_monto_recibido IS NOT NULL THEN
    v_cambio := GREATEST(0, p_monto_recibido - v_total);
  ELSE
    v_cambio := 0;
  END IF;

  -- 5. Preparar items para la factura
  v_items := jsonb_build_array(
    jsonb_build_object(
      'servicio_id', v_cita.servicio_id,
      'nombre', v_cita.servicio_nombre,
      'precio', v_cita.servicio_precio,
      'cantidad', 1,
      'subtotal', v_cita.servicio_precio
    )
  );

  -- 6. Crear factura
  INSERT INTO facturas (
    barbero_id,
    cliente_nombre,
    items,
    subtotal,
    total,
    metodo_pago,
    monto_recibido,
    cambio,
    porcentaje_comision,
    comision_barbero,
    ingreso_casa,
    created_by,
    cita_id
  ) VALUES (
    v_cita.barbero_id,
    v_cita.cliente_nombre,
    v_items,
    v_total,
    v_total,
    p_metodo_pago,
    COALESCE(p_monto_recibido, v_total),
    v_cambio,
    v_porcentaje_comision,
    v_comision_barbero,
    v_ingreso_casa,
    p_usuario_id,
    p_cita_id
  )
  RETURNING id, numero_factura INTO v_factura_id, v_numero_factura;

  -- 7. Actualizar cita como pagada
  UPDATE citas
  SET estado_pago = 'pagado',
      monto_pagado = v_total,
      metodo_pago = p_metodo_pago,
      factura_id = v_factura_id,
      fecha_pago = NOW(),
      cobrado_por = p_usuario_id
  WHERE id = p_cita_id;

  -- 8. Retornar éxito
  RETURN QUERY SELECT TRUE, v_factura_id, v_numero_factura, 'Cobro procesado exitosamente';
END;
$$;

-- 6. Dar permisos
GRANT EXECUTE ON FUNCTION cobrar_cita(UUID, TEXT, DECIMAL, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cobrar_cita(UUID, TEXT, DECIMAL, UUID) TO service_role;

-- 7. Agregar columna cita_id a facturas si no existe
ALTER TABLE facturas 
ADD COLUMN IF NOT EXISTS cita_id UUID REFERENCES citas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_facturas_cita_id ON facturas(cita_id);

COMMENT ON COLUMN facturas.cita_id IS 'Referencia a la cita que originó esta factura';

-- ==================================================================
-- RESULTADO ESPERADO:
-- ==================================================================
-- ✅ Columnas de pago agregadas a tabla citas
-- ✅ Función cobrar_cita() creada
-- ✅ Índices creados para optimización
-- ✅ Relación bidireccional citas <-> facturas establecida
-- ==================================================================
