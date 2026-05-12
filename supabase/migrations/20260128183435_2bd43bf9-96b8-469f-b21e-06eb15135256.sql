-- Remove overly-permissive RLS policies that use `USING (true)` / `WITH CHECK (true)`
-- These policies trigger the "RLS Policy Always True" linter warning.
-- Service-role requests already bypass RLS, so these policies are unnecessary.

DROP POLICY IF EXISTS "Service role can update licenses" ON public.licenses;
DROP POLICY IF EXISTS "Service role full access" ON public.pro_codes;
