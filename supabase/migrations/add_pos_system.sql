-- ================================================
-- MIGRACIÓN: Sistema POS y Facturación
-- Fecha: 2025-11-08
-- Descripción: Agregar funcionalidad de punto de venta
-- ================================================

-- 1. TABLA: facturas (tickets térmicos)
CREATE TABLE IF NOT EXISTS public.facturas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Numeración secuencial
  numero_factura VARCHAR(50) UNIQUE NOT NULL,
  
  -- Relaciones
  cita_id UUID REFERENCES public.citas(id) ON DELETE SET NULL,
  barbero_id UUID NOT NULL REFERENCES public.barberos(id) ON DELETE RESTRICT,
  
  -- Cliente
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_telefono VARCHAR(50),
  cliente_email VARCHAR(255),
  
  -- Detalles de venta
  items JSONB NOT NULL, 
  -- Formato: [
  --   {
  --     "servicio_id": "uuid",
  --     "nombre": "Corte Rapado",
  --     "precio": 5.00,
  --     "cantidad": 1,
  --     "subtotal": 5.00
  --   }
  -- ]
  
  -- Totales
  subtotal DECIMAL(10,2) NOT NULL,
  descuento DECIMAL(10,2) DEFAULT 0.00,
  iva DECIMAL(10,2) DEFAULT 0.00,
  total DECIMAL(10,2) NOT NULL,
  
  -- Pago
  metodo_pago VARCHAR(50) NOT NULL DEFAULT 'efectivo',
  -- Opciones: 'efectivo', 'tarjeta', 'transferencia', 'zelle', 'binance'
  monto_recibido DECIMAL(10,2),
  cambio DECIMAL(10,2) DEFAULT 0.00,
  
  -- Comisiones
  porcentaje_comision DECIMAL(5,2) NOT NULL, -- Ej: 50.00 para 50%
  comision_barbero DECIMAL(10,2) NOT NULL,
  ingreso_casa DECIMAL(10,2) NOT NULL,
  
  -- Metadata
  mesa_silla VARCHAR(50), -- "Barra", "Silla 1", "Silla 2"
  notas TEXT,
  
  -- Control
  impresa BOOLEAN DEFAULT false,
  anulada BOOLEAN DEFAULT false,
  fecha_anulacion TIMESTAMP WITH TIME ZONE,
  motivo_anulacion TEXT,
  anulada_por UUID REFERENCES public.admin_users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.admin_users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA: configuracion_comisiones
CREATE TABLE IF NOT EXISTS public.configuracion_comisiones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbero_id UUID UNIQUE NOT NULL REFERENCES public.barberos(id) ON DELETE CASCADE,
  
  -- Porcentaje de comisión del barbero
  porcentaje DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  
  -- Notas sobre el acuerdo
  notas TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. FUNCIÓN: Generar número de factura automático
CREATE OR REPLACE FUNCTION generar_numero_factura()
RETURNS TEXT AS $$
DECLARE
  ultimo_numero INTEGER;
  nuevo_numero TEXT;
BEGIN
  -- Obtener el último número de factura del día
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(numero_factura FROM '[0-9]+$') AS INTEGER)), 
    0
  ) INTO ultimo_numero
  FROM public.facturas
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Incrementar y formatear: F-YYYYMMDD-0001
  nuevo_numero := 'F-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                  LPAD((ultimo_numero + 1)::TEXT, 4, '0');
  
  RETURN nuevo_numero;
END;
$$ LANGUAGE plpgsql;

-- 4. TRIGGER: Auto-generar número de factura
CREATE OR REPLACE FUNCTION trigger_auto_numero_factura()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_factura IS NULL OR NEW.numero_factura = '' THEN
    NEW.numero_factura := generar_numero_factura();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_numero_factura
  BEFORE INSERT ON public.facturas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_numero_factura();

-- 5. TRIGGER: Actualizar updated_at
CREATE OR REPLACE FUNCTION trigger_update_facturas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_facturas_updated_at
  BEFORE UPDATE ON public.facturas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_facturas_updated_at();

CREATE TRIGGER update_comisiones_updated_at
  BEFORE UPDATE ON public.configuracion_comisiones
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_facturas_updated_at();

-- 6. ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_facturas_barbero_id ON public.facturas(barbero_id);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON public.facturas(created_at);
CREATE INDEX IF NOT EXISTS idx_facturas_cita_id ON public.facturas(cita_id);
CREATE INDEX IF NOT EXISTS idx_facturas_numero ON public.facturas(numero_factura);
CREATE INDEX IF NOT EXISTS idx_facturas_anulada ON public.facturas(anulada);

-- 7. RLS POLICIES
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_comisiones ENABLE ROW LEVEL SECURITY;

