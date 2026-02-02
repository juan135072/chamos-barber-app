-- ==========================================
-- REPARACIÓN INTEGRAL DE CAJA (CHAMOS BARBER)
-- ==========================================

-- 1. Asegurar tablas base
CREATE TABLE IF NOT EXISTS public.caja_sesiones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id uuid REFERENCES auth.users(id),
    comercio_id uuid REFERENCES public.comercios(id),
    fecha_apertura timestamptz DEFAULT now(),
    fecha_cierre timestamptz,
    monto_inicial numeric DEFAULT 0,
    monto_final_esperado numeric DEFAULT 0,
    monto_final_real numeric,
    diferencia numeric DEFAULT 0,
    estado text DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada'))
);

CREATE TABLE IF NOT EXISTS public.movimientos_caja (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sesion_id uuid REFERENCES public.caja_sesiones(id) ON DELETE CASCADE,
    comercio_id uuid REFERENCES public.comercios(id),
    tipo text CHECK (tipo IN ('apertura', 'cierre', 'venta', 'gasto', 'ajuste')),
    monto numeric NOT NULL,
    metodo_pago text,
    descripcion text,
    referencia_id text, -- ID de la factura o gasto relacionado
    created_at timestamptz DEFAULT now()
);

-- 2. Vincular facturas con la sesión de caja
-- Usamos 'cierre_caja_id' para compatibilidad con el código existente en ResumenDia
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='facturas' AND column_name='cierre_caja_id') THEN
        ALTER TABLE public.facturas ADD COLUMN cierre_caja_id uuid REFERENCES public.caja_sesiones(id);
    END IF;
END $$;

-- 3. Permisos y Esquema
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role, postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role, postgres;

-- 4. RLS Simplificado (Permitir todo a autenticados mientras depuramos, luego restringiremos)
ALTER TABLE public.caja_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo sesiones" ON public.caja_sesiones;
CREATE POLICY "Permitir todo sesiones" ON public.caja_sesiones FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo movimientos" ON public.movimientos_caja;
CREATE POLICY "Permitir todo movimientos" ON public.movimientos_caja FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Actualizar vista de usuarios para asegurar que comercio_id esté disponible en el frontend
CREATE OR REPLACE VIEW public.usuarios_con_permisos AS
SELECT 
    au.id,
    au.email,
    au.nombre,
    au.rol,
    au.comercio_id,
    rp.permisos
FROM public.admin_users au
LEFT JOIN public.roles_permisos rp ON au.rol = rp.rol;

GRANT SELECT ON public.usuarios_con_permisos TO authenticated, service_role;
