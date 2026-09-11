BEGIN;
SET LOCAL lock_timeout='5s';
-- Profile edits and GPS attendance pass through authenticated server endpoints.
-- Direct browser writes must not bypass their validation or change commission.
DO $$ DECLARE t text; action text; BEGIN
  FOREACH t IN ARRAY ARRAY['barberos','asistencias','claves_diarias'] LOOP
    FOREACH action IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I','app_role_'||lower(action),t);
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s %s',
        'app_role_'||lower(action),t,action,
        CASE WHEN action IN ('UPDATE','DELETE') THEN 'USING(public.app_has_role(ARRAY[''admin'']))' ELSE '' END,
        CASE WHEN action IN ('INSERT','UPDATE') THEN 'WITH CHECK(public.app_has_role(ARRAY[''admin'']))' ELSE '' END);
    END LOOP;
  END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
