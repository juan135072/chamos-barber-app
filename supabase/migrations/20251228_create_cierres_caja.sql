-- Migration: Create cierres_caja table
-- Date: 2025-12-28

CREATE TABLE IF NOT EXISTS public.cierres_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    cajero_id UUID REFERENCES auth.users(id),
    monto_apertura DECIMAL(10,2) NOT NULL DEFAULT 0,
    monto_esperado_efectivo DECIMAL(10,2) NOT NULL DEFAULT 0,
    monto_real_efectivo DECIMAL(10,2) NOT NULL DEFAULT 0,
    diferencia DECIMAL(10,2) GENERATED ALWAYS AS (monto_real_efectivo - monto_esperado_efectivo) STORED,
    total_ventas DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_comisiones DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_casa DECIMAL(10,2) NOT NULL DEFAULT 0,
    metodos_pago JSONB NOT NULL DEFAULT '{}'::jsonb,
    notas TEXT,
    estado TEXT NOT NULL CHECK (estado IN ('cerrada')) DEFAULT 'cerrada',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_range CHECK (fecha_inicio <= fecha_fin)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_cierres_caja_rango ON public.cierres_caja(fecha_inicio, fecha_fin);

-- RLS Policies
ALTER TABLE public.cierres_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Cashiers can view cierres_caja" 
ON public.cierres_caja FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE email = auth.jwt()->>'email' 
        AND (rol = 'admin' OR rol = 'cajero')
    )
);

CREATE POLICY "Admins and Cashiers can insert cierres_caja" 
ON public.cierres_caja FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE email = auth.jwt()->>'email' 
        AND (rol = 'admin' OR rol = 'cajero')
    )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cierres_caja_updated_at
    BEFORE UPDATE ON public.cierres_caja
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
