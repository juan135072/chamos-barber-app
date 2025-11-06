-- =====================================================
-- SCRIPT: Fix y Creación de Tablas para Dashboard
-- Descripción: Versión corregida sin unaccent
-- Autor: GenSpark AI
-- Fecha: 2025-11-04
-- =====================================================

-- PASO 1: Agregar campos a tabla barberos
ALTER TABLE barberos 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS biografia TEXT,
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS tiktok TEXT,
ADD COLUMN IF NOT EXISTS certificaciones JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS idiomas TEXT[] DEFAULT ARRAY['Español'],
ADD COLUMN IF NOT EXISTS horario_preferido TEXT,
ADD COLUMN IF NOT EXISTS disponible_fines_semana BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS total_clientes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cortes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS promedio_calificacion DECIMAL(3,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS total_resenas INTEGER DEFAULT 0;

-- PASO 2: Crear índice para slug
CREATE INDEX IF NOT EXISTS idx_barberos_slug ON barberos(slug);

-- PASO 3: Crear tabla de reseñas
CREATE TABLE IF NOT EXISTS barbero_resenas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbero_id UUID NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
    cliente_nombre TEXT NOT NULL,
    cliente_email TEXT,
    calificacion INTEGER NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
    comentario TEXT,
    servicio_recibido TEXT,
    foto_antes_url TEXT,
    foto_despues_url TEXT,
    fecha_cita DATE,
    aprobado BOOLEAN DEFAULT false,
    fecha_aprobacion TIMESTAMP,
    destacada BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barbero_resenas_barbero ON barbero_resenas(barbero_id);
CREATE INDEX IF NOT EXISTS idx_barbero_resenas_aprobado ON barbero_resenas(aprobado);
CREATE INDEX IF NOT EXISTS idx_barbero_resenas_destacada ON barbero_resenas(destacada);

-- PASO 4: Crear tabla de estadísticas
CREATE TABLE IF NOT EXISTS barbero_estadisticas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbero_id UUID NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    anio INTEGER NOT NULL CHECK (anio >= 2020),
    total_citas INTEGER DEFAULT 0,
    total_ingresos DECIMAL(10,2) DEFAULT 0,
    promedio_calificacion DECIMAL(3,2) DEFAULT 5.00,
    clientes_nuevos INTEGER DEFAULT 0,
    clientes_recurrentes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(barbero_id, mes, anio)
);

CREATE INDEX IF NOT EXISTS idx_barbero_estadisticas_barbero ON barbero_estadisticas(barbero_id);
CREATE INDEX IF NOT EXISTS idx_barbero_estadisticas_periodo ON barbero_estadisticas(anio DESC, mes DESC);

-- PASO 5: Crear tabla de portfolio
CREATE TABLE IF NOT EXISTS barbero_portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbero_id UUID NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
    imagen_url TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT,
    destacada BOOLEAN DEFAULT false,
    likes INTEGER DEFAULT 0,
    aprobado BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barbero_portfolio_barbero ON barbero_portfolio(barbero_id);
CREATE INDEX IF NOT EXISTS idx_barbero_portfolio_destacada ON barbero_portfolio(destacada);
CREATE INDEX IF NOT EXISTS idx_barbero_portfolio_aprobado ON barbero_portfolio(aprobado);

-- PASO 6: Crear tabla de certificaciones
CREATE TABLE IF NOT EXISTS barbero_certificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbero_id UUID NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    institucion TEXT NOT NULL,
    fecha_obtencion DATE,
    fecha_expiracion DATE,
    numero_certificado TEXT,
    documento_url TEXT,
    verificado BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barbero_certificaciones_barbero ON barbero_certificaciones(barbero_id);

-- PASO 7: RLS Policies para barbero_resenas
ALTER TABLE barbero_resenas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de reseñas aprobadas" ON barbero_resenas;
CREATE POLICY "Permitir lectura pública de reseñas aprobadas"
ON barbero_resenas FOR SELECT
TO anon
USING (aprobado = true);

DROP POLICY IF EXISTS "Permitir inserción de reseñas por cualquier usuario autenticado" ON barbero_resenas;
CREATE POLICY "Permitir inserción de reseñas por cualquier usuario autenticado"
ON barbero_resenas FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin puede ver todas las reseñas" ON barbero_resenas;
CREATE POLICY "Admin puede ver todas las reseñas"
ON barbero_resenas FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid() 
        AND admin_users.activo = true
    )
);

DROP POLICY IF EXISTS "Admin puede actualizar reseñas" ON barbero_resenas;
CREATE POLICY "Admin puede actualizar reseñas"
ON barbero_resenas FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid() 
        AND admin_users.activo = true
    )
);

-- PASO 8: RLS Policies para barbero_estadisticas
ALTER TABLE barbero_estadisticas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Barberos pueden ver sus propias estadísticas" ON barbero_estadisticas;
CREATE POLICY "Barberos pueden ver sus propias estadísticas"
ON barbero_estadisticas FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid() 
        AND (admin_users.barbero_id = barbero_estadisticas.barbero_id OR admin_users.rol = 'admin')
        AND admin_users.activo = true
    )
);

-- PASO 9: RLS Policies para barbero_portfolio
ALTER TABLE barbero_portfolio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de portfolio aprobado" ON barbero_portfolio;
CREATE POLICY "Permitir lectura pública de portfolio aprobado"
ON barbero_portfolio FOR SELECT
TO anon
USING (aprobado = true);

