BEGIN;
SET LOCAL lock_timeout = '5s';
-- project_admin inherits authenticated, including its restrictive staff policies.
-- These server-only entry points run after requireStaff has verified the actor.
ALTER FUNCTION public.app_record_sale(jsonb) SECURITY DEFINER;
ALTER FUNCTION public.app_change_sale(uuid,uuid,uuid,text,jsonb) SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.app_record_sale(jsonb), public.app_change_sale(uuid,uuid,uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_record_sale(jsonb), public.app_change_sale(uuid,uuid,uuid,text,jsonb) TO project_admin;
NOTIFY pgrst, 'reload schema';
COMMIT;
