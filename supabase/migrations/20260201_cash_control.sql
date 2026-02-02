-- Migración para Sistema de Apertura y Cierre de Caja

-- 1. Tabla de Sesiones de Caja
CREATE TABLE IF NOT EXISTS public.caja_sesiones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id uuid REFERENCES auth.users(id),
    comercio_id uuid REFERENCES public.comercios(id),
    fecha_apertura timestamptz DEFAULT now(),
    fecha_cierre timestamptz,
    monto_inicial numeric DEFAULT 0,
    monto_final_esperado numeric DEFAULT 0, -- Calculado por sistema
    monto_final_real numeric, -- Ingresado por usuario al cerrar
    diferencia numeric DEFAULT 0,
    estado text DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
    created_at timestamptz DEFAULT now()
);

-- 2. Tabla de Movimientos de Caja
CREATE TABLE IF NOT EXISTS public.movimientos_caja (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sesion_id uuid REFERENCES public.caja_sesiones(id) ON DELETE CASCADE,
    tipo text NOT NULL CHECK (tipo IN ('apertura', 'venta', 'ingreso', 'egreso', 'cierre')),
    monto numeric NOT NULL,
    metodo_pago text,
    referencia_id uuid, -- ID de la factura o cita si aplica
    descripcion text,
    fecha timestamptz DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.caja_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;

-- 4. Políticas (Simplificadas para este entorno, idealmente usar comercio_id)
CREATE POLICY "Permitir todo a usuarios autenticados en caja_sesiones"
    ON public.caja_sesiones FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir todo a usuarios autenticados en movimientos_caja"
    ON public.movimientos_caja FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Agregar comercio_id a facturas si no existe (ya debería existir en multitenant)
-- ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS caja_sesion_id uuid REFERENCES public.caja_sesiones(id);
