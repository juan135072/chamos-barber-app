-- ================================================================
-- 💰 SISTEMA DE LIQUIDACIONES - IMPLEMENTACIÓN COMPLETA
-- ================================================================
--
-- CARACTERÍSTICAS:
-- - Comisiones variables por barbero
-- - Liquidaciones cuando el barbero solicite
-- - Pagos mixtos (efectivo + transferencia)
-- - Control total del admin
-- - Comprobantes con detalles
-- ================================================================

BEGIN;

-- ================================================================
-- PASO 1: AGREGAR CAMPOS BANCARIOS A BARBEROS
-- ================================================================

-- Agregar campos para datos bancarios (si no existen)
ALTER TABLE public.barberos 
ADD COLUMN IF NOT EXISTS banco VARCHAR(100),
ADD COLUMN IF NOT EXISTS tipo_cuenta VARCHAR(50) CHECK (tipo_cuenta IN ('corriente', 'vista', 'ahorro', 'rut')),
ADD COLUMN IF NOT EXISTS numero_cuenta VARCHAR(50),
ADD COLUMN IF NOT EXISTS titular_cuenta VARCHAR(200),
ADD COLUMN IF NOT EXISTS rut_titular VARCHAR(20);

-- ================================================================
-- PASO 2: CREAR TABLA liquidaciones
-- ================================================================

CREATE TABLE IF NOT EXISTS public.liquidaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_liquidacion VARCHAR(50) UNIQUE NOT NULL,
  
  -- Barbero
  barbero_id UUID NOT NULL REFERENCES public.barberos(id) ON DELETE RESTRICT,
  
  -- Período
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  
  -- Ventas del período
  total_ventas INTEGER DEFAULT 0,
  monto_total_vendido NUMERIC(10,2) DEFAULT 0,
  
  -- Comisiones
  porcentaje_comision NUMERIC(5,2) NOT NULL,
  total_comision NUMERIC(10,2) NOT NULL,
  
  -- Estado
  estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'cancelada')),
  
  -- Pago
  metodo_pago VARCHAR(50) CHECK (metodo_pago IN ('efectivo', 'transferencia', 'mixto')),
  monto_efectivo NUMERIC(10,2) DEFAULT 0,
  monto_transferencia NUMERIC(10,2) DEFAULT 0,
  fecha_pago TIMESTAMP WITH TIME ZONE,
  
  -- Referencias
  numero_transferencia VARCHAR(100),
  comprobante_url TEXT,
  
  -- Notas
  notas TEXT,
  
  -- Control
  creada_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pagada_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para liquidaciones
CREATE INDEX IF NOT EXISTS idx_liquidaciones_barbero ON public.liquidaciones(barbero_id);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_estado ON public.liquidaciones(estado);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_fecha_inicio ON public.liquidaciones(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_fecha_fin ON public.liquidaciones(fecha_fin);

-- ================================================================
-- PASO 3: FUNCIÓN PARA GENERAR NÚMERO DE LIQUIDACIÓN
-- ================================================================

CREATE OR REPLACE FUNCTION public.generar_numero_liquidacion()
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  ultimo_numero INTEGER;
  nuevo_numero VARCHAR;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(numero_liquidacion FROM '[0-9]+') AS INTEGER)), 
    0
  )
  INTO ultimo_numero
  FROM public.liquidaciones
  WHERE numero_liquidacion ~ '^L-[0-9]+$';
  
  ultimo_numero := ultimo_numero + 1;
  nuevo_numero := 'L-' || LPAD(ultimo_numero::TEXT, 4, '0');
  
  RETURN nuevo_numero;
END;
$$;

-- ================================================================
-- PASO 4: TRIGGER PARA AUTO-GENERAR numero_liquidacion
-- ================================================================

CREATE OR REPLACE FUNCTION public.set_numero_liquidacion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_liquidacion IS NULL OR NEW.numero_liquidacion = '' THEN
    NEW.numero_liquidacion := generar_numero_liquidacion();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_numero_liquidacion ON public.liquidaciones;
CREATE TRIGGER trigger_set_numero_liquidacion
  BEFORE INSERT ON public.liquidaciones
  FOR EACH ROW
  EXECUTE FUNCTION set_numero_liquidacion();

-- ================================================================
-- PASO 5: FUNCIÓN PARA CALCULAR COMISIONES PENDIENTES
-- ================================================================

