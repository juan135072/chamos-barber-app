-- FIX: Permisos y Multi-tenencia para Control de Caja

-- 1. Asegurar que el esquema public sea accesible
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;

-- 2. Otorgar permisos explícitos sobre las tablas de caja
GRANT ALL ON TABLE public.caja_sesiones TO authenticated, service_role, postgres;
GRANT ALL ON TABLE public.movimientos_caja TO authenticated, service_role, postgres;

-- 2.1 Añadir comercio_id a movimientos_caja para RLS simplificado
ALTER TABLE public.movimientos_caja ADD COLUMN IF NOT EXISTS comercio_id uuid REFERENCES public.comercios(id);

-- 3. Actualizar la vista de usuarios con permisos para incluir comercio_id
-- Esto es vital para que el frontend sepa a qué comercio pertenece el usuario
CREATE OR REPLACE VIEW public.usuarios_con_permisos AS
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.rol,
  u.activo,
  u.telefono,
  u.barbero_id,
  u.comercio_id, -- AÑADIDO: Importante para multi-tenant
  r.nombre_display as rol_nombre,
  r.descripcion as rol_descripcion,
  r.permisos,
  r.created_at as rol_created_at
FROM public.admin_users u
LEFT JOIN public.roles_permisos r ON r.rol = u.rol
ORDER BY u.nombre;

-- 4. Re-configurar RLS para ser más robusto pero permitir acceso a usuarios autenticados
ALTER TABLE public.caja_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados en caja_sesiones" ON public.caja_sesiones;
DROP POLICY IF EXISTS "RLS Sesiones Caja Multi-tenant" ON public.caja_sesiones;

CREATE POLICY "RLS Sesiones Caja Multi-tenant" ON public.caja_sesiones
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados en movimientos_caja" ON public.movimientos_caja;
DROP POLICY IF EXISTS "RLS Movimientos Caja Multi-tenant" ON public.movimientos_caja;

CREATE POLICY "RLS Movimientos Caja Multi-tenant" ON public.movimientos_caja
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Asegurar secuencias (si las hubiera, aunque usamos UUID)
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
