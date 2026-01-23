
-- Agregar columna items a la tabla citas si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citas' AND column_name = 'items') THEN
        ALTER TABLE citas ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