CREATE OR REPLACE FUNCTION public.calcular_comisiones_pendientes(
  p_barbero_id UUID,
  p_fecha_inicio DATE DEFAULT NULL,
  p_fecha_fin DATE DEFAULT NULL
)
RETURNS TABLE (
  total_ventas BIGINT,
  monto_total_vendido NUMERIC,
  porcentaje_comision NUMERIC,
  total_comision NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_porcentaje NUMERIC;
  v_fecha_inicio DATE;
  v_fecha_fin DATE;
BEGIN
  -- Obtener porcentaje del barbero
  SELECT porcentaje_comision INTO v_porcentaje
  FROM public.barberos
  WHERE id = p_barbero_id;
  
  IF v_porcentaje IS NULL THEN
    v_porcentaje := 50.00;
  END IF;
  
  -- Establecer fechas (por defecto: mes actual)
  v_fecha_inicio := COALESCE(p_fecha_inicio, DATE_TRUNC('month', CURRENT_DATE)::DATE);
  v_fecha_fin := COALESCE(p_fecha_fin, CURRENT_DATE);
  
  -- Calcular comisiones de facturas NO liquidadas
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_ventas,
    COALESCE(SUM(f.total), 0) as monto_total_vendido,
    v_porcentaje as porcentaje_comision,
    COALESCE(SUM(f.comision_barbero), 0) as total_comision
  FROM public.facturas f
  WHERE f.barbero_id = p_barbero_id
    AND f.created_at::DATE >= v_fecha_inicio
    AND f.created_at::DATE <= v_fecha_fin
    AND f.anulada = false
    -- Solo facturas que NO están en una liquidación pagada
    AND NOT EXISTS (
      SELECT 1 FROM public.liquidaciones l
      WHERE l.barbero_id = p_barbero_id
        AND l.estado = 'pagada'
        AND f.created_at::DATE >= l.fecha_inicio
        AND f.created_at::DATE <= l.fecha_fin
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calcular_comisiones_pendientes(UUID, DATE, DATE) TO authenticated;

-- ================================================================
-- PASO 6: FUNCIÓN PARA CREAR LIQUIDACIÓN
-- ================================================================

CREATE OR REPLACE FUNCTION public.crear_liquidacion(
  p_barbero_id UUID,
  p_fecha_inicio DATE,
  p_fecha_fin DATE,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_liquidacion_id UUID;
  v_comisiones RECORD;
BEGIN
  -- Calcular comisiones del período
  SELECT * INTO v_comisiones
  FROM calcular_comisiones_pendientes(p_barbero_id, p_fecha_inicio, p_fecha_fin);
  
  -- Verificar que hay ventas
  IF v_comisiones.total_ventas = 0 THEN
    RAISE EXCEPTION 'No hay ventas pendientes de liquidar en este período';
  END IF;
  
  -- Crear liquidación
  INSERT INTO public.liquidaciones (
    barbero_id,
    fecha_inicio,
    fecha_fin,
    total_ventas,
    monto_total_vendido,
    porcentaje_comision,
    total_comision,
    estado,
    creada_por
  ) VALUES (
    p_barbero_id,
    p_fecha_inicio,
    p_fecha_fin,
    v_comisiones.total_ventas,
    v_comisiones.monto_total_vendido,
    v_comisiones.porcentaje_comision,
    v_comisiones.total_comision,
    'pendiente',
    COALESCE(p_created_by, auth.uid())
  )
  RETURNING id INTO v_liquidacion_id;
  
  RETURN v_liquidacion_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_liquidacion(UUID, DATE, DATE, UUID) TO authenticated;

-- ================================================================
-- PASO 7: FUNCIÓN PARA PAGAR LIQUIDACIÓN
-- ================================================================

CREATE OR REPLACE FUNCTION public.pagar_liquidacion(
  p_liquidacion_id UUID,
  p_metodo_pago VARCHAR,
  p_monto_efectivo NUMERIC DEFAULT 0,
  p_monto_transferencia NUMERIC DEFAULT 0,
  p_numero_transferencia VARCHAR DEFAULT NULL,
  p_notas TEXT DEFAULT NULL,
  p_pagada_por UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_comision NUMERIC;
  v_total_pago NUMERIC;
BEGIN
  -- Obtener total de la liquidación
  SELECT total_comision INTO v_total_comision
  FROM public.liquidaciones
  WHERE id = p_liquidacion_id AND estado = 'pendiente';
  
  IF v_total_comision IS NULL THEN
    RAISE EXCEPTION 'Liquidación no encontrada o ya pagada';
  END IF;
  
  -- Calcular total del pago
  v_total_pago := p_monto_efectivo + p_monto_transferencia;
  
  -- Verificar que el monto coincide
  IF v_total_pago != v_total_comision THEN
    RAISE EXCEPTION 'El monto total del pago (%) no coincide con la comisión (%)', 
      v_total_pago, v_total_comision;
  END IF;
  
  -- Actualizar liquidación
  UPDATE public.liquidaciones
  SET 
    estado = 'pagada',
    metodo_pago = p_metodo_pago,
    monto_efectivo = p_monto_efectivo,
    monto_transferencia = p_monto_transferencia,
    numero_transferencia = p_numero_transferencia,
    fecha_pago = NOW(),
    notas = p_notas,
    pagada_por = COALESCE(p_pagada_por, auth.uid()),
    updated_at = NOW()
  WHERE id = p_liquidacion_id;
  
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pagar_liquidacion(UUID, VARCHAR, NUMERIC, NUMERIC, VARCHAR, TEXT, UUID) TO authenticated;

-- ================================================================
-- PASO 8: POLÍTICAS RLS PARA liquidaciones
-- ================================================================

-- Habilitar RLS
ALTER TABLE public.liquidaciones ENABLE ROW LEVEL SECURITY;

-- SELECT: Admins ven todas, barberos solo las suyas
CREATE POLICY "liquidaciones_select_policy"
ON public.liquidaciones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid()
  )
  OR barbero_id IN (
    SELECT barbero_id FROM admin_users 
    WHERE admin_users.id = auth.uid()
  )
);

-- INSERT: Solo admins
CREATE POLICY "liquidaciones_insert_policy"
ON public.liquidaciones
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid() 
    AND admin_users.rol = 'admin'
  )
);

