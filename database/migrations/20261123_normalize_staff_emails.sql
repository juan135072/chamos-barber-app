BEGIN;
SET LOCAL lock_timeout='5s';
-- /api/auth/access looks up admin_users with the authenticated email trimmed and
-- lowercased, and the lookup is case-sensitive. Accounts created with uppercase
-- letters in the email therefore could not log in (ACCESS_NOT_FOUND).
-- Keep every staff and barber email trimmed and lowercased, whatever writes it.
CREATE OR REPLACE FUNCTION public.app_normalize_email() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := NULLIF(lower(btrim(NEW.email)), '');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS app_normalize_email ON public.admin_users;
CREATE TRIGGER app_normalize_email BEFORE INSERT OR UPDATE OF email ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.app_normalize_email();

DROP TRIGGER IF EXISTS app_normalize_email ON public.barberos;
CREATE TRIGGER app_normalize_email BEFORE INSERT OR UPDATE OF email ON public.barberos
  FOR EACH ROW EXECUTE FUNCTION public.app_normalize_email();

-- Existing rows (the triggers above normalize the new value).
UPDATE public.admin_users SET email = email WHERE email <> lower(btrim(email));
UPDATE public.barberos SET email = email WHERE email IS NOT NULL AND email <> lower(btrim(email));
COMMIT;
