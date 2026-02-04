-- ======================================================
-- CORRECCIÓN DE MULTITENANCY Y RESTRICCIONES
-- ======================================================

-- 1. Asegurar que los administradores tengan comercio_id
DO $$
DECLARE
    v_comercio_id uuid;
BEGIN
    SELECT id INTO v_comercio_id FROM public.comercios LIMIT 1;
    IF v_comercio_id IS NOT NULL THEN
        UPDATE public.admin_users SET comercio_id = v_comercio_id WHERE comercio_id IS NULL;
    END IF;
END $$;

-- 2. Corregir restricciones de claves_diarias para multitenancy
-- Primero eliminamos la restricción única simple por fecha
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'claves_diarias_fecha_key') THEN
        ALTER TABLE public.claves_diarias DROP CONSTRAINT claves_diarias_fecha_key;
    END IF;
END $$;

-- Añadimos la restricción multitenant (fecha + comercio_id)
ALTER TABLE public.claves_diarias DROP CONSTRAINT IF EXISTS claves_diarias_fecha_comercio_id_key;
ALTER TABLE public.claves_diarias ADD CONSTRAINT claves_diarias_fecha_comercio_id_key UNIQUE (fecha, comercio_id);

-- 3. Asegurar RLS en claves_diarias para multitenancy
DROP POLICY IF EXISTS "Admin gestiona claves" ON public.claves_diarias;
CREATE POLICY "Admin gestiona claves multitenant"
ON public.claves_diarias
FOR ALL
TO authenticated
USING (
    comercio_id = (SELECT comercio_id FROM admin_users WHERE id = auth.uid())
)
WITH CHECK (
    comercio_id = (SELECT comercio_id FROM admin_users WHERE id = auth.uid())
);

-- 4. Asegurar RLS en asistencias para multitenancy
DROP POLICY IF EXISTS "Admin ve todas las asistencias" ON public.asistencias;
CREATE POLICY "Admin ve todas las asistencias multitenant"
ON public.asistencias
FOR SELECT
TO authenticated
USING (
    comercio_id = (SELECT comercio_id FROM admin_users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Barbero ve sus asistencias" ON public.asistencias;
CREATE POLICY "Barbero ve sus asistencias multitenant"
ON public.asistencias
FOR SELECT
TO authenticated
USING (
    comercio_id = (SELECT comercio_id FROM barberos WHERE id = auth.uid())
    OR
    comercio_id = (SELECT comercio_id FROM admin_users WHERE id = auth.uid())
);
