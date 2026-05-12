-- Create storage bucket for custom avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-avatars', 'custom-avatars', true);

-- Allow anyone to upload avatars (public customization without auth)
CREATE POLICY "Anyone can upload avatars"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'custom-avatars');

-- Allow anyone to view avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'custom-avatars');

-- Allow anyone to update their avatars
CREATE POLICY "Anyone can update avatars"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'custom-avatars');

-- Allow anyone to delete avatars
CREATE POLICY "Anyone can delete avatars"
ON storage.objects
FOR DELETE
USING (bucket_id = 'custom-avatars');