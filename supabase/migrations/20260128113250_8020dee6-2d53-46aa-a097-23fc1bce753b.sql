-- Fix profiles table RLS: Ensure only authenticated users can access their own profile
-- Drop existing SELECT policy and recreate with authentication requirement
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix licenses table: Replace insecure device_id header-based policy with proper authenticated access
-- The licenses table should require proper authentication, not just a client-provided header

-- Drop the insecure header-based policy
DROP POLICY IF EXISTS "Users can only validate their own license" ON public.licenses;

-- Create a more secure policy: Only authenticated users can view licenses linked to their user_id
-- Add a user_id column reference if the system uses authenticated users for license validation
-- Since the current system uses device_id binding, we'll make the policy require authentication
-- AND restrict access to the service role for license management

-- Allow authenticated users to view their own licenses (if we add user_id linking)
-- For now, since the system uses device_id binding without user accounts,
-- we'll create a restrictive policy that only allows service role access
-- and edge functions to handle license validation

CREATE POLICY "Service role only license access"
ON public.licenses
FOR SELECT
TO authenticated
USING (false);

-- Note: License validation should now happen through the edge function
-- which uses service role access, not direct RLS-based access from clients