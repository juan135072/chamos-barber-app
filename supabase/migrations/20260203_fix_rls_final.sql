-- ======================================================
-- CORRECCIÓN DEFINITIVA DE RLS Y RESTRICCIONES
-- ======================================================

-- 1. Asegurar que la función helper exista y sea SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_active_tenant_id()
RETURNS UUID AS $$
BEGIN
  -- Buscamos el comercio_id del usuario autenticado en la tabla admin_users
  -- Usamos SECURITY DEFINER para saltar el RLS de admin_users si lo hay
  RETURN (SELECT comercio_id FROM public.admin_users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Actualizar políticas de claves_diarias usando la función helper
DROP POLICY IF EXISTS "Admin gestiona claves multitenant" ON public.claves_diarias;
CREATE POLICY "Admin gestiona claves multitenant"
ON public.claves_diarias
FOR ALL
TO authenticated
USING (
    comercio_id = get_active_tenant_id()
)
WITH CHECK (
    comercio_id = get_active_tenant_id()
);

-- 3. Actualizar políticas de asistencias usando la función helper
DROP POLICY IF EXISTS "Admin ve todas las asistencias multitenant" ON public.asistencias;
CREATE POLICY "Admin ve todas las asistencias multitenant"
ON public.asistencias
FOR SELECT
TO authenticated
USING (
    comercio_id = get_active_tenant_id()
);

DROP POLICY IF EXISTS "Barbero ve sus asistencias multitenant" ON public.asistencias;
CREATE POLICY "Barbero ve sus asistencias multitenant"
ON public.asistencias
FOR SELECT
TO authenticated
USING (
    comercio_id = (SELECT comercio_id FROM barberos WHERE id = auth.uid())
    OR
    comercio_id = get_active_tenant_id()
);

-- 4. Asegurar que el barbero pueda insertar
DROP POLICY IF EXISTS "Barbero registra su asistencia" ON public.asistencias;
CREATE POLICY "Barbero registra su asistencia multitenant"
ON public.asistencias
FOR INSERT
TO authenticated
WITH CHECK (
    barbero_id = auth.uid() AND
    comercio_id = (SELECT comercio_id FROM barberos WHERE id = auth.uid())
);
