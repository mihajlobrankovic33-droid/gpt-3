-- Create pro_codes table
CREATE TABLE public.pro_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by_device_id TEXT,
  duration_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.pro_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can check if a code exists and use it
CREATE POLICY "Anyone can read pro codes"
ON public.pro_codes
FOR SELECT
USING (true);

-- Policy: Authenticated users can claim unused codes
CREATE POLICY "Authenticated users can claim unused codes"
ON public.pro_codes
FOR UPDATE
TO authenticated
USING (is_used = false)
WITH CHECK (is_used = true AND used_by_user_id = auth.uid());

-- Policy: Service role can insert/update/delete (for admin)
CREATE POLICY "Service role full access"
ON public.pro_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);