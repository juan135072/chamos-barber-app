-- Crear tabla de categorías de servicios
CREATE TABLE IF NOT EXISTS public.categorias_servicios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    icono TEXT,
    orden INTEGER NOT NULL DEFAULT 0,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear índice para consultas más rápidas
CREATE INDEX IF NOT EXISTS idx_categorias_servicios_nombre ON public.categorias_servicios(nombre);
CREATE INDEX IF NOT EXISTS idx_categorias_servicios_activa ON public.categorias_servicios(activa);
CREATE INDEX IF NOT EXISTS idx_categorias_servicios_orden ON public.categorias_servicios(orden);

-- Insertar categorías predeterminadas
INSERT INTO public.categorias_servicios (nombre, descripcion, icono, orden, activa) VALUES
('cortes', 'Servicios de corte de cabello', '✂️', 1, true),
('barbas', 'Servicios de arreglo y diseño de barba', '🧔', 2, true),
('tintes', 'Servicios de coloración y tintes', '🎨', 3, true),
('tratamientos', 'Tratamientos capilares y faciales', '💆', 4, true),
('combos', 'Paquetes y servicios combinados', '⭐', 5, true)
ON CONFLICT (nombre) DO NOTHING;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.categorias_servicios ENABLE ROW LEVEL SECURITY;

-- Policy: Todos pueden leer las categorías activas
CREATE POLICY "Categorías públicas lectura" ON public.categorias_servicios
    FOR SELECT
    USING (activa = true);

-- Policy: Solo administradores pueden insertar
CREATE POLICY "Admin puede insertar categorías" ON public.categorias_servicios
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
            AND rol = 'admin'
            AND activo = true
        )
    );

-- Policy: Solo administradores pueden actualizar
CREATE POLICY "Admin puede actualizar categorías" ON public.categorias_servicios
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
            AND rol = 'admin'
            AND activo = true
        )
    );

-- Policy: Solo administradores pueden eliminar
CREATE POLICY "Admin puede eliminar categorías" ON public.categorias_servicios
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
            AND rol = 'admin'
            AND activo = true
        )
    );

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categorias_servicios_updated_at
    BEFORE UPDATE ON public.categorias_servicios
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE public.categorias_servicios IS 'Tabla para gestionar categorías de servicios de barbería';
COMMENT ON COLUMN public.categorias_servicios.nombre IS 'Nombre único de la categoría (lowercase)';
COMMENT ON COLUMN public.categorias_servicios.descripcion IS 'Descripción de la categoría';
COMMENT ON COLUMN public.categorias_servicios.icono IS 'Emoji o icono representativo';
COMMENT ON COLUMN public.categorias_servicios.orden IS 'Orden de visualización';
COMMENT ON COLUMN public.categorias_servicios.activa IS 'Indica si la categoría está activa';
