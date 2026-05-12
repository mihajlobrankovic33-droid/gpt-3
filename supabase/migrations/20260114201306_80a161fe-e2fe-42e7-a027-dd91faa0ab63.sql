-- First create the function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create puskice table for user notes linked to user_id
CREATE TABLE public.puskice (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.puskice ENABLE ROW LEVEL SECURITY;

-- Users can only view their own puskice
CREATE POLICY "Users can view their own puskice"
ON public.puskice FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own puskice
CREATE POLICY "Users can create their own puskice"
ON public.puskice FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own puskice
CREATE POLICY "Users can update their own puskice"
ON public.puskice FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own puskice
CREATE POLICY "Users can delete their own puskice"
ON public.puskice FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_puskice_updated_at
BEFORE UPDATE ON public.puskice
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster queries
CREATE INDEX idx_puskice_user_id ON public.puskice(user_id);
CREATE INDEX idx_puskice_subject ON public.puskice(subject);