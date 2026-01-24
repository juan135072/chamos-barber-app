
-- ================================================================
-- 🛠️ FIX: AGREGAR COLUMNAS FALTANTES A TABLA CITAS
-- ================================================================
-- Este script agrega las columnas 'items', 'precio_final' y 'metodo_pago'
-- que son necesarias para el nuevo sistema de reservas multi-servicio.
-- ================================================================

DO $$ 
BEGIN
    -- 1. Agregar columna 'items' (JSONB) si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citas' AND column_name = 'items') THEN
        ALTER TABLE citas ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE '✅ Columna "items" agregada correctamente.';
    ELSE
        RAISE NOTICE '💡 La columna "items" ya existe.';
    END IF;

    -- 2. Agregar columna 'precio_final' (DECIMAL) si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citas' AND column_name = 'precio_final') THEN
        ALTER TABLE citas ADD COLUMN precio_final DECIMAL DEFAULT 0;
        RAISE NOTICE '✅ Columna "precio_final" agregada correctamente.';
    ELSE
        RAISE NOTICE '💡 La columna "precio_final" ya existe.';
    END IF;

    -- 3. Agregar columna 'metodo_pago' (VARCHAR) si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'citas' AND column_name = 'metodo_pago') THEN
        ALTER TABLE citas ADD COLUMN metodo_pago VARCHAR(50) DEFAULT 'efectivo';
        RAISE NOTICE '✅ Columna "metodo_pago" agregada correctamente.';
    ELSE
        RAISE NOTICE '💡 La columna "metodo_pago" ya existe.';
    END IF;
END $$;

-- Actualizar el caché de PostgREST (Supabase) para reconocer las nuevas columnas
NOTIFY pgrst, 'reload schema';
