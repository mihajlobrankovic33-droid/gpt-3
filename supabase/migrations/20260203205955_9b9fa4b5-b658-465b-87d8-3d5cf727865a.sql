-- ===========================================
-- FIX RLS POLICIES FOR profiles AND chat_sessions
-- ===========================================

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- PROFILES TABLE - Drop existing restrictive policies
-- ===========================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;

-- Create PERMISSIVE policies for authenticated users
CREATE POLICY "Users can view their own profile"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Service role policy to ensure auth triggers work
CREATE POLICY "Service role can manage all profiles"
ON public.profiles
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ===========================================
-- CHAT_SESSIONS TABLE - Drop existing restrictive policies
-- ===========================================
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON public.chat_sessions;

-- Create PERMISSIVE policies for authenticated users
CREATE POLICY "Users can view their own chat sessions"
ON public.chat_sessions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions"
ON public.chat_sessions
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
ON public.chat_sessions
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
ON public.chat_sessions
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);