-- Agregar columnas para tipo de documento (boleta/factura) y RUT
-- Migración: add_tipo_documento_facturas.sql
-- Fecha: 2025-11-09

-- Agregar columna tipo_documento (boleta por defecto)
ALTER TABLE facturas 
ADD COLUMN IF NOT EXISTS tipo_documento TEXT NOT NULL DEFAULT 'boleta'
CHECK (tipo_documento IN ('boleta', 'factura'));

-- Agregar columna cliente_rut (opcional, requerido solo para facturas)
ALTER TABLE facturas 
ADD COLUMN IF NOT EXISTS cliente_rut TEXT;

-- Agregar comentarios para documentación
COMMENT ON COLUMN facturas.tipo_documento IS 'Tipo de documento: boleta (simple) o factura (tributaria con RUT)';
COMMENT ON COLUMN facturas.cliente_rut IS 'RUT del cliente, requerido solo para facturas tributarias';

-- Crear índice para búsquedas por tipo de documento
CREATE INDEX IF NOT EXISTS idx_facturas_tipo_documento ON facturas(tipo_documento);

-- Crear índice para búsquedas por RUT
CREATE INDEX IF NOT EXISTS idx_facturas_cliente_rut ON facturas(cliente_rut) WHERE cliente_rut IS NOT NULL;
