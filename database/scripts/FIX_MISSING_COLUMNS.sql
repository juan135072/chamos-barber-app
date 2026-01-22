-- ================================================================
-- 🔧 FIX: Agregar columnas y tablas faltantes para el POS
-- ================================================================
-- 
-- PROBLEMA ENCONTRADO (de los logs del navegador):
-- 1. servicios.duracion_minutos NO EXISTE (se llama 'duracion')
-- 2. citas.estado_pago NO EXISTE
-- 3. tabla 'facturas' NO EXISTE
--
-- SOLUCIÓN:
-- - Agregar columna estado_pago a citas
-- - Crear tabla facturas para el POS
-- - Crear alias/vista si es necesario
-- ================================================================

-- ================================================================
-- PARTE 1: AGREGAR COLUMNA estado_pago A CITAS
-- ================================================================

ALTER TABLE public.citas 
ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(50) DEFAULT 'pendiente' 
CHECK (estado_pago IN ('pendiente', 'pagado', 'parcial'));

-- Actualizar citas existentes
UPDATE public.citas 
SET estado_pago = 'pendiente' 
WHERE estado_pago IS NULL;

-- ================================================================
-- PARTE 2: CREAR TABLA FACTURAS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.facturas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_factura VARCHAR(50) UNIQUE NOT NULL,
  tipo_documento VARCHAR(20) DEFAULT 'boleta' CHECK (tipo_documento IN ('boleta', 'factura')),
  
  -- Cliente
  cliente_nombre VARCHAR(200) NOT NULL,
  cliente_rut VARCHAR(20),
  cliente_email VARCHAR(255),
  cliente_telefono VARCHAR(20),
  
  -- Relaciones
  barbero_id UUID REFERENCES public.barberos(id) ON DELETE SET NULL,
  cajero_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  
  -- Montos
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  descuento DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Pago
  metodo_pago VARCHAR(50) NOT NULL DEFAULT 'efectivo' 
    CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'otro')),
  monto_recibido DECIMAL(10,2),
  cambio DECIMAL(10,2),
  
  -- Comisiones
  porcentaje_comision DECIMAL(5,2) DEFAULT 50.00,
  comision_barbero DECIMAL(10,2),
  ingreso_casa DECIMAL(10,2),
  
  -- Estado
  anulada BOOLEAN DEFAULT false,
  motivo_anulacion TEXT,
  anulada_por UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  fecha_anulacion TIMESTAMP WITH TIME ZONE,
  
  -- Notas
  notas TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para facturas
CREATE INDEX IF NOT EXISTS idx_facturas_numero ON public.facturas(numero_factura);
CREATE INDEX IF NOT EXISTS idx_facturas_barbero ON public.facturas(barbero_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cajero ON public.facturas(cajero_id);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON public.facturas(created_at);
CREATE INDEX IF NOT EXISTS idx_facturas_anulada ON public.facturas(anulada);

-- ================================================================
-- PARTE 3: CREAR TABLA facturas_detalle (items de la factura)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.facturas_detalle (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  factura_id UUID NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  servicio_id UUID REFERENCES public.servicios(id) ON DELETE SET NULL,
  
  -- Detalle del item
  descripcion VARCHAR(200) NOT NULL,
  cantidad INTEGER DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para facturas_detalle
CREATE INDEX IF NOT EXISTS idx_facturas_detalle_factura ON public.facturas_detalle(factura_id);
CREATE INDEX IF NOT EXISTS idx_facturas_detalle_servicio ON public.facturas_detalle(servicio_id);

-- ================================================================
-- PARTE 4: HABILITAR RLS Y POLÍTICAS PARA FACTURAS
-- ================================================================

ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas_detalle ENABLE ROW LEVEL SECURITY;

-- Políticas para facturas
CREATE POLICY "Facturas - SELECT autenticado"
ON public.facturas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Facturas - INSERT autenticado"
ON public.facturas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Facturas - UPDATE autenticado"
ON public.facturas FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Facturas - DELETE admin"
ON public.facturas FOR DELETE
TO authenticated
USING (true);

-- Políticas para facturas_detalle
CREATE POLICY "Facturas detalle - SELECT autenticado"
ON public.facturas_detalle FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Facturas detalle - INSERT autenticado"
ON public.facturas_detalle FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Facturas detalle - UPDATE autenticado"
ON public.facturas_detalle FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Facturas detalle - DELETE admin"
ON public.facturas_detalle FOR DELETE
TO authenticated
USING (true);

-- ================================================================
-- PARTE 5: FUNCIÓN PARA GENERAR NÚMERO DE FACTURA
-- ================================================================

CREATE OR REPLACE FUNCTION public.generar_numero_factura()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  fecha_actual DATE := CURRENT_DATE;
  anio VARCHAR(4) := TO_CHAR(fecha_actual, 'YYYY');
  mes VARCHAR(2) := TO_CHAR(fecha_actual, 'MM');
  dia VARCHAR(2) := TO_CHAR(fecha_actual, 'DD');
  contador INTEGER;
  numero_final VARCHAR(50);
BEGIN
  -- Contar facturas del día
  SELECT COUNT(*) + 1 INTO contador
  FROM public.facturas
  WHERE DATE(created_at) = fecha_actual;
  
  -- Formato: YYYYMMDD-NNNN (ej: 20251215-0001)
  numero_final := anio || mes || dia || '-' || LPAD(contador::TEXT, 4, '0');
  
  RETURN numero_final;
END;
$$;

-- ================================================================
-- PARTE 6: TRIGGER PARA ACTUALIZAR updated_at
-- ================================================================

CREATE OR REPLACE FUNCTION public.actualizar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_facturas_updated_at ON public.facturas;
CREATE TRIGGER trigger_facturas_updated_at
  BEFORE UPDATE ON public.facturas
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();

-- ================================================================
-- ✅ VERIFICACIÓN
-- ================================================================

-- Verificar columna estado_pago en citas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'citas'
  AND column_name = 'estado_pago';

-- Verificar tabla facturas existe
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('facturas', 'facturas_detalle');

-- Verificar estructura de facturas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'facturas'
ORDER BY ordinal_position;

-- Probar función de generar número
SELECT generar_numero_factura();

-- ================================================================
-- 📋 RESUMEN
-- ================================================================
-- ✅ Columna estado_pago agregada a citas
-- ✅ Tabla facturas creada con todas las columnas necesarias
-- ✅ Tabla facturas_detalle creada
-- ✅ Políticas RLS configuradas
-- ✅ Función generar_numero_factura() creada
-- ✅ Trigger para updated_at configurado
-- ================================================================
