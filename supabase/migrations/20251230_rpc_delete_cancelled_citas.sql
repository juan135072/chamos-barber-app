-- ================================================
-- MIGRACIÓN: Función Segura para Borrar Citas Canceladas
-- Fecha: 2025-12-30
-- Descripción: Crea una función RPC con SECURITY DEFINER para borrar citas canceladas
-- ================================================

CREATE OR REPLACE FUNCTION public.eliminar_citas_canceladas()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con privilegios del creador (bypass RLS)
AS $$
DECLARE
    filas_borradas INTEGER;
BEGIN
    -- Borrar citas con estado 'cancelada'
    DELETE FROM public.citas
    WHERE estado = 'cancelada';
    
    GET DIAGNOSTICS filas_borradas = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'count', filas_borradas,
        'message', 'Se han eliminado ' || filas_borradas || ' citas canceladas correctamente.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Error al intentar eliminar las citas.'
    );
END;
$$;

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.eliminar_citas_canceladas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_citas_canceladas() TO service_role;

-- Forzar recarga del schema cache para que PostgREST vea la nueva función inmediatamente
NOTIFY pgrst, 'reload schema';
