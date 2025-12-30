-- ==================================================================
-- MIGRACIÓN: Fix Referencias y RPC de Borrado en Cascada
-- Fecha: 2025-12-30
-- Descripción: Desvincula citas de facturas para permitir borrado seguro
-- ==================================================================

-- 1. Asegurar que la relación factura -> cita permita el borrado (ON DELETE SET NULL)
-- Primero eliminamos la restricción si existe para recrearla correctamente
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'facturas_cita_id_fkey') THEN
        ALTER TABLE facturas DROP CONSTRAINT facturas_cita_id_fkey;
    END IF;
END $$;

ALTER TABLE facturas 
ADD CONSTRAINT facturas_cita_id_fkey 
FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL;

-- 2. RPC Actualizado: Borra citas canceladas Y desvincula citas antes de borrar (doble seguridad)
CREATE OR REPLACE FUNCTION public.eliminar_citas_canceladas()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_filas_borradas INTEGER;
BEGIN
    -- A. Desvincular cualquier factura que apunte a las citas que vamos a borrar
    -- Aunque el ON DELETE SET NULL ya lo hace, esto previene bloqueos de transacción
    UPDATE public.facturas 
    SET cita_id = NULL 
    WHERE cita_id IN (SELECT id FROM public.citas WHERE estado = 'cancelada');

    -- B. Ahora sí, borrar las citas canceladas
    DELETE FROM public.citas
    WHERE estado = 'cancelada';
    
    GET DIAGNOSTICS v_filas_borradas = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'count', v_filas_borradas,
        'message', 'Se han eliminado ' || v_filas_borradas || ' citas canceladas y se han limpiado sus referencias.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Error crítico en la base de datos al intentar borrar.'
    );
END;
$$;

-- 3. Permisos
GRANT EXECUTE ON FUNCTION public.eliminar_citas_canceladas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_citas_canceladas() TO service_role;

-- 4. Notificar recarga
NOTIFY pgrst, 'reload schema';
