-- ================================================================
-- FIX: RLS policies that used auth.jwt() → rewritten for InsForge
--
-- Root cause: the Supabase→InsForge migration script transforms
--   auth.uid()   → uid()
--   auth.role()  → role()
--   auth.email() → email()
-- but does NOT transform the pattern auth.jwt() ->> 'email'.
-- Those policies were imported with broken references and either
-- failed silently or throw errors at query time.
--
-- Fix: drop + recreate each affected policy using email() instead.
-- Affected tables: walk_in_clients, cierres_caja, facturas
-- ================================================================

BEGIN;

-- ================================================================
-- 1. walk_in_clients — 4 policies
-- ================================================================

DROP POLICY IF EXISTS "Admins pueden ver walk-in clients"        ON public.walk_in_clients;
DROP POLICY IF EXISTS "Admins pueden crear walk-in clients"      ON public.walk_in_clients;
DROP POLICY IF EXISTS "Admins pueden actualizar walk-in clients" ON public.walk_in_clients;
DROP POLICY IF EXISTS "Admins pueden eliminar walk-in clients"   ON public.walk_in_clients;

CREATE POLICY "Admins pueden ver walk-in clients"
  ON public.walk_in_clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = email()
        AND rol = 'admin'
        AND activo = true
    )
  );

CREATE POLICY "Admins pueden crear walk-in clients"
  ON public.walk_in_clients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = email()
        AND rol = 'admin'
        AND activo = true
    )
  );

CREATE POLICY "Admins pueden actualizar walk-in clients"
  ON public.walk_in_clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = email()
        AND rol = 'admin'
        AND activo = true
    )
  );

CREATE POLICY "Admins pueden eliminar walk-in clients"
  ON public.walk_in_clients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = email()
        AND rol = 'admin'
        AND activo = true
    )
  );

-- ================================================================
-- 2. cierres_caja — 2 policies
-- ================================================================

DROP POLICY IF EXISTS "Admins and Cashiers can view cierres_caja"   ON public.cierres_caja;
DROP POLICY IF EXISTS "Admins and Cashiers can insert cierres_caja" ON public.cierres_caja;

CREATE POLICY "Admins and Cashiers can view cierres_caja"
  ON public.cierres_caja
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = email()
        AND (rol = 'admin' OR rol = 'cajero')
    )
  );

CREATE POLICY "Admins and Cashiers can insert cierres_caja"
  ON public.cierres_caja
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = email()
        AND (rol = 'admin' OR rol = 'cajero')
    )
  );

-- ================================================================
-- 3. facturas — 1 UPDATE policy from link_closure migration
-- ================================================================

DROP POLICY IF EXISTS "Admins can link facturas to closures" ON public.facturas;

CREATE POLICY "Admins can link facturas to closures"
  ON public.facturas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = email()
        AND (rol = 'admin' OR rol = 'cajero')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = email()
        AND (rol = 'admin' OR rol = 'cajero')
    )
  );

COMMIT;

-- ================================================================
-- Verification
-- ================================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('walk_in_clients', 'cierres_caja', 'facturas')
ORDER BY tablename, policyname;
