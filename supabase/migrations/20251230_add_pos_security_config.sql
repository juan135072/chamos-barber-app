-- ================================================
-- MIGRACIÓN: Configuración de Seguridad POS
-- Fecha: 2025-12-30
-- Descripción: Asegurar tabla de configuración e insertar clave de seguridad
-- ================================================

-- 1. Crear tabla si no existe (normalmente ya debería existir)
CREATE TABLE IF NOT EXISTS public.sitio_configuracion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clave VARCHAR(255) UNIQUE NOT NULL,
    valor TEXT,
    tipo VARCHAR(50) DEFAULT 'texto',
    descripcion TEXT,
    categoria VARCHAR(100) DEFAULT 'general',
    publico BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.sitio_configuracion ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso (si no existen)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sitio_configuracion' AND policyname = 'config_select_public') THEN
        CREATE POLICY "config_select_public" ON public.sitio_configuracion FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sitio_configuracion' AND policyname = 'config_update_admin') THEN
        CREATE POLICY "config_update_admin" ON public.sitio_configuracion FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- 4. Insertar configuraciones base (iniciales o faltantes)
INSERT INTO public.sitio_configuracion (clave, valor, tipo, descripcion, categoria)
VALUES 
    ('sitio_nombre', 'Chamos Barber Shop', 'texto', 'Nombre comercial del negocio', 'general'),
    ('sitio_telefono', '+56 9 1234 5678', 'tel', 'Teléfono de contacto principal', 'contacto'),
    ('sitio_email', 'contacto@chamosbarber.com', 'email', 'Email de contacto principal', 'contacto'),
    ('sitio_direccion', 'Av. Principal 123, Santiago', 'texto', 'Dirección física del local', 'general'),
    ('google_maps_url', '', 'url', 'URL de integración con Google Maps', 'contacto'),
    ('facebook_url', '', 'url', 'URL del perfil de Facebook', 'redes'),
    ('instagram_url', '', 'url', 'URL del perfil de Instagram', 'redes'),
    ('whatsapp_numero', '', 'tel', 'Número para WhatsApp directo', 'contacto'),
    ('pos_clave_seguridad', '1234', 'texto', 'Clave para autorizar anulaciones y ediciones en el POS', 'seguridad')
ON CONFLICT (clave) DO NOTHING;

-- Verificación
SELECT * FROM public.sitio_configuracion ORDER BY categoria, clave;
