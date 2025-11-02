-- ============================================
-- CREAR TABLAS FALTANTES PARA CONFIGURACIÓN
-- ============================================

-- 1. TABLA: configuracion_sitio
-- Para información general del negocio
CREATE TABLE IF NOT EXISTS configuracion_sitio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_negocio VARCHAR(255) NOT NULL DEFAULT 'Chamos Barber',
  direccion TEXT,
  telefono VARCHAR(50),
  email VARCHAR(255),
  whatsapp VARCHAR(50),
  instagram VARCHAR(255),
  facebook VARCHAR(255),
  twitter VARCHAR(255),
  youtube VARCHAR(255),
  tiktok VARCHAR(255),
  google_maps_url TEXT,
  horario_atencion TEXT,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA: enlaces_sociales
-- Para gestionar múltiples enlaces de redes sociales
CREATE TABLE IF NOT EXISTS enlaces_sociales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  orden_display INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_enlaces_sociales_activo ON enlaces_sociales(activo);
CREATE INDEX IF NOT EXISTS idx_enlaces_sociales_orden ON enlaces_sociales(orden_display);

-- 4. POLÍTICAS RLS - configuracion_sitio
ALTER TABLE configuracion_sitio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "configuracion_sitio_public_select" ON configuracion_sitio;
CREATE POLICY "configuracion_sitio_public_select"
ON configuracion_sitio
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "configuracion_sitio_service_all" ON configuracion_sitio;
CREATE POLICY "configuracion_sitio_service_all"
ON configuracion_sitio
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. POLÍTICAS RLS - enlaces_sociales
ALTER TABLE enlaces_sociales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enlaces_sociales_public_select" ON enlaces_sociales;
CREATE POLICY "enlaces_sociales_public_select"
ON enlaces_sociales
FOR SELECT
TO anon, authenticated
USING (activo = true);

DROP POLICY IF EXISTS "enlaces_sociales_service_all" ON enlaces_sociales;
CREATE POLICY "enlaces_sociales_service_all"
ON enlaces_sociales
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. INSERTAR DATOS DEMO - configuracion_sitio
INSERT INTO configuracion_sitio (
  nombre_negocio,
  direccion,
  telefono,
  email,
  whatsapp,
  instagram,
  facebook,
  twitter,
  youtube,
  tiktok,
  google_maps_url,
  horario_atencion,
  descripcion
) VALUES (
  'Chamos Barber',
  'Av. Providencia 1234, Santiago, Chile',
  '+56 9 1234 5678',
  'contacto@chamosbarber.com',
  '+56912345678',
  'https://instagram.com/chamosbarber',
  'https://facebook.com/chamosbarber',
  'https://twitter.com/chamosbarber',
  'https://youtube.com/@chamosbarber',
  'https://tiktok.com/@chamosbarber',
  'https://goo.gl/maps/ejemplo',
  'Lunes a Viernes: 9:00 - 18:00, Sábado: 9:00 - 14:00',
  'Barbería profesional con más de 8 años de experiencia. Especialistas en cortes modernos, clásicos y perfilado de barba.'
)
ON CONFLICT DO NOTHING;

-- 7. INSERTAR DATOS DEMO - enlaces_sociales
INSERT INTO enlaces_sociales (plataforma, url, activo, orden_display) VALUES
  ('instagram', 'https://instagram.com/chamosbarber', true, 1),
  ('facebook', 'https://facebook.com/chamosbarber', true, 2),
  ('whatsapp', 'https://wa.me/56912345678', true, 3),
  ('tiktok', 'https://tiktok.com/@chamosbarber', true, 4),
  ('youtube', 'https://youtube.com/@chamosbarber', true, 5)
ON CONFLICT DO NOTHING;

-- 8. VERIFICACIÓN
SELECT 'configuracion_sitio' as tabla, COUNT(*) as registros FROM configuracion_sitio
UNION ALL
SELECT 'enlaces_sociales' as tabla, COUNT(*) as registros FROM enlaces_sociales;
