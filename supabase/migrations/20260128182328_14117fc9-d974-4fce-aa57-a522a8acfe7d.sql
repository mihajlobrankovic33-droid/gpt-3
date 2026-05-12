-- Fix licenses table RLS policies
-- The current SELECT policy with USING (false) blocks all access including service role
-- We need to remove the restrictive SELECT policy and keep only the ALL policy for service role

-- Drop the overly restrictive SELECT policy
DROP POLICY IF EXISTS "Service role only license access" ON public.licenses;

-- The "Service role can update licenses" policy with ALL command should be sufficient
-- Service role bypasses RLS anyway, so we just need to ensure no conflicting policies

-- Add a DELETE policy for avatar storage to allow users to clean up old avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'custom-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);