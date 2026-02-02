-- ======================================================
-- MIGRACIÓN MULTI-TENANT: CHAMOS vs AURUN
-- ======================================================

-- 1. CREAR TABLA DE COMERCIOS
CREATE TABLE IF NOT EXISTS public.comercios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('barberia', 'restaurante')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. AÑADIR COMERCIO_ID A TABLAS EXISTENTES
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS comercio_id UUID REFERENCES public.comercios(id);
ALTER TABLE public.barberos ADD COLUMN IF NOT EXISTS comercio_id UUID REFERENCES public.comercios(id);
ALTER TABLE public.servicios ADD COLUMN IF NOT EXISTS comercio_id UUID REFERENCES public.comercios(id);
ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS comercio_id UUID REFERENCES public.comercios(id);
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS comercio_id UUID REFERENCES public.comercios(id);
ALTER TABLE public.sitio_configuracion ADD COLUMN IF NOT EXISTS comercio_id UUID REFERENCES public.comercios(id);

-- 3. FUNCIÓN DE SEGURIDAD PARA RLS (Helper de la Skill)
CREATE OR REPLACE FUNCTION get_active_tenant_id()
RETURNS UUID AS $$
  -- Buscamos el comercio_id del usuario autenticado en la tabla admin_users
  SELECT comercio_id FROM public.admin_users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. CONFIGURAR POLÍTICAS RLS ESTRICTAS
-- Nota: Primero eliminamos las políticas antiguas para evitar conflictos

-- Servicios
DROP POLICY IF EXISTS "Authed full access for servicios" ON public.servicios;
DROP POLICY IF EXISTS "Public read for services" ON public.servicios;
CREATE POLICY "RLS Servicios Multi-tenant" ON public.servicios
    FOR ALL TO authenticated
    USING (comercio_id = get_active_tenant_id())
    WITH CHECK (comercio_id = get_active_tenant_id());
CREATE POLICY "Public select for services" ON public.servicios
    FOR SELECT USING (activo = true); -- Ajustar luego si se requiere aislamiento público

-- Facturas
DROP POLICY IF EXISTS "Authed full access for facturas" ON public.facturas;
CREATE POLICY "RLS Facturas Multi-tenant" ON public.facturas
    FOR ALL TO authenticated
    USING (comercio_id = get_active_tenant_id())
    WITH CHECK (comercio_id = get_active_tenant_id());

-- Barberos / Personal
DROP POLICY IF EXISTS "Authed full access for barberos" ON public.barberos;
CREATE POLICY "RLS Personal Multi-tenant" ON public.barberos
    FOR ALL TO authenticated
    USING (comercio_id = get_active_tenant_id())
    WITH CHECK (comercio_id = get_active_tenant_id());

-- Citas / Comandas
DROP POLICY IF EXISTS "Authed full access for citas" ON public.citas;
CREATE POLICY "RLS Citas Multi-tenant" ON public.citas
    FOR ALL TO authenticated
    USING (comercio_id = get_active_tenant_id())
    WITH CHECK (comercio_id = get_active_tenant_id());

-- 5. CREAR COMERCIOS INICIALES (Opcional, manual después)
-- INSERT INTO public.comercios (id, nombre, tipo) VALUES ('UUID_AOURUN', 'Aurun & Ember', 'restaurante');
