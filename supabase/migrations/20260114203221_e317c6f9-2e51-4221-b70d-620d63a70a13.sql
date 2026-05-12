-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation participants (who is in each conversation)
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Create direct messages table
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  puskica_id UUID REFERENCES public.puskice(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: users can see conversations they are part of
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (true);

-- Participants: users can see participants of their conversations
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id 
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (true);

-- Messages: users can see messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
ON public.direct_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = direct_messages.conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their conversations"
ON public.direct_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = direct_messages.conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update read status"
ON public.direct_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = direct_messages.conversation_id AND user_id = auth.uid()
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- Create indexes for performance
CREATE INDEX idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX idx_direct_messages_conv ON public.direct_messages(conversation_id);
CREATE INDEX idx_direct_messages_sender ON public.direct_messages(sender_id);

-- Add display_name to profiles if not searchable
CREATE INDEX idx_profiles_email ON public.profiles(email);