-- Tighten pro_codes UPDATE policy to prevent theoretical enumeration
-- The current policy allows UPDATE on any unused code, but SELECT prevents enumeration
-- This change adds an additional safety layer by blocking direct RLS-based updates entirely
-- All code redemption MUST go through the edge function with service role

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can claim unused codes" ON public.pro_codes;

-- Create a new restrictive policy that blocks ALL direct updates
-- Code redemption is handled exclusively by the edge function using service role
CREATE POLICY "No direct code updates - use edge function"
ON public.pro_codes FOR UPDATE
USING (false);