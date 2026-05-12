-- Add proper RLS policy for licenses table
-- Users can only view their own licenses (matched by device_id which is stored locally)
-- This replaces the dropped "Service role can update licenses" policy

-- For licenses table: Allow authenticated users to view licenses matching their device
-- The device_id is sent from the client and matched against stored licenses
CREATE POLICY "Users can view licenses by device_id"
ON public.licenses FOR SELECT
TO authenticated
USING (true);

-- Note: The licenses table uses device_id for matching, not user_id
-- The actual authorization happens in the application code and edge functions
-- Service role is used for all mutations (bypasses RLS)
-- This SELECT policy allows authenticated users to query licenses
-- The application filters by device_id client-side

-- Also ensure RLS is enforced properly by making anon role have no access
DROP POLICY IF EXISTS "Users can view licenses by device_id" ON public.licenses;

-- Better approach: No direct SELECT access for authenticated users
-- All license operations go through edge functions with service role
CREATE POLICY "No direct license access"
ON public.licenses FOR SELECT
USING (false);

-- Service role bypasses RLS, so edge functions can still access