-- Create gastos_categorias table
CREATE TABLE IF NOT EXISTS public.gastos_categorias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('GASTO', 'COSTO')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create gastos table
CREATE TABLE IF NOT EXISTS public.gastos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    descripcion TEXT NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('GASTO', 'COSTO')),
    categoria_id UUID REFERENCES public.gastos_categorias(id),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    registrado_por UUID REFERENCES public.admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.gastos_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

-- Policies for gastos_categorias
CREATE POLICY "Allow read access for authenticated users" ON public.gastos_categorias
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access for admins" ON public.gastos_categorias
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );

-- Policies for gastos
CREATE POLICY "Allow read access for authenticated users" ON public.gastos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access for admins" ON public.gastos
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON public.gastos(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON public.gastos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_gastos_tipo ON public.gastos(tipo);

-- Insert some default categories
INSERT INTO public.gastos_categorias (nombre, tipo) VALUES
    ('Alquiler', 'GASTO'),
    ('Servicios Básicos', 'GASTO'),
    ('Insumos', 'COSTO'),
    ('Mantenimiento', 'GASTO'),
    ('Publicidad', 'GASTO'),
    ('Otros', 'GASTO'),
    ('Productos Venta', 'COSTO')
ON CONFLICT DO NOTHING;
