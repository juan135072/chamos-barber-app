-- ================================================
-- MIGRACIÓN: Habilitar borrado de citas
-- Fecha: 2025-12-30
-- Descripción: Agrega política RLS para permitir la eliminación de citas a usuarios autenticados
-- ================================================

-- 1. Verificar si la política ya existe para evitar errores
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'citas' AND policyname = 'citas_authenticated_delete') THEN
        -- Crear política de borrado para usuarios autenticados (Admin/Barberos)
        CREATE POLICY "citas_authenticated_delete" ON public.citas
        FOR DELETE TO authenticated USING (true);
        
        RAISE NOTICE 'Política citas_authenticated_delete creada correctamente.';
    ELSE
        RAISE NOTICE 'La política citas_authenticated_delete ya existe.';
    END IF;
END $$;

-- 2. Asegurarse de que el RLS esté habilitado (ya debería estarlo)
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- 3. Verificación de políticas actuales
SELECT policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename = 'citas';
