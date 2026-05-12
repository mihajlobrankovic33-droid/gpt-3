-- Secure the licenses table properly
-- Now that we have an edge function for license validation,
-- we can block all direct SELECT access

-- Drop the permissive policy
DROP POLICY IF EXISTS "Authenticated users can validate licenses" ON public.licenses;

-- Create a restrictive policy that blocks all direct access
-- All license operations now go through edge functions with service role
CREATE POLICY "No direct license access - use edge function"
ON public.licenses FOR SELECT
USING (false);

-- Service role bypasses RLS, so edge functions can still access