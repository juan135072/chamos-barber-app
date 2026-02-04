-- ================================================================
-- MIGRACIÓN: CONFIGURACIÓN DE ZONA HORARIA GLOBAL (MULTITENANT FIX)
-- ================================================================

-- 1. Asegurar columnas de multitenancy en tablas de asistencia
ALTER TABLE public.asistencias ADD COLUMN IF NOT EXISTS comercio_id UUID REFERENCES public.comercios(id);
ALTER TABLE public.claves_diarias ADD COLUMN IF NOT EXISTS comercio_id UUID REFERENCES public.comercios(id);
ALTER TABLE public.configuracion_horarios ADD COLUMN IF NOT EXISTS comercio_id UUID REFERENCES public.comercios(id);

-- 2. Asegurar restricciones únicas para configuración multitenant
-- Configuracion del Sitio
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sitio_configuracion_clave_key') THEN
        ALTER TABLE public.sitio_configuracion DROP CONSTRAINT sitio_configuracion_clave_key;
    END IF;
END $$;

ALTER TABLE public.sitio_configuracion DROP CONSTRAINT IF EXISTS sitio_configuracion_clave_comercio_id_key;
ALTER TABLE public.sitio_configuracion ADD CONSTRAINT sitio_configuracion_clave_comercio_id_key UNIQUE (clave, comercio_id);

-- Configuracion de Horarios
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'configuracion_horarios_nombre_key') THEN
        ALTER TABLE public.configuracion_horarios DROP CONSTRAINT configuracion_horarios_nombre_key;
    END IF;
END $$;

ALTER TABLE public.configuracion_horarios DROP CONSTRAINT IF EXISTS configuracion_horarios_nombre_comercio_id_key;
ALTER TABLE public.configuracion_horarios ADD CONSTRAINT configuracion_horarios_nombre_comercio_id_key UNIQUE (nombre, comercio_id);

-- 3. Vincular datos existentes al primer comercio (si aplica)
DO $$
DECLARE
    v_comercio_id uuid;
BEGIN
    SELECT id INTO v_comercio_id FROM public.comercios LIMIT 1;
    IF v_comercio_id IS NOT NULL THEN
        UPDATE public.asistencias SET comercio_id = v_comercio_id WHERE comercio_id IS NULL;
        UPDATE public.claves_diarias SET comercio_id = v_comercio_id WHERE comercio_id IS NULL;
        UPDATE public.configuracion_horarios SET comercio_id = v_comercio_id WHERE comercio_id IS NULL;
        UPDATE public.sitio_configuracion SET comercio_id = v_comercio_id WHERE comercio_id IS NULL;
    END IF;
END $$;

-- 3. Insertar configuración de zona horaria para cada comercio existente
INSERT INTO public.sitio_configuracion (clave, valor, tipo, categoria, comercio_id)
SELECT 'sitio_timezone', 'America/Santiago', 'select', 'general', id
FROM public.comercios
ON CONFLICT (clave, comercio_id) DO NOTHING;

-- 4. Actualizar la función de generación de clave para que sea multitenant
CREATE OR REPLACE FUNCTION public.ejecutar_generacion_clave_automatica()
RETURNS void AS $$
DECLARE
    r RECORD;
    v_timezone TEXT;
    v_fecha DATE;
    v_clave TEXT;
BEGIN
    -- Recorrer todos los comercios activos
    FOR r IN SELECT id FROM public.comercios WHERE activo = true LOOP
        
        -- Obtener la zona horaria del comercio (default America/Santiago)
        SELECT COALESCE(valor, 'America/Santiago') INTO v_timezone 
        FROM public.sitio_configuracion 
        WHERE clave = 'sitio_timezone' AND comercio_id = r.id;

        -- Obtener fecha actual en esa zona horaria
        v_fecha := (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE v_timezone);
        
        -- Verificar si ya existe una clave activa para este comercio hoy
        IF NOT EXISTS (SELECT 1 FROM public.claves_diarias WHERE fecha = v_fecha::text AND comercio_id = r.id) THEN
            -- Generamos clave única para cada comercio
            v_clave := public.generar_clave_asistencia_diaria();
            
            INSERT INTO public.claves_diarias (clave, fecha, activa, creada_por, comercio_id)
            VALUES (v_clave, v_fecha::text, true, NULL, r.id);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Actualizar la función helper para obtener hora local (ahora requiere comercio_id)
CREATE OR REPLACE FUNCTION public.get_hora_local_comercio(p_comercio_id UUID)
RETURNS TIME AS $$
DECLARE
    v_timezone TEXT;
BEGIN
    SELECT COALESCE(valor, 'America/Santiago') INTO v_timezone 
    FROM public.sitio_configuracion 
    WHERE clave = 'sitio_timezone' AND comercio_id = p_comercio_id;
    
    RETURN (CURRENT_TIME AT TIME ZONE 'UTC' AT TIME ZONE v_timezone)::TIME;
END;
$$ LANGUAGE plpgsql;
