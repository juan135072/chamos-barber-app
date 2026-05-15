-- ==========================================
-- 🧹 MIGRACIÓN: Agregar Tiempo de Buffer
-- Permite bloquear tiempo adicional para limpieza
-- ==========================================

-- 1. Agregar la columna a la tabla servicios
ALTER TABLE servicios 
ADD COLUMN IF NOT EXISTS tiempo_buffer INTEGER DEFAULT 5;

-- 2. Comentario para documentación
COMMENT ON COLUMN servicios.tiempo_buffer IS 'Tiempo en minutos adicional que se bloquea después del servicio para limpieza/preparación.';

-- 3. Actualizar servicios existentes con un default de 5 minutos si no tenían
-- (Opcional, pero recomendado por el usuario)
UPDATE servicios SET tiempo_buffer = 5 WHERE tiempo_buffer IS NULL;
