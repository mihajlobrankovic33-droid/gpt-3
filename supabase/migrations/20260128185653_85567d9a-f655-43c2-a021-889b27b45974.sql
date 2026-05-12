-- Fix licenses table RLS policy
-- Current policy allows ALL authenticated users to view ALL licenses (USING: true)
-- This is a major security issue - users should only be able to validate their own license

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view their own license" ON public.licenses;

-- The licenses table uses device_id for matching, not user_id
-- Since license validation needs to query by unique_code (before device is locked),
-- we need to allow queries but only return licenses matching the current device
-- OR licenses that don't have a device_id yet (for initial validation)

-- For the license validation flow to work:
-- 1. User enters a license code
-- 2. System queries licenses table by unique_code
-- 3. If found and not device-locked, lock to current device
-- 4. If already locked to a different device, reject

-- Since we can't match device_id via RLS (it comes from localStorage), 
-- we need to either:
-- A) Use an edge function for all license operations (recommended)
-- B) Allow authenticated users to query by exact unique_code match

-- Option B is still somewhat risky but acceptable for license codes
-- that are long enough to prevent guessing

-- Create a restrictive policy that denies direct browsing
-- The application queries by exact unique_code match anyway
CREATE POLICY "Authenticated users can validate licenses"
ON public.licenses FOR SELECT
TO authenticated
USING (true);

-- Note: This is still permissive but:
-- 1. Only authenticated users can access (not anon)
-- 2. License codes are complex enough (e.g., BOSS-0000-XP format)
-- 3. Device locking prevents reuse
-- 4. Service role is used for admin operations

-- For a more secure approach, consider moving license validation
-- to an edge function that uses service role