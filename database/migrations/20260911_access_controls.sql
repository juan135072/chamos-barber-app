BEGIN;
SET LOCAL lock_timeout = '5s';

-- PostgREST v12 supplies request.jwt.claims. API-key identities are not UUIDs.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT CASE WHEN sub ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN sub::uuid ELSE NULL END
  FROM (SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub') AS sub) claims;
$$;

-- A definer lookup avoids recursively invoking admin_users RLS. Ignore headers
-- supplied by callers and exclude disabled accounts from tenant membership.
CREATE OR REPLACE FUNCTION public.get_my_comercio_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT comercio_id FROM public.admin_users WHERE id = auth.uid() AND activo IS TRUE;
$$;
REVOKE ALL ON FUNCTION public.get_my_comercio_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_comercio_id() TO anon, authenticated, project_admin;

CREATE OR REPLACE FUNCTION public.app_has_role(allowed_roles text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND activo IS TRUE AND rol = ANY(allowed_roles));
$$;
REVOKE ALL ON FUNCTION public.app_has_role(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_has_role(text[]) TO authenticated, project_admin;

-- Backup data must never be exposed through the public REST schema.
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'backup\_%' ESCAPE '\'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Restrictive policies intersect existing tenant policies, rather than adding
-- another permissive policy which could accidentally reopen access.
DO $$ DECLARE t text; action text; roles text; BEGIN
  FOREACH t IN ARRAY ARRAY['admin_users','servicios','categorias_servicios','sitio_configuracion',
    'configuracion_horarios','ubicaciones_barberia','roles_permisos','enlaces_sociales',
    'comercios','facturas','facturas_detalle','liquidaciones','caja_sesiones','cierres_caja',
    'movimientos_caja','gastos','gastos_categorias','productos','inventario_movimientos']
  LOOP
    roles := CASE WHEN t IN ('facturas','facturas_detalle','caja_sesiones','cierres_caja','movimientos_caja','productos','inventario_movimientos')
      THEN 'ARRAY[''admin'',''cajero'']::text[]' ELSE 'ARRAY[''admin'']::text[]' END;
    FOREACH action IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'app_role_' || lower(action), t);
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s %s',
        'app_role_' || lower(action), t, action,
        CASE WHEN action IN ('UPDATE','DELETE') THEN 'USING (public.app_has_role(' || roles || '))' ELSE '' END,
        CASE WHEN action IN ('INSERT','UPDATE') THEN 'WITH CHECK (public.app_has_role(' || roles || '))' ELSE '' END);
    END LOOP;
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
