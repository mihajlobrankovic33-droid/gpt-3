-- Fix overly permissive RLS policies for conversation_participants
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;
CREATE POLICY "Users can add participants to their conversations" 
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM conversation_participants cp 
    WHERE cp.conversation_id = conversation_participants.conversation_id 
    AND cp.user_id = auth.uid()
  )
);

-- Fix overly permissive RLS policies for conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations" 
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);