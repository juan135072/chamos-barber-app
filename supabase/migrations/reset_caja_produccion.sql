-- ==========================================
-- RESET DE DATOS DE CAJA (PRODUCCIÓN)
-- ==========================================

-- 1. Desvincular facturas de sesiones de prueba
UPDATE public.facturas SET cierre_caja_id = NULL;

-- 2. Limpiar movimientos
DELETE FROM public.movimientos_caja;

-- 3. Limpiar sesiones
DELETE FROM public.caja_sesiones;

-- NOTA: Esto dejará el sistema como si nunca se hubiera abierto la caja.
-- Al recargar el POS, solicitará el "Monto Inicial" real de producción.
