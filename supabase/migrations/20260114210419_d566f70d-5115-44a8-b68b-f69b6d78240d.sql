-- Create chat_sessions table to store AI chat history with subjects
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novi razgovor',
  subject TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chat sessions
CREATE POLICY "Users can view their own chat sessions"
ON public.chat_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own chat sessions
CREATE POLICY "Users can create their own chat sessions"
ON public.chat_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own chat sessions
CREATE POLICY "Users can update their own chat sessions"
ON public.chat_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own chat sessions
CREATE POLICY "Users can delete their own chat sessions"
ON public.chat_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();