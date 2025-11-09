-- ==================================================================
-- MIGRACIÓN: Corregir ambigüedad en función cobrar_cita()
-- ==================================================================
-- Propósito: Resolver error "column reference 'numero_factura' is ambiguous"
-- Fecha: 2025-11-09
-- ==================================================================

-- Recrear función cobrar_cita con columnas explícitas en lugar de c.*
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
  -- 1. Obtener información de la cita (COLUMNAS EXPLÍCITAS)
  SELECT c.id,
         c.servicio_id,
         c.barbero_id,
         c.cliente_nombre,
         c.cliente_telefono,
         c.estado_pago,
         c.factura_id as cita_factura_id,
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
    RETURN QUERY SELECT FALSE, v_cita.cita_factura_id, NULL::TEXT, 'Esta cita ya fue pagada';
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

  -- 6. Crear factura (ESPECIFICAR facturas.numero_factura en RETURNING)
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
  RETURNING facturas.id, facturas.numero_factura 
  INTO v_factura_id, v_numero_factura;

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

-- ==================================================================
-- RESULTADO ESPERADO:
-- ==================================================================
-- ✅ Función cobrar_cita() actualizada
-- ✅ Ambigüedad de numero_factura eliminada
-- ✅ Columnas explícitas en SELECT y RETURNING
-- ==================================================================
