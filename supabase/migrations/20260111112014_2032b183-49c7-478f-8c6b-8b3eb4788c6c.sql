-- Create licenses table for Study Buddy
CREATE TABLE public.licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL,
  unique_code TEXT NOT NULL UNIQUE,
  device_id TEXT,
  avatar TEXT NOT NULL DEFAULT 'owl',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Create policy for reading licenses (anyone can check license validity)
CREATE POLICY "Anyone can read licenses for validation"
ON public.licenses
FOR SELECT
USING (true);

-- Create policy for admin updates (service role only)
CREATE POLICY "Service role can update licenses"
ON public.licenses
FOR ALL
USING (true)
WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_licenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_licenses_updated_at
BEFORE UPDATE ON public.licenses
FOR EACH ROW
EXECUTE FUNCTION public.update_licenses_updated_at();

-- Insert initial license data
INSERT INTO public.licenses (user_name, unique_code, avatar, is_active, expiry_date) VALUES
  ('Admin', 'BOSS-0000-XP', 'rabbit', true, NULL),
  ('Korisnik 1', 'OWL-2988-WX', 'owl', true, now() + interval '30 days'),
  ('Korisnik 2', 'BUN-1142-ST', 'rabbit', true, now() + interval '30 days'),
  ('Korisnik 3', 'FOX-0051-QR', 'fox', true, now() + interval '30 days'),
  ('Korisnik 4', 'PAN-8832-ZZ', 'panda', true, now() + interval '30 days'),
  ('Korisnik 5', 'CAT-9910-MM', 'cat', true, now() + interval '30 days'),
  ('Korisnik 6', 'PEN-4421-CC', 'penguin', true, now() + interval '30 days');