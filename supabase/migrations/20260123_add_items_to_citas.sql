-- ================================================
-- MIGRACIÓN: Soporte para múltiples servicios en citas
-- Fecha: 2026-01-23
-- Descripción: Agregar columna items a la tabla citas para soportar múltiples servicios
-- ================================================

-- 1. Agregar columna items a la tabla citas
ALTER TABLE public.citas
ADD COLUMN IF NOT EXISTS items JSONB;

-- 2. Comentario de documentación
COMMENT ON COLUMN public.citas.items IS 'Array JSON con los servicios asociados a la cita. Formato compatible con facturas.items.';

-- 3. Actualizar RLS (si es necesario, aunque usualmente las políticas existentes cubren nuevas columnas)
-- Las políticas existentes de SELECT, INSERT, UPDATE en 'citas' deberían aplicar automáticamente a la nueva columna.

-- Verificación
SELECT 'Columna items agregada a la tabla citas' as resultado;
