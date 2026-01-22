-- ================================================================
-- 💰 SISTEMA DE LIQUIDACIÓN DE COMISIONES
-- ================================================================
--
-- CONFIGURACIÓN:
-- - Frecuencia: Flexible (admin decide)
-- - Comisión: Variable por barbero
-- - Acceso Barberos: Resumen básico
-- - Método Pago: Mixto (efectivo/transferencia)
-- - Comprobantes: PDF imprimible
-- - Control: Solo admin
--
-- ================================================================

-- ================================================================
-- PARTE 1: AGREGAR COLUMNAS A BARBEROS
-- ================================================================

-- Agregar porcentaje de comisión personalizado por barbero
ALTER TABLE public.barberos 
ADD COLUMN IF NOT EXISTS porcentaje_comision DECIMAL(5,2) DEFAULT 50.00;

-- Agregar campos bancarios (opcional para transferencias)
ALTER TABLE public.barberos 
ADD COLUMN IF NOT EXISTS banco VARCHAR(100),
ADD COLUMN IF NOT EXISTS tipo_cuenta VARCHAR(50),
ADD COLUMN IF NOT EXISTS numero_cuenta VARCHAR(50),
ADD COLUMN IF NOT EXISTS titular_cuenta VARCHAR(200);

-- Agregar RUT para comprobantes
ALTER TABLE public.barberos 
ADD COLUMN IF NOT EXISTS rut VARCHAR(20);

-- Comentarios en columnas
COMMENT ON COLUMN public.barberos.porcentaje_comision IS 'Porcentaje de comisión que recibe el barbero (ej: 50.00 = 50%)';
COMMENT ON COLUMN public.barberos.banco IS 'Banco para transferencias (ej: Banco de Chile)';
COMMENT ON COLUMN public.barberos.tipo_cuenta IS 'Tipo de cuenta (corriente/vista/ahorro)';
COMMENT ON COLUMN public.barberos.numero_cuenta IS 'Número de cuenta bancaria';

-- Actualizar barberos existentes con comisión 50%
UPDATE public.barberos 
SET porcentaje_comision = 50.00 
WHERE porcentaje_comision IS NULL;

-- ================================================================
-- PARTE 2: CREAR TABLA LIQUIDACIONES
-- ================================================================

CREATE TABLE IF NOT EXISTS public.liquidaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Número de liquidación (correlativo)
  numero_liquidacion VARCHAR(50) UNIQUE NOT NULL,
  
  -- Barbero
  barbero_id UUID NOT NULL REFERENCES public.barberos(id) ON DELETE RESTRICT,
  
  -- Período
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  
  -- Montos
  total_ventas DECIMAL(10,2) NOT NULL DEFAULT 0,
  cantidad_servicios INTEGER NOT NULL DEFAULT 0,
  porcentaje_comision DECIMAL(5,2) NOT NULL,
  total_comision DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Facturas incluidas (array de UUIDs)
  facturas_ids UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Estado
  estado VARCHAR(50) DEFAULT 'pendiente' 
    CHECK (estado IN ('pendiente', 'pagada', 'anulada')),
  
  -- Pago
  metodo_pago VARCHAR(50) 
    CHECK (metodo_pago IN ('efectivo', 'transferencia', 'mixto', NULL)),
  monto_efectivo DECIMAL(10,2) DEFAULT 0,
  monto_transferencia DECIMAL(10,2) DEFAULT 0,
  referencia_transferencia VARCHAR(100),
  fecha_pago TIMESTAMP WITH TIME ZONE,
  
  -- Control administrativo
  creado_por UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  pagado_por UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  
  -- Notas
  notas TEXT,
  motivo_anulacion TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para liquidaciones