-- Policy: Todos pueden leer (para reportes)
CREATE POLICY "facturas_select_all"
  ON public.facturas FOR SELECT
  USING (true);

CREATE POLICY "comisiones_select_all"
  ON public.configuracion_comisiones FOR SELECT
  USING (true);

-- Policy: Solo autenticados pueden crear
CREATE POLICY "facturas_insert_authenticated"
  ON public.facturas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "comisiones_insert_authenticated"
  ON public.configuracion_comisiones FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Solo autenticados pueden actualizar
CREATE POLICY "facturas_update_authenticated"
  ON public.facturas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "comisiones_update_authenticated"
  ON public.configuracion_comisiones FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Solo autenticados pueden eliminar (anular)
CREATE POLICY "facturas_delete_authenticated"
  ON public.facturas FOR DELETE
  TO authenticated
  USING (true);

-- 8. VISTA: Resumen de ventas por barbero (diario)
CREATE OR REPLACE VIEW public.ventas_diarias_por_barbero AS
SELECT 
  b.id as barbero_id,
  b.nombre || ' ' || b.apellido as barbero_nombre,
  DATE(f.created_at) as fecha,
  COUNT(*) as total_ventas,
  SUM(f.total) as total_ingresos,
  SUM(f.comision_barbero) as total_comision,
  SUM(f.ingreso_casa) as total_casa,
  AVG(f.porcentaje_comision) as porcentaje_promedio
FROM public.barberos b
LEFT JOIN public.facturas f ON f.barbero_id = b.id AND f.anulada = false
GROUP BY b.id, b.nombre, b.apellido, DATE(f.created_at)
ORDER BY fecha DESC, total_ingresos DESC;

-- 9. VISTA: Resumen de caja del día
CREATE OR REPLACE VIEW public.cierre_caja_diario AS
SELECT 
  DATE(created_at) as fecha,
  metodo_pago,
  COUNT(*) as cantidad_transacciones,
  SUM(total) as total_cobrado,
  SUM(comision_barbero) as total_comisiones,
  SUM(ingreso_casa) as ingreso_neto_casa
FROM public.facturas
WHERE anulada = false
GROUP BY DATE(created_at), metodo_pago
ORDER BY fecha DESC, metodo_pago;

-- 10. COMENTARIOS de documentación
COMMENT ON TABLE public.facturas IS 'Registro de todas las ventas/facturas generadas en el POS';
COMMENT ON COLUMN public.facturas.items IS 'Array JSON con los servicios vendidos';
COMMENT ON COLUMN public.facturas.porcentaje_comision IS 'Porcentaje que se lleva el barbero (ej: 50.00)';
COMMENT ON COLUMN public.facturas.comision_barbero IS 'Monto que le corresponde al barbero';
COMMENT ON COLUMN public.facturas.ingreso_casa IS 'Monto que le corresponde a la barbería';

COMMENT ON TABLE public.configuracion_comisiones IS 'Configuración de % de comisión por barbero';

-- 11. DATOS INICIALES: Configurar comisiones por defecto para barberos existentes
INSERT INTO public.configuracion_comisiones (barbero_id, porcentaje, notas)
SELECT 
  id, 
  50.00, 
  'Comisión por defecto configurada automáticamente'
FROM public.barberos
WHERE activo = true
ON CONFLICT (barbero_id) DO NOTHING;

-- 12. FUNCIÓN: Calcular comisiones automáticamente
CREATE OR REPLACE FUNCTION calcular_comisiones_factura(
  p_barbero_id UUID,
  p_total DECIMAL(10,2)
)
RETURNS TABLE(
  porcentaje DECIMAL(5,2),
  comision_barbero DECIMAL(10,2),
  ingreso_casa DECIMAL(10,2)
) AS $$
DECLARE
  v_porcentaje DECIMAL(5,2);
BEGIN
  -- Obtener porcentaje configurado o usar 50% por defecto
  SELECT COALESCE(c.porcentaje, 50.00)
  INTO v_porcentaje
  FROM public.configuracion_comisiones c
  WHERE c.barbero_id = p_barbero_id;
  
  -- Si no existe configuración, usar 50%
  IF v_porcentaje IS NULL THEN
    v_porcentaje := 50.00;
  END IF;
  
  -- Calcular montos
  RETURN QUERY SELECT 
    v_porcentaje,
    ROUND((p_total * v_porcentaje / 100)::numeric, 2),
    ROUND((p_total * (100 - v_porcentaje) / 100)::numeric, 2);
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- FIN DE MIGRACIÓN
-- ================================================

-- Verificación
SELECT 'Migración completada exitosamente' as resultado;
SELECT COUNT(*) as barberos_con_comision FROM public.configuracion_comisiones;
