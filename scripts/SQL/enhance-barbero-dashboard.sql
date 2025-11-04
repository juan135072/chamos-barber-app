-- =====================================================
-- SCRIPT: Mejoras para Dashboard Profesional de Barberos
-- Descripción: Agrega tablas y campos para dashboard completo
-- Autor: GenSpark AI
-- Fecha: 2025-11-04
-- =====================================================

-- 1. Agregar campos adicionales a la tabla barberos
ALTER TABLE barberos 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
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

-- 2. Crear índice para el slug
CREATE INDEX IF NOT EXISTS idx_barberos_slug ON barberos(slug);

-- 3. Crear tabla de reseñas de barberos
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
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_calificacion CHECK (calificacion BETWEEN 1 AND 5)
);

-- Índices para reseñas
CREATE INDEX IF NOT EXISTS idx_barbero_resenas_barbero ON barbero_resenas(barbero_id);
CREATE INDEX IF NOT EXISTS idx_barbero_resenas_aprobado ON barbero_resenas(aprobado);
CREATE INDEX IF NOT EXISTS idx_barbero_resenas_destacada ON barbero_resenas(destacada);

-- 4. Crear tabla de estadísticas mensuales de barberos
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

-- Índices para estadísticas
CREATE INDEX IF NOT EXISTS idx_barbero_estadisticas_barbero ON barbero_estadisticas(barbero_id);
CREATE INDEX IF NOT EXISTS idx_barbero_estadisticas_periodo ON barbero_estadisticas(anio DESC, mes DESC);

-- 5. Crear tabla de portfolio (si no existe)
CREATE TABLE IF NOT EXISTS barbero_portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbero_id UUID NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
    imagen_url TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT, -- ej: "Fade", "Barba", "Corte Clásico", etc.
    destacada BOOLEAN DEFAULT false,
    likes INTEGER DEFAULT 0,
    aprobado BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para portfolio
CREATE INDEX IF NOT EXISTS idx_barbero_portfolio_barbero ON barbero_portfolio(barbero_id);
CREATE INDEX IF NOT EXISTS idx_barbero_portfolio_destacada ON barbero_portfolio(destacada);
CREATE INDEX IF NOT EXISTS idx_barbero_portfolio_aprobado ON barbero_portfolio(aprobado);

-- 6. Crear tabla de certificaciones
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

-- Índices para certificaciones
CREATE INDEX IF NOT EXISTS idx_barbero_certificaciones_barbero ON barbero_certificaciones(barbero_id);

-- 7. RLS Policies para nuevas tablas

-- Políticas para barbero_resenas (público puede leer aprobadas, solo admin/barbero puede crear/actualizar)
ALTER TABLE barbero_resenas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura pública de reseñas aprobadas"
ON barbero_resenas FOR SELECT
TO public
USING (aprobado = true);

CREATE POLICY "Permitir inserción de reseñas por cualquier usuario autenticado"
ON barbero_resenas FOR INSERT
TO authenticated
WITH CHECK (true);

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

-- Políticas para barbero_estadisticas
ALTER TABLE barbero_estadisticas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barberos pueden ver sus propias estadísticas"
ON barbero_estadisticas FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid() 
        AND admin_users.barbero_id = barbero_estadisticas.barbero_id
        AND admin_users.activo = true
    )
    OR
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid() 
        AND admin_users.rol = 'admin'
        AND admin_users.activo = true
    )
);

-- Políticas para barbero_portfolio
ALTER TABLE barbero_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura pública de portfolio aprobado"
ON barbero_portfolio FOR SELECT
TO public
USING (aprobado = true);

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

-- Políticas para barbero_certificaciones
ALTER TABLE barbero_certificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura pública de certificaciones verificadas"
ON barbero_certificaciones FOR SELECT
TO public
USING (verificado = true);

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

-- 8. Función para generar slug automático
CREATE OR REPLACE FUNCTION generar_slug_barbero()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := lower(
            regexp_replace(
                unaccent(NEW.nombre || '-' || NEW.apellido),
                '[^a-z0-9]+', '-', 'g'
            )
        );
        
        -- Si el slug ya existe, agregar un número
        IF EXISTS (SELECT 1 FROM barberos WHERE slug = NEW.slug AND id != NEW.id) THEN
            NEW.slug := NEW.slug || '-' || substr(md5(random()::text), 1, 6);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar slug automáticamente
DROP TRIGGER IF EXISTS trigger_generar_slug_barbero ON barberos;
CREATE TRIGGER trigger_generar_slug_barbero
BEFORE INSERT OR UPDATE ON barberos
FOR EACH ROW
EXECUTE FUNCTION generar_slug_barbero();

-- 9. Función para actualizar promedio de calificaciones
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

-- Trigger para actualizar calificaciones
DROP TRIGGER IF EXISTS trigger_actualizar_calificacion_barbero ON barbero_resenas;
CREATE TRIGGER trigger_actualizar_calificacion_barbero
AFTER INSERT OR UPDATE OF aprobado, calificacion ON barbero_resenas
FOR EACH ROW
WHEN (NEW.aprobado = true)
EXECUTE FUNCTION actualizar_promedio_calificacion_barbero();