CREATE INDEX IF NOT EXISTS idx_liquidaciones_barbero ON public.liquidaciones(barbero_id);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_estado ON public.liquidaciones(estado);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_fecha_inicio ON public.liquidaciones(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_fecha_fin ON public.liquidaciones(fecha_fin);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_numero ON public.liquidaciones(numero_liquidacion);

-- Comentarios
COMMENT ON TABLE public.liquidaciones IS 'Registro de liquidaciones de comisiones a barberos';
COMMENT ON COLUMN public.liquidaciones.numero_liquidacion IS 'Formato: LIQ-YYYYMM-NNNN';
COMMENT ON COLUMN public.liquidaciones.facturas_ids IS 'Array de UUIDs de facturas incluidas en esta liquidación';
COMMENT ON COLUMN public.liquidaciones.metodo_pago IS 'Método usado: efectivo, transferencia o mixto';

-- ================================================================
-- PARTE 3: HABILITAR RLS Y POLÍTICAS
-- ================================================================

ALTER TABLE public.liquidaciones ENABLE ROW LEVEL SECURITY;

-- Políticas para liquidaciones
CREATE POLICY "Liquidaciones - SELECT autenticado"
ON public.liquidaciones FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Liquidaciones - INSERT admin"
ON public.liquidaciones FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Liquidaciones - UPDATE admin"
ON public.liquidaciones FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Liquidaciones - DELETE admin"
ON public.liquidaciones FOR DELETE
TO authenticated
USING (true);

-- ================================================================
-- PARTE 4: FUNCIÓN GENERAR NÚMERO DE LIQUIDACIÓN
-- ================================================================

CREATE OR REPLACE FUNCTION public.generar_numero_liquidacion()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  fecha_actual DATE := CURRENT_DATE;
  anio VARCHAR(4) := TO_CHAR(fecha_actual, 'YYYY');
  mes VARCHAR(2) := TO_CHAR(fecha_actual, 'MM');
  contador INTEGER;
  numero_final VARCHAR(50);
BEGIN
  -- Contar liquidaciones del mes
  SELECT COUNT(*) + 1 INTO contador
  FROM public.liquidaciones
  WHERE TO_CHAR(created_at, 'YYYYMM') = anio || mes;
  
  -- Formato: LIQ-YYYYMM-NNNN (ej: LIQ-202512-0001)
  numero_final := 'LIQ-' || anio || mes || '-' || LPAD(contador::TEXT, 4, '0');
  
  RETURN numero_final;
END;
$$;

-- ================================================================
-- PARTE 5: FUNCIÓN CALCULAR COMISIONES PENDIENTES
-- ================================================================

CREATE OR REPLACE FUNCTION public.calcular_comisiones_pendientes(
  p_barbero_id UUID,
  p_fecha_inicio DATE DEFAULT NULL,
  p_fecha_fin DATE DEFAULT NULL
)
RETURNS TABLE (
  total_ventas DECIMAL(10,2),
  cantidad_servicios BIGINT,
  porcentaje_comision DECIMAL(5,2),
  total_comision DECIMAL(10,2),
  facturas_ids UUID[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(f.total), 0)::DECIMAL(10,2) as total_ventas,
    COUNT(f.id) as cantidad_servicios,
    b.porcentaje_comision,
    COALESCE(SUM(f.comision_barbero), 0)::DECIMAL(10,2) as total_comision,
    ARRAY_AGG(f.id) as facturas_ids
  FROM public.facturas f
  JOIN public.barberos b ON f.barbero_id = b.id
  WHERE f.barbero_id = p_barbero_id
    AND f.anulada = false
    AND NOT EXISTS (
      SELECT 1 FROM public.liquidaciones l
      WHERE f.id = ANY(l.facturas_ids)
        AND l.estado != 'anulada'
    )
    AND (p_fecha_inicio IS NULL OR DATE(f.created_at) >= p_fecha_inicio)
    AND (p_fecha_fin IS NULL OR DATE(f.created_at) <= p_fecha_fin)
  GROUP BY b.porcentaje_comision;
END;
$$;

-- ================================================================
-- PARTE 6: FUNCIÓN CREAR LIQUIDACIÓN
-- ================================================================

CREATE OR REPLACE FUNCTION public.crear_liquidacion(
  p_barbero_id UUID,
  p_fecha_inicio DATE,
  p_fecha_fin DATE,
  p_creado_por UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_liquidacion_id UUID;
  v_numero_liquidacion TEXT;
  v_datos RECORD;
BEGIN
  -- Generar número de liquidación
  v_numero_liquidacion := generar_numero_liquidacion();
  
  -- Obtener datos de comisiones pendientes
  SELECT * INTO v_datos
  FROM calcular_comisiones_pendientes(p_barbero_id, p_fecha_inicio, p_fecha_fin);
  
  -- Validar que hay facturas pendientes
  IF v_datos.cantidad_servicios = 0 THEN
    RAISE EXCEPTION 'No hay facturas pendientes para liquidar en este período';
  END IF;
  
  -- Crear liquidación
  INSERT INTO public.liquidaciones (
    numero_liquidacion,
    barbero_id,
    fecha_inicio,
    fecha_fin,
    total_ventas,
    cantidad_servicios,
    porcentaje_comision,
    total_comision,
    facturas_ids,
    estado,
    creado_por
  ) VALUES (
    v_numero_liquidacion,
    p_barbero_id,
    p_fecha_inicio,
    p_fecha_fin,
    v_datos.total_ventas,
    v_datos.cantidad_servicios,
    v_datos.porcentaje_comision,
    v_datos.total_comision,
    v_datos.facturas_ids,
    'pendiente',
    p_creado_por
  )
  RETURNING id INTO v_liquidacion_id;
  
  RETURN v_liquidacion_id;
END;
$$;

-- ================================================================
-- PARTE 7: FUNCIÓN MARCAR LIQUIDACIÓN COMO PAGADA
-- ================================================================

CREATE OR REPLACE FUNCTION public.pagar_liquidacion(
  p_liquidacion_id UUID,
  p_metodo_pago VARCHAR(50),
  p_monto_efectivo DECIMAL(10,2) DEFAULT 0,
  p_monto_transferencia DECIMAL(10,2) DEFAULT 0,
  p_referencia_transferencia VARCHAR(100) DEFAULT NULL,
  p_pagado_por UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_comision DECIMAL(10,2);
  v_monto_total DECIMAL(10,2);
BEGIN
  -- Obtener total de comisión
  SELECT total_comision INTO v_total_comision
  FROM public.liquidaciones
  WHERE id = p_liquidacion_id;
  
  IF v_total_comision IS NULL THEN
    RAISE EXCEPTION 'Liquidación no encontrada';
  END IF;
  
  -- Calcular monto total pagado
  v_monto_total := COALESCE(p_monto_efectivo, 0) + COALESCE(p_monto_transferencia, 0);
  
  -- Validar que el monto coincida
  IF v_monto_total != v_total_comision THEN
    RAISE EXCEPTION 'El monto pagado (%) no coincide con el total de comisión (%)', 
      v_monto_total, v_total_comision;
  END IF;
  
  -- Actualizar liquidación
  UPDATE public.liquidaciones
  SET 
    estado = 'pagada',
    metodo_pago = p_metodo_pago,
    monto_efectivo = p_monto_efectivo,
    monto_transferencia = p_monto_transferencia,
    referencia_transferencia = p_referencia_transferencia,
    fecha_pago = NOW(),
    pagado_por = p_pagado_por,
    updated_at = NOW()
  WHERE id = p_liquidacion_id;
  
  RETURN true;
END;
$$;

-- ================================================================
-- PARTE 8: VISTA PARA RESUMEN DE BARBEROS
-- ================================================================

CREATE OR REPLACE VIEW public.barberos_resumen AS
SELECT 
  b.id,
  b.nombre,
  b.apellido,
  b.email,
  b.telefono,
  b.activo,
  b.porcentaje_comision,
  
  -- Ventas totales (no anuladas)
  COUNT(DISTINCT f.id) FILTER (WHERE f.anulada = false) as total_ventas,
  COALESCE(SUM(f.total) FILTER (WHERE f.anulada = false), 0) as total_vendido,
  
  -- Comisiones
  COALESCE(SUM(f.comision_barbero) FILTER (WHERE f.anulada = false), 0) as total_comisiones,
  
  -- Comisiones pendientes (no liquidadas)
  COALESCE(
    SUM(f.comision_barbero) FILTER (
      WHERE f.anulada = false 
      AND NOT EXISTS (
        SELECT 1 FROM liquidaciones l
        WHERE f.id = ANY(l.facturas_ids)
        AND l.estado != 'anulada'
      )
    ), 0
  ) as comisiones_pendientes,
  
  -- Comisiones pagadas
  COALESCE(
    SUM(l.total_comision) FILTER (WHERE l.estado = 'pagada'), 0
  ) as comisiones_pagadas,
  
  -- Última liquidación
  MAX(l.fecha_pago) as ultima_liquidacion
  
FROM public.barberos b
LEFT JOIN public.facturas f ON b.id = f.barbero_id
LEFT JOIN public.liquidaciones l ON b.id = l.barbero_id
GROUP BY b.id, b.nombre, b.apellido, b.email, b.telefono, b.activo, b.porcentaje_comision;

-- Dar permisos a la vista
GRANT SELECT ON public.barberos_resumen TO authenticated;

-- ================================================================
-- PARTE 9: TRIGGER PARA UPDATED_AT
-- ================================================================

DROP TRIGGER IF EXISTS trigger_liquidaciones_updated_at ON public.liquidaciones;
CREATE TRIGGER trigger_liquidaciones_updated_at
  BEFORE UPDATE ON public.liquidaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();

-- ================================================================
-- ✅ VERIFICACIÓN
-- ================================================================

-- Verificar columnas agregadas a barberos
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'barberos'
  AND column_name IN ('porcentaje_comision', 'banco', 'tipo_cuenta', 'numero_cuenta', 'rut');

-- Verificar tabla liquidaciones
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'liquidaciones'
ORDER BY ordinal_position;

-- Probar función generar número
SELECT generar_numero_liquidacion();

-- Ver resumen de barberos
SELECT 
  nombre,
  apellido,
  porcentaje_comision,
  total_ventas,
  total_vendido,
  comisiones_pendientes,
  comisiones_pagadas
FROM barberos_resumen
WHERE activo = true;

-- ================================================================
-- 📋 RESUMEN
-- ================================================================
-- ✅ Tabla barberos actualizada (% comisión, datos bancarios)
-- ✅ Tabla liquidaciones creada
-- ✅ Políticas RLS configuradas
-- ✅ Función generar_numero_liquidacion() creada
-- ✅ Función calcular_comisiones_pendientes() creada
-- ✅ Función crear_liquidacion() creada
-- ✅ Función pagar_liquidacion() creada
-- ✅ Vista barberos_resumen creada
-- ✅ Triggers configurados
-- ================================================================
