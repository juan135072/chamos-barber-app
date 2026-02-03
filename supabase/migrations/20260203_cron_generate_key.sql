-- ================================================================
-- MIGRACIÓN: AUTOMATIZAR CLAVE DE ASISTENCIA
-- ================================================================

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Función para generar la clave (Formato: XXX-DDMM)
CREATE OR REPLACE FUNCTION public.generar_clave_asistencia_diaria()
RETURNS TEXT AS $$
DECLARE
    letras TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    prefijo TEXT := '';
    v_fecha DATE := (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago');
    dia TEXT := to_char(v_fecha, 'DD');
    mes TEXT := to_char(v_fecha, 'MM');
    i INTEGER;
BEGIN
    -- Clave alfanumérica de 3 caracteres + fecha
    FOR i IN 1..3 LOOP
        prefijo := prefijo || substr(letras, floor(random() * length(letras) + 1)::integer, 1);
    END LOOP;
    RETURN prefijo || '-' || dia || mes;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear wrapper para insertar la clave (evita errores si ya existe)
CREATE OR REPLACE FUNCTION public.ejecutar_generacion_clave_automatica()
RETURNS void AS $$
DECLARE
    v_fecha DATE := (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago');
    v_clave TEXT;
BEGIN
    -- Verificar si ya existe una clave activa para hoy
    IF NOT EXISTS (SELECT 1 FROM public.claves_diarias WHERE fecha = v_fecha::text) THEN
        v_clave := public.generar_clave_asistencia_diaria();
        
        INSERT INTO public.claves_diarias (clave, fecha, activa, creada_por)
        VALUES (v_clave, v_fecha::text, true, NULL);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Programar la tarea (Cada día a las 00:00 Chile)
-- '0 3 * * *' UTC es aprox 00:00 Chile (UTC-3)
SELECT cron.schedule('generar-clave-diaria', '0 3 * * *', 'SELECT public.ejecutar_generacion_clave_automatica()');

-- 5. Dar permisos necesarios
GRANT EXECUTE ON FUNCTION public.generar_clave_asistencia_diaria() TO service_role;
GRANT EXECUTE ON FUNCTION public.ejecutar_generacion_clave_automatica() TO service_role;