-- 10. Vista para dashboard completo de barbero
CREATE OR REPLACE VIEW vista_barbero_dashboard AS
SELECT 
    b.id,
    b.slug,
    b.nombre,
    b.apellido,
    b.nombre || ' ' || b.apellido AS nombre_completo,
    b.biografia,
    b.foto_url,
    b.telefono,
    b.whatsapp,
    b.email,
    b.instagram,
    b.facebook,
    b.twitter,
    b.tiktok,
    b.especialidad,
    b.experiencia_anos,
    b.certificaciones,
    b.idiomas,
    b.horario_preferido,
    b.disponible_fines_semana,
    b.promedio_calificacion,
    b.total_resenas,
    b.total_clientes,
    b.total_cortes,
    b.activo,
    
    -- Contar portfolio
    (SELECT COUNT(*) FROM barbero_portfolio WHERE barbero_id = b.id AND aprobado = true) as total_portfolio,
    
    -- Contar certificaciones
    (SELECT COUNT(*) FROM barbero_certificaciones WHERE barbero_id = b.id AND verificado = true) as total_certificaciones,
    
    -- Estadísticas del mes actual
    (SELECT total_citas FROM barbero_estadisticas 
     WHERE barbero_id = b.id 
     AND mes = EXTRACT(MONTH FROM CURRENT_DATE)
     AND anio = EXTRACT(YEAR FROM CURRENT_DATE)
    ) as citas_mes_actual,
    
    (SELECT total_ingresos FROM barbero_estadisticas 
     WHERE barbero_id = b.id 
     AND mes = EXTRACT(MONTH FROM CURRENT_DATE)
     AND anio = EXTRACT(YEAR FROM CURRENT_DATE)
    ) as ingresos_mes_actual,
    
    b.created_at,
    b.updated_at
FROM barberos b
WHERE b.activo = true;

-- 11. Función RPC para obtener dashboard completo
CREATE OR REPLACE FUNCTION obtener_dashboard_barbero(barbero_slug TEXT)
RETURNS JSON AS $$
DECLARE
    resultado JSON;
BEGIN
    SELECT json_build_object(
        'barbero', (
            SELECT row_to_json(v) 
            FROM vista_barbero_dashboard v 
            WHERE v.slug = barbero_slug
        ),
        'resenas_recientes', (
            SELECT COALESCE(json_agg(r ORDER BY r.created_at DESC), '[]'::json)
            FROM (
                SELECT * FROM barbero_resenas
                WHERE barbero_id = (SELECT id FROM barberos WHERE slug = barbero_slug)
                AND aprobado = true
                LIMIT 10
            ) r
        ),
        'portfolio', (
            SELECT COALESCE(json_agg(p ORDER BY p.destacada DESC, p.fecha_creacion DESC), '[]'::json)
            FROM (
                SELECT * FROM barbero_portfolio
                WHERE barbero_id = (SELECT id FROM barberos WHERE slug = barbero_slug)
                AND aprobado = true
                LIMIT 20
            ) p
        ),
        'certificaciones', (
            SELECT COALESCE(json_agg(c ORDER BY c.fecha_obtencion DESC), '[]'::json)
            FROM barbero_certificaciones c
            WHERE c.barbero_id = (SELECT id FROM barberos WHERE slug = barbero_slug)
            AND c.verificado = true
        ),
        'estadisticas_ultimos_6_meses', (
            SELECT COALESCE(json_agg(e ORDER BY e.anio DESC, e.mes DESC), '[]'::json)
            FROM (
                SELECT * FROM barbero_estadisticas
                WHERE barbero_id = (SELECT id FROM barberos WHERE slug = barbero_slug)
                ORDER BY anio DESC, mes DESC
                LIMIT 6
            ) e
        )
    ) INTO resultado;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Comentarios en las tablas
COMMENT ON TABLE barbero_resenas IS 'Reseñas y calificaciones de clientes para cada barbero';
COMMENT ON TABLE barbero_estadisticas IS 'Estadísticas mensuales de rendimiento de barberos';
COMMENT ON TABLE barbero_portfolio IS 'Galería de trabajos realizados por cada barbero';
COMMENT ON TABLE barbero_certificaciones IS 'Certificaciones y títulos profesionales de barberos';

COMMENT ON COLUMN barberos.slug IS 'URL amigable para el perfil del barbero';
COMMENT ON COLUMN barberos.biografia IS 'Biografía profesional del barbero';
COMMENT ON COLUMN barberos.certificaciones IS 'Array JSON de certificaciones del barbero';
COMMENT ON COLUMN barberos.total_clientes IS 'Contador total de clientes atendidos';
COMMENT ON COLUMN barberos.total_cortes IS 'Contador total de cortes realizados';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- Para aplicar este script en Supabase:
-- 1. Copia el contenido completo
-- 2. Ve a SQL Editor en tu proyecto de Supabase
-- 3. Pega el script y ejecuta
-- 4. Verifica que todas las tablas se crearon correctamente
