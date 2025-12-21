-- ================================================================
-- MIGRACION: Agregar Foto a Notas de Cliente
-- ================================================================

-- 1. Agregar columna imagen_url a notas_clientes
ALTER TABLE notas_clientes
ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- 2. Asegurar que las políticas de Storage funcionen para notas
-- (Ya existen las políticas para el bucket 'cortes', usaremos ese mismo)

-- Fin de la migración