DROP POLICY IF EXISTS "Barberos pueden gestionar su propio portfolio" ON barbero_portfolio;
CREATE POLICY "Barberos pueden gestionar su propio portfolio"
ON barbero_portfolio FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid() 
        AND admin_users.barbero_id = barbero_portfolio.barbero_id
        AND admin_users.activo = true
    )
);

DROP POLICY IF EXISTS "Admin puede gestionar todo el portfolio" ON barbero_portfolio;
CREATE POLICY "Admin puede gestionar todo el portfolio"
ON barbero_portfolio FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid() 
        AND admin_users.rol = 'admin'
        AND admin_users.activo = true
    )
);

-- PASO 10: RLS Policies para barbero_certificaciones
ALTER TABLE barbero_certificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de certificaciones verificadas" ON barbero_certificaciones;
CREATE POLICY "Permitir lectura pública de certificaciones verificadas"
ON barbero_certificaciones FOR SELECT
TO anon
USING (verificado = true);

DROP POLICY IF EXISTS "Barberos pueden gestionar sus propias certificaciones" ON barbero_certificaciones;
CREATE POLICY "Barberos pueden gestionar sus propias certificaciones"
ON barbero_certificaciones FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid() 
        AND admin_users.barbero_id = barbero_certificaciones.barbero_id
        AND admin_users.activo = true
    )
);

DROP POLICY IF EXISTS "Admin puede gestionar todas las certificaciones" ON barbero_certificaciones;
CREATE POLICY "Admin puede gestionar todas las certificaciones"
ON barbero_certificaciones FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid() 
        AND admin_users.rol = 'admin'
        AND admin_users.activo = true
    )
);

-- PASO 11: Función para generar slug (versión simple sin unaccent)
CREATE OR REPLACE FUNCTION generar_slug_barbero()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        -- Convertir a minúsculas y reemplazar espacios por guiones
        NEW.slug := lower(
            regexp_replace(
                regexp_replace(
                    NEW.nombre || '-' || NEW.apellido,
                    '[áàäâ]', 'a', 'g'
                ),
                '[éèëê]', 'e', 'g'
            )
        );
        NEW.slug := regexp_replace(
            regexp_replace(NEW.slug, '[íìïî]', 'i', 'g'),
            '[óòöô]', 'o', 'g'
        );
        NEW.slug := regexp_replace(NEW.slug, '[úùüû]', 'u', 'g');
        NEW.slug := regexp_replace(NEW.slug, 'ñ', 'n', 'g');
        NEW.slug := regexp_replace(NEW.slug, '[^a-z0-9]+', '-', 'g');
        NEW.slug := trim(both '-' from NEW.slug);
        
        -- Si el slug ya existe, agregar número
        IF EXISTS (SELECT 1 FROM barberos WHERE slug = NEW.slug AND id != NEW.id) THEN
            NEW.slug := NEW.slug || '-' || substr(md5(random()::text), 1, 6);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 12: Trigger para generar slug
DROP TRIGGER IF EXISTS trigger_generar_slug_barbero ON barberos;
CREATE TRIGGER trigger_generar_slug_barbero
BEFORE INSERT OR UPDATE ON barberos
FOR EACH ROW
EXECUTE FUNCTION generar_slug_barbero();

-- PASO 13: Función para actualizar promedio de calificaciones
CREATE OR REPLACE FUNCTION actualizar_promedio_calificacion_barbero()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE barberos
    SET 
        promedio_calificacion = (
            SELECT COALESCE(AVG(calificacion), 5.00)
            FROM barbero_resenas
            WHERE barbero_id = NEW.barbero_id AND aprobado = true
        ),
        total_resenas = (
            SELECT COUNT(*)
            FROM barbero_resenas
            WHERE barbero_id = NEW.barbero_id AND aprobado = true
        )
    WHERE id = NEW.barbero_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 14: Trigger para actualizar calificaciones
DROP TRIGGER IF EXISTS trigger_actualizar_calificacion_barbero ON barbero_resenas;
CREATE TRIGGER trigger_actualizar_calificacion_barbero
AFTER INSERT OR UPDATE OF aprobado, calificacion ON barbero_resenas
FOR EACH ROW
WHEN (NEW.aprobado = true)
EXECUTE FUNCTION actualizar_promedio_calificacion_barbero();

-- PASO 15: Generar slugs para barberos existentes que no tienen
UPDATE barberos 
SET slug = lower(
    regexp_replace(
        regexp_replace(
            regexp_replace(
                regexp_replace(
                    regexp_replace(
                        regexp_replace(nombre || '-' || apellido, '[áàäâ]', 'a', 'g'),
                        '[éèëê]', 'e', 'g'
                    ),
                    '[íìïî]', 'i', 'g'
                ),
                '[óòöô]', 'o', 'g'
            ),
            '[úùüû]', 'u', 'g'
        ),
        '[^a-z0-9]+', '-', 'g'
    )
)
WHERE slug IS NULL OR slug = '';

-- PASO 16: Verificar que las tablas se crearon
SELECT 
    'barberos' as tabla,
    COUNT(*) as registros
FROM barberos
UNION ALL
SELECT 
    'barbero_resenas' as tabla,
    COUNT(*) as registros
FROM barbero_resenas
UNION ALL
SELECT 
    'barbero_portfolio' as tabla,
    COUNT(*) as registros
FROM barbero_portfolio
UNION ALL
SELECT 
    'barbero_certificaciones' as tabla,
    COUNT(*) as registros
FROM barbero_certificaciones
UNION ALL
SELECT 
    'barbero_estadisticas' as tabla,
    COUNT(*) as registros
FROM barbero_estadisticas;

-- =====================================================
-- FIN DEL SCRIPT - Las tablas deberían estar creadas
-- =====================================================
