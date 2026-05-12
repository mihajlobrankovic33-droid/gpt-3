-- Fix 1: Remove public read access from licenses table
-- Users should validate via edge function or only see their own license
DROP POLICY IF EXISTS "Anyone can read licenses for validation" ON public.licenses;

-- Create a restrictive policy - users can only read licenses matching their device
CREATE POLICY "Users can only validate their own license"
ON public.licenses
FOR SELECT
USING (device_id IS NOT NULL AND device_id = current_setting('request.headers', true)::json->>'x-device-id');

-- Fix 2: Remove public read access from pro_codes table
-- Codes should only be redeemed via edge function with service role
DROP POLICY IF EXISTS "Anyone can read pro codes" ON public.pro_codes;

-- Only allow authenticated users to check if a specific code exists (for validation UI feedback)
CREATE POLICY "Authenticated users can check code existence"
ON public.pro_codes
FOR SELECT
TO authenticated
USING (true);

-- Fix 3: Fix the conversations policy bug
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);