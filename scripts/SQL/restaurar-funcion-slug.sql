-- =====================================================
-- SCRIPT: Restaurar Función de Slug para URLs Amigables
-- Descripción: Genera automáticamente slugs para barberos
-- Autor: GenSpark AI
-- Fecha: 2025-11-06
-- =====================================================

-- =====================================================
-- CONTEXTO:
-- Esta función fue eliminada por error en la limpieza
-- del dashboard profesional, pero es NECESARIA para
-- generar URLs amigables como: /barbero/miguel-torres
-- =====================================================

-- Crear la función
CREATE OR REPLACE FUNCTION public.generar_slug_barbero()
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
        
        -- Si el slug ya existe, agregar número aleatorio
        IF EXISTS (SELECT 1 FROM public.barberos WHERE slug = NEW.slug AND id != NEW.id) THEN
            NEW.slug := NEW.slug || '-' || substr(md5(random()::text), 1, 6);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_generar_slug_barbero ON public.barberos;
CREATE TRIGGER trigger_generar_slug_barbero
BEFORE INSERT OR UPDATE ON public.barberos
FOR EACH ROW
EXECUTE FUNCTION public.generar_slug_barbero();

-- Generar slugs para barberos existentes que no tienen
UPDATE public.barberos 
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

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 
    id,
    nombre,
    apellido,
    slug,
    CASE 
        WHEN slug IS NOT NULL AND slug != '' THEN '✅ OK - Tiene slug'
        ELSE '❌ ERROR - Sin slug'
    END as estado
FROM public.barberos
ORDER BY nombre;

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

-- Ejemplo 1: Insertar nuevo barbero (slug se genera automáticamente)
/*
INSERT INTO barberos (nombre, apellido, email, telefono, especialidad, activo)
VALUES ('Pedro', 'García', 'pedro@example.com', '123456789', 'Cortes modernos', true)
RETURNING id, nombre, apellido, slug;
-- Resultado: slug = 'pedro-garcia'
*/

-- Ejemplo 2: Actualizar barbero (slug se regenera si está vacío)
/*
UPDATE barberos 
SET slug = NULL 
WHERE nombre = 'Miguel' AND apellido = 'Torres'
RETURNING id, nombre, apellido, slug;
-- El trigger regenerará el slug automáticamente
*/

-- =====================================================
-- CONVERSIÓN DE CARACTERES
-- =====================================================

-- La función convierte:
-- á, à, ä, â → a
-- é, è, ë, ê → e
-- í, ì, ï, î → i
-- ó, ò, ö, ô → o
-- ú, ù, ü, û → u
-- ñ → n
-- Espacios → -
-- Mayúsculas → minúsculas
-- Caracteres especiales → eliminados

-- Ejemplos:
-- "José Hernández" → "jose-hernandez"
-- "María Ángeles" → "maria-angeles"
-- "Raúl Pérez" → "raul-perez"

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

-- 1. El slug se genera SOLO si está vacío (NULL o '')
-- 2. Si el slug ya está definido manualmente, NO se sobrescribe
-- 3. Si hay duplicados, se agrega un código aleatorio
-- 4. El trigger se ejecuta en INSERT y UPDATE
-- 5. La columna 'slug' debe existir en la tabla barberos

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
