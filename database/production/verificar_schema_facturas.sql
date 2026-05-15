-- ============================================================================
-- VERIFICACIÓN Y CORRECCIÓN DEL SCHEMA DE FACTURAS
-- ============================================================================
-- Fecha: 2025-12-17
-- Propósito: Verificar que la columna cita_id existe y refrescar cache
-- ============================================================================

-- 1. VERIFICAR SI LA COLUMNA CITA_ID EXISTE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'facturas' 
        AND column_name = 'cita_id'
    ) THEN
        RAISE NOTICE '✅ La columna cita_id EXISTE en la tabla facturas';
    ELSE
        RAISE NOTICE '❌ La columna cita_id NO EXISTE en la tabla facturas';
        RAISE NOTICE '⚠️ Se necesita crear la columna';
    END IF;
END $$;

-- 2. VERIFICAR ESTRUCTURA COMPLETA DE LA TABLA FACTURAS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'facturas'
ORDER BY ordinal_position;

-- 3. SI LA COLUMNA NO EXISTE, CREARLA
-- (Este script solo se ejecutará si cita_id no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'facturas' 
        AND column_name = 'cita_id'
    ) THEN
        -- Crear la columna cita_id
        ALTER TABLE public.facturas 
        ADD COLUMN cita_id UUID NULL;
        
        -- Agregar foreign key a citas
        ALTER TABLE public.facturas 
        ADD CONSTRAINT facturas_cita_id_fkey 
        FOREIGN KEY (cita_id) 
        REFERENCES public.citas(id) 
        ON DELETE SET NULL;
        
        -- Crear índice para mejor rendimiento
        CREATE INDEX IF NOT EXISTS idx_facturas_cita_id 
        ON public.facturas(cita_id);
        
        RAISE NOTICE '✅ Columna cita_id creada exitosamente';
        RAISE NOTICE '✅ Foreign key agregada';
        RAISE NOTICE '✅ Índice creado';
    END IF;
END $$;

-- 4. REFRESCAR CACHE DE POSTGREST (Supabase)
-- Nota: Esto normalmente se hace desde el dashboard de Supabase
-- o esperando unos minutos para que el cache se actualice automáticamente

-- 5. VERIFICACIÓN FINAL
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facturas' 
            AND column_name = 'cita_id'
        ) THEN '✅ VERIFICACIÓN EXITOSA: cita_id existe en facturas'
        ELSE '❌ ERROR: cita_id NO existe en facturas'
    END as resultado;

-- 6. MOSTRAR EJEMPLO DE INSERT CORRECTO
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📝 EJEMPLO DE INSERT CORRECTO:';
    RAISE NOTICE 'INSERT INTO facturas (';
    RAISE NOTICE '  numero_factura, cita_id, barbero_id, cliente_nombre,';
    RAISE NOTICE '  items, subtotal, descuento, iva, total,';
    RAISE NOTICE '  metodo_pago, monto_recibido, cambio,';
    RAISE NOTICE '  porcentaje_comision, comision_barbero, ingreso_casa,';
    RAISE NOTICE '  impresa, anulada, created_by';
    RAISE NOTICE ') VALUES (';
    RAISE NOTICE '  ''FAC-123456'', ''uuid-de-cita'', ''uuid-barbero'', ''Juan Perez'',';
    RAISE NOTICE '  ''[{"servicio":"Corte","precio":20}]''::jsonb, 20, 0, 0, 20,';
    RAISE NOTICE '  ''efectivo'', 20, 0,';
    RAISE NOTICE '  50, 10, 10,';
    RAISE NOTICE '  false, false, ''uuid-usuario''';
    RAISE NOTICE ');';
    RAISE NOTICE '';
END $$;
