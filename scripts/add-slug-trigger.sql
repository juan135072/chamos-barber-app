-- ============================================
-- TRIGGER: Generación Automática de Slugs
-- ============================================
-- Este trigger genera slugs automáticamente cuando se crea
-- o actualiza un barbero, basándose en nombre + apellido
--
-- Características:
-- - Genera slug en formato: nombre-apellido (ej: carlos-mendoza)
-- - Remueve acentos: José → jose, Andrés → andres
-- - Garantiza unicidad: si existe, agrega -1, -2, etc.
-- - Se ejecuta en INSERT (si slug es NULL)
-- - Se ejecuta en UPDATE (si cambia nombre o apellido)
-- ============================================

-- Eliminar trigger y función anterior si existen
DROP TRIGGER IF EXISTS trigger_generate_barbero_slug ON barberos;
DROP FUNCTION IF EXISTS generate_barbero_slug();

-- Crear función de generación de slug
CREATE OR REPLACE FUNCTION generate_barbero_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Solo generar slug si:
  -- 1. Es un INSERT nuevo (slug es NULL)
  -- 2. Es un UPDATE y cambió el nombre o apellido
  IF (TG_OP = 'INSERT' AND NEW.slug IS NULL) OR 
     (TG_OP = 'UPDATE' AND (OLD.nombre != NEW.nombre OR OLD.apellido != NEW.apellido)) THEN
    
    -- Generar slug base desde nombre + apellido
    base_slug := lower(trim(NEW.nombre || '-' || NEW.apellido));
    
    -- Reemplazar acentos manualmente (á→a, é→e, etc.)
    base_slug := translate(base_slug, 
                          'áàäâãåéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ', 
                          'aaaaaaeeeeiiiioooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNC');
    
    -- Reemplazar espacios y caracteres no válidos por guiones
    base_slug := regexp_replace(base_slug, '[^a-z0-9\-]', '-', 'g');
    
    -- Reemplazar múltiples guiones consecutivos por uno solo
    base_slug := regexp_replace(base_slug, '\-+', '-', 'g');
    
    -- Quitar guiones al inicio y final
    base_slug := trim(both '-' from base_slug);
    
    -- Verificar unicidad (si ya existe, agregar número)
    final_slug := base_slug;
    
    WHILE EXISTS (
      SELECT 1 FROM barberos 
      WHERE slug = final_slug 
      AND id != NEW.id
    ) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    -- Asignar slug generado
    NEW.slug := final_slug;
    
    RAISE NOTICE 'Slug generado: % para barbero: % %', NEW.slug, NEW.nombre, NEW.apellido;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para INSERT y UPDATE
CREATE TRIGGER trigger_generate_barbero_slug
  BEFORE INSERT OR UPDATE OF nombre, apellido ON barberos
  FOR EACH ROW
  EXECUTE FUNCTION generate_barbero_slug();

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver función creada
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'generate_barbero_slug';

-- Ver trigger activo
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_generate_barbero_slug';

-- Verificar slugs de barberos existentes
SELECT 
  nombre, 
  apellido, 
  slug, 
  CASE WHEN slug IS NOT NULL THEN '✓' ELSE '✗' END as tiene_slug
FROM barberos 
WHERE activo = true
ORDER BY nombre;

-- ============================================
-- EJEMPLOS DE USO
-- ============================================

-- Ejemplo 1: Crear barbero sin especificar slug (se genera automáticamente)
-- INSERT INTO barberos (nombre, apellido, email, especialidad, activo)
-- VALUES ('Juan', 'Pérez', 'juan@example.com', 'Cortes clásicos', true);
-- Resultado: slug = 'juan-perez'

-- Ejemplo 2: Crear barbero con acentos (se normalizan)
-- INSERT INTO barberos (nombre, apellido, email, especialidad, activo)
-- VALUES ('José', 'García', 'jose@example.com', 'Diseños', true);
-- Resultado: slug = 'jose-garcia'

-- Ejemplo 3: Crear barbero duplicado (se agrega número)
-- INSERT INTO barberos (nombre, apellido, email, especialidad, activo)
-- VALUES ('Juan', 'Pérez', 'juan2@example.com', 'Barbería', true);
-- Resultado: slug = 'juan-perez-1'

-- Ejemplo 4: Actualizar nombre (se regenera slug)
-- UPDATE barberos SET nombre = 'Juanito' WHERE email = 'juan@example.com';
-- Resultado: slug cambia de 'juan-perez' a 'juanito-perez'

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. El trigger SOLO se ejecuta si el slug es NULL en INSERT
-- 2. Si especificas manualmente un slug en INSERT, se respeta
-- 3. El trigger se ejecuta en UPDATE solo si cambia nombre o apellido
-- 4. Los slugs siempre son únicos (se agrega -1, -2, etc. si hay duplicados)
-- 5. Los acentos y caracteres especiales se normalizan automáticamente
