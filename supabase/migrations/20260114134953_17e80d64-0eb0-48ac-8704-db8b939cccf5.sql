-- Add avatar_url column to profiles if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- RLS policies already exist for profiles (users can view/update their own profile)
-- Storage policies for custom-avatars bucket

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'custom-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'custom-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to avatars (bucket is already public)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'custom-avatars');