-- Fix applied 2026-05-15: drop the two BEFORE INSERT triggers on facturas
-- whose functions called auth.uid() without a guard. Under the InsForge
-- admin API key, auth.uid() evaluates "project-admin-with-api-key"::uuid
-- and raises 22P02, which surfaced as a 500 on /api/pos/registrar-venta.
--
-- set_audit_user_trigger (BEFORE INSERT OR UPDATE) already populates
-- created_by / updated_by via COALESCE inside a defensive EXCEPTION block,
-- so the two duplicates below are redundant and harmful.
--
-- Note: CREATE OR REPLACE FUNCTION is blocked by the InsForge advance/rawsql
-- endpoint. The functions set_created_by() and set_facturas_created_by()
-- still exist in the catalog but are now dangling (no trigger references
-- them). They can be DROPped via psql if/when direct DB access is available.

DROP TRIGGER IF EXISTS set_facturas_created_by ON public.facturas;
DROP TRIGGER IF EXISTS trigger_set_facturas_created_by ON public.facturas;

-- generar_numero_factura() also calls auth.uid() unguarded. Since the
-- InsForge rawsql endpoint blocks CREATE OR REPLACE FUNCTION we cannot
-- patch the function here; instead we drop its trigger and compute
-- numero_factura inside the API route /api/pos/registrar-venta.ts.
DROP TRIGGER IF EXISTS trigger_set_numero_factura ON public.facturas;

-- Temporary safety net: a column DEFAULT so any INSERT that forgets to
-- supply numero_factura (e.g., a stale frontend bundle still in flight)
-- gets a non-colliding fallback instead of a NOT NULL violation.
-- Drop this default once /api/pos/registrar-venta is deployed and the
-- new sequential-numbering logic has been validated.
ALTER TABLE public.facturas
  ALTER COLUMN numero_factura SET DEFAULT
    'B-' || LPAD((EXTRACT(EPOCH FROM clock_timestamp())::bigint % 1000000)::text, 6, '0');
