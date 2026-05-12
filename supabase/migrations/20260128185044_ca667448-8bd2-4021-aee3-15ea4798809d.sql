-- Fix profiles table to block anonymous access
-- Currently only has policies for authenticated users but no explicit anon block

-- Ensure profiles SELECT policy only works for authenticated users viewing their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix pro_codes table to block anonymous access
-- Update the existing SELECT policy to explicitly require authentication
DROP POLICY IF EXISTS "Users can only view their own redeemed codes" ON public.pro_codes;
CREATE POLICY "Users can only view their own redeemed codes"
ON public.pro_codes FOR SELECT
TO authenticated
USING (used_by_user_id = auth.uid());