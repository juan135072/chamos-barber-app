
-- AGREGAR COLUMNAS FALTANTES A CITAS (VERSIÓN DIRECTA)
ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS precio_final DECIMAL DEFAULT 0;
ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50) DEFAULT 'efectivo';

-- FORZAR RECARGA DE SCHEMA
NOTIFY pgrst, 'reload schema';

-- VERIFICACIÓN RÁPIDA (Ejecutar esto también)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'citas' 
AND column_name IN ('items', 'precio_final', 'metodo_pago');
