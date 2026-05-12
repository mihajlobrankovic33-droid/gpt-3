-- =========================================
-- SECURITY FIX 1: Drop permissive storage policies
-- =========================================
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete avatars" ON storage.objects;

-- =========================================
-- SECURITY FIX 2: Fix pro_codes RLS - remove public readable policy
-- Replace with a restrictive policy that only allows checking via edge function
-- =========================================
DROP POLICY IF EXISTS "Authenticated users can check code existence" ON pro_codes;

-- Only allow code lookup through edge function (service role)
-- Users cannot directly query pro_codes table
CREATE POLICY "Users can only view their own redeemed codes"
ON pro_codes
FOR SELECT
TO authenticated
USING (used_by_user_id = auth.uid());

-- =========================================
-- SECURITY FIX 3: Create admin roles system
-- =========================================
-- Create role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only allow users to view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;