-- UPDATE: Solo admins
CREATE POLICY "liquidaciones_update_policy"
ON public.liquidaciones
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid() 
    AND admin_users.rol = 'admin'
  )
);

-- DELETE: Solo admins pueden cancelar
CREATE POLICY "liquidaciones_delete_policy"
ON public.liquidaciones
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid() 
    AND admin_users.rol = 'admin'
  )
);

-- ================================================================
-- PASO 9: ACTUALIZAR VISTA barberos_resumen
-- ================================================================

CREATE OR REPLACE VIEW public.barberos_resumen AS
SELECT 
  b.id,
  b.nombre,
  b.apellido,
  b.email,
  b.telefono,
  b.porcentaje_comision,
  b.activo,
  -- Estadísticas de ventas
  COUNT(DISTINCT f.id) as total_ventas,
  COALESCE(SUM(f.total), 0) as total_vendido,
  -- Comisiones
  COALESCE(SUM(f.comision_barbero), 0) as comisiones_generadas,
  -- Comisiones pendientes (no liquidadas)
  COALESCE(SUM(
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM liquidaciones l
        WHERE l.barbero_id = b.id
          AND l.estado = 'pagada'
          AND f.created_at::DATE >= l.fecha_inicio
          AND f.created_at::DATE <= l.fecha_fin
      ) THEN f.comision_barbero
      ELSE 0
    END
  ), 0) as comisiones_pendientes,
  -- Comisiones pagadas (liquidadas)
  COALESCE(
    (SELECT SUM(total_comision) 
     FROM liquidaciones 
     WHERE barbero_id = b.id AND estado = 'pagada'
    ), 0
  ) as comisiones_pagadas
FROM barberos b
LEFT JOIN facturas f ON f.barbero_id = b.id AND f.anulada = false
GROUP BY b.id;

GRANT SELECT ON public.barberos_resumen TO authenticated;

COMMIT;

-- ================================================================
-- ✅ VERIFICACIÓN
-- ================================================================

-- 1. Ver estructura de liquidaciones
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'liquidaciones'
ORDER BY ordinal_position;

-- 2. Verificar funciones creadas
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('generar_numero_liquidacion', 'calcular_comisiones_pendientes', 'crear_liquidacion', 'pagar_liquidacion')
ORDER BY proname;

-- 3. Ver vista barberos_resumen actualizada
SELECT * FROM barberos_resumen;

-- 4. Probar calcular comisiones pendientes de Carlos
DO $$
DECLARE
  carlos_id UUID;
  result RECORD;
BEGIN
  SELECT id INTO carlos_id FROM barberos WHERE nombre = 'Carlos' LIMIT 1;
  
  IF carlos_id IS NULL THEN
    RAISE NOTICE '❌ No se encontró barbero Carlos';
    RETURN;
  END IF;
  
  SELECT * INTO result FROM calcular_comisiones_pendientes(carlos_id);
  
  RAISE NOTICE '✅ Comisiones pendientes de Carlos:';
  RAISE NOTICE '   Total ventas: %', result.total_ventas;
  RAISE NOTICE '   Monto vendido: $%', result.monto_total_vendido;
  RAISE NOTICE '   Porcentaje: %%%', result.porcentaje_comision;
  RAISE NOTICE '   Comisión: $%', result.total_comision;
END $$;

-- ================================================================
-- 📋 RESUMEN
-- ================================================================
-- ✅ Tabla liquidaciones creada
-- ✅ Campos bancarios agregados a barberos
-- ✅ Función generar_numero_liquidacion() creada
-- ✅ Trigger para auto-generar número
-- ✅ Función calcular_comisiones_pendientes() creada
-- ✅ Función crear_liquidacion() creada
-- ✅ Función pagar_liquidacion() creada
-- ✅ Políticas RLS configuradas
-- ✅ Vista barberos_resumen actualizada
-- ================================================================
