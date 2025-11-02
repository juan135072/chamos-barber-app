-- ============================================
-- SCRIPT: Agregar Slugs y Portfolio de Barberos
-- ============================================
-- Este script:
-- 1. Agrega campo 'slug' a tabla barberos
-- 2. Crea función para generar slugs automáticos
-- 3. Genera slugs para barberos existentes
-- 4. Crea tabla barbero_portfolio
-- 5. Configura RLS para portfolio
-- 6. Inserta datos demo de portfolio
-- ============================================

-- ====================
-- PASO 1: Agregar campo slug a barberos
-- ====================

ALTER TABLE barberos 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Crear índice único para el slug
CREATE UNIQUE INDEX IF NOT EXISTS barberos_slug_key ON barberos(slug);

-- ====================
-- PASO 2: Función para generar slug desde nombre
-- ====================

CREATE OR REPLACE FUNCTION generate_slug(nombre TEXT, apellido TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convertir nombre + apellido a slug
  base_slug := lower(trim(nombre || '-' || apellido));
  
  -- Reemplazar espacios y caracteres especiales
  base_slug := regexp_replace(base_slug, '[^a-z0-9\-]', '-', 'g');
  base_slug := regexp_replace(base_slug, '\-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- Verificar si existe
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM barberos WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- PASO 3: Generar slugs para barberos existentes
-- ====================

-- Carlos Ramírez
UPDATE barberos 
SET slug = 'carlos-ramirez'
WHERE nombre = 'Carlos' AND apellido = 'Ramírez' AND slug IS NULL;

-- Miguel Torres
UPDATE barberos 
SET slug = 'miguel-torres'
WHERE nombre = 'Miguel' AND apellido = 'Torres' AND slug IS NULL;

-- Luis Mendoza
UPDATE barberos 
SET slug = 'luis-mendoza'
WHERE nombre = 'Luis' AND apellido = 'Mendoza' AND slug IS NULL;

-- Jorge Silva
UPDATE barberos 
SET slug = 'jorge-silva'
WHERE nombre = 'Jorge' AND apellido = 'Silva' AND slug IS NULL;

-- ====================
-- PASO 4: Crear tabla barbero_portfolio
-- ====================

CREATE TABLE IF NOT EXISTS barbero_portfolio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbero_id UUID NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
  imagen_url TEXT NOT NULL,
  titulo TEXT,
  descripcion TEXT,
  categoria TEXT, -- ej: 'corte-clasico', 'fade', 'barba', 'color', 'diseno'
  tags TEXT[], -- array de tags
  likes INTEGER DEFAULT 0,
  orden_display INTEGER DEFAULT 0,
  aprobado BOOLEAN DEFAULT false, -- Para moderación
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_portfolio_barbero ON barbero_portfolio(barbero_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_aprobado ON barbero_portfolio(aprobado, activo);
CREATE INDEX IF NOT EXISTS idx_portfolio_orden ON barbero_portfolio(orden_display);

-- ====================
-- PASO 5: RLS para barbero_portfolio
-- ====================

ALTER TABLE barbero_portfolio ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública (solo items aprobados y activos)
DROP POLICY IF EXISTS "portfolio_public_select" ON barbero_portfolio;
CREATE POLICY "portfolio_public_select" 
ON barbero_portfolio FOR SELECT 
TO anon, authenticated 
USING (aprobado = true AND activo = true);

-- Política para service_role (acceso completo)
DROP POLICY IF EXISTS "portfolio_service_all" ON barbero_portfolio;
CREATE POLICY "portfolio_service_all" 
ON barbero_portfolio FOR ALL 
TO service_role 
USING (true);

-- ====================
-- PASO 6: Insertar datos demo de portfolio
-- ====================

-- Obtener IDs de los barberos por slug
DO $$
DECLARE
  carlos_id UUID;
  miguel_id UUID;
  luis_id UUID;
  jorge_id UUID;
BEGIN
  -- Obtener IDs
  SELECT id INTO carlos_id FROM barberos WHERE slug = 'carlos-ramirez' LIMIT 1;
  SELECT id INTO miguel_id FROM barberos WHERE slug = 'miguel-torres' LIMIT 1;
  SELECT id INTO luis_id FROM barberos WHERE slug = 'luis-mendoza' LIMIT 1;
  SELECT id INTO jorge_id FROM barberos WHERE slug = 'jorge-silva' LIMIT 1;

  -- Portfolio de Carlos Ramírez (Cortes clásicos)
  IF carlos_id IS NOT NULL THEN
    INSERT INTO barbero_portfolio (barbero_id, imagen_url, titulo, descripcion, categoria, tags, aprobado, activo, orden_display)
    VALUES 
      (carlos_id, 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400', 'Corte Clásico Ejecutivo', 'Corte tradicional con degradado suave, perfecto para look profesional', 'corte-clasico', ARRAY['clásico', 'profesional', 'degradado'], true, true, 1),
      (carlos_id, 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400', 'Barba Perfilada', 'Perfilado de barba con navaja, técnica tradicional', 'barba', ARRAY['barba', 'perfilado', 'navaja'], true, true, 2),
      (carlos_id, 'https://images.unsplash.com/photo-1620331311520-246422fd82f9?w=400', 'Side Part Clásico', 'Raya al lado con texturizado, estilo vintage', 'corte-clasico', ARRAY['side-part', 'vintage', 'texturizado'], true, true, 3),
      (carlos_id, 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400', 'Corte Caballero', 'Corte elegante con acabado mate', 'corte-clasico', ARRAY['elegante', 'caballero'], true, true, 4);
  END IF;

  -- Portfolio de Miguel Torres (Diseños y degradados modernos)
  IF miguel_id IS NOT NULL THEN
    INSERT INTO barbero_portfolio (barbero_id, imagen_url, titulo, descripcion, categoria, tags, aprobado, activo, orden_display)
    VALUES 
      (miguel_id, 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400', 'Fade Alto con Diseño', 'Degradado alto skin fade con diseño en línea lateral', 'fade', ARRAY['fade', 'diseño', 'skin-fade'], true, true, 1),
      (miguel_id, 'https://images.unsplash.com/photo-1633681926035-ec1ac984418a?w=400', 'Mid Fade Texturizado', 'Fade medio con textura en la parte superior', 'fade', ARRAY['mid-fade', 'texturizado', 'moderno'], true, true, 2),
      (miguel_id, 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400', 'Taper Fade', 'Taper fade clásico con acabado impecable', 'fade', ARRAY['taper', 'fade', 'limpio'], true, true, 3),
      (miguel_id, 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400', 'Diseño Tribal', 'Diseño artístico en lateral con degradado', 'diseno', ARRAY['diseño', 'artístico', 'tribal'], true, true, 4),
      (miguel_id, 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400', 'Burst Fade', 'Fade circular con volumen arriba', 'fade', ARRAY['burst-fade', 'volumen'], true, true, 5);
  END IF;

  -- Portfolio de Luis Mendoza (Coloración y tratamientos)
  IF luis_id IS NOT NULL THEN
    INSERT INTO barbero_portfolio (barbero_id, imagen_url, titulo, descripcion, categoria, tags, aprobado, activo, orden_display)
    VALUES 
      (luis_id, 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400', 'Coloración Platino', 'Decoloración y tono platino', 'color', ARRAY['color', 'platino', 'decoloración'], true, true, 1),
      (luis_id, 'https://images.unsplash.com/photo-1633681926035-ec1ac984418a?w=400', 'Mechas Balayage', 'Mechas naturales con técnica balayage', 'color', ARRAY['mechas', 'balayage', 'natural'], true, true, 2),
      (luis_id, 'https://images.unsplash.com/photo-1620331311520-246422fd82f9?w=400', 'Gris Ash', 'Tono gris ceniza moderno', 'color', ARRAY['gris', 'ash', 'ceniza'], true, true, 3),
      (luis_id, 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400', 'Tratamiento Capilar', 'Tratamiento de hidratación profunda', 'tratamiento', ARRAY['tratamiento', 'hidratación'], true, true, 4);
  END IF;

  -- Portfolio de Jorge Silva (Cortes infantiles)
  IF jorge_id IS NOT NULL THEN
    INSERT INTO barbero_portfolio (barbero_id, imagen_url, titulo, descripcion, categoria, tags, aprobado, activo, orden_display)
    VALUES 
      (jorge_id, 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400', 'Corte Infantil Clásico', 'Corte tradicional para niños, cómodo y práctico', 'infantil', ARRAY['infantil', 'clásico', 'niños'], true, true, 1),
      (jorge_id, 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400', 'Corte Moderno Juvenil', 'Estilo moderno para adolescentes', 'infantil', ARRAY['juvenil', 'moderno', 'adolescentes'], true, true, 2),
      (jorge_id, 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400', 'Primer Corte', 'Primera experiencia especial para bebés', 'infantil', ARRAY['bebé', 'primer-corte'], true, true, 3),
      (jorge_id, 'https://images.unsplash.com/photo-1633681926035-ec1ac984418a?w=400', 'Corte Escolar', 'Corte práctico para el colegio', 'infantil', ARRAY['escolar', 'práctico'], true, true, 4);
  END IF;

END $$;

-- ====================
-- PASO 7: Trigger para actualizar updated_at
-- ====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_portfolio_updated_at ON barbero_portfolio;
CREATE TRIGGER update_portfolio_updated_at 
BEFORE UPDATE ON barbero_portfolio
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ====================
-- VERIFICACIÓN
-- ====================

-- Verificar que todos los barberos tienen slug
SELECT nombre, apellido, slug FROM barberos WHERE activo = true;

-- Verificar items de portfolio insertados
SELECT 
  b.nombre || ' ' || b.apellido as barbero,
  COUNT(p.id) as items_portfolio
FROM barberos b
LEFT JOIN barbero_portfolio p ON b.id = p.barbero_id
WHERE b.activo = true
GROUP BY b.id, b.nombre, b.apellido
ORDER BY b.nombre;

-- ====================
-- RESULTADO ESPERADO:
-- ====================
-- ✅ Campo slug agregado a barberos
-- ✅ 4 barberos con slugs únicos
-- ✅ Tabla barbero_portfolio creada
-- ✅ RLS configurado correctamente
-- ✅ ~17 items de portfolio demo insertados
-- ====================